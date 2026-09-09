import crypto from 'crypto';
import { env } from '../config/env';
import { RepoService } from './repo.service';
import { updateRepoQueue } from '../jobs/queues/update.queue';
import { logger } from '../utils/logger';
import { AppError } from '../types/api.types';

export interface GitHubPushPayload {
  ref: string;
  after: string;
  repository: {
    id: number | string;
    name: string;
    full_name: string;
    default_branch: string;
  };
  head_commit?: {
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  };
  commits?: Array<{
    id: string;
    added: string[];
    removed: string[];
    modified: string[];
  }>;
}

export class WebhookService {
  /**
   * Validates GitHub HMAC-SHA256 signature (X-Hub-Signature-256 header)
   */
  public static verifySignature(signatureHeader: string | undefined, payload: Buffer | string): boolean {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const providedSignature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET);
    const digest = Buffer.from(
      hmac.update(typeof payload === 'string' ? payload : payload).digest('hex'),
      'utf8'
    );
    const checksum = Buffer.from(providedSignature, 'utf8');

    if (digest.length !== checksum.length) {
      return false;
    }

    return crypto.timingSafeEqual(digest, checksum);
  }

  /**
   * Processes GitHub push event, extracts changed files, and enqueues update job.
   */
  public static async handlePushEvent(payload: GitHubPushPayload): Promise<{ enqueued: boolean; repoId?: string; changedFilesCount?: number }> {
    const githubRepoId = String(payload.repository.id);
    const repo = await RepoService.findByGithubRepoId(githubRepoId);

    if (!repo) {
      logger.info(`Received push webhook for unlinked repository ${payload.repository.full_name} (${githubRepoId})`);
      return { enqueued: false };
    }

    // Extract all unique changed files across commits
    const changedFilesSet = new Set<string>();
    if (payload.commits && Array.isArray(payload.commits)) {
      for (const commit of payload.commits) {
        commit.added?.forEach((f) => changedFilesSet.add(f));
        commit.modified?.forEach((f) => changedFilesSet.add(f));
        commit.removed?.forEach((f) => changedFilesSet.add(f));
      }
    } else if (payload.head_commit) {
      payload.head_commit.added?.forEach((f) => changedFilesSet.add(f));
      payload.head_commit.modified?.forEach((f) => changedFilesSet.add(f));
      payload.head_commit.removed?.forEach((f) => changedFilesSet.add(f));
    }

    const changedFiles = Array.from(changedFilesSet);
    const commitSha = payload.head_commit?.id || payload.after || 'head_commit_update';
    const branch = payload.ref.replace('refs/heads/', '');

    logger.info(`Received push for repo ${repo.id} (${repo.full_name}): ${changedFiles.length} files changed at commit ${commitSha}`);

    // Enqueue BullMQ update-repo job
    await updateRepoQueue.addJob('update-repository', {
      repoId: repo.id,
      commitSha,
      changedFiles,
      branch,
      author: payload.head_commit?.author?.name,
    });

    return {
      enqueued: true,
      repoId: repo.id,
      changedFilesCount: changedFiles.length,
    };
  }
}
