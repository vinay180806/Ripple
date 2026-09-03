import { RepoRepository } from '../../src/db/schema/repos.schema';
import { UserRepository } from '../../src/db/schema/users.schema';
import { processIndexJob } from '../../src/jobs/workers/index.worker';
import { processUpdateJob } from '../../src/jobs/workers/update.worker';
import { trackAService } from '../../src/services/trackA.service';
import { cacheService } from '../../src/services/cache.service';

describe('Phase 6 & 10: BullMQ Queues & Workers Tests', () => {
  let userId: string;
  let repoId: string;

  beforeEach(async () => {
    await UserRepository.clear();
    await RepoRepository.clear();

    const user = await UserRepository.create({
      username: 'jobUser',
      email: 'jobuser@example.com',
    });
    userId = user.id;

    const repo = await RepoRepository.create({
      github_repo_id: '555666',
      github_url: 'https://github.com/jobUser/project',
      owner_id: userId,
      name: 'project',
      full_name: 'jobUser/project',
      indexed_status: 'pending',
    });
    repoId = repo.id;
  });

  describe('Index Worker Job Processing', () => {
    it('should process index job, transition repo status to complete and record commitSha', async () => {
      await processIndexJob({
        repoId,
        githubRepoId: '555666',
        githubUrl: 'https://github.com/jobUser/project',
        ownerId: userId,
        defaultBranch: 'main',
        commitSha: 'commit_sha_12345',
      });

      const updated = await RepoRepository.findById(repoId);
      expect(updated?.indexed_status).toBe('complete');
      expect(updated?.last_indexed_commit).toBe('commit_sha_12345');
    });

    it('should set repo status to failed if Track A ingestion throws error', async () => {
      const originalMethod = trackAService.getClient().ingestRepository;
      trackAService.getClient().ingestRepository = jest.fn().mockRejectedValue(new Error('Ingestion parsing failed'));

      await expect(
        processIndexJob({
          repoId,
          githubRepoId: '555666',
          githubUrl: 'https://github.com/jobUser/project',
          ownerId: userId,
          defaultBranch: 'main',
        })
      ).rejects.toThrow('Ingestion parsing failed');

      const updated = await RepoRepository.findById(repoId);
      expect(updated?.indexed_status).toBe('failed');

      // Restore client method
      trackAService.getClient().ingestRepository = originalMethod;
    });
  });

  describe('Update Worker Job Processing', () => {
    it('should process incremental update, invalidate cache, and update commitSha', async () => {
      // Seed cache for repo
      await cacheService.set(`qa:${repoId}:c1:hash1`, { answer: 'cached' });
      const cachedBefore = await cacheService.get(`qa:${repoId}:c1:hash1`);
      expect(cachedBefore).toBeDefined();

      await processUpdateJob({
        repoId,
        commitSha: 'new_commit_999',
        changedFiles: ['src/payment.ts', 'src/checkout.ts'],
        branch: 'main',
      });

      const updated = await RepoRepository.findById(repoId);
      expect(updated?.indexed_status).toBe('complete');
      expect(updated?.last_indexed_commit).toBe('new_commit_999');

      // Verify cache invalidation
      const cachedAfter = await cacheService.get(`qa:${repoId}:c1:hash1`);
      expect(cachedAfter).toBeNull();
    });
  });
});
