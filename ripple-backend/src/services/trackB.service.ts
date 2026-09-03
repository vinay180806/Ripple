import { TrackBClient } from '../clients/trackB.client';
import { MockTrackBClient } from '../clients/mockTrackB.client';

export class TrackBService {
  private client: TrackBClient;

  constructor(client?: TrackBClient) {
    this.client = client || new MockTrackBClient();
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

  public async triggerEmbedding(repoId: string, commitSha: string, changedFiles?: string[]) {
    return this.client.triggerEmbedding(repoId, commitSha, changedFiles);
  }
}

export const trackBService = new TrackBService();
