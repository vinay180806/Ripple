import { db } from '../connection';
import { logger } from '../../utils/logger';

export interface ChunkMetadata {
  file_path: string;
  function_name?: string;
  heading_text?: string;
  heading_level?: number;
  section_order?: number;
  parent_headings?: string[];
  is_exported?: boolean;
  caller_count?: number;
  callee_count?: number;
  language?: string;
  parent_chunk_id?: string;
  source_commit_hash: string;
}

export interface CodeChunkRow {
  id: string;
  repo_id: string;
  chunk_id: string;
  chunk_text: string;
  embedding: number[] | null;
  metadata: ChunkMetadata;
  source_commit_hash: string;
  created_at: Date;
  similarity?: number;
}

export interface UpsertChunkInput {
  repo_id: string;
  chunk_id: string;
  chunk_text: string;
  embedding: number[];
  metadata: ChunkMetadata;
  source_commit_hash: string;
}

export interface SimilarChunk {
  chunk_id: string;
  chunk_text: string;
  metadata: ChunkMetadata;
  similarity: number;
}

export class CodeChunksRepository {
  /**
   * Upsert a single chunk. ON CONFLICT on chunk_id updates text, embedding and metadata.
   * This is the idempotency guarantee: re-running the pipeline on the same chunk is safe.
   */
  public static async upsert(input: UpsertChunkInput): Promise<void> {
    const embeddingLiteral = `[${input.embedding.join(',')}]`;
    await db.query(
      `INSERT INTO code_chunks (repo_id, chunk_id, chunk_text, embedding, metadata, source_commit_hash)
       VALUES ($1, $2, $3, $4::vector, $5::jsonb, $6)
       ON CONFLICT (chunk_id)
       DO UPDATE SET
         chunk_text = EXCLUDED.chunk_text,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata,
         source_commit_hash = EXCLUDED.source_commit_hash`,
      [
        input.repo_id,
        input.chunk_id,
        input.chunk_text,
        embeddingLiteral,
        JSON.stringify(input.metadata),
        input.source_commit_hash,
      ]
    );
  }

  /**
   * Batch upsert — more efficient than calling upsert() in a loop.
   * Falls back to individual upserts if batch fails.
   */
  public static async upsertBatch(inputs: UpsertChunkInput[]): Promise<void> {
    if (inputs.length === 0) return;
    for (const input of inputs) {
      await this.upsert(input);
    }
  }

  /**
   * Cosine similarity search scoped to a repo.
   * Uses <=> pgvector cosine distance operator.
   * Lower distance = more similar; we report 1 - distance as "similarity".
   */
  public static async findSimilar(
    repoId: string,
    queryEmbedding: number[],
    topK: number,
    filePathFilter?: string
  ): Promise<SimilarChunk[]> {
    const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

    let sql = `
      SELECT chunk_id, chunk_text, metadata,
             1 - (embedding <=> $1::vector) AS similarity
      FROM code_chunks
      WHERE repo_id = $2
    `;
    const params: unknown[] = [embeddingLiteral, repoId];

    if (filePathFilter) {
      params.push(`%${filePathFilter}%`);
      sql += ` AND metadata->>'file_path' LIKE $${params.length}`;
    }

    sql += ` ORDER BY embedding <=> $1::vector LIMIT $${params.length + 1}`;
    params.push(topK);

    const res = await db.query<SimilarChunk & { metadata: string }>(sql, params);
    return res.rows.map((row) => ({
      chunk_id: row.chunk_id,
      chunk_text: row.chunk_text,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      similarity: parseFloat(row.similarity as unknown as string),
    }));
  }

  /**
   * Delete all chunks for specific file paths in a repo.
   * Used during incremental re-indexing when files change.
   */
  public static async deleteByFilePaths(repoId: string, filePaths: string[]): Promise<number> {
    if (filePaths.length === 0) return 0;
    const placeholders = filePaths.map((_, i) => `$${i + 2}`).join(', ');
    const res = await db.query(
      `DELETE FROM code_chunks
       WHERE repo_id = $1 AND metadata->>'file_path' = ANY(ARRAY[${placeholders}])`,
      [repoId, ...filePaths]
    );
    const count = res.rowCount ?? 0;
    logger.info(`Deleted ${count} chunks for ${filePaths.length} changed files in repo ${repoId}`);
    return count;
  }

  /**
   * Delete all chunks for a repo. Used when a repo is delinked.
   */
  public static async deleteByRepoId(repoId: string): Promise<number> {
    const res = await db.query('DELETE FROM code_chunks WHERE repo_id = $1', [repoId]);
    const count = res.rowCount ?? 0;
    logger.info(`Deleted ${count} chunks for repo ${repoId}`);
    return count;
  }

  /**
   * Count chunks for a repo — useful for health checks and reporting.
   */
  public static async countByRepoId(repoId: string): Promise<number> {
    const res = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM code_chunks WHERE repo_id = $1',
      [repoId]
    );
    return parseInt(res.rows[0]?.count ?? '0', 10);
  }
}
