import crypto from 'crypto';
import { DiskStorage } from '../disk.storage';
import { env } from '../../config/env';

export interface QACitation {
  file: string;
  startLine: number;
  endLine: number;
  snippet?: string;
}

export interface QAHistoryRow {
  id: string;
  user_id: string;
  repo_id: string;
  question: string;
  answer: string;
  citations: QACitation[];
  created_at: Date;
}

export interface CreateQAHistoryInput {
  user_id: string;
  repo_id: string;
  question: string;
  answer: string;
  citations?: QACitation[];
}

const diskQA = new DiskStorage<QAHistoryRow>('qa_history.json');
const testMemoryQA = new Map<string, QAHistoryRow>();

function getQAStore() {
  return env.NODE_ENV === 'test' ? testMemoryQA : diskQA;
}

export class QAHistoryRepository {
  public static async create(input: CreateQAHistoryInput): Promise<QAHistoryRow> {
    const id = crypto.randomUUID();
    const now = new Date();

    const newRecord: QAHistoryRow = {
      id,
      user_id: input.user_id,
      repo_id: input.repo_id,
      question: input.question,
      answer: input.answer,
      citations: input.citations || [],
      created_at: now,
    };

    const store = getQAStore();
    store.set(id, newRecord);
    return newRecord;
  }

  public static async findByUserAndRepo(userId: string, repoId: string): Promise<QAHistoryRow[]> {
    const store = getQAStore();
    const all = store instanceof Map ? Array.from(store.values()) : store.getAll();
    return all
      .filter((q) => q.user_id === userId && q.repo_id === repoId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public static async clear(): Promise<void> {
    const store = getQAStore();
    store.clear();
  }
}
