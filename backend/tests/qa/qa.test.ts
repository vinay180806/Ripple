import request from 'supertest';
import { createApp } from '../../src/app';
import { UserRepository } from '../../src/db/schema/users.schema';
import { RepoRepository } from '../../src/db/schema/repos.schema';
import { SessionRepository } from '../../src/db/schema/sessions.schema';
import { cacheService } from '../../src/services/cache.service';

describe('Phase 11: Q&A API Boundary & Caching Tests', () => {
  const app = createApp();
  let userToken: string;
  let otherUserToken: string;
  let repoId: string;

  beforeEach(async () => {
    await UserRepository.clear();
    await RepoRepository.clear();
    await SessionRepository.clear();
    cacheService.clearMemory();

    const u1 = await request(app).post('/auth/signup').send({
      username: 'qaUser',
      email: 'qa@example.com',
      password: 'password123',
    });
    userToken = u1.body.data.tokens.token;

    const u2 = await request(app).post('/auth/signup').send({
      username: 'qaUser2',
      email: 'qa2@example.com',
      password: 'password123',
    });
    otherUserToken = u2.body.data.tokens.token;

    const repoRes = await request(app)
      .post('/repos/connect')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        github_repo_id: '123999',
        github_url: 'https://github.com/qaUser/qa-project',
        name: 'qa-project',
        full_name: 'qaUser/qa-project',
      });
    repoId = repoRes.body.data.id;
  });

  it('should answer question and cache subsequent identical queries', async () => {
    // 1. Initial Q&A request (Cache Miss)
    const res1 = await request(app)
      .post('/qa')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        repo_id: repoId,
        question: 'How does session authentication work?',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('ok');
    expect(res1.body.data.answer).toBeDefined();
    expect(res1.body.data.sources.length).toBeGreaterThan(0);
    expect(res1.body.data.cached).toBe(false);

    // 2. Second identical request (Cache Hit)
    const res2 = await request(app)
      .post('/qa')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        repo_id: repoId,
        question: 'How does session authentication work?',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.cached).toBe(true);
    expect(res2.body.data.answer).toEqual(res1.body.data.answer);
  });

  it('should reject Q&A request from unauthorized user (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/qa')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        repo_id: repoId,
        question: 'Explain the architecture',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should validate request payload', async () => {
    const res = await request(app)
      .post('/qa')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        repo_id: repoId,
        question: 'a', // Too short
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
