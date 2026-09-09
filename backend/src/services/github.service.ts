import axios from 'axios';
import { env } from '../config/env';
import { GitHubTokenResponse, GitHubUser, GitHubEmail, GitHubRepo } from '../types/github.types';
import { logger } from '../utils/logger';
import { AppError } from '../types/api.types';

export class GitHubService {
  public static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'repo read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  public static async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.GITHUB_CALLBACK_URL,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        throw new AppError('Failed to obtain GitHub access token', 400, 'GITHUB_OAUTH_FAILED', response.data);
      }

      return response.data.access_token;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error('GitHub OAuth token exchange failed', {}, err);
      throw new AppError('GitHub OAuth token exchange error', 502, 'GITHUB_API_ERROR');
    }
  }

  public static async getUserProfile(accessToken: string): Promise<{ user: GitHubUser; primaryEmail: string }> {
    try {
      const userRes = await axios.get<GitHubUser>('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Ripple-Backend-Platform',
        },
      });

      let primaryEmail = userRes.data.email;
      if (!primaryEmail) {
        // Fetch emails endpoint if email is private
        const emailsRes = await axios.get<GitHubEmail[]>('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Ripple-Backend-Platform',
          },
        });
        const primary = emailsRes.data.find((e) => e.primary && e.verified) || emailsRes.data[0];
        if (primary) {
          primaryEmail = primary.email;
        }
      }

      if (!primaryEmail) {
        primaryEmail = `${userRes.data.login}@users.noreply.github.com`;
      }

      return {
        user: userRes.data,
        primaryEmail,
      };
    } catch (err: any) {
      logger.error('Failed to fetch GitHub user profile', {}, err);
      throw new AppError('Failed to fetch GitHub profile', 502, 'GITHUB_API_ERROR');
    }
  }

  public static parseRepoUrl(urlOrName: string): { owner: string; repo: string } {
    let cleaned = urlOrName.trim();
    // Strip trailing .git and slashes
    cleaned = cleaned.replace(/\.git\/?$/, '').replace(/\/+$/, '');

    // Match https://github.com/owner/repo or git@github.com:owner/repo
    const httpMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (httpMatch) {
      return { owner: httpMatch[1], repo: httpMatch[2] };
    }

    const sshMatch = cleaned.match(/git@github\.com:([^/]+)\/([^/]+)/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // Match owner/repo
    const parts = cleaned.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }

    throw new AppError('Invalid GitHub repository URL or format. Expected format: https://github.com/owner/repo or owner/repo', 400, 'INVALID_REPO_URL');
  }

  public static async getRepository(accessToken: string | null, owner: string, repo: string): Promise<GitHubRepo> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Ripple-Backend-Platform',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await axios.get<GitHubRepo>(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
      });
      return res.data;
    } catch (err: any) {
      logger.error(`Failed to verify GitHub repository access for ${owner}/${repo}`, {}, err);
      if (err.response?.status === 404) {
        throw new AppError(`Repository "${owner}/${repo}" was not found on GitHub or is private. Please check permissions or token.`, 404, 'REPO_NOT_FOUND');
      }
      throw new AppError('Failed to access repository from GitHub API', 502, 'GITHUB_API_ERROR');
    }
  }

  public static async fetchRepoMetadata(urlOrName: string, accessToken?: string | null): Promise<GitHubRepo> {
    const { owner, repo } = this.parseRepoUrl(urlOrName);
    return this.getRepository(accessToken || null, owner, repo);
  }
}
