/**
 * Gemini API smoke test — runs without Postgres or a real repo.
 * Tests that the API key works and both embedding + generation calls succeed.
 *
 * Usage: npx tsx src/smoke_test.ts
 */
import 'dotenv/config';
import { geminiClient } from './clients/gemini.client';

async function smokeTest() {
  console.log('\n=== Gemini API Smoke Test ===\n');

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set in .env');
    process.exit(1);
  }
  console.log(`✅ GEMINI_API_KEY found (length: ${apiKey.length} chars)`);

  // ── Test 1: Embedding ──────────────────────────────────────────────────────
  console.log('\n[1/3] Testing embedTexts (gemini-embedding-001 @ 768 dims)...');
  const t1 = Date.now();
  try {
    const embeddings = await geminiClient.embedTexts([
      'function processRefund(orderId: string, amount: number) { return gateway.refund(orderId, amount); }',
    ]);
    const dim = embeddings[0].length;
    const latency = Date.now() - t1;
    if (dim !== 768) {
      console.error(`❌ Expected 768 dims but got ${dim} — check output_dimensionality parameter`);
      process.exit(1);
    }
    console.log(`✅ Embedding returned ${dim} dimensions in ${latency}ms`);
    console.log(`   First 5 values: [${embeddings[0].slice(0, 5).map((v) => v.toFixed(4)).join(', ')}]`);
  } catch (err) {
    console.error(`❌ Embedding call failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Test 2: Query embedding (different task type) ─────────────────────────
  console.log('\n[2/3] Testing embedQuery (RETRIEVAL_QUERY task type)...');
  const t2 = Date.now();
  try {
    const queryEmbedding = await geminiClient.embedQuery('How does refund processing work?');
    const latency = Date.now() - t2;
    console.log(`✅ Query embedding returned ${queryEmbedding.length} dimensions in ${latency}ms`);
  } catch (err) {
    console.error(`❌ Query embedding failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Test 3: Text generation ───────────────────────────────────────────────
  console.log('\n[3/3] Testing generateText (gemini-3.5-flash)...');
  const t3 = Date.now();
  try {
    const answer = await geminiClient.generateText(
      'You are a helpful assistant. Answer in one sentence.',
      'What does the pgvector extension do in PostgreSQL?'
    );
    const latency = Date.now() - t3;
    console.log(`✅ Generation responded in ${latency}ms:`);
    console.log(`   "${answer.trim()}"`);
  } catch (err) {
    console.error(`❌ Text generation failed: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log('\n=== All checks passed — Gemini API is working ✅ ===\n');
  console.log('Next steps:');
  console.log('  1. Run `npm run migrate` to create the code_chunks table (needs Postgres + pgvector)');
  console.log('  2. Connect a repo via the UI to trigger indexing');
  console.log('  3. Run `npx tsx src/evaluation/run_eval.ts` after filling in eval_dataset.json\n');
}

smokeTest().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
