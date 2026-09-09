import request from 'supertest';
import { createApp } from '../../src/app';
import { UserRepository } from '../../src/db/schema/users.schema';
import { RepoRepository } from '../../src/db/schema/repos.schema';
import { SessionRepository } from '../../src/db/schema/sessions.schema';
import { cacheService } from '../../src/services/cache.service';

describe('Phase 12: Impact Report API Boundary Tests', () => {
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
      username: 'impactUser',
      email: 'impact@example.com',
      password: 'password123',
    });
    userToken = u1.body.data.tokens.token;

    const u2 = await request(app).post('/auth/signup').send({
      username: 'impactUser2',
      email: 'impact2@example.com',
      password: 'password123',
    });
    otherUserToken = u2.body.data.tokens.token;

    const repoRes = await request(app)
      .post('/repos/connect')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        github_repo_id: '444555',
        github_url: 'https://github.com/impactUser/impact-project',
        name: 'impact-project',
        full_name: 'impactUser/impact-project',
      });
    repoId = repoRes.body.data.id;
  });

  it('should generate impact report and cache response', async () => {
    // 1. Initial Request (Cache Miss)
    const res1 = await request(app)
      .post('/impact-report')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        repo_id: repoId,
        diff_ref: 'HEAD~1..HEAD',
        changed_files: ['src/services/payment.ts'],
      });

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('ok');
    expect(res1.body.data.reportId).toBeDefined();
    expect(res1.body.data.riskScore).toBeDefined();
    expect(res1.body.data.blastRadius.length).toBeGreaterThan(0);
    expect(res1.body.data.cached).toBe(false);

    // 2. Subsequent Request (Cache Hit)
    const res2 = await request(app)
      .post('/impact-report')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        repo_id: repoId,
        diff_ref: 'HEAD~1..HEAD',
        changed_files: ['src/services/payment.ts'],
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.cached).toBe(true);
    expect(res2.body.data.reportId).toEqual(res1.body.data.reportId);
  });

  it('should reject impact report for unauthorized user (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/impact-report')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        repo_id: repoId,
        diff_ref: 'main..feat',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
