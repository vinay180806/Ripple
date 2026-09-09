import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { INDEX_REPO_QUEUE_NAME, IndexRepoJobData } from '../queues/index.queue';
import { RepoRepository } from '../../db/schema/repos.schema';
import { WorkspaceService } from '../../services/workspace.service';
import { trackAService } from '../../services/trackA.service';
import { trackBService } from '../../services/trackB.service';
import { logger } from '../../utils/logger';

export async function processIndexJob(data: IndexRepoJobData): Promise<void> {
  const commitSha = data.commitSha || 'mock_head_commit_sha_01';
  logger.info(`Starting indexing job for repo ${data.repoId} (${data.githubUrl}) at commit ${commitSha}`);

  // 1. Update repo status to 'indexing'
  await RepoRepository.updateStatus(data.repoId, 'indexing');

  try {
    // 2. Manage temporary workspace lifecycle
    await WorkspaceService.withWorkspace(`job_index_${data.repoId}`, async (workspacePath) => {
      // 3. Delegate to Track A Static Analysis Interface
      const trackAResult = await trackAService.ingestRepository(data.repoId, commitSha, workspacePath);
      logger.info(`Track A ingestion completed for repo ${data.repoId}`, { trackAResult });

      // 4. Delegate to Track B Embedding Interface — pass the real workspace so chunker finds source files
      const trackBResult = await trackBService.triggerEmbedding(data.repoId, commitSha, undefined, workspacePath);
      logger.info(`Track B embedding completed for repo ${data.repoId}`, { trackBResult });
    });

    // 5. Update repo status to 'complete'
    await RepoRepository.updateStatus(data.repoId, 'complete', commitSha);
    logger.info(`Repository ${data.repoId} indexing completed successfully`);
  } catch (err) {
    logger.error(`Repository ${data.repoId} indexing failed`, {}, err as Error);
    await RepoRepository.updateStatus(data.repoId, 'failed');
    throw err;
  }
}

class IndexWorkerManager {
  private worker: Worker<IndexRepoJobData> | null = null;

  constructor() {
    this.initWorker();
  }

  public initWorker(): Worker<IndexRepoJobData> | null {
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker<IndexRepoJobData>(
        INDEX_REPO_QUEUE_NAME,
        async (job: Job<IndexRepoJobData>) => {
          await processIndexJob(job.data);
        },
        {
          connection: {
            url: env.REDIS_URL,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy: () => null,
          },
          concurrency: 5,
        }
      );

      this.worker.on('completed', (job) => {
        logger.info(`Index job ${job.id} for repo ${job.data.repoId} completed`);
      });

      this.worker.on('failed', (job, err) => {
        logger.error(`Index job ${job?.id} failed with error: ${err.message}`, {
          attemptsMade: job?.attemptsMade,
        }, err);
      });

      this.worker.on('error', () => {
        // Quiet error listener when Redis is not running
      });
      return this.worker;
    } catch {
      return null;
    }
  }

  public getWorker(): Worker<IndexRepoJobData> | null {
    return this.worker;
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch(() => {});
      this.worker = null;
    }
  }
}

export const indexWorker = new IndexWorkerManager();
