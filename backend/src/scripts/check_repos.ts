import 'dotenv/config';
import { Pool } from 'pg';

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const repos = await p.query("SELECT id, name, indexed_status FROM repos ORDER BY created_at DESC");
  for (const repo of repos.rows) {
    const cnt = await p.query("SELECT COUNT(*) as total FROM code_chunks WHERE repo_id = $1", [repo.id]);
    console.log(`${repo.name} | status: ${repo.indexed_status} | chunks: ${cnt.rows[0].total}`);
  }
  p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
