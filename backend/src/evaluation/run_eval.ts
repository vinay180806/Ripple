/**
 * Track B — Evaluation Script (Phase 8)
 *
 * Usage:
 *   npx tsx src/evaluation/run_eval.ts
 *
 * Prerequisites:
 *   - GEMINI_API_KEY set in .env
 *   - repo_id and pinned_commit_hash filled in eval_dataset.json
 *   - The repo must already be indexed (run triggerEmbedding first)
 *
 * Outputs:
 *   - Per-question: retrieval hit/miss, answer, latency, token cost estimate
 *   - Summary: Precision@5, Recall@5, faithfulness pass rate, total cost
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { RetrievalService } from '../services/retrieval.service';
import { LocalTrackBClient } from '../clients/localTrackB.client';

interface EvalQuestion {
  id: string;
  type: string;
  question: string;
  expected_chunk_ids: string[];
  expected_answer_contains: string[];
  notes: string;
}

interface EvalDataset {
  pinned_commit_hash: string;
  repo_id: string;
  questions: EvalQuestion[];
}

const TOP_K = 5;
// Gemini API approximate cost per 1M tokens (check current published rate)
const COST_PER_MILLION_INPUT_TOKENS = 0.30; // USD, gemini-3.5-flash input estimate
const COST_PER_MILLION_OUTPUT_TOKENS = 2.50; // USD, gemini-3.5-flash output estimate
const CHARS_PER_TOKEN = 4;

function estimateCost(inputChars: number, outputChars: number): number {
  const inputTokens = inputChars / CHARS_PER_TOKEN;
  const outputTokens = outputChars / CHARS_PER_TOKEN;
  return (inputTokens / 1_000_000) * COST_PER_MILLION_INPUT_TOKENS
    + (outputTokens / 1_000_000) * COST_PER_MILLION_OUTPUT_TOKENS;
}

async function runEval() {
  const datasetPath = path.resolve(__dirname, 'eval_dataset.json');
  const dataset: EvalDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  if (dataset.pinned_commit_hash === 'REPLACE_WITH_ACTUAL_COMMIT_SHA') {
    console.error('❌ Fill in pinned_commit_hash in eval_dataset.json before running evaluation');
    process.exit(1);
  }
  if (dataset.repo_id === 'REPLACE_WITH_ACTUAL_REPO_UUID') {
    console.error('❌ Fill in repo_id in eval_dataset.json before running evaluation');
    process.exit(1);
  }

  const client = new LocalTrackBClient();
  const { repo_id, questions } = dataset;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Track B Evaluation — ${questions.length} questions against repo ${repo_id}`);
  console.log(`Pinned commit: ${dataset.pinned_commit_hash}`);
  console.log(`${'='.repeat(70)}\n`);

  let retrievalHits = 0;
  let retrievalTotal = 0;
  let faithfulnessPasses = 0;
  let totalCostUSD = 0;
  let totalLatencyMs = 0;

  const results: Array<{
    id: string;
    type: string;
    question: string;
    retrievalHit: boolean;
    faithfulnessPass: boolean | 'manual_review';
    latencyMs: number;
    estimatedCostUSD: number;
    answer: string;
    topChunkIds: string[];
  }> = [];

  for (const q of questions) {
    console.log(`\n[${q.id}] ${q.type.toUpperCase()}`);
    console.log(`Q: ${q.question}`);

    const startTime = Date.now();

    // Step 1: Run retrieval and check if expected chunks are in top-K
    let topChunkIds: string[] = [];
    let retrievalHit = false;

    try {
      const retrieved = await RetrievalService.retrieve(repo_id, q.question, TOP_K);
      topChunkIds = retrieved.map((c) => c.chunk_id);

      if (q.expected_chunk_ids.length > 0) {
        retrievalHit = q.expected_chunk_ids.some((id) => topChunkIds.includes(id));
        retrievalTotal++;
        if (retrievalHit) retrievalHits++;
      } else {
        // No expected chunk IDs set yet — mark as pending
        retrievalHit = false;
      }
    } catch (err) {
      console.error(`  Retrieval failed: ${(err as Error).message}`);
    }

    // Step 2: Run full Q&A pipeline
    let answer = '';
    let inputChars = q.question.length;
    let outputChars = 0;

    try {
      const result = await client.qa(repo_id, q.question, dataset.pinned_commit_hash);
      answer = result.answer;
      outputChars = answer.length;
      inputChars += answer.length * 4; // rough estimate of context sent
    } catch (err) {
      answer = `ERROR: ${(err as Error).message}`;
    }

    const latencyMs = Date.now() - startTime;
    totalLatencyMs += latencyMs;

    // Step 3: Check faithfulness (automated: check expected_answer_contains)
    let faithfulnessPass: boolean | 'manual_review' = 'manual_review';
    if (q.expected_answer_contains.length > 0) {
      const answerLower = answer.toLowerCase();
      faithfulnessPass = q.expected_answer_contains.every((term) =>
        answerLower.includes(term.toLowerCase())
      );
      if (faithfulnessPass) faithfulnessPasses++;
    }

    const costUSD = estimateCost(inputChars, outputChars);
    totalCostUSD += costUSD;

    results.push({
      id: q.id,
      type: q.type,
      question: q.question,
      retrievalHit,
      faithfulnessPass,
      latencyMs,
      estimatedCostUSD: costUSD,
      answer,
      topChunkIds,
    });

    // Print result
    console.log(`  Retrieval hit: ${retrievalHit ? '✅' : (q.expected_chunk_ids.length === 0 ? '⬜ (no expected IDs set)' : '❌')}`);
    console.log(`  Faithfulness: ${faithfulnessPass === true ? '✅' : faithfulnessPass === false ? '❌' : '⬜ manual review'}`);
    console.log(`  Latency: ${latencyMs}ms | Cost: \$${costUSD.toFixed(6)}`);
    console.log(`  Answer: ${answer.substring(0, 200)}${answer.length > 200 ? '...' : ''}`);
    if (topChunkIds.length > 0) {
      console.log(`  Top chunks: ${topChunkIds.slice(0, 3).join(', ')}${topChunkIds.length > 3 ? '...' : ''}`);
    }
  }

  // Summary
  const answerable = results.filter((r) => r.type !== 'unanswerable');
  const unanswerable = results.filter((r) => r.type === 'unanswerable');
  const faithfulPasses = results.filter((r) => r.faithfulnessPass === true).length;

  console.log(`\n${'='.repeat(70)}`);
  console.log('EVALUATION SUMMARY');
  console.log(`${'='.repeat(70)}`);
  console.log(`Total questions:         ${questions.length}`);
  console.log(`Answerable questions:    ${answerable.length}`);
  console.log(`Unanswerable questions:  ${unanswerable.length}`);
  console.log('');
  if (retrievalTotal > 0) {
    console.log(`Precision@${TOP_K}:           ${retrievalHits}/${retrievalTotal} = ${(retrievalHits / retrievalTotal * 100).toFixed(1)}%`);
  } else {
    console.log(`Precision@${TOP_K}:           ⬜ Fill in expected_chunk_ids to measure`);
  }
  console.log(`Faithfulness:            ${faithfulPasses}/${questions.length} = ${(faithfulPasses / questions.length * 100).toFixed(1)}%`);
  console.log(`Avg latency:             ${Math.round(totalLatencyMs / questions.length)}ms`);
  console.log(`Total estimated cost:    \$${totalCostUSD.toFixed(4)}`);
  console.log(`Cost per query (avg):    \$${(totalCostUSD / questions.length).toFixed(6)}`);
  console.log(`${'='.repeat(70)}\n`);

  // Save results to file for review
  const outputPath = path.resolve(__dirname, 'eval_results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ summary: { retrievalHits, retrievalTotal, faithfulPasses, totalQuestions: questions.length, totalCostUSD, avgLatencyMs: Math.round(totalLatencyMs / questions.length) }, results }, null, 2));
  console.log(`Full results saved to: ${outputPath}`);
}

runEval().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
