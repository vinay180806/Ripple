import { Queue, JobsOptions } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { processUpdateJob } from '../workers/update.worker';

export interface UpdateRepoJobData {
  repoId: string;
  commitSha: string;
  changedFiles: string[];
  branch: string;
  author?: string;
}

export const UPDATE_REPO_QUEUE_NAME = 'update-repo';

export const defaultUpdateJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

class UpdateRepoQueueManager {
  private queue: Queue<UpdateRepoJobData> | null = null;
  private isConnected = false;

  constructor() {
    this.initQueue();
  }

  public initQueue(): Queue<UpdateRepoJobData> | null {
    if (this.queue) return this.queue;
    try {
      this.queue = new Queue<UpdateRepoJobData>(UPDATE_REPO_QUEUE_NAME, {
        connection: {
          url: env.REDIS_URL,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: () => null, // Stop reconnect loop when Redis is offline
        },
        defaultJobOptions: defaultUpdateJobOptions,
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

  public async addJob(jobName: string, data: UpdateRepoJobData, opts?: JobsOptions): Promise<string> {
    const jobId = `update:${data.repoId}:${data.commitSha}`;

    if (this.queue && this.isConnected) {
      try {
        const job = await this.queue.add(jobName, data, {
          jobId,
          ...opts,
        });
        logger.info(`Enqueued update job [${job.id}] for repo ${data.repoId} in BullMQ`);
        return job.id || jobId;
      } catch {
        // Fallback
      }
    }

    // Direct in-memory background processing fallback when Redis is not running
    logger.info(`Processing update job asynchronously in-process for repo ${data.repoId}`);
    setImmediate(() => {
      processUpdateJob(data).catch((err) => {
        logger.error(`In-process update job failed for repo ${data.repoId}`, {}, err);
      });
    });

    return jobId;
  }

  public getQueue(): Queue<UpdateRepoJobData> | null {
    return this.queue;
  }

  public async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close().catch(() => {});
      this.queue = null;
    }
  }
}

export const updateRepoQueue = new UpdateRepoQueueManager();
