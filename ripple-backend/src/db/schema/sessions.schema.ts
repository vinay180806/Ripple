import { db } from '../connection';
import crypto from 'crypto';

export interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface CreateSessionInput {
  user_id: string;
  token: string;
  expires_at: Date;
}

const memorySessions = new Map<string, SessionRow>();

export class SessionRepository {
  public static async create(input: CreateSessionInput): Promise<SessionRow> {
    const id = crypto.randomUUID();
    const now = new Date();

    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<SessionRow>(
        `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, input.user_id, input.token, input.expires_at, now]
      );
      return res.rows[0];
    }

    const newSession: SessionRow = {
      id,
      user_id: input.user_id,
      token: input.token,
      expires_at: input.expires_at,
      created_at: now,
    };
    memorySessions.set(input.token, newSession);
    return newSession;
  }

  public static async findByToken(token: string): Promise<SessionRow | null> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query<SessionRow>(
        'SELECT * FROM sessions WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
        [token]
      );
      return res.rows[0] || null;
    }

    const session = memorySessions.get(token);
    if (!session) return null;
    if (new Date() > session.expires_at) {
      memorySessions.delete(token);
      return null;
    }
    return session;
  }

  public static async deleteByToken(token: string): Promise<boolean> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      const res = await db.query('DELETE FROM sessions WHERE token = $1', [token]);
      return (res.rowCount ?? 0) > 0;
    }

    return memorySessions.delete(token);
  }

  public static async deleteByUserId(userId: string): Promise<void> {
    const isConnected = await db.healthCheck();
    if (isConnected) {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      return;
    }

    for (const [token, session] of memorySessions.entries()) {
      if (session.user_id === userId) {
        memorySessions.delete(token);
      }
    }
  }

  public static async clear(): Promise<void> {
    memorySessions.clear();
  }
}
