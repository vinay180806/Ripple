import { GroundingCheckService } from '../src/services/groundingCheck.service';
import { GraphResult } from '../src/clients/trackA.client';
import { RetrievedChunk } from '../src/services/retrieval.service';

function makeGraph(nodes: GraphResult['nodes'] = [], edges: GraphResult['edges'] = []): GraphResult {
  return { repoId: 'repo1', nodes, edges };
}

function makeChunk(filePath: string, fnName: string, text = ''): RetrievedChunk {
  return {
    chunk_id: `repo1:${filePath}:${fnName}:1`,
    chunk_text: text || `function ${fnName}() {}`,
    metadata: {
      file_path: filePath,
      function_name: fnName,
      caller_count: 0,
      callee_count: 0,
      language: 'typescript',
      source_commit_hash: 'abc123',
    },
    similarity: 0.9,
  };
}

describe('GroundingCheckService', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Clean response — all citations valid
  // ──────────────────────────────────────────────────────────────────────────
  test('returns isGrounded=true when all citations are in the whitelist', () => {
    const graph = makeGraph([
      { id: 'fn1', name: 'processRefund', kind: 'function', file: 'src/payment.ts' },
    ]);
    const chunks = [makeChunk('src/payment.ts', 'processRefund')];
    const response = 'Refunds are handled by [src/payment.ts:processRefund] which validates the order.';

    const result = GroundingCheckService.validate(response, graph, chunks);
    expect(result.isGrounded).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Unknown citation — both file and function not in whitelist
  // ──────────────────────────────────────────────────────────────────────────
  test('flags a citation where both file and function are unknown', () => {
    const graph = makeGraph();
    const chunks: RetrievedChunk[] = [];
    const response = 'This calls [src/unknown.ts:fantasyFunction] to do the magic.';

    const result = GroundingCheckService.validate(response, graph, chunks);
    expect(result.isGrounded).toBe(false);
    expect(result.warnings.some((w: string) => w.includes('fantasyFunction'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Bare camelCase identifier ≥8 chars not in whitelist → warning
  // ──────────────────────────────────────────────────────────────────────────
  test('flags bare camelCase identifier (≥8 chars) not in context', () => {
    const graph = makeGraph();
    const chunks: RetrievedChunk[] = [];
    // "handleRefundRequest" is camelCase, ≥8 chars, not in whitelist
    const response = 'The system calls handleRefundRequest to initiate the process.';

    const result = GroundingCheckService.validate(response, graph, chunks);
    expect(result.isGrounded).toBe(false);
    expect(result.warnings.some((w: string) => w.includes('handleRefundRequest'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Short common identifier → NO false positive
  // ──────────────────────────────────────────────────────────────────────────
  test('does NOT flag short common words like "get" or "set"', () => {
    const graph = makeGraph();
    const chunks: RetrievedChunk[] = [];
    const response = 'You can get the value or set it via the API.';

    const result = GroundingCheckService.validate(response, graph, chunks);
    const shortWordWarnings = result.warnings.filter(
      (w: string) => w.includes('"get"') || w.includes('"set"')
    );
    expect(shortWordWarnings).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "I don't have enough context" → treated as grounded
  // ──────────────────────────────────────────────────────────────────────────
  test('treats "I don\'t have enough context" response as grounded', () => {
    const graph = makeGraph();
    const chunks: RetrievedChunk[] = [];
    const response = "I don't have enough context to answer that confidently.";

    const result = GroundingCheckService.validate(response, graph, chunks);
    expect(result.isGrounded).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Bare symbol IS in whitelist → no warning
  // ──────────────────────────────────────────────────────────────────────────
  test('does NOT flag a bare symbol that appears in the whitelist', () => {
    const graph = makeGraph([
      { id: 'fn1', name: 'processRefundNow', kind: 'function', file: 'src/payment.ts' },
    ]);
    const chunks = [makeChunk('src/payment.ts', 'processRefundNow')];
    const response = 'The pipeline calls processRefundNow to complete the operation.';

    const result = GroundingCheckService.validate(response, graph, chunks);
    const bareWarnings = result.warnings.filter((w: string) => w.includes('processRefundNow'));
    expect(bareWarnings).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Warning badge formatting
  // ──────────────────────────────────────────────────────────────────────────
  test('formatWarningBadge produces a visible badge with all warnings listed', () => {
    const warnings = ['Citation [a.ts:foo] not found', 'Bare symbol "barBazQux" not found'];
    const badge = GroundingCheckService.formatWarningBadge(warnings);
    expect(badge).toContain('⚠️');
    expect(badge).toContain('a.ts:foo');
    expect(badge).toContain('barBazQux');
  });
});
