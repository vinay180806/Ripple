import { Queue, JobsOptions } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { processIndexJob } from '../workers/index.worker';

export interface IndexRepoJobData {
  repoId: string;
  githubRepoId: string;
  githubUrl: string;
  ownerId: string;
  defaultBranch: string;
  commitSha?: string;
}

export const INDEX_REPO_QUEUE_NAME = 'index-repo';

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

class IndexRepoQueueManager {
  private queue: Queue<IndexRepoJobData> | null = null;
  private isConnected = false;

  constructor() {
    this.initQueue();
  }

  public initQueue(): Queue<IndexRepoJobData> | null {
    if (this.queue) return this.queue;
    try {
      this.queue = new Queue<IndexRepoJobData>(INDEX_REPO_QUEUE_NAME, {
        connection: {
          url: env.REDIS_URL,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: () => null, // Stop reconnect loop when Redis is offline
        },
        defaultJobOptions,
      });

      this.queue.on('error', () => {
        this.isConnected = false;
      });

      this.queue.client.then(() => {
        this.isConnected = true;
      }).catch(() => {
        this.isConnected = false;
      });

      return this.queue;
    } catch {
      this.isConnected = false;
      return null;
    }
  }

  public async addJob(jobName: string, data: IndexRepoJobData, opts?: JobsOptions): Promise<string> {
    const jobId = `index:${data.repoId}:${data.commitSha || 'head'}`;

    if (this.queue && this.isConnected) {
      try {
        const job = await this.queue.add(jobName, data, {
          jobId,
          ...opts,
        });
        logger.info(`Enqueued index job [${job.id}] for repo ${data.repoId} in BullMQ`);
        return job.id || jobId;
      } catch {
        // Fallback to direct async execution
      }
    }

    // Direct in-memory background processing fallback when Redis is not running
    logger.info(`Processing index job asynchronously in-process for repo ${data.repoId}`);
    setImmediate(() => {
      processIndexJob(data).catch((err) => {
        logger.error(`In-process index job failed for repo ${data.repoId}`, {}, err);
      });
    });

    return jobId;
  }

  public getQueue(): Queue<IndexRepoJobData> | null {
    return this.queue;
  }

  public async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close().catch(() => {});
      this.queue = null;
    }
  }
}

export const indexRepoQueue = new IndexRepoQueueManager();
