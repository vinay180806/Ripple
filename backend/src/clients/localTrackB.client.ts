import crypto from 'crypto';
import { TrackBClient, QAResult, ImpactReportResult, TriggerEmbeddingResult } from './trackB.client';
import { RetrievalService } from '../services/retrieval.service';
import { PromptBuilderService } from '../services/promptBuilder.service';
import { GroundingCheckService } from '../services/groundingCheck.service';
import { ImpactAgentService } from '../services/impactAgent.service';
import { EmbeddingService } from '../services/embedding.service';
import { ChunkerService } from '../services/chunker.service';
import { trackAService } from '../services/trackA.service';
import { CodeChunksRepository } from '../db/schema/code_chunks.schema';
import { geminiClient } from './gemini.client';
import { logger } from '../utils/logger';

// Confidence threshold below which we respond with a low-confidence fallback.
// Determined empirically (see Phase 8 evaluation). Start at 0.55 — tune after evaluation.
const CONFIDENCE_THRESHOLD = 0.55;

const LOW_CONFIDENCE_ANSWER =
  "I don't have enough context to answer that confidently. The repository may not be indexed yet, or this question is outside the scope of the indexed codebase.";

export class LocalTrackBClient implements TrackBClient {
  /**
   * Answer a natural-language question about the codebase.
   * Full pipeline: retrieve → prompt → generate → ground-check → return.
   */
  public async qa(repoId: string, question: string, commitHash?: string): Promise<QAResult> {
    logger.info(`[LocalTrackBClient] Q&A for repo ${repoId}: "${question}"`);

    // Step 1: Retrieve relevant chunks
    const TOP_K = 8;
    let retrievedChunks;
    try {
      retrievedChunks = await RetrievalService.retrieve(repoId, question, TOP_K);
    } catch (err) {
      logger.error('[LocalTrackBClient] Retrieval failed', {}, err as Error);
      return this.buildQAResult(repoId, question, commitHash, LOW_CONFIDENCE_ANSWER, [], 0, false);
    }

    // Check confidence threshold on top result
    const topSimilarity = retrievedChunks[0]?.similarity ?? 0;
    if (topSimilarity < CONFIDENCE_THRESHOLD) {
      logger.info(`[LocalTrackBClient] Low confidence (${topSimilarity.toFixed(3)} < ${CONFIDENCE_THRESHOLD}) — returning fallback`);
      return this.buildQAResult(repoId, question, commitHash, LOW_CONFIDENCE_ANSWER, [], topSimilarity, false);
    }

    // Step 2: Get graph facts for the relevant files
    let graph;
    try {
      graph = await trackAService.getGraph(repoId);
    } catch {
      // Non-fatal — continue without graph facts
      graph = { repoId, nodes: [], edges: [] };
    }

    // Step 3: Build prompt
    const { system, user, chunksIncluded } = PromptBuilderService.buildQAPrompt(
      graph, retrievedChunks, question
    );
    logger.info(`[LocalTrackBClient] Prompt built with ${chunksIncluded}/${retrievedChunks.length} chunks`);

    // Step 4: Call Gemini
    let answer: string;
    try {
      answer = await geminiClient.generateText(system, user);
    } catch (err) {
      logger.error('[LocalTrackBClient] LLM generation failed', {}, err as Error);
      return this.buildQAResult(repoId, question, commitHash, LOW_CONFIDENCE_ANSWER, [], 0, false);
    }

    // Step 5: Grounding check
    const groundingResult = GroundingCheckService.validate(answer, graph, retrievedChunks.slice(0, chunksIncluded));
    if (!groundingResult.isGrounded) {
      logger.warn(`[LocalTrackBClient] Grounding issues detected: ${groundingResult.warnings.join('; ')}`);
      answer += GroundingCheckService.formatWarningBadge(groundingResult.warnings);
    }

    // Build sources from the chunks that were included in the prompt
    const sources = retrievedChunks.slice(0, chunksIncluded).map((chunk) => ({
      file: chunk.metadata.file_path,
      lineStart: 0, // Line info not stored in chunks; would need to be added to metadata
      lineEnd: 0,
      snippet: chunk.chunk_text.substring(0, 200),
    }));

    return this.buildQAResult(repoId, question, commitHash, answer, sources, topSimilarity, false);
  }

  /**
   * Generate a diff-based impact report using the agent loop.
   */
  public async impactReport(
    repoId: string,
    diffRef: string,
    changedFiles?: string[]
  ): Promise<ImpactReportResult> {
    logger.info(`[LocalTrackBClient] Impact report for repo ${repoId}, diff ${diffRef}`);

    const files = changedFiles ?? [];
    const result = await ImpactAgentService.analyze(repoId, diffRef, files);

    // Compute a risk score from the dependency facts (fraction of high-risk symbols)
    const highRiskCount = result.dependency_facts.filter((f) => f.riskLevel === 'high').length;
    const riskScore = result.dependency_facts.length > 0
      ? highRiskCount / result.dependency_facts.length
      : 0.2; // default moderate risk when no analysis could run

    const affectedSymbols = result.dependency_facts.map((f) => f.symbol);
    const blastRadius = result.dependency_facts.flatMap((f) => f.callers);

    return {
      reportId: crypto.randomUUID(),
      repoId,
      diffRef,
      summary: result.explanation,
      riskScore,
      affectedSymbols,
      blastRadius: [...new Set(blastRadius)], // deduplicate
      recommendations: result.warnings.length > 0
        ? [`Review warnings: ${result.warnings.join('; ')}`]
        : ['Review all callers of the changed functions before merging'],
      isMock: false,
    };
  }

  /**
   * Trigger full embedding of a repository.
   * Called during initial indexing and after webhook push events.
   */
  public async triggerEmbedding(
    repoId: string,
    commitSha: string,
    changedFiles?: string[],
    workspacePath?: string
  ): Promise<TriggerEmbeddingResult> {
    logger.info(`[LocalTrackBClient] Triggering embedding for repo ${repoId} at commit ${commitSha}`);

    // Fall back to WORKSPACE_DIR base only when no explicit path given (e.g. webhook updates)
    const resolvedPath = workspacePath ?? process.env['WORKSPACE_DIR'] ?? './tmp_workspaces';

    try {
      if (changedFiles && changedFiles.length > 0) {
        // Incremental re-indexing
        const { stored } = await EmbeddingService.reindexChangedFiles(
          repoId, changedFiles, commitSha, resolvedPath
        );
        return {
          success: true,
          repoId,
          commitSha,
          embeddedChunksCount: stored,
          isMock: false,
        };
      } else {
        // Full initial indexing — graph from Track A, files from workspace
        const graph = await trackAService.getGraph(repoId);
        const chunks = await ChunkerService.chunkRepo(repoId, graph, resolvedPath, commitSha);
        const { stored } = await EmbeddingService.embedAndStoreChunks(repoId, chunks, commitSha);

        return {
          success: true,
          repoId,
          commitSha,
          embeddedChunksCount: stored,
          isMock: false,
        };
      }
    } catch (err) {
      logger.error(`[LocalTrackBClient] Embedding failed for repo ${repoId}`, {}, err as Error);
      return {
        success: false,
        repoId,
        commitSha,
        embeddedChunksCount: 0,
        isMock: false,
      };
    }
  }

  private buildQAResult(
    repoId: string,
    question: string,
    commitHash: string | undefined,
    answer: string,
    sources: QAResult['sources'],
    confidence: number,
    isMock: boolean
  ): QAResult {
    return { repoId, question, commitHash, answer, sources, confidence, isMock };
  }
}
