import { MockTrackAClient } from '../../src/clients/mockTrackA.client';
import { MockTrackBClient } from '../../src/clients/mockTrackB.client';
import { trackAService } from '../../src/services/trackA.service';
import { trackBService } from '../../src/services/trackB.service';

describe('Phase 8: Track A & Track B Client Boundaries & Mocks', () => {
  describe('Track A Client Mock Interface', () => {
    const client = new MockTrackAClient();

    it('should simulate repository ingestion', async () => {
      const result = await client.ingestRepository('repo_1', 'commit_abc', '/tmp/workspace');
      expect(result.success).toBe(true);
      expect(result.repoId).toBe('repo_1');
      expect(result.symbolCount).toBeGreaterThan(0);
      expect(result.graphNodeCount).toBeGreaterThan(0);
    });

    it('should simulate incremental repository update', async () => {
      const result = await client.updateRepository('repo_1', 'commit_def', ['src/service.ts']);
      expect(result.success).toBe(true);
      expect(result.processedFiles).toEqual(['src/service.ts']);
      expect(result.affectedSymbols.length).toBeGreaterThan(0);
    });

    it('should return blast radius calculation', async () => {
      const result = await client.getBlastRadius('sym_login', 'repo_1');
      expect(result.symbolId).toBe('sym_login');
      expect(result.affectedNodes.length).toBeGreaterThan(0);
    });

    it('should return call graph nodes and edges', async () => {
      const result = await client.getGraph('repo_1');
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
    });
  });

  describe('Track B Client Mock Interface', () => {
    const client = new MockTrackBClient();

    it('should provide grounded Q&A mock response with citations', async () => {
      const result = await client.qa('repo_1', 'How does authentication work?');
      expect(result.isMock).toBe(true);
      expect(result.answer).toContain('JWT Bearer tokens');
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should generate impact report with risk score and blast radius', async () => {
      const result = await client.impactReport('repo_1', 'HEAD~1..HEAD', ['src/auth.ts']);
      expect(result.isMock).toBe(true);
      expect(result.riskScore).toBeDefined();
      expect(result.blastRadius.length).toBeGreaterThan(0);
    });

    it('should trigger vector embeddings', async () => {
      const result = await client.triggerEmbedding('repo_1', 'commit_123', ['src/index.ts']);
      expect(result.success).toBe(true);
      expect(result.embeddedChunksCount).toBeGreaterThan(0);
    });
  });

  describe('Service Wrapper Dependency Injection', () => {
    it('trackAService and trackBService should successfully delegate to clients', async () => {
      const ingest = await trackAService.ingestRepository('r1', 'c1', '/tmp');
      expect(ingest.success).toBe(true);

      const qa = await trackBService.qa('r1', 'Question');
      expect(qa.isMock).toBe(true);
    });
  });
});
