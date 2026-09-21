import 'dotenv/config';
import { Pool } from 'pg';
import { processIndexJob } from '../jobs/workers/index.worker';

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Get all repos or a specific one
  const repoName = process.argv[2]; // optional: pass repo name as arg
  const query = repoName
    ? 'SELECT id, name, github_url, github_repo_id, owner_id, default_branch FROM repos WHERE name = $1'
    : 'SELECT id, name, github_url, github_repo_id, owner_id, default_branch FROM repos';
  const res = await p.query(query, repoName ? [repoName] : []);

  if (!res.rows.length) { console.error('No repos found'); await p.end(); return; }

  for (const repo of res.rows) {
    console.log(`\nCleaning chunks for: ${repo.name}`);
    const del = await p.query('DELETE FROM code_chunks WHERE repo_id = $1', [repo.id]);
    console.log(`Deleted ${del.rowCount} old chunks`);

    await p.query("UPDATE repos SET indexed_status = 'pending' WHERE id = $1", [repo.id]);
  }

  await p.end();

  // Re-index each repo fresh
  for (const repo of res.rows) {
    console.log(`\nIndexing: ${repo.name} (${repo.id})`);
    await processIndexJob({
      repoId: repo.id,
      githubRepoId: repo.github_repo_id || repo.id,
      githubUrl: repo.github_url,
      ownerId: repo.owner_id,
      defaultBranch: repo.default_branch || 'main',
    });
    console.log(`Done: ${repo.name}`);
  }

  console.log('\nAll done!');
}

main().catch((err) => { console.error('FAILED:', err.message, err.stack); process.exit(1); });
