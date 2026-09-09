import { db } from '../connection';
import crypto from 'crypto';
import { DiskStorage } from '../disk.storage';
import { env } from '../../config/env';

export type IndexedStatus = 'pending' | 'indexing' | 'complete' | 'failed';

export interface RepoRow {
  id: string;
  github_repo_id: string;
  github_url: string;
  owner_id: string;
  name: string;
  full_name: string;
  default_branch: string;
  indexed_status: IndexedStatus;
  last_indexed_commit: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRepoInput {
  github_repo_id: string;
  github_url: string;
  owner_id: string;
  name: string;
  full_name: string;
  default_branch?: string;
  indexed_status?: IndexedStatus;
  last_indexed_commit?: string | null;
}

const diskRepos = new DiskStorage<RepoRow>('repos.json');
const testMemoryRepos = new Map<string, RepoRow>();

function getReposStore() {
  return env.NODE_ENV === 'test' ? testMemoryRepos : diskRepos;
}

export class RepoRepository {
  public static async create(input: CreateRepoInput): Promise<RepoRow> {
    const id = crypto.randomUUID();
    const now = new Date();
    const defaultBranch = input.default_branch || 'main';
    const status = input.indexed_status || 'pending';

    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<RepoRow>(
        `INSERT INTO repos (id, github_repo_id, github_url, owner_id, name, full_name, default_branch, indexed_status, last_indexed_commit, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id,
          input.github_repo_id,
          input.github_url,
          input.owner_id,
          input.name,
          input.full_name,
          defaultBranch,
          status,
          input.last_indexed_commit || null,
          now,
          now,
        ]
      );
      return res.rows[0];
    }

    const store = getReposStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    const existing = all.find((r) => r.github_repo_id === input.github_repo_id);
    if (existing) {
      const error: any = new Error('duplicate key value violates unique constraint "repos_github_repo_id_key"');
      error.code = '23505';
      throw error;
    }

    const newRepo: RepoRow = {
      id,
      github_repo_id: input.github_repo_id,
      github_url: input.github_url,
      owner_id: input.owner_id,
      name: input.name,
      full_name: input.full_name,
      default_branch: defaultBranch,
      indexed_status: status,
      last_indexed_commit: input.last_indexed_commit || null,
      created_at: now,
      updated_at: now,
    };

    store.set(id, newRepo);
    return newRepo;
  }

  public static async findById(id: string): Promise<RepoRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<RepoRow>('SELECT * FROM repos WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    const store = getReposStore();
    return store instanceof Map ? store.get(id) || null : store.getById(id);
  }

  public static async findByOwnerId(ownerId: string): Promise<RepoRow[]> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<RepoRow>('SELECT * FROM repos WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
      return res.rows;
    }

    const store = getReposStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all.filter((r) => r.owner_id === ownerId);
  }

  public static async findByGithubRepoId(githubRepoId: string): Promise<RepoRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<RepoRow>('SELECT * FROM repos WHERE github_repo_id = $1', [githubRepoId]);
      return res.rows[0] || null;
    }

    const store = getReposStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all.find((r) => r.github_repo_id === githubRepoId) || null;
  }

  public static async findByFullName(fullName: string): Promise<RepoRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<RepoRow>('SELECT * FROM repos WHERE LOWER(full_name) = LOWER($1)', [fullName]);
      return res.rows[0] || null;
    }

    const store = getReposStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all.find((r) => r.full_name.toLowerCase() === fullName.toLowerCase()) || null;
  }

  public static async updateStatus(
    id: string,
    status: IndexedStatus,
    lastIndexedCommit?: string | null
  ): Promise<RepoRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<RepoRow>(
        `UPDATE repos 
         SET indexed_status = $1, 
             last_indexed_commit = COALESCE($2, last_indexed_commit),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, lastIndexedCommit || null, id]
      );
      return res.rows[0] || null;
    }

    const repo = await this.findById(id);
    if (!repo) return null;
    repo.indexed_status = status;
    if (lastIndexedCommit !== undefined) repo.last_indexed_commit = lastIndexedCommit;
    repo.updated_at = new Date();

    const store = getReposStore();
    store.set(id, repo);
    return repo;
  }

  public static async delete(id: string): Promise<boolean> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query('DELETE FROM repos WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }

    const store = getReposStore();
    return store.delete(id);
  }

  public static async clear(): Promise<void> {
    const store = getReposStore();
    store.clear();
  }
}
