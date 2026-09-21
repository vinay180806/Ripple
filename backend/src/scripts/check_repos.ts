import 'dotenv/config';
import { Pool } from 'pg';
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const cnt = await p.query("SELECT COUNT(*) as total FROM code_chunks WHERE repo_id = 'da2daff5-d4b0-4c0a-a307-5427098fff37'");
  const readme = await p.query("SELECT DISTINCT metadata->>'file_path' as fp FROM code_chunks WHERE repo_id = 'da2daff5-d4b0-4c0a-a307-5427098fff37' AND metadata->>'file_path' ILIKE '%readme%' LIMIT 5");
  const sample = await p.query("SELECT metadata->>'file_path' as fp, LEFT(chunk_text, 80) as preview FROM code_chunks WHERE repo_id = 'da2daff5-d4b0-4c0a-a307-5427098fff37' LIMIT 5");
  console.log('Trident-AI total chunks:', cnt.rows[0].total);
  console.log('README chunks:', readme.rows);
  console.log('Sample chunks:', sample.rows);
  p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
