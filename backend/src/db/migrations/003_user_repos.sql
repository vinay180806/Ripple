-- Migration 003: user_repos junction table
-- Allows multiple users to connect the same repository and share its indexed chunks.

CREATE TABLE IF NOT EXISTS user_repos (
  user_id   UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  repo_id   UUID NOT NULL REFERENCES repos(id)  ON DELETE CASCADE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, repo_id)
);

CREATE INDEX IF NOT EXISTS idx_user_repos_user ON user_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_repos_repo ON user_repos(repo_id);

-- Back-fill existing connections so current users don't lose access to their repos
INSERT INTO user_repos (user_id, repo_id)
SELECT owner_id, id FROM repos
ON CONFLICT DO NOTHING;
