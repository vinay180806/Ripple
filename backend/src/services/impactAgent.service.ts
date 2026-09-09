import { geminiClient } from '../clients/gemini.client';
import { trackAService } from './trackA.service';
import { RetrievalService } from './retrieval.service';
import { logger } from '../utils/logger';

// V1 tool surface — get_commit_history deferred to V2
const V1_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_blast_radius',
        description:
          'Returns all functions that directly or transitively call the given function, using verified static analysis from Track A.',
        parameters: {
          type: 'object',
          properties: {
            symbol_id: {
              type: 'string',
              description: 'The unique identifier (id field) of the function to analyze',
            },
            depth: {
              type: 'integer',
              description: 'How many levels of transitive callers to include (default: 3)',
            },
          },
          required: ['symbol_id'],
        },
      },
      {
        name: 'retrieve_context',
        description:
          'Retrieves relevant code chunks for a given query string using semantic search.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant code',
            },
            top_k: {
              type: 'integer',
              description: 'How many chunks to retrieve (default: 5)',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];

export interface DependencyFact {
  symbol: string;
  file: string;
  callers: string[];
  callees?: string[];
  riskLevel?: string;
}

export interface EvidenceEntry {
  tool_name: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface ImpactAgentResult {
  dependency_facts: DependencyFact[];
  explanation: string;
  evidence_log: EvidenceEntry[];
  warnings: string[];
}

const MAX_TOOL_CALLS = 5;

export class ImpactAgentService {
  /**
   * Run the diff-based impact analysis agent loop.
   *
   * Process:
   * 1. Map changed files → symbol IDs using the graph
   * 2. Agent loop (max 5 tool calls): LLM requests tools, we execute them
   * 3. Return structured impact report with dependency facts + LLM explanation
   */
  public static async analyze(
    repoId: string,
    diffRef: string,
    changedFiles: string[]
  ): Promise<ImpactAgentResult> {
    const warnings: string[] = [];
    const evidence: EvidenceEntry[] = [];

    // Step 1: Get graph and map changed files to symbol IDs
    let graph;
    let knownSymbolIds: Set<string>;
    try {
      graph = await trackAService.getGraph(repoId);
      knownSymbolIds = new Set(graph.nodes.map((n) => n.id));
    } catch (err) {
      logger.error(`[ImpactAgent] Failed to get graph for repo ${repoId}`, {}, err as Error);
      warnings.push('Could not retrieve repository graph — blast radius analysis unavailable');
      graph = { repoId, nodes: [], edges: [] };
      knownSymbolIds = new Set();
    }

    // Map changed file paths to affected symbol IDs
    const changedFileSet = new Set(changedFiles);
    const affectedSymbols = graph.nodes.filter((n) => changedFileSet.has(n.file));
    const dependencyFacts: DependencyFact[] = [];

    // Initial evidence: what files changed and what symbols they contain
    const initialSummary = [
      `Diff reference: ${diffRef}`,
      `Changed files (${changedFiles.length}): ${changedFiles.join(', ')}`,
      `Affected symbols (${affectedSymbols.length}): ${affectedSymbols.map((s) => `${s.name} (${s.file})`).join(', ')}`,
    ].join('\n');

    const systemPrompt = `You are analyzing the impact of a code change. Your job is to:
1. Use the available tools to gather blast radius and relevant context for each changed symbol
2. Identify which parts of the codebase are at risk due to these changes
3. Produce a concise impact report explaining what changed and what might break

Rules:
- Use get_blast_radius for each significantly changed function to find its callers
- Use retrieve_context if you need more information about how something works
- Only make claims supported by tool results — do not guess
- If a tool returns an error, note the limitation explicitly in your report
- Do NOT call more than ${MAX_TOOL_CALLS} tools total`;

    // Conversation history for the agent loop
    const history: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
    }> = [
      {
        role: 'user',
        parts: [{ text: initialSummary + '\n\nPlease analyze the impact of these changes.' }],
      },
    ];

    // Agent loop
    let toolCallCount = 0;
    let finalText: string | undefined;

    while (toolCallCount < MAX_TOOL_CALLS) {
      let response: { text?: string; toolCall?: { name: string; args: Record<string, unknown> } };

      try {
        response = await geminiClient.generateWithTools(systemPrompt, history, V1_TOOLS);
      } catch (err) {
        logger.error('[ImpactAgent] LLM call failed', {}, err as Error);
        warnings.push('LLM generation failed during agent loop');
        break;
      }

      if (response.text) {
        finalText = response.text;
        break;
      }

      if (!response.toolCall) {
        break;
      }

      const { name: toolName, args } = response.toolCall;
      toolCallCount++;

      logger.info(`[ImpactAgent] Tool call ${toolCallCount}/${MAX_TOOL_CALLS}: ${toolName}(${JSON.stringify(args)})`);

      // Add the model's tool call to history
      history.push({ role: 'model', parts: [{ functionCall: { name: toolName, args } }] });

      // Execute the tool
      let toolResult: unknown;
      try {
        toolResult = await ImpactAgentService.executeTool(
          toolName, args, repoId, knownSymbolIds, dependencyFacts, warnings
        );
      } catch (err) {
        toolResult = { error: 'tool_execution_failed', message: (err as Error).message };
        warnings.push(`Tool ${toolName} failed: ${(err as Error).message}`);
      }

      evidence.push({ tool_name: toolName, input: args, output: toolResult });

      // Feed result back to the model
      history.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: toolName,
            response: { result: toolResult },
          },
        }],
      });

      // If we've hit the max, force a final answer on the next iteration
      if (toolCallCount >= MAX_TOOL_CALLS) {
        history.push({
          role: 'user',
          parts: [{
            text: 'You have used the maximum number of tool calls. Please produce your final impact report now based on the evidence gathered so far.',
          }],
        });

        try {
          const forced = await geminiClient.generateWithTools(systemPrompt, history, []);
          if (forced.text) finalText = forced.text;
        } catch (err) {
          logger.error('[ImpactAgent] Forced final answer failed', {}, err as Error);
        }
        break;
      }
    }

    return {
      dependency_facts: dependencyFacts,
      explanation: finalText ?? 'Impact analysis could not be completed due to an error.',
      evidence_log: evidence,
      warnings,
    };
  }

  /**
   * Execute a V1 agent tool call.
   */
  private static async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    repoId: string,
    knownSymbolIds: Set<string>,
    dependencyFacts: DependencyFact[],
    warnings: string[]
  ): Promise<unknown> {
    if (toolName === 'get_blast_radius') {
      const symbolId = args['symbol_id'] as string;
      const depth = (args['depth'] as number) ?? 3;

      // Validate symbol exists before calling Track A
      if (!knownSymbolIds.has(symbolId)) {
        warnings.push(`Symbol "${symbolId}" not found in graph — may be a newly added function not yet indexed`);
        return { error: 'symbol_not_found', symbol_id: symbolId };
      }

      const result = await trackAService.getBlastRadius(symbolId, repoId);

      // Record in dependency facts for structured output
      dependencyFacts.push({
        symbol: symbolId,
        file: result.affectedNodes[0]?.file ?? 'unknown',
        callers: result.affectedNodes.map((n) => `${n.name} (${n.file})`),
        riskLevel: result.riskLevel,
      });

      return {
        symbol_id: symbolId,
        risk_level: result.riskLevel,
        affected_nodes: result.affectedNodes,
        depth_requested: depth,
      };
    }

    if (toolName === 'retrieve_context') {
      const query = args['query'] as string;
      const topK = (args['top_k'] as number) ?? 5;

      const chunks = await RetrievalService.retrieve(repoId, query, topK);
      return {
        query,
        chunks_found: chunks.length,
        results: chunks.map((c) => ({
          chunk_id: c.chunk_id,
          file: c.metadata.file_path,
          function: c.metadata.function_name,
          similarity: c.similarity,
          snippet: c.chunk_text.substring(0, 300),
        })),
      };
    }

    return { error: 'unknown_tool', tool_name: toolName };
  }
}
