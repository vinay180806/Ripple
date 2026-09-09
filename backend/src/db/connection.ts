import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class Database {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    try {
      this.pool = new Pool({
        connectionString: env.DATABASE_URL,
        max: env.DB_MAX_CONNECTIONS,
        idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      });

      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle PostgreSQL client', {}, err);
      });
    } catch (err) {
      logger.warn('Failed to initialize PostgreSQL pool', {}, err as Error);
    }
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed DB query', { text, duration, rows: res.rowCount });
      return res;
    } catch (err) {
      logger.error(`Database query failed: ${text}`, { params }, err as Error);
      throw err;
    }
  }

  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const res = await this.pool.query('SELECT 1 as healthy');
      this.isConnected = res.rows.length > 0;
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('PostgreSQL connection pool closed');
    }
  }
}

export const db = new Database();
