import { TrackAClient, IngestRepoResult, UpdateRepoResult, BlastRadiusResult, GraphResult } from './trackA.client';
import { logger } from '../utils/logger';

export class MockTrackAClient implements TrackAClient {
  public async ingestRepository(
    repoId: string,
    commitSha: string,
    workspacePath: string
  ): Promise<IngestRepoResult> {
    logger.info(`[MockTrackAClient] Ingesting repository ${repoId} at commit ${commitSha} in ${workspacePath}`);
    return {
      success: true,
      repoId,
      commitSha,
      symbolCount: 142,
      graphNodeCount: 320,
      processingTimeMs: 150,
    };
  }

  public async updateRepository(
    repoId: string,
    commitSha: string,
    changedFiles: string[]
  ): Promise<UpdateRepoResult> {
    logger.info(`[MockTrackAClient] Incrementally updating repository ${repoId} with ${changedFiles.length} files`);
    const affectedSymbols = changedFiles.map((file) => `symbol_from_${file.replace(/[^a-zA-Z0-9]/g, '_')}`);
    return {
      success: true,
      repoId,
      commitSha,
      affectedSymbols,
      processedFiles: changedFiles,
    };
  }

  public async getBlastRadius(symbolId: string, repoId: string): Promise<BlastRadiusResult> {
    logger.info(`[MockTrackAClient] Calculating blast radius for symbol ${symbolId} in repo ${repoId}`);
    return {
      symbolId,
      repoId,
      riskLevel: 'medium',
      affectedNodes: [
        { id: `${symbolId}_caller_1`, name: 'processPayment', file: 'src/services/payment.ts', distance: 1 },
        { id: `${symbolId}_caller_2`, name: 'checkoutHandler', file: 'src/controllers/checkout.ts', distance: 2 },
      ],
    };
  }

  public async getGraph(repoId: string): Promise<GraphResult> {
    logger.info(`[MockTrackAClient] Generating call graph for repository ${repoId}`);
    return {
      repoId,
      nodes: [
        { id: 'node_1', name: 'AuthService', kind: 'class', file: 'src/services/auth.ts' },
        { id: 'node_2', name: 'login', kind: 'function', file: 'src/controllers/auth.ts' },
      ],
      edges: [
        { from: 'node_2', to: 'node_1', kind: 'calls' },
      ],
    };
  }
}
