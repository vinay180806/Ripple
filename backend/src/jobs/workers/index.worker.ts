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

// Directories that are never source code — skip them entirely
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', 'venv', '.venv', 'env',
  'data',       // ML training data, fixtures, corpora
  'vendor',     // vendored dependencies
  'coverage',   // test coverage reports
  'fixtures',   // test fixtures
  '.cache', '.parcel-cache', '.turbo',
]);

import AdmZip from 'adm-zip';

export { SKIP_DIRS, CODE_EXTENSIONS };

/**
 * Download the repo as a single zip archive and extract only source files.
 * Uses GitHub's zipball endpoint — one HTTP request, no per-file rate limiting.
 */
async function fetchRepoFilesViaZip(
  githubUrl: string,
  destDir: string,
  branch: string,
  accessToken?: string
): Promise<number> {
  const { owner, repo } = GitHubService.parseRepoUrl(githubUrl);
  const headers: Record<string, string> = { 'User-Agent': 'Ripple-Backend-Platform' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  logger.info(`[IndexWorker] Downloading zip for ${owner}/${repo}@${branch}`);

  // Download the zipball — GitHub redirects, axios follows automatically
  const zipRes = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`,
    { headers, responseType: 'arraybuffer', maxRedirects: 5 }
  );

  const zip = new AdmZip(Buffer.from(zipRes.data));
  const entries = zip.getEntries();

  // GitHub zips have a top-level folder like "owner-repo-sha/" — strip it
  const topDir = entries[0]?.entryName.split('/')[0] ?? '';

  let extracted = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;

    // Strip the GitHub-added top-level prefix
    const relPath = entry.entryName.startsWith(topDir + '/')
      ? entry.entryName.slice(topDir.length + 1)
      : entry.entryName;

    const parts = relPath.split('/');
    const ext = path.extname(relPath).toLowerCase();
    const base = path.basename(relPath).toLowerCase();

    // Skip non-code dirs and non-code extensions
    if (parts.some((p) => SKIP_DIRS.has(p))) continue;
    if (!CODE_EXTENSIONS.has(ext) && base !== '.env.example') continue;

    const destPath = path.join(destDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, entry.getData());
    extracted++;
  }

  logger.info(`[IndexWorker] Extracted ${extracted} source files into ${destDir} (skipped data/, node_modules/, etc.)`);
  return extracted;
}
export async function processIndexJob(data: IndexRepoJobData): Promise<void> {
  const commitSha = data.commitSha || 'head';
  logger.info(`Starting indexing job for repo ${data.repoId} (${data.githubUrl}) at commit ${commitSha}`);

  // 1. Update repo status to 'indexing'
  await RepoRepository.updateStatus(data.repoId, 'indexing');

  try {
    await WorkspaceService.withWorkspace(`job_index_${data.repoId}`, async (workspacePath) => {
      // 2. Download repo as zip and extract source files (skips data/, node_modules/, etc.)
      try {
        const fileCount = await fetchRepoFilesViaZip(
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
