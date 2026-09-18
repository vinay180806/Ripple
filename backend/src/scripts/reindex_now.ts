import 'dotenv/config';
import { Pool } from 'pg';
import { processIndexJob } from '../jobs/workers/index.worker';

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const res = await p.query(
    `SELECT id, name, github_url, github_repo_id, owner_id, default_branch, indexed_status
     FROM repos WHERE name = 'Trident-AI' LIMIT 1`
  );
  if (!res.rows.length) { console.error('Repo not found in DB'); return; }
  const repo = res.rows[0];
  console.log(`Repo: ${repo.name} | status: ${repo.indexed_status} | id: ${repo.id}`);
  await p.end();

  // Run the index job directly with the new code (git clone + fallback chunker)
  console.log('Starting index job directly (with git clone + fallback chunker)...');
  await processIndexJob({
    repoId: repo.id,
    githubRepoId: repo.github_repo_id || repo.id,
    githubUrl: repo.github_url,
    ownerId: repo.owner_id,
    defaultBranch: repo.default_branch || 'main',
  });

  console.log('✅ Index job complete! Check Neon code_chunks table for results.');
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
