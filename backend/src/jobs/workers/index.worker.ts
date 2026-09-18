import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { env } from '../../config/env';
import { INDEX_REPO_QUEUE_NAME, IndexRepoJobData } from '../queues/index.queue';
import { RepoRepository } from '../../db/schema/repos.schema';
import { WorkspaceService } from '../../services/workspace.service';
import { GitHubService } from '../../services/github.service';
import { trackAService } from '../../services/trackA.service';
import { trackBService } from '../../services/trackB.service';
import { logger } from '../../utils/logger';

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs',
  '.md', '.mdx', '.json', '.yaml', '.yml', '.sh', '.env.example',
]);

/**
 * Fetch all source files from a GitHub repo via the REST API.
 * No git required — works for public repos, and private repos with a PAT.
 */
async function fetchRepoFilesViaApi(
  githubUrl: string,
  destDir: string,
  branch: string,
  accessToken?: string
): Promise<number> {
  const { owner, repo } = GitHubService.parseRepoUrl(githubUrl);
  const headers: Record<string, string> = { 'User-Agent': 'Ripple-Backend-Platform' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  // 1. Get the commit SHA for the branch
  const branchRes = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
    { headers }
  );
  const treeSha: string = branchRes.data.commit.commit.tree.sha;

  // 2. Get the full recursive file tree
  const treeRes = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { headers }
  );

  const items: Array<{ path: string; type: string; url: string }> = treeRes.data.tree;
  const files = items.filter((item) => {
    if (item.type !== 'blob') return false;
    const ext = path.extname(item.path).toLowerCase();
    const base = path.basename(item.path).toLowerCase();
    // Skip generated/vendor dirs
    const parts = item.path.split('/');
    if (parts.some((p) => ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv'].includes(p))) return false;
    return CODE_EXTENSIONS.has(ext) || base === '.env.example';
  });

  logger.info(`[IndexWorker] GitHub API: found ${files.length} source files to download`);

  // 3. Download each file's content
  let downloaded = 0;
  for (const file of files) {
    try {
      const blobRes = await axios.get(file.url, { headers });
      const content = Buffer.from(blobRes.data.content, 'base64').toString('utf8');
      const filePath = path.join(destDir, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
      downloaded++;
    } catch {
      // Skip unreadable files
    }
  }

  logger.info(`[IndexWorker] Downloaded ${downloaded}/${files.length} files into ${destDir}`);
  return downloaded;
}

export async function processIndexJob(data: IndexRepoJobData): Promise<void> {
  const commitSha = data.commitSha || 'head';
  logger.info(`Starting indexing job for repo ${data.repoId} (${data.githubUrl}) at commit ${commitSha}`);

  // 1. Update repo status to 'indexing'
  await RepoRepository.updateStatus(data.repoId, 'indexing');

  try {
    await WorkspaceService.withWorkspace(`job_index_${data.repoId}`, async (workspacePath) => {
      // 2. Fetch source files via GitHub API into workspacePath
      try {
        const fileCount = await fetchRepoFilesViaApi(
          data.githubUrl,
          workspacePath,
          data.defaultBranch || 'main',
          data.personalAccessToken
        );
        logger.info(`[IndexWorker] Fetched ${fileCount} files for repo ${data.repoId}`);
      } catch (fetchErr) {
        logger.warn(`[IndexWorker] GitHub API fetch failed — workspace may be empty`, {}, fetchErr as Error);
      }

      // 3. Track A Static Analysis
      const trackAResult = await trackAService.ingestRepository(data.repoId, commitSha, workspacePath);
      logger.info(`Track A ingestion completed for repo ${data.repoId}`, { trackAResult });

      // 4. Track B Embedding (chunker reads files from workspacePath)
      const trackBResult = await trackBService.triggerEmbedding(data.repoId, commitSha, undefined, workspacePath);
      logger.info(`Track B embedding completed for repo ${data.repoId}`, { trackBResult });
    });

    // 5. Mark complete
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
