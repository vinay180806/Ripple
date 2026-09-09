import { db } from '../connection';
import crypto from 'crypto';
import { DiskStorage } from '../disk.storage';
import { env } from '../../config/env';

export interface UserRow {
  id: string;
  github_user_id: string | null;
  username: string;
  email: string;
  password_hash: string | null;
  github_access_token_encrypted: string | null;
  avatar?: string | null;
  bio?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  github_user_id?: string | null;
  username: string;
  email: string;
  password_hash?: string | null;
  github_access_token_encrypted?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

export interface UpdateProfileInput {
  username?: string;
  avatar?: string | null;
  bio?: string | null;
}

// Persistent fallback storage for offline dev and in-memory for testing
const diskUsers = new DiskStorage<UserRow>('users.json');
const testMemoryUsers = new Map<string, UserRow>();

function getUsersStore() {
  return env.NODE_ENV === 'test' ? testMemoryUsers : diskUsers;
}

export class UserRepository {
  public static async create(input: CreateUserInput): Promise<UserRow> {
    const id = crypto.randomUUID();
    const now = new Date();

    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>(
        `INSERT INTO users (id, github_user_id, username, email, password_hash, github_access_token_encrypted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          input.github_user_id || null,
          input.username,
          input.email.toLowerCase(),
          input.password_hash || null,
          input.github_access_token_encrypted || null,
          now,
          now,
        ]
      );
      return res.rows[0];
    }

    // Disk / memory store
    const store = getUsersStore();
    const allUsers = store instanceof Map ? Array.from(store.values()) : store.getAll();
    const existing = allUsers.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      const error: any = new Error('duplicate key value violates unique constraint "users_email_key"');
      error.code = '23505';
      throw error;
    }

    const newUser: UserRow = {
      id,
      github_user_id: input.github_user_id || null,
      username: input.username,
      email: input.email.toLowerCase(),
      password_hash: input.password_hash || null,
      github_access_token_encrypted: input.github_access_token_encrypted || null,
      avatar: input.avatar || null,
      bio: input.bio || null,
      created_at: now,
      updated_at: now,
    };

    if (store instanceof Map) {
      store.set(id, newUser);
    } else {
      store.set(id, newUser);
    }

    return newUser;
  }

  public static async findById(id: string): Promise<UserRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    const store = getUsersStore();
    return store instanceof Map ? store.get(id) || null : store.getById(id);
  }

  public static async findByEmail(email: string): Promise<UserRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] || null;
    }

    const store = getUsersStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public static async findByGithubId(githubUserId: string): Promise<UserRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>('SELECT * FROM users WHERE github_user_id = $1', [githubUserId]);
      return res.rows[0] || null;
    }

    const store = getUsersStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all.find((u) => u.github_user_id === githubUserId) || null;
  }

  public static async updateGithubToken(id: string, encryptedToken: string, githubUserId?: string): Promise<UserRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>(
        `UPDATE users 
         SET github_access_token_encrypted = $1, 
             github_user_id = COALESCE($2, github_user_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [encryptedToken, githubUserId || null, id]
      );
      return res.rows[0] || null;
    }

    const user = await this.findById(id);
    if (!user) return null;
    user.github_access_token_encrypted = encryptedToken;
    if (githubUserId) user.github_user_id = githubUserId;
    user.updated_at = new Date();

    const store = getUsersStore();
    store.set(id, user);
    return user;
  }

  public static async updateProfile(id: string, updates: UpdateProfileInput): Promise<UserRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>(
        `UPDATE users
         SET username = COALESCE($1, username),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [updates.username || null, id]
      );
      return res.rows[0] || null;
    }

    const user = await this.findById(id);
    if (!user) return null;

    if (updates.username !== undefined) user.username = updates.username;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if (updates.bio !== undefined) user.bio = updates.bio;
    user.updated_at = new Date();

    const store = getUsersStore();
    store.set(id, user);
    return user;
  }

  public static async setPassword(id: string, passwordHash: string): Promise<UserRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<UserRow>(
        `UPDATE users
         SET password_hash = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [passwordHash, id]
      );
      return res.rows[0] || null;
    }

    const user = await this.findById(id);
    if (!user) return null;
    user.password_hash = passwordHash;
    user.updated_at = new Date();

    const store = getUsersStore();
    store.set(id, user);
    return user;
  }

  public static async clear(): Promise<void> {
    const store = getUsersStore();
    store.clear();
  }
}
