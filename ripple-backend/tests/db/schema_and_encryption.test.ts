import { encryptToken, decryptToken } from '../../src/utils/encryption';
import { UserRepository } from '../../src/db/schema/users.schema';
import { RepoRepository } from '../../src/db/schema/repos.schema';
import { SessionRepository } from '../../src/db/schema/sessions.schema';

describe('Phase 2: Database Schema & Encryption Tests', () => {
  beforeEach(async () => {
    await UserRepository.clear();
    await RepoRepository.clear();
    await SessionRepository.clear();
  });

  describe('Token Encryption Utility (AES-256-GCM)', () => {
    it('should correctly encrypt and decrypt GitHub access tokens', () => {
      const plainToken = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';
      const encrypted = encryptToken(plainToken);

      expect(encrypted).not.toBe(plainToken);
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plainToken);
    });

    it('should handle empty input gracefully', () => {
      expect(encryptToken('')).toBe('');
      expect(decryptToken('')).toBe('');
    });
  });

  describe('User Repository', () => {
    it('should create and retrieve user by email and ID', async () => {
      const user = await UserRepository.create({
        username: 'alice',
        email: 'alice@example.com',
        password_hash: 'hashed_password_123',
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('alice');
      expect(user.email).toBe('alice@example.com');

      const byEmail = await UserRepository.findByEmail('ALICE@example.com');
      expect(byEmail?.id).toBe(user.id);

      const byId = await UserRepository.findById(user.id);
      expect(byId?.username).toBe('alice');
    });

    it('should reject duplicate email insertion', async () => {
      await UserRepository.create({
        username: 'alice',
        email: 'alice@example.com',
        password_hash: 'hash1',
      });

      await expect(
        UserRepository.create({
          username: 'alice2',
          email: 'alice@example.com',
          password_hash: 'hash2',
        })
      ).rejects.toThrow();
    });
  });

  describe('Repo Repository', () => {
    it('should create repo with default pending status and update status', async () => {
      const user = await UserRepository.create({
        username: 'bob',
        email: 'bob@example.com',
      });

      const repo = await RepoRepository.create({
        github_repo_id: '123456',
        github_url: 'https://github.com/bob/my-project',
        owner_id: user.id,
        name: 'my-project',
        full_name: 'bob/my-project',
      });

      expect(repo.indexed_status).toBe('pending');
      expect(repo.default_branch).toBe('main');

      const updated = await RepoRepository.updateStatus(repo.id, 'indexing');
      expect(updated?.indexed_status).toBe('indexing');

      const completed = await RepoRepository.updateStatus(repo.id, 'complete', 'a1b2c3d4');
      expect(completed?.indexed_status).toBe('complete');
      expect(completed?.last_indexed_commit).toBe('a1b2c3d4');
    });
  });

  describe('Session Repository', () => {
    it('should create, find, and delete sessions', async () => {
      const user = await UserRepository.create({
        username: 'charlie',
        email: 'charlie@example.com',
      });

      const expiresAt = new Date(Date.now() + 3600 * 1000);
      const session = await SessionRepository.create({
        user_id: user.id,
        token: 'test_session_jwt_token',
        expires_at: expiresAt,
      });

      const found = await SessionRepository.findByToken('test_session_jwt_token');
      expect(found?.user_id).toBe(user.id);

      await SessionRepository.deleteByToken('test_session_jwt_token');
      const deleted = await SessionRepository.findByToken('test_session_jwt_token');
      expect(deleted).toBeNull();
    });
  });
});
