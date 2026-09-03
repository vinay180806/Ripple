import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { UPDATE_REPO_QUEUE_NAME, UpdateRepoJobData } from '../queues/update.queue';
import { RepoRepository } from '../../db/schema/repos.schema';
import { trackAService } from '../../services/trackA.service';
import { trackBService } from '../../services/trackB.service';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../utils/logger';

export async function processUpdateJob(data: UpdateRepoJobData): Promise<void> {
  logger.info(`Starting incremental update job for repo ${data.repoId} at commit ${data.commitSha} (${data.changedFiles.length} changed files)`);

  try {
    // 1. Trigger Track A Incremental Static Analysis
    const trackAResult = await trackAService.updateRepository(data.repoId, data.commitSha, data.changedFiles);
    logger.info(`Track A incremental update completed for repo ${data.repoId}`, { trackAResult });

    // 2. Trigger Track B Incremental Vector Embeddings
    const trackBResult = await trackBService.triggerEmbedding(data.repoId, data.commitSha, data.changedFiles);
    logger.info(`Track B incremental embedding completed for repo ${data.repoId}`, { trackBResult });

    // 3. Invalidate Redis Caches for this repository
    await cacheService.deletePattern(`qa:${data.repoId}:*`);
    await cacheService.deletePattern(`impact:${data.repoId}:*`);
    logger.info(`Invalidated Redis caches for repository ${data.repoId}`);

    // 4. Update repository commit pointer and status
    await RepoRepository.updateStatus(data.repoId, 'complete', data.commitSha);
    logger.info(`Repository ${data.repoId} incremental update complete`);
  } catch (err) {
    logger.error(`Repository ${data.repoId} incremental update failed`, {}, err as Error);
    await RepoRepository.updateStatus(data.repoId, 'failed');
    throw err;
  }
}

class UpdateWorkerManager {
  private worker: Worker<UpdateRepoJobData> | null = null;

  constructor() {
    this.initWorker();
  }

  public initWorker(): Worker<UpdateRepoJobData> | null {
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker<UpdateRepoJobData>(
        UPDATE_REPO_QUEUE_NAME,
        async (job: Job<UpdateRepoJobData>) => {
          await processUpdateJob(job.data);
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
        logger.info(`Update job ${job.id} for repo ${job.data.repoId} completed`);
      });

      this.worker.on('failed', (job, err) => {
        logger.error(`Update job ${job?.id} failed with error: ${err.message}`, {
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

  public getWorker(): Worker<UpdateRepoJobData> | null {
    return this.worker;
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch(() => {});
      this.worker = null;
    }
  }
}

export const updateWorker = new UpdateWorkerManager();
