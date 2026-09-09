import { GraphResult } from '../clients/trackA.client';
import { RetrievedChunk } from './retrieval.service';

// Approximate token estimate: 4 characters per token (good enough for budgeting)
const CHARS_PER_TOKEN = 4;

// Context window budget for gemini-3.5-flash (leave headroom for system prompt + response)
const MAX_CONTEXT_TOKENS = 100_000;

// Fixed cost for system prompt + graph facts section headers (rough estimate)
const SYSTEM_OVERHEAD_TOKENS = 500;

export interface BuiltPrompt {
  system: string;
  user: string;
  /** How many retrieved chunks were included (may be less than retrieved.length if budget exceeded) */
  chunksIncluded: number;
  estimatedTokens: number;
}

export class PromptBuilderService {
  /**
   * Build the complete Q&A system + user prompt.
   * Inserts graph facts and retrieved chunks within the token budget.
   * Drops whole chunks (never truncates mid-chunk) when budget is exceeded.
   */
  public static buildQAPrompt(
    graph: GraphResult,
    retrievedChunks: RetrievedChunk[],
    question: string
  ): BuiltPrompt {
    const graphFacts = PromptBuilderService.serializeGraphFacts(graph);
    const systemPrompt = PromptBuilderService.buildSystemPrompt();

    // Estimate fixed cost
    const fixedChars = systemPrompt.length + graphFacts.length;
    const fixedTokens = Math.ceil(fixedChars / CHARS_PER_TOKEN) + SYSTEM_OVERHEAD_TOKENS;

    // Budget remaining for chunks
    const budgetTokens = MAX_CONTEXT_TOKENS - fixedTokens;
    let usedTokens = 0;
    let chunksIncluded = 0;
    const includedChunkTexts: string[] = [];

    for (const chunk of retrievedChunks) {
      const chunkLabel = `[${chunk.metadata.file_path}:${chunk.metadata.function_name ?? chunk.metadata.heading_text ?? 'section'}]`;
      const chunkBlock = `${chunkLabel}\n${chunk.chunk_text}`;
      const chunkTokens = Math.ceil(chunkBlock.length / CHARS_PER_TOKEN);

      if (usedTokens + chunkTokens > budgetTokens) {
        // Drop this chunk and all remaining — never partial-chunk
        break;
      }

      includedChunkTexts.push(chunkBlock);
      usedTokens += chunkTokens;
      chunksIncluded++;
    }

    const retrievedContextSection = includedChunkTexts.length > 0
      ? includedChunkTexts.join('\n\n---\n\n')
      : '(No relevant context found for this question.)';

    const userPrompt = [
      'GRAPH FACTS:',
      graphFacts || '(No graph facts available.)',
      '',
      'RETRIEVED CONTEXT:',
      retrievedContextSection,
      '',
      'USER QUESTION:',
      question,
    ].join('\n');

    return {
      system: systemPrompt,
      user: userPrompt,
      chunksIncluded,
      estimatedTokens: fixedTokens + usedTokens,
    };
  }

  /**
   * Build the system prompt that constrains the LLM to only cite injected facts.
   * This is the grounding contract — Phase 5 enforces it post-hoc.
   */
  private static buildSystemPrompt(): string {
    return `You are explaining facts about a codebase to a developer. You must follow these rules strictly:

1. Only state claims that are directly supported by the GRAPH FACTS or RETRIEVED CONTEXT provided below.

2. If the provided context does not contain enough information to answer confidently, respond with exactly:
   "I don't have enough context to answer that confidently"
   Do not guess or infer beyond what is explicitly shown.

3. Every specific claim about a file or function must include a citation in the format [file_path:function_name].
   Example: "The refund is processed in [src/services/payment.ts:processRefund]"

4. Never state that one function calls another unless that relationship appears explicitly in GRAPH FACTS.

5. Do not introduce function names, file paths, or technical claims that do not appear in the context below.`;
  }

  /**
   * Convert Track A's structured graph data into plain-English bullet points.
   * LLMs handle natural-language facts more reliably than raw JSON in prompts.
   */
  public static serializeGraphFacts(graph: GraphResult): string {
    if (!graph || graph.nodes.length === 0) return '';

    // Build caller/callee maps from edges
    const callersOf = new Map<string, string[]>();
    const calleesOf = new Map<string, string[]>();
    const nodeById = new Map<string, { name: string; file: string }>();

    for (const node of graph.nodes) {
      nodeById.set(node.id, { name: node.name, file: node.file });
    }

    for (const edge of graph.edges) {
      if (edge.kind === 'calls') {
        const fromNode = nodeById.get(edge.from);
        const toNode = nodeById.get(edge.to);
        if (!fromNode || !toNode) continue;

        // edge.from calls edge.to
        const calleesOfFrom = calleesOf.get(edge.from) ?? [];
        calleesOfFrom.push(`\`${toNode.name}\` (${toNode.file})`);
        calleesOf.set(edge.from, calleesOfFrom);

        const callersOfTo = callersOf.get(edge.to) ?? [];
        callersOfTo.push(`\`${fromNode.name}\` (${fromNode.file})`);
        callersOf.set(edge.to, callersOfTo);
      }
    }

    const lines: string[] = [];
    for (const [id, node] of nodeById) {
      const callers = callersOf.get(id);
      const callees = calleesOf.get(id);

      if (callers && callers.length > 0) {
        lines.push(`- \`${node.name}\` (${node.file}) is called by: ${callers.join(', ')}`);
      }
      if (callees && callees.length > 0) {
        lines.push(`- \`${node.name}\` (${node.file}) calls: ${callees.join(', ')}`);
      }
    }

    return lines.join('\n');
  }
}
