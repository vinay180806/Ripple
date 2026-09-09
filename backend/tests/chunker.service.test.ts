import { ChunkerService } from '../src/services/chunker.service';
import { GraphResult } from '../src/clients/trackA.client';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Helper: create a temp workspace with a given file
function makeTempWorkspace(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ripple-chunker-test-'));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
  return dir;
}

// Cast extended node objects to GraphResult nodes (the chunker reads extra fields at runtime)
type TestNode = {
  id: string;
  name: string;
  kind: string;
  file: string;
  start_line?: number;
  end_line?: number;
  jsdoc?: string;
  is_exported?: boolean;
  signature?: string;
};

function makeGraph(nodes: TestNode[] = [], edges: GraphResult['edges'] = []): GraphResult {
  return {
    repoId: 'repo1',
    nodes: nodes as unknown as GraphResult['nodes'],
    edges,
  };
}

describe('ChunkerService', () => {
  const REPO_ID = 'test-repo';
  const COMMIT = 'abc123';

  // ──────────────────────────────────────────────────────────────────────────
  // Basic function extraction
  // ──────────────────────────────────────────────────────────────────────────
  test('extracts function text from correct line range', async () => {
    const content = [
      'import x from "y";',
      '',
      'function hello() {',
      '  return "world";',
      '}',
    ].join('\n');

    const workspace = makeTempWorkspace({ 'src/hello.ts': content });
    const graph = makeGraph([{
      id: 'fn1', name: 'hello', kind: 'function', file: 'src/hello.ts',
      start_line: 3, end_line: 5,
    }]);

    const chunks = await ChunkerService.chunkRepo(REPO_ID, graph, workspace, COMMIT);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunk_id).toBe(`${REPO_ID}:src/hello.ts:hello:3`);
    expect(chunks[0].text).toContain('function hello()');
    expect(chunks[0].text).toContain('return "world"');
    expect(chunks[0].metadata.function_name).toBe('hello');
    expect(chunks[0].metadata.source_commit_hash).toBe(COMMIT);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JSDoc prepending
  // ──────────────────────────────────────────────────────────────────────────
  test('prepends JSDoc when it is not already in the line range', async () => {
    const content = [
      '/** Does the thing */',
      'function doThing() {',
      '  return 42;',
      '}',
    ].join('\n');

    const workspace = makeTempWorkspace({ 'src/thing.ts': content });
    const graph = makeGraph([{
      id: 'fn1', name: 'doThing', kind: 'function', file: 'src/thing.ts',
      start_line: 2, end_line: 4, jsdoc: '/** Does the thing */',
    }]);

    const chunks = await ChunkerService.chunkRepo(REPO_ID, graph, workspace, COMMIT);
    expect(chunks[0].text).toContain('/** Does the thing */');
    expect(chunks[0].text).toContain('function doThing()');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Oversized function sub-chunking
  // ──────────────────────────────────────────────────────────────────────────
  test('sub-chunks an oversized function and prepends signature to each sub-chunk', async () => {
    const lines: string[] = ['function bigFn() {'];
    for (let i = 0; i < 100; i++) {
      lines.push(`  if (condition${i}) {`);
      lines.push(`    doWork(${i});`);
      lines.push('  }');
    }
    lines.push('}');
    const content = lines.join('\n');

    const workspace = makeTempWorkspace({ 'src/big.ts': content });
    const graph = makeGraph([{
      id: 'fn1', name: 'bigFn', kind: 'function', file: 'src/big.ts',
      start_line: 1, end_line: lines.length, signature: 'function bigFn()',
    }]);

    const chunks = await ChunkerService.chunkRepo(REPO_ID, graph, workspace, COMMIT);

    // Should produce multiple sub-chunks
    expect(chunks.length).toBeGreaterThan(1);

    // Every sub-chunk must contain the function signature
    for (const chunk of chunks) {
      expect(chunk.text).toContain('function bigFn()');
    }

    // All sub-chunks share the same parent_chunk_id
    const parentId = `${REPO_ID}:src/big.ts:bigFn:1`;
    for (const chunk of chunks) {
      expect(chunk.metadata.parent_chunk_id).toBe(parentId);
    }

    // Sub-chunk IDs must be unique
    const ids = chunks.map((c) => c.chunk_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Chunk ID uniqueness across a mock repo
  // ──────────────────────────────────────────────────────────────────────────
  test('chunk_ids are unique across multiple functions in different files', async () => {
    const workspace = makeTempWorkspace({
      'src/a.ts': 'function alpha() { return 1; }\nfunction beta() { return 2; }',
      'src/b.ts': 'function alpha() { return 3; }', // same name, different file
    });
    const graph = makeGraph([
      { id: 'a1', name: 'alpha', kind: 'function', file: 'src/a.ts', start_line: 1, end_line: 1 },
      { id: 'a2', name: 'beta',  kind: 'function', file: 'src/a.ts', start_line: 2, end_line: 2 },
      { id: 'b1', name: 'alpha', kind: 'function', file: 'src/b.ts', start_line: 1, end_line: 1 },
    ]);

    const chunks = await ChunkerService.chunkRepo(REPO_ID, graph, workspace, COMMIT);
    const ids = chunks.map((c) => c.chunk_id);
    expect(new Set(ids).size).toBe(ids.length);

    const aAlpha = chunks.find((c) => c.chunk_id.includes('src/a.ts:alpha'));
    const bAlpha = chunks.find((c) => c.chunk_id.includes('src/b.ts:alpha'));
    expect(aAlpha).toBeDefined();
    expect(bAlpha).toBeDefined();
    expect(aAlpha!.chunk_id).not.toBe(bAlpha!.chunk_id);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Minified file guard
  // ──────────────────────────────────────────────────────────────────────────
  test('skips functions that look minified (very long avg line length)', async () => {
    const longLine = 'x'.repeat(500);
    const content = `function minified(){${longLine};${longLine};${longLine};}`;
    const workspace = makeTempWorkspace({ 'dist/bundle.js': content });
    const graph = makeGraph([{
      id: 'fn1', name: 'minified', kind: 'function', file: 'dist/bundle.js',
      start_line: 1, end_line: 1,
    }]);

    const chunks = await ChunkerService.chunkRepo(REPO_ID, graph, workspace, COMMIT);
    // Minified chunk should be skipped
    expect(chunks).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Markdown chunking
  // ──────────────────────────────────────────────────────────────────────────
  test('chunks markdown by H2 headings and carries forward H1 as parent', () => {
    const content = [
      '# Payments',
      '',
      'Overview text.',
      '',
      '## Processing',
      '',
      'How payments are processed.',
      '',
      '## Refunds',
      '',
      'How refunds work.',
    ].join('\n');

    const chunks = ChunkerService.chunkMarkdown(REPO_ID, 'docs/payments.md', content, COMMIT);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const refundChunk = chunks.find((c) => c.metadata.heading_text === 'Refunds');
    expect(refundChunk).toBeDefined();
    expect(refundChunk!.metadata.parent_headings).toContain('Payments');
  });
});
