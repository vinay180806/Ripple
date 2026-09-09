import { geminiClient } from '../clients/gemini.client';
import { CodeChunksRepository } from '../db/schema/code_chunks.schema';
import { ChunkRecord, ChunkerService } from './chunker.service';
import { trackAService } from './trackA.service';
import { logger } from '../utils/logger';

// Batch size for embedding API calls — balances throughput vs rate-limit risk
const BATCH_SIZE = 20;

// Flat inter-batch delay (first-line rate-limit defense before reactive backoff kicks in)
const INTER_BATCH_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EmbeddingService {
  /**
   * Embed a list of ChunkRecords and upsert them into code_chunks.
   * Processes in batches of BATCH_SIZE with a flat inter-batch delay.
   * Failed chunks are logged but do not abort the whole pipeline.
   */
  public static async embedAndStoreChunks(
    repoId: string,
    chunks: ChunkRecord[],
    commitHash: string
  ): Promise<{ stored: number; failed: number }> {
    let stored = 0;
    let failed = 0;
    const failedChunkIds: string[] = [];

    logger.info(`[EmbeddingService] Starting embedding of ${chunks.length} chunks for repo ${repoId}`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

      logger.info(`[EmbeddingService] Embedding batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

      try {
        const texts = batch.map((c) => c.text);
        const embeddings = await geminiClient.embedTexts(texts);

        // Upsert each chunk in the batch
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = embeddings[j];
          try {
            await CodeChunksRepository.upsert({
              repo_id: repoId,
              chunk_id: chunk.chunk_id,
              chunk_text: chunk.text,
              embedding,
              metadata: chunk.metadata,
              source_commit_hash: commitHash,
            });
            stored++;
          } catch (upsertErr) {
            failed++;
            failedChunkIds.push(chunk.chunk_id);
            logger.error(`[EmbeddingService] Upsert failed for chunk ${chunk.chunk_id}`, {}, upsertErr as Error);
          }
        }
      } catch (batchErr) {
        // Entire batch embedding call failed — mark all in batch as failed
        for (const chunk of batch) {
          failedChunkIds.push(chunk.chunk_id);
        }
        failed += batch.length;
        logger.error(`[EmbeddingService] Batch ${batchNum} embedding failed, marking ${batch.length} chunks as failed`, {}, batchErr as Error);
      }

      // Flat delay between batches to stay within free-tier RPM limits
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(INTER_BATCH_DELAY_MS);
      }
    }

    if (failedChunkIds.length > 0) {
      logger.warn(`[EmbeddingService] ${failedChunkIds.length} chunks failed permanently: ${failedChunkIds.slice(0, 10).join(', ')}${failedChunkIds.length > 10 ? '...' : ''}`);
    }

    logger.info(`[EmbeddingService] Done: ${stored} stored, ${failed} failed for repo ${repoId}`);
    return { stored, failed };
  }

  /**
   * Incremental re-indexing for changed files.
   * Deletes old chunks for those files, re-chunks them, re-embeds and stores.
   * Treated as one logical operation — if embedding fails, old data was already deleted
   * (acceptable trade-off; full re-index recovers from this).
   */
  public static async reindexChangedFiles(
    repoId: string,
    changedFiles: string[],
    commitHash: string,
    workspacePath: string
  ): Promise<{ deleted: number; stored: number; failed: number }> {
    logger.info(`[EmbeddingService] Re-indexing ${changedFiles.length} changed files for repo ${repoId}`);

    // Step 1: Delete old chunks for changed files
    const deleted = await CodeChunksRepository.deleteByFilePaths(repoId, changedFiles);

    // Step 2: Get graph data and re-chunk the changed files
    let chunks: ChunkRecord[] = [];
    try {
      const graph = await trackAService.getGraph(repoId);

      // Filter graph nodes to only the changed files
      const changedFileSet = new Set(changedFiles);
      const filteredGraph = {
        ...graph,
        nodes: graph.nodes.filter((n) => changedFileSet.has(n.file)),
      };

      chunks = await ChunkerService.chunkRepo(repoId, filteredGraph, workspacePath, commitHash);
    } catch (err) {
      logger.error(`[EmbeddingService] Failed to re-chunk changed files for repo ${repoId}`, {}, err as Error);
      return { deleted, stored: 0, failed: changedFiles.length };
    }

    // Step 3: Embed and store
    const { stored, failed } = await EmbeddingService.embedAndStoreChunks(repoId, chunks, commitHash);
    return { deleted, stored, failed };
  }
}
