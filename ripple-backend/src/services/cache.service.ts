import Redis from 'ioredis';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class CacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private warnedOffline = false;
  // Fallback in-memory cache for standalone execution when Redis is not running
  private memoryFallback = new Map<string, { value: string; expiresAt?: number }>();

  constructor() {
    this.initRedis();
  }

  public initRedis(): Redis | null {
    if (this.client) return this.client;
    try {
      this.client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null, // Do not spam reconnects if Redis server is not running
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.warnedOffline = false;
        logger.info('Connected to Redis server');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        if (!this.warnedOffline) {
          logger.info('Redis server is offline. Local memory cache is active.');
          this.warnedOffline = true;
        }
      });

      // Attempt initial connection asynchronously
      this.client.connect().catch(() => {
        if (!this.warnedOffline) {
          logger.info('Redis server is offline. Local memory cache is active.');
          this.warnedOffline = true;
        }
      });
      return this.client;
    } catch {
      return null;
    }
  }

  public generateKey(prefix: string, ...parts: string[]): string {
    const sanitizedParts = parts.map((part) => {
      if (part.length > 32) {
        return crypto.createHash('sha256').update(part).digest('hex').substring(0, 16);
      }
      return part.replace(/[^a-zA-Z0-9_-]/g, '_');
    });
    return `${prefix}:${sanitizedParts.join(':')}`;
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch {
        // Fallback to memory
      }
    }

    // Memory fallback
    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  public async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds > 0) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }

    // Memory fallback
    this.memoryFallback.set(key, {
      value: serialized,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  public async delete(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fallback
      }
    }
    this.memoryFallback.delete(key);
  }

  public async deletePattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {
        // Fallback
      }
    }

    // Memory fallback matching
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of Array.from(this.memoryFallback.keys())) {
      if (regex.test(key)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const res = await this.client.ping();
        return res === 'PONG';
      } catch {
        return false;
      }
    }
    return false;
  }

  public getRedisClient(): Redis | null {
    return this.client;
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.client = null;
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  public clearMemory(): void {
    this.memoryFallback.clear();
  }
}

export const cacheService = new CacheService();
