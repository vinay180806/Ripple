// ─────────────────────────────────────────────────────────────────────────────
// lib/api.ts — Ripple Backend API Client
// Standardized client for communicating with Ripple Backend Platform
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UserProfileData {
  id: string;
  github_user_id: string | null;
  username: string;
  email: string;
  has_github_auth: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectedRepo {
  id: string;
  github_repo_id: string;
  github_url: string;
  owner_id: string;
  name: string;
  full_name: string;
  default_branch: string;
  indexed_status: 'pending' | 'indexing' | 'complete' | 'failed';
  last_indexed_commit: string | null;
  created_at: string;
  updated_at: string;
}

export class ApiClient {
  public static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ripple_auth_token');
    }
    return null;
  }

  public static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ripple_auth_token', token);
      window.dispatchEvent(new Event('ripple_auth_changed'));
    }
  }

  public static clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ripple_auth_token');
      localStorage.removeItem('ripple_user_profile');
      window.dispatchEvent(new Event('ripple_auth_changed'));
    }
  }

  public static getStoredUser(): UserProfileData | null {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('ripple_user_profile');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  public static setStoredUser(user: UserProfileData): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ripple_user_profile', JSON.stringify(user));
      window.dispatchEvent(new Event('ripple_auth_changed'));
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = json?.error?.message || json?.message || `HTTP ${response.status} Error`;
        const err: any = new Error(errorMsg);
        err.code = json?.error?.code;
        err.status = response.status;
        throw err;
      }

      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      // If server unreachable, provide user-friendly error
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to Ripple backend server (http://localhost:4000). Please verify backend is running.');
      }
      throw err;
    }
  }

  // ── Health ──
  public static async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request('/health');
  }

  // ── Auth ──
  public static async signup(username: string, email: string, password: string): Promise<{ user: UserProfileData; tokens: { token: string; expiresIn: string } }> {
    const res = await this.request<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (res?.tokens?.token) {
      this.setToken(res.tokens.token);
    }
    if (res?.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  public static async login(email: string, password: string): Promise<{ user: UserProfileData; tokens: { token: string; expiresIn: string } }> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res?.tokens?.token) {
      this.setToken(res.tokens.token);
    }
    if (res?.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  public static async getMe(): Promise<UserProfileData> {
    const user = await this.request<UserProfileData>('/auth/me');
    if (user) {
      this.setStoredUser(user);
    }
    return user;
  }

  public static async getGoogleOAuthUrl(): Promise<{ url: string; state: string }> {
    return this.request<{ url: string; state: string }>('/auth/google');
  }

  public static async googleDirectLogin(email: string, name?: string): Promise<{ user: UserProfileData; tokens: { token: string; expiresIn: string } }> {
    const res = await this.request<any>('/auth/google/direct', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
    if (res?.tokens?.token) {
      this.setToken(res.tokens.token);
    }
    if (res?.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  public static async handleGoogleCallback(code: string): Promise<{ user: UserProfileData; tokens: { token: string; expiresIn: string } }> {
    const res = await this.request<any>(`/auth/google/callback?code=${encodeURIComponent(code)}`);
    if (res?.tokens?.token) {
      this.setToken(res.tokens.token);
    }
    if (res?.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  public static async getGithubOAuthUrl(): Promise<{ url: string; state: string }> {
    return this.request<{ url: string; state: string }>('/auth/github');
  }

  public static async handleGithubCallback(code: string): Promise<{ user: UserProfileData; tokens: { token: string; expiresIn: string } }> {
    const res = await this.request<any>(`/auth/github/callback?code=${encodeURIComponent(code)}`);
    if (res?.tokens?.token) {
      this.setToken(res.tokens.token);
    }
    if (res?.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  // ── Repositories ──
  public static async listRepos(): Promise<ConnectedRepo[]> {
    return this.request<ConnectedRepo[]>('/repos');
  }

  public static async connectRepo(payload: {
    github_url: string;
    personal_access_token?: string;
    name?: string;
    full_name?: string;
    default_branch?: string;
  }): Promise<ConnectedRepo> {
    return this.request<ConnectedRepo>('/repos/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getRepoById(repoId: string): Promise<ConnectedRepo> {
    return this.request<ConnectedRepo>(`/repos/${repoId}`);
  }

  public static async getRepoStatus(repoId: string): Promise<{
    id: string;
    name: string;
    full_name: string;
    indexed_status: string;
    last_indexed_commit: string | null;
    updated_at: string;
  }> {
    return this.request(`/repos/${repoId}/status`);
  }

  public static async deleteRepo(repoId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/repos/${repoId}`, {
      method: 'DELETE',
    });
  }

  public static async updateProfile(updates: { username?: string; avatar?: string | null; bio?: string | null }): Promise<UserProfileData> {
    const user = await this.request<UserProfileData>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (user) {
      this.setStoredUser(user);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ripple_profile_updated', { detail: user }));
      }
    }
    return user;
  }

  // ── Q&A ──
  public static async askQuestion(repoId: string, question: string, commitHash?: string): Promise<{
    repoId: string;
    question: string;
    answer: string;
    sources: Array<{ file: string; lineStart: number; lineEnd: number; snippet: string }>;
    confidence: number;
    cached: boolean;
  }> {
    return this.request('/qa', {
      method: 'POST',
      body: JSON.stringify({ repo_id: repoId, question, commit_hash: commitHash }),
    });
  }

  public static async getQAHistory(repoId: string): Promise<Array<{
    id: string;
    repo_id: string;
    question: string;
    answer: string;
    citations: Array<{ file: string; startLine: number; endLine: number; snippet?: string }>;
    created_at: string;
  }>> {
    return this.request(`/qa/history?repoId=${encodeURIComponent(repoId)}`);
  }

  // ── Activity ──
  public static async getActivityLog(limit = 50): Promise<Array<{
    id: string;
    user_id: string;
    type: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
    created_at: string;
  }>> {
    return this.request(`/activity?limit=${limit}`);
  }

  // ── Impact Report ──
  public static async generateImpactReport(repoId: string, diffRef: string, changedFiles?: string[]): Promise<{
    reportId: string;
    repoId: string;
    diffRef: string;
    summary: string;
    riskScore: number;
    affectedSymbols: string[];
    blastRadius: string[];
    recommendations: string[];
    cached: boolean;
  }> {
    return this.request('/impact-report', {
      method: 'POST',
      body: JSON.stringify({ repo_id: repoId, diff_ref: diffRef, changed_files: changedFiles }),
    });
  }
}
