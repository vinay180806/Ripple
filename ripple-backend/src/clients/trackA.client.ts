export interface IngestRepoResult {
  success: boolean;
  repoId: string;
  commitSha: string;
  symbolCount: number;
  graphNodeCount: number;
  processingTimeMs: number;
}

export interface UpdateRepoResult {
  success: boolean;
  repoId: string;
  commitSha: string;
  affectedSymbols: string[];
  processedFiles: string[];
}

export interface BlastRadiusResult {
  symbolId: string;
  repoId: string;
  riskLevel: 'low' | 'medium' | 'high';
  affectedNodes: Array<{
    id: string;
    name: string;
    file: string;
    distance: number;
  }>;
}

export interface GraphResult {
  repoId: string;
  nodes: Array<{
    id: string;
    name: string;
    kind: 'function' | 'class' | 'interface' | 'variable';
    file: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    kind: 'calls' | 'imports' | 'extends' | 'references';
  }>;
}

export interface TrackAClient {
  ingestRepository(repoId: string, commitSha: string, workspacePath: string): Promise<IngestRepoResult>;
  updateRepository(repoId: string, commitSha: string, changedFiles: string[]): Promise<UpdateRepoResult>;
  getBlastRadius(symbolId: string, repoId: string): Promise<BlastRadiusResult>;
  getGraph(repoId: string): Promise<GraphResult>;
}
