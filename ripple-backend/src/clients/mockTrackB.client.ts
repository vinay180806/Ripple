import crypto from 'crypto';
import { TrackBClient, QAResult, ImpactReportResult, TriggerEmbeddingResult } from './trackB.client';
import { logger } from '../utils/logger';

export class MockTrackBClient implements TrackBClient {
  public async qa(repoId: string, question: string, commitHash?: string): Promise<QAResult> {
    logger.info(`[MockTrackBClient] Answering Q&A query for repo ${repoId}: "${question}"`);
    return {
      repoId,
      question,
      commitHash,
      answer: `[MOCK TRACK B RESPONSE] Based on repository analysis for "${question}", authentication uses JWT Bearer tokens and sessions are stored in PostgreSQL with Redis caching.`,
      sources: [
        {
          file: 'src/middleware/auth.middleware.ts',
          lineStart: 18,
          lineEnd: 35,
          snippet: 'export async function authenticate(req: Request, res: Response, next: NextFunction) { ... }',
        },
        {
          file: 'src/services/auth.service.ts',
          lineStart: 45,
          lineEnd: 70,
          snippet: 'public static async login(email: string, password: string) { ... }',
        },
      ],
      confidence: 0.94,
      isMock: true,
    };
  }

  public async impactReport(
    repoId: string,
    diffRef: string,
    changedFiles?: string[]
  ): Promise<ImpactReportResult> {
    logger.info(`[MockTrackBClient] Generating impact report for repo ${repoId}, diff ${diffRef}`);
    const files = changedFiles || ['src/controllers/auth.controller.ts'];
    return {
      reportId: crypto.randomUUID(),
      repoId,
      diffRef,
      summary: `[MOCK TRACK B RESPONSE] Impact analysis on ${files.length} changed files reveals moderate blast radius affecting authorization flows.`,
      riskScore: 0.35,
      affectedSymbols: files.map((f) => `symbol_in_${f.replace(/[^a-zA-Z0-9]/g, '_')}`),
      blastRadius: [
        'src/routes/auth.routes.ts',
        'src/controllers/auth.controller.ts',
        'src/middleware/auth.middleware.ts',
      ],
      recommendations: [
        'Run full auth test suite before merging',
        'Verify session invalidation on token revocation',
      ],
      isMock: true,
    };
  }

  public async triggerEmbedding(
    repoId: string,
    commitSha: string,
    changedFiles?: string[]
  ): Promise<TriggerEmbeddingResult> {
    const fileCount = changedFiles ? changedFiles.length : 10;
    logger.info(`[MockTrackBClient] Triggering vector embeddings for repo ${repoId} at commit ${commitSha} (${fileCount} files)`);
    return {
      success: true,
      repoId,
      commitSha,
      embeddedChunksCount: fileCount * 8,
      isMock: true,
    };
  }
}
