import { TrackAClient } from '../clients/trackA.client';
import { MockTrackAClient } from '../clients/mockTrackA.client';

export class TrackAService {
  private client: TrackAClient;

  constructor(client?: TrackAClient) {
    this.client = client || new MockTrackAClient();
  }

  public setClient(client: TrackAClient): void {
    this.client = client;
  }

  public getClient(): TrackAClient {
    return this.client;
  }

  public async ingestRepository(repoId: string, commitSha: string, workspacePath: string) {
    return this.client.ingestRepository(repoId, commitSha, workspacePath);
  }

  public async updateRepository(repoId: string, commitSha: string, changedFiles: string[]) {
    return this.client.updateRepository(repoId, commitSha, changedFiles);
  }

  public async getBlastRadius(symbolId: string, repoId: string) {
    return this.client.getBlastRadius(symbolId, repoId);
  }

  public async getGraph(repoId: string) {
    return this.client.getGraph(repoId);
  }
}

export const trackAService = new TrackAService();
