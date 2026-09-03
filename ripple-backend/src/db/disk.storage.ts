import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class DiskStorage<T extends { id: string }> {
  private filePath: string;
  private cache: Map<string, T> = new Map();
  private isLoaded = false;

  constructor(filename: string) {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        logger.warn(`Could not create data directory at ${dataDir}`, {}, err as Error);
      }
    }
    this.filePath = path.join(dataDir, filename);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw.trim()) {
          const items: T[] = JSON.parse(raw);
          this.cache.clear();
          for (const item of items) {
            this.cache.set(item.id, item);
          }
        }
      }
      this.isLoaded = true;
    } catch (err) {
      logger.error(`Failed to load disk storage from ${this.filePath}`, {}, err as Error);
      this.cache.clear();
      this.isLoaded = true;
    }
  }

  private persist(): void {
    try {
      const items = Array.from(this.cache.values());
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(items, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      logger.error(`Failed to persist disk storage to ${this.filePath}`, {}, err as Error);
    }
  }

  public getAll(): T[] {
    if (!this.isLoaded) this.load();
    return Array.from(this.cache.values());
  }

  public getById(id: string): T | null {
    if (!this.isLoaded) this.load();
    return this.cache.get(id) || null;
  }

  public set(id: string, item: T): void {
    if (!this.isLoaded) this.load();
    this.cache.set(id, item);
    this.persist();
  }

  public delete(id: string): boolean {
    if (!this.isLoaded) this.load();
    const result = this.cache.delete(id);
    if (result) {
      this.persist();
    }
    return result;
  }

  public clear(): void {
    this.cache.clear();
    this.persist();
  }
}
