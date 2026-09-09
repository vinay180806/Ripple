import { cacheService } from '../../src/services/cache.service';

describe('Phase 13: Redis Cache Service & Invalidation Tests', () => {
  beforeEach(async () => {
    cacheService.clearMemory();
  });

  it('should set, get, and delete cached items with deterministic keys', async () => {
    const key = cacheService.generateKey('qa', 'repo_1', 'commit_1', 'long query question that will be hashed');
    expect(key).toContain('qa:repo_1:commit_1:');

    await cacheService.set(key, { answer: 'sample' }, 60);

    const retrieved = await cacheService.get<{ answer: string }>(key);
    expect(retrieved).toEqual({ answer: 'sample' });

    await cacheService.delete(key);
    const afterDelete = await cacheService.get(key);
    expect(afterDelete).toBeNull();
  });

  it('should invalidate cache keys matching pattern', async () => {
    await cacheService.set('qa:repo_123:c1:hashA', { a: 1 });
    await cacheService.set('qa:repo_123:c2:hashB', { b: 2 });
    await cacheService.set('impact:repo_123:diffA', { c: 3 });
    await cacheService.set('qa:repo_456:c1:hashC', { d: 4 });

    await cacheService.deletePattern('qa:repo_123:*');

    expect(await cacheService.get('qa:repo_123:c1:hashA')).toBeNull();
    expect(await cacheService.get('qa:repo_123:c2:hashB')).toBeNull();
    expect(await cacheService.get('impact:repo_123:diffA')).toBeDefined();
    expect(await cacheService.get('qa:repo_456:c1:hashC')).toBeDefined();
  });
});
