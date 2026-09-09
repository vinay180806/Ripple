export interface QASource {
  file: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
}

export interface QAResult {
  repoId: string;
  question: string;
  commitHash?: string;
  answer: string;
  sources: QASource[];
  confidence: number;
  isMock: boolean;
}

export interface ImpactReportResult {
  reportId: string;
  repoId: string;
  diffRef: string;
  summary: string;
  riskScore: number; // 0.0 to 1.0
  affectedSymbols: string[];
  blastRadius: string[];
  recommendations: string[];
  isMock: boolean;
}

export interface TriggerEmbeddingResult {
  success: boolean;
  repoId: string;
  commitSha: string;
  embeddedChunksCount: number;
  isMock: boolean;
}

export interface TrackBClient {
  qa(repoId: string, question: string, commitHash?: string): Promise<QAResult>;
  impactReport(repoId: string, diffRef: string, changedFiles?: string[]): Promise<ImpactReportResult>;
  triggerEmbedding(repoId: string, commitSha: string, changedFiles?: string[], workspacePath?: string): Promise<TriggerEmbeddingResult>;
}
