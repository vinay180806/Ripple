import { GraphResult } from '../clients/trackA.client';
import { RetrievedChunk } from './retrieval.service';

export interface GroundingResult {
  isGrounded: boolean;
  warnings: string[];
}

// Matches citations in the format [file_path:function_name]
const CITATION_RE = /\[([^\]:]+):([^\]]+)\]/g;

// Matches potential bare camelCase or snake_case identifiers that look like code symbols.
// Min length of 8 chars to avoid flagging common words like "isValid", "getUser".
// Require at least one uppercase letter (camelCase) or underscore (snake_case) to
// distinguish code identifiers from regular English words.
const BARE_SYMBOL_RE = /\b([a-z][a-zA-Z0-9_]{7,}[A-Z][a-zA-Z0-9_]*|[a-zA-Z0-9]+_[a-zA-Z0-9_]{4,})\b/g;

// The "no context" phrase signals no verifiable claims — treat as grounded
const NO_CONTEXT_PHRASE = "i don't have enough context";

export class GroundingCheckService {
  /**
   * Validate that all citations in the LLM response refer to symbols
   * that were actually injected into the prompt context.
   *
   * Phase 5 algorithm:
   * 1. Build whitelist from graph nodes + retrieved chunks
   * 2. Extract [file:function] citations from response
   * 3. Check each citation against whitelist
   * 4. Loose scan for bare camelCase/snake_case identifiers (≥8 chars) not in whitelist
   */
  public static validate(
    response: string,
    graph: GraphResult,
    retrievedChunks: RetrievedChunk[]
  ): GroundingResult {
    const warnings: string[] = [];

    // Short-circuit: if model says it doesn't have context, no claims to validate
    if (response.toLowerCase().includes(NO_CONTEXT_PHRASE)) {
      return { isGrounded: true, warnings: [] };
    }

    // Build whitelist of known symbols from injected context
    const knownPairs = new Set<string>(); // "file_path:function_name"
    const knownNames = new Set<string>(); // just function names

    for (const node of graph.nodes) {
      if (node.name && node.file) {
        knownPairs.add(`${node.file}:${node.name}`);
        knownNames.add(node.name);
      }
    }

    for (const chunk of retrievedChunks) {
      if (chunk.metadata.function_name) {
        knownPairs.add(`${chunk.metadata.file_path}:${chunk.metadata.function_name}`);
        knownNames.add(chunk.metadata.function_name);
      }
      if (chunk.metadata.heading_text) {
        knownNames.add(chunk.metadata.heading_text);
      }
    }

    // Step 1: Check formal citations [file:function]
    CITATION_RE.lastIndex = 0;
    let citationMatch: RegExpExecArray | null;
    while ((citationMatch = CITATION_RE.exec(response)) !== null) {
      const filePath = citationMatch[1].trim();
      const fnName = citationMatch[2].trim();
      const pairKey = `${filePath}:${fnName}`;

      if (!knownPairs.has(pairKey)) {
        // Try partial match — file exists but function name is slightly off
        const fileKnown = [...knownPairs].some((p) => p.startsWith(filePath + ':'));
        const fnKnown = knownNames.has(fnName);

        if (!fileKnown && !fnKnown) {
          warnings.push(`Citation [${filePath}:${fnName}] not found in injected context`);
        } else if (!fnKnown) {
          warnings.push(`Function "${fnName}" in citation [${filePath}:${fnName}] not found in context`);
        } else if (!fileKnown) {
          warnings.push(`File "${filePath}" in citation [${filePath}:${fnName}] not found in context`);
        }
      }
    }

    // Step 2: Loose scan for bare camelCase/snake_case identifiers not in whitelist
    // Only flag identifiers ≥8 chars with camelCase or snake_case pattern to reduce false positives.
    // This is intentionally conservative — tune threshold against real output.
    BARE_SYMBOL_RE.lastIndex = 0;
    let symbolMatch: RegExpExecArray | null;
    const flaggedBare = new Set<string>(); // deduplicate warnings per symbol

    while ((symbolMatch = BARE_SYMBOL_RE.exec(response)) !== null) {
      const symbol = symbolMatch[1];
      if (!knownNames.has(symbol) && !flaggedBare.has(symbol)) {
        // Additional heuristic: skip if it looks like a common English compound word
        // (no digit, no consecutive capitals, not all-lowercase run)
        const looksLikeCode = /[A-Z]/.test(symbol) || /_/.test(symbol);
        if (looksLikeCode) {
          flaggedBare.add(symbol);
          warnings.push(`Bare symbol "${symbol}" not found in injected context (may be hallucinated)`);
        }
      }
    }

    return {
      isGrounded: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Format a warning badge to append to responses with grounding issues.
   * Used by the QA controller when isGrounded is false.
   */
  public static formatWarningBadge(warnings: string[]): string {
    return `\n\n⚠️ **Grounding Warning**: This response may reference details not found in the verified context.\n${warnings.map((w) => `- ${w}`).join('\n')}`;
  }
}
