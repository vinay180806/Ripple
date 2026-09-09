-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Code Chunks table: stores function/section chunks with their embeddings
CREATE TABLE IF NOT EXISTS code_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL,
  chunk_id TEXT NOT NULL UNIQUE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB NOT NULL,
  source_commit_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx
  ON code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS code_chunks_metadata_idx
  ON code_chunks USING gin (metadata);

CREATE INDEX IF NOT EXISTS code_chunks_repo_id_idx
  ON code_chunks (repo_id);

ALTER TABLE code_chunks
  ADD COLUMN IF NOT EXISTS text_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;

CREATE INDEX IF NOT EXISTS code_chunks_text_search_idx
  ON code_chunks USING gin (text_search);
