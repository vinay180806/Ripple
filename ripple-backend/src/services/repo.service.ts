import { RepoRepository, RepoRow } from '../db/schema/repos.schema';
import { UserRepository } from '../db/schema/users.schema';
import { ConnectRepoInput, RepoDto, RepoStatusDto, formatRepoDto } from '../types/repo.types';
import { indexRepoQueue } from '../jobs/queues/index.queue';
import { cacheService } from './cache.service';
import { GitHubService } from './github.service';
import { decryptToken } from '../utils/encryption';
import { AppError } from '../types/api.types';
import { logger } from '../utils/logger';

export class RepoService {
  public static async connectRepo(userId: string, input: ConnectRepoInput): Promise<RepoDto> {
    let githubRepoId = input.github_repo_id;
    let githubUrl = input.github_url;
    let name = input.name;
    let fullName = input.full_name;
    let defaultBranch = input.default_branch || 'main';

    // If metadata is incomplete, fetch live metadata from GitHub API
    if (!githubRepoId || !name || !fullName) {
      let accessToken: string | null = input.personal_access_token || null;
      
      // If no PAT provided, check if user has encrypted GitHub OAuth token
      if (!accessToken) {
        const user = await UserRepository.findById(userId);
        if (user?.github_access_token_encrypted) {
          try {
            accessToken = decryptToken(user.github_access_token_encrypted);
          } catch (e) {
            logger.warn('Failed to decrypt user GitHub token', {}, e as Error);
          }
        }
      }

      const ghMeta = await GitHubService.fetchRepoMetadata(githubUrl, accessToken);
      githubRepoId = ghMeta.id.toString();
      githubUrl = ghMeta.html_url || (githubUrl.startsWith('http') ? githubUrl : `https://github.com/${ghMeta.full_name}`);
      name = ghMeta.name;
      fullName = ghMeta.full_name;
      defaultBranch = ghMeta.default_branch || 'main';
    }

    const existing = await RepoRepository.findByGithubRepoId(githubRepoId);
    if (existing) {
      if (existing.owner_id === userId) {
        return formatRepoDto(existing);
      }
      throw new AppError('Repository is already connected by another user account', 409, 'REPO_ALREADY_CONNECTED');
    }

    // 1. Create repository record with status 'pending'
    const repo = await RepoRepository.create({
      github_repo_id: githubRepoId,
      github_url: githubUrl,
      owner_id: userId,
      name: name,
      full_name: fullName,
      default_branch: defaultBranch,
      indexed_status: 'pending',
    });

    // 2. Dispatch BullMQ Index Job
    try {
      await indexRepoQueue.addJob('index-repository', {
        repoId: repo.id,
        githubRepoId: repo.github_repo_id,
        githubUrl: repo.github_url,
        ownerId: repo.owner_id,
        defaultBranch: repo.default_branch,
      });
    } catch (err) {
      logger.warn(`Failed to enqueue BullMQ index job for repo ${repo.id}`, {}, err as Error);
    }

    return formatRepoDto(repo);
  }

  public static async listUserRepos(userId: string): Promise<RepoDto[]> {
    const repos = await RepoRepository.findByOwnerId(userId);
    return repos.map(formatRepoDto);
  }

  public static async getRepoById(repoId: string, userId: string): Promise<RepoDto> {
    const repo = await RepoRepository.findById(repoId);
    if (!repo) {
      throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
    }

    if (repo.owner_id !== userId) {
      throw new AppError('Access to this repository is forbidden', 403, 'FORBIDDEN');
    }

    return formatRepoDto(repo);
  }

  public static async getRepoStatus(repoId: string, userId: string): Promise<RepoStatusDto> {
    const repo = await this.getRepoById(repoId, userId);
    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      indexed_status: repo.indexed_status,
      last_indexed_commit: repo.last_indexed_commit,
      updated_at: repo.updated_at,
    };
  }

  public static async deleteRepo(repoId: string, userId: string): Promise<void> {
    const repo = await RepoRepository.findById(repoId);
    if (!repo) {
      throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
    }

    if (repo.owner_id !== userId) {
      throw new AppError('Access to this repository is forbidden', 403, 'FORBIDDEN');
    }

    await RepoRepository.delete(repoId);
    await cacheService.deletePattern(`qa:${repoId}:*`);
    await cacheService.deletePattern(`impact:${repoId}:*`);
    logger.info(`Deleted repository ${repoId} and cleared associated caches`);
  }

  public static async findByGithubRepoId(githubRepoId: string): Promise<RepoRow | null> {
    return RepoRepository.findByGithubRepoId(githubRepoId);
  }

  public static async findByFullName(fullName: string): Promise<RepoRow | null> {
    return RepoRepository.findByFullName(fullName);
  }
}
