import request from 'supertest';
import { createApp } from '../../src/app';
import { UserRepository } from '../../src/db/schema/users.schema';
import { RepoRepository } from '../../src/db/schema/repos.schema';
import { SessionRepository } from '../../src/db/schema/sessions.schema';

describe('Phase 5: Repository Management Tests', () => {
  const app = createApp();
  let userToken1: string;
  let userToken2: string;

  beforeEach(async () => {
    await UserRepository.clear();
    await RepoRepository.clear();
    await SessionRepository.clear();

    const u1 = await request(app).post('/auth/signup').send({
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123',
    });
    userToken1 = u1.body.data.tokens.token;

    const u2 = await request(app).post('/auth/signup').send({
      username: 'user2',
      email: 'user2@example.com',
      password: 'password123',
    });
    userToken2 = u2.body.data.tokens.token;
  });

  describe('POST /repos/connect', () => {
    it('should connect a new repository with pending status', async () => {
      const res = await request(app)
        .post('/repos/connect')
        .set('Authorization', `Bearer ${userToken1}`)
        .send({
          github_repo_id: '987654',
          github_url: 'https://github.com/user1/test-repo',
          name: 'test-repo',
          full_name: 'user1/test-repo',
          default_branch: 'main',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.name).toBe('test-repo');
      expect(res.body.data.indexed_status).toBe('pending');
    });

    it('should reject connecting a repo already owned by another user (409 Conflict)', async () => {
      await request(app)
        .post('/repos/connect')
        .set('Authorization', `Bearer ${userToken1}`)
        .send({
          github_repo_id: '987654',
          github_url: 'https://github.com/org/shared-repo',
          name: 'shared-repo',
          full_name: 'org/shared-repo',
        });

      const res = await request(app)
        .post('/repos/connect')
        .set('Authorization', `Bearer ${userToken2}`)
        .send({
          github_repo_id: '987654',
          github_url: 'https://github.com/org/shared-repo',
          name: 'shared-repo',
          full_name: 'org/shared-repo',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REPO_ALREADY_CONNECTED');
    });
  });

  describe('GET /repos and GET /repos/:id', () => {
    let repoId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/repos/connect')
        .set('Authorization', `Bearer ${userToken1}`)
        .send({
          github_repo_id: '111222',
          github_url: 'https://github.com/user1/repo-alpha',
          name: 'repo-alpha',
          full_name: 'user1/repo-alpha',
        });
      repoId = res.body.data.id;
    });

    it('should list all connected repositories for the authenticated user', async () => {
      const res = await request(app)
        .get('/repos')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(repoId);
    });

    it('should get repository details by ID', async () => {
      const res = await request(app)
        .get(`/repos/${repoId}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('repo-alpha');
    });

    it('should forbid user2 from accessing user1 repository (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/repos/${repoId}`)
        .set('Authorization', `Bearer ${userToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return repository indexing status', async () => {
      const res = await request(app)
        .get(`/repos/${repoId}/status`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(['pending', 'indexing', 'complete']).toContain(res.body.data.indexed_status);
    });

    it('should delete connected repository', async () => {
      const delRes = await request(app)
        .delete(`/repos/${repoId}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(delRes.status).toBe(200);

      const getRes = await request(app)
        .get(`/repos/${repoId}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(getRes.status).toBe(404);
    });
  });
});
