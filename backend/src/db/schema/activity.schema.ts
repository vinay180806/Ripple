import crypto from 'crypto';
import { DiskStorage } from '../disk.storage';
import { env } from '../../config/env';

export type ActivityType = 'repo_connected' | 'repo_indexed' | 'qa_query' | 'impact_analyzed';

export interface ActivityRow {
  id: string;
  user_id: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface CreateActivityInput {
  user_id: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

const diskActivity = new DiskStorage<ActivityRow>('activity.json');
const testMemoryActivity = new Map<string, ActivityRow>();

function getActivityStore() {
  return env.NODE_ENV === 'test' ? testMemoryActivity : diskActivity;
}

export class ActivityRepository {
  public static async create(input: CreateActivityInput): Promise<ActivityRow> {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: ActivityRow = {
      id,
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      description: input.description,
      metadata: input.metadata || {},
      created_at: now,
    };

    const store = getActivityStore();
    store.set(id, record);
    return record;
  }

  public static async findByUserId(userId: string, limit = 50): Promise<ActivityRow[]> {
    const store = getActivityStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all
      .filter((a) => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  public static async clear(): Promise<void> {
    const store = getActivityStore();
    store.clear();
  }
}
