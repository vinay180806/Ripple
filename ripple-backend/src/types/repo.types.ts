import { IndexedStatus, RepoRow } from '../db/schema/repos.schema';

export interface ConnectRepoInput {
  github_repo_id?: string;
  github_url: string;
  name?: string;
  full_name?: string;
  default_branch?: string;
  personal_access_token?: string;
}

export interface RepoDto {
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

export interface RepoStatusDto {
  id: string;
  name: string;
  full_name: string;
  indexed_status: IndexedStatus;
  last_indexed_commit: string | null;
  updated_at: Date;
}

export function formatRepoDto(repo: RepoRow): RepoDto {
  return {
    id: repo.id,
    github_repo_id: repo.github_repo_id,
    github_url: repo.github_url,
    owner_id: repo.owner_id,
    name: repo.name,
    full_name: repo.full_name,
    default_branch: repo.default_branch,
    indexed_status: repo.indexed_status,
    last_indexed_commit: repo.last_indexed_commit,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
  };
}
