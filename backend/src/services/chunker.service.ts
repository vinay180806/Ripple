import fs from 'fs';
import path from 'path';
import { GraphResult } from '../clients/trackA.client';
import { logger } from '../utils/logger';

export interface ChunkRecord {
  chunk_id: string;
  text: string;
  metadata: {
    file_path: string;
    function_name?: string;
    is_exported?: boolean;
    caller_count: number;
    callee_count: number;
    language: string;
    source_commit_hash: string;
    parent_chunk_id?: string;
    heading_text?: string;
    heading_level?: number;
    section_order?: number;
    parent_headings?: string[];
  };
}

interface FunctionNode {
  id: string;
  name: string;
  kind: string;
  file: string;
  start_line?: number;
  end_line?: number;
  jsdoc?: string;
  is_exported?: boolean;
  signature?: string;
}

// Functions longer than this get sub-chunked
const OVERSIZED_LINE_THRESHOLD = 200;

// Nested functions shorter than this stay embedded in parent chunk
const NESTED_MIN_LINES = 5;

// Minification guards
const MAX_AVG_LINE_LENGTH = 200;
const MAX_SUSPICIOUS_FUNCTION_LINES = 2000;

// Markdown heading chunk granularity (chunk at H2 level)
const CHUNK_HEADING_LEVEL = 2;

export class ChunkerService {
  /**
   * Main entry point: given a Track A graph and the repo workspace path,
   * produce all chunks (code + markdown) ready for embedding.
   */
  public static async chunkRepo(
    repoId: string,
    graph: GraphResult,
    workspacePath: string,
    commitHash: string
  ): Promise<ChunkRecord[]> {
    const chunks: ChunkRecord[] = [];

    // Build caller/callee count maps from graph edges
    const callerCounts = new Map<string, number>();
    const calleeCounts = new Map<string, number>();
    for (const edge of graph.edges) {
      if (edge.kind === 'calls') {
        calleeCounts.set(edge.from, (calleeCounts.get(edge.from) ?? 0) + 1);
        callerCounts.set(edge.to, (callerCounts.get(edge.to) ?? 0) + 1);
      }
    }

    // Group nodes by file for efficient file reading
    const nodesByFile = new Map<string, FunctionNode[]>();
    for (const node of graph.nodes as FunctionNode[]) {
      if (!node.file) continue;
      const existing = nodesByFile.get(node.file) ?? [];
      existing.push(node);
      nodesByFile.set(node.file, existing);
    }

    for (const [filePath, nodes] of nodesByFile) {
      const fullPath = path.join(workspacePath, filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Markdown files get heading-based chunking
      if (ext === '.md' || ext === '.mdx') {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const mdChunks = ChunkerService.chunkMarkdown(
            repoId, filePath, content, commitHash
          );
          chunks.push(...mdChunks);
        } catch (err) {
          logger.warn(`[Chunker] Could not read markdown file: ${filePath}`, {}, err as Error);
        }
        continue;
      }

      // Code files: chunk by function node
      let fileLines: string[] | null = null;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        fileLines = content.split('\n');
      } catch {
        logger.warn(`[Chunker] Could not read code file: ${filePath}`);
        continue;
      }

      for (const node of nodes) {
        if (node.kind !== 'function' && node.kind !== 'variable') continue;

        const startLine = node.start_line;
        const endLine = node.end_line;

        if (startLine === undefined || endLine === undefined) {
          // Node has no line info — skip (can't extract meaningful chunk)
          continue;
        }

        const lineCount = endLine - startLine + 1;

        // Guard: skip minified/generated files
        const excerpt = fileLines.slice(startLine - 1, Math.min(startLine + 9, fileLines.length));
        const avgLen = excerpt.reduce((s, l) => s + l.length, 0) / Math.max(excerpt.length, 1);
        if (lineCount > MAX_SUSPICIOUS_FUNCTION_LINES || avgLen > MAX_AVG_LINE_LENGTH) {
          logger.warn(`[Chunker] Skipping suspicious/minified chunk: ${filePath}:${node.name} (${lineCount} lines, avgLen ${Math.round(avgLen)})`);
          continue;
        }

        const callerCount = callerCounts.get(node.id) ?? 0;
        const calleeCount = calleeCounts.get(node.id) ?? 0;

        if (lineCount > OVERSIZED_LINE_THRESHOLD) {
          // Split oversized function into sub-chunks
          const subChunks = ChunkerService.splitOversized(
            repoId, filePath, node, fileLines, callerCount, calleeCount, commitHash
          );
          chunks.push(...subChunks);
        } else {
          // Normal single chunk
          const rawLines = fileLines.slice(startLine - 1, endLine);
          let text = rawLines.join('\n');

          // Prepend JSDoc if it exists and wasn't already in the line range
          if (node.jsdoc && !text.includes(node.jsdoc.trim().substring(0, 20))) {
            text = node.jsdoc + '\n' + text;
          }

          const chunkId = `${repoId}:${filePath}:${node.name}:${startLine}`;
          chunks.push({
            chunk_id: chunkId,
            text,
            metadata: {
              file_path: filePath,
              function_name: node.name,
              is_exported: node.is_exported ?? false,
              caller_count: callerCount,
              callee_count: calleeCount,
              language: ChunkerService.detectLanguage(ext),
              source_commit_hash: commitHash,
            },
          });
        }
      }
    }

    // Verify uniqueness (defensive check — should always pass given our chunk_id scheme)
    const ids = chunks.map((c) => c.chunk_id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      logger.warn(`[Chunker] Duplicate chunk_ids detected! ${ids.length - uniqueIds.size} duplicates`);
    }

    logger.info(`[Chunker] Produced ${chunks.length} chunks for repo ${repoId}`);
    return chunks;
  }

  /**
   * Split an oversized function into sub-chunks at block boundaries.
   * Every sub-chunk gets the function signature prepended so it's meaningful in isolation.
   */
  private static splitOversized(
    repoId: string,
    filePath: string,
    node: FunctionNode,
    fileLines: string[],
    callerCount: number,
    calleeCount: number,
    commitHash: string
  ): ChunkRecord[] {
    const startLine = node.start_line!;
    const endLine = node.end_line!;
    const lines = fileLines.slice(startLine - 1, endLine);
    const signature = node.signature ?? lines[0] ?? `function ${node.name}`;
    const parentChunkId = `${repoId}:${filePath}:${node.name}:${startLine}`;

    // Find block boundary lines (if, for, switch, else, try, catch, })
    const blockBoundaryRe = /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|else\s*\{|else\s+if|try\s*\{|catch\s*\(|\/\/\s*---)/;
    const boundaries: number[] = [0];
    for (let i = 1; i < lines.length; i++) {
      if (blockBoundaryRe.test(lines[i])) {
        boundaries.push(i);
      }
    }
    boundaries.push(lines.length);

    // Merge adjacent boundaries to avoid tiny sub-chunks (target ~80 lines each)
    const TARGET_SUB_CHUNK = 80;
    const merged: Array<[number, number]> = [];
    let segStart = 0;
    for (let i = 1; i < boundaries.length; i++) {
      if (boundaries[i] - segStart >= TARGET_SUB_CHUNK || i === boundaries.length - 1) {
        merged.push([segStart, boundaries[i]]);
        segStart = boundaries[i];
      }
    }
    if (merged.length === 0) merged.push([0, lines.length]);

    return merged.map(([from, to], idx) => {
      const subLines = lines.slice(from, to);
      const text = `${signature}\n// ... sub-chunk ${idx + 1} of ${merged.length} ...\n${subLines.join('\n')}`;
      return {
        chunk_id: `${parentChunkId}:sub${idx}`,
        text,
        metadata: {
          file_path: filePath,
          function_name: node.name,
          is_exported: node.is_exported ?? false,
          caller_count: callerCount,
          callee_count: calleeCount,
          language: ChunkerService.detectLanguage(path.extname(filePath).toLowerCase()),
          source_commit_hash: commitHash,
          parent_chunk_id: parentChunkId,
        },
      };
    });
  }

  /**
   * Chunk a markdown file by H2 headings.
   * Carries forward parent headings (H1) as context in metadata.
   */
  public static chunkMarkdown(
    repoId: string,
    filePath: string,
    content: string,
    commitHash: string
  ): ChunkRecord[] {
    const lines = content.split('\n');
    const chunks: ChunkRecord[] = [];
    let currentH1 = '';
    let currentHeading = '';
    let currentLevel = 0;
    let sectionLines: string[] = [];
    let sectionOrder = 0;

    const flush = () => {
      const text = sectionLines.join('\n').trim();
      if (!text) return;
      const chunkId = `${repoId}:${filePath}:${currentHeading || 'intro'}:${sectionOrder}`;
      const parentHeadings = currentH1 ? [currentH1] : [];
      chunks.push({
        chunk_id: chunkId,
        text,
        metadata: {
          file_path: filePath,
          heading_text: currentHeading || '(intro)',
          heading_level: currentLevel || 1,
          section_order: sectionOrder,
          parent_headings: parentHeadings,
          language: 'markdown',
          source_commit_hash: commitHash,
          caller_count: 0,
          callee_count: 0,
        },
      });
      sectionOrder++;
    };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();

        if (level === 1) {
          flush();
          currentH1 = text;
          currentHeading = text;
          currentLevel = level;
          sectionLines = [line];
        } else if (level <= CHUNK_HEADING_LEVEL) {
          flush();
          currentHeading = text;
          currentLevel = level;
          sectionLines = [line];
        } else {
          // H3+ stays embedded in the current H2 section
          sectionLines.push(line);
        }
      } else {
        sectionLines.push(line);
      }
    }
    flush();
    return chunks;
  }

  private static detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.rs': 'rust',
      '.md': 'markdown',
      '.mdx': 'markdown',
    };
    return map[ext] ?? 'unknown';
  }
}
