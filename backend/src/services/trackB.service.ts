import { TrackBClient } from '../clients/trackB.client';
import { MockTrackBClient } from '../clients/mockTrackB.client';
import { logger } from '../utils/logger';

function createDefaultClient(): TrackBClient {
  // Dynamically require to avoid circular deps and to allow env to be fully loaded first
  const { env } = require('../config/env');
  if (env.GEMINI_API_KEY) {
    logger.info('[TrackBService] GEMINI_API_KEY detected — using LocalTrackBClient (real AI pipeline)');
    const { LocalTrackBClient } = require('../clients/localTrackB.client');
    return new LocalTrackBClient();
  }
  logger.info('[TrackBService] No GEMINI_API_KEY — using MockTrackBClient');
  return new MockTrackBClient();
}

export class TrackBService {
  private client: TrackBClient;

  constructor(client?: TrackBClient) {
    this.client = client || createDefaultClient();
  }

  public setClient(client: TrackBClient): void {
    this.client = client;
  }

  public getClient(): TrackBClient {
    return this.client;
  }

  public async qa(repoId: string, question: string, commitHash?: string) {
    return this.client.qa(repoId, question, commitHash);
  }

  public async impactReport(repoId: string, diffRef: string, changedFiles?: string[]) {
    return this.client.impactReport(repoId, diffRef, changedFiles);
  }

  public async triggerEmbedding(repoId: string, commitSha: string, changedFiles?: string[], workspacePath?: string) {
    return this.client.triggerEmbedding(repoId, commitSha, changedFiles, workspacePath);
  }
}

export const trackBService = new TrackBService();
