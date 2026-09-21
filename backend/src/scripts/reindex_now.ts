import 'dotenv/config';
import { Pool } from 'pg';
import { processIndexJob } from '../jobs/workers/index.worker';

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function indexRepo(row: any) {
  console.log(`\nIndexing: ${row.name} (${row.id})`);
  await processIndexJob({
    repoId: row.id,
    githubRepoId: row.github_repo_id || row.id,
    githubUrl: row.github_url,
    ownerId: row.owner_id,
    defaultBranch: row.default_branch || 'main',
  });
  console.log(`Done: ${row.name}`);
}

async function main() {
  // Reset any stuck 'indexing' repos back to pending so they rerun cleanly
  await p.query("UPDATE repos SET indexed_status = 'pending' WHERE indexed_status = 'indexing'");
  console.log('Reset stuck indexing repos to pending');

  const res = await p.query(
    "SELECT id, name, github_url, github_repo_id, owner_id, default_branch FROM repos WHERE indexed_status = 'pending' ORDER BY created_at ASC"
  );
  console.log(`Found ${res.rows.length} repos to index: ${res.rows.map((r: any) => r.name).join(', ')}`);
  await p.end();

  for (const row of res.rows) {
    await indexRepo(row);
  }

  console.log('\nAll repos indexed successfully');
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
