import { geminiClient } from '../clients/gemini.client';
import { CodeChunksRepository, SimilarChunk } from '../db/schema/code_chunks.schema';
import { logger } from '../utils/logger';

// Keyword patterns that suggest a specific file/module is being asked about
// e.g. "in auth.service.ts" or "inside the payments module"
const FILE_MENTION_RE = /\b([\w/-]+\.(ts|js|tsx|jsx|py|go|java|rs))\b/gi;
const MODULE_MENTION_RE = /\b(in|inside|from|within)\s+(?:the\s+)?(\w+)\s+(?:module|service|controller|file|handler)/gi;

export interface RetrievedChunk extends SimilarChunk {
  // Inherits: chunk_id, chunk_text, metadata, similarity
}

export class RetrievalService {
  /**
   * Retrieve the top-k most relevant chunks for a query.
   *
   * Process:
   * 1. Embed the query text (using RETRIEVAL_QUERY task type)
   * 2. Detect any file/module mentions in the query for optional pre-filtering
   * 3. Run cosine similarity search scoped to repo_id
   * 4. Return ranked results with similarity scores
   */
  public static async retrieve(
    repoId: string,
    queryText: string,
    topK = 8
  ): Promise<RetrievedChunk[]> {
    // Embed the query
    const queryEmbedding = await geminiClient.embedQuery(queryText);

    // Detect optional file path filter from query text
    const filePathFilter = RetrievalService.extractFilePathFilter(queryText);
    if (filePathFilter) {
      logger.info(`[RetrievalService] Applying file path filter: ${filePathFilter}`);
    }

    try {
      const results = await CodeChunksRepository.findSimilar(
        repoId,
        queryEmbedding,
        topK,
        filePathFilter ?? undefined
      );

      // If filtered results are empty but a filter was applied, retry without filter
      // (over-filtering can accidentally exclude the right answer)
      if (results.length === 0 && filePathFilter) {
        logger.info(`[RetrievalService] No results with filter "${filePathFilter}", retrying without filter`);
        return await CodeChunksRepository.findSimilar(repoId, queryEmbedding, topK);
      }

      logger.info(`[RetrievalService] Retrieved ${results.length} chunks for repo ${repoId} (top similarity: ${results[0]?.similarity?.toFixed(3) ?? 'n/a'})`);
      return results;
    } catch (err) {
      logger.error(`[RetrievalService] Similarity search failed for repo ${repoId}`, {}, err as Error);
      throw err;
    }
  }

  /**
   * Extract a file path filter keyword from the query text.
   * Looks for explicit file mentions (e.g., "auth.service.ts") or
   * module references (e.g., "in the payments service").
   * Returns null if no specific scope is detectable.
   */
  private static extractFilePathFilter(queryText: string): string | null {
    // Check for explicit file name mentions
    FILE_MENTION_RE.lastIndex = 0;
    const fileMatch = FILE_MENTION_RE.exec(queryText);
    if (fileMatch) {
      return fileMatch[1];
    }

    // Check for module/service references
    MODULE_MENTION_RE.lastIndex = 0;
    const moduleMatch = MODULE_MENTION_RE.exec(queryText);
    if (moduleMatch) {
      return moduleMatch[2]; // The module name (e.g., "payments", "auth")
    }

    return null;
  }
}
