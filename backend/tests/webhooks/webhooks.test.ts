import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { UserRepository } from '../../src/db/schema/users.schema';
import { RepoRepository } from '../../src/db/schema/repos.schema';

describe('Phase 9: GitHub Webhooks Tests', () => {
  const app = createApp();
  let repoId: string;
  const githubRepoId = '777888999';

  beforeEach(async () => {
    await UserRepository.clear();
    await RepoRepository.clear();

    const user = await UserRepository.create({
      username: 'whUser',
      email: 'wh@example.com',
    });

    const repo = await RepoRepository.create({
      github_repo_id: githubRepoId,
      github_url: 'https://github.com/whUser/test-webhook-repo',
      owner_id: user.id,
      name: 'test-webhook-repo',
      full_name: 'whUser/test-webhook-repo',
    });
    repoId = repo.id;
  });

  function generateSignature(payload: object): string {
    const json = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET);
    return `sha256=${hmac.update(json).digest('hex')}`;
  }

  it('should accept valid signature and process push event for linked repo', async () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'sha_new_commit_456',
      repository: {
        id: Number(githubRepoId),
        name: 'test-webhook-repo',
        full_name: 'whUser/test-webhook-repo',
        default_branch: 'main',
      },
      head_commit: {
        id: 'sha_new_commit_456',
        message: 'fix: update payment logic',
        timestamp: new Date().toISOString(),
        author: {
          name: 'Developer',
          email: 'dev@example.com',
        },
        added: ['src/payment.ts'],
        removed: [],
        modified: ['src/checkout.ts'],
      },
    };

    const signature = generateSignature(payload);

    const res = await request(app)
      .post('/webhooks/github')
      .set('X-Hub-Signature-256', signature)
      .set('X-GitHub-Event', 'push')
      .send(payload);

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.enqueued).toBe(true);
    expect(res.body.data.repoId).toBe(repoId);
    expect(res.body.data.changedFilesCount).toBe(2);
  });

  it('should reject webhook with invalid signature (401 Unauthorized)', async () => {
    const payload = { test: true };
    const res = await request(app)
      .post('/webhooks/github')
      .set('X-Hub-Signature-256', 'sha256=invalid_signature_hex')
      .set('X-GitHub-Event', 'push')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('should acknowledge ping events with valid signature', async () => {
    const payload = { zen: 'Keep it simple.' };
    const signature = generateSignature(payload);

    const res = await request(app)
      .post('/webhooks/github')
      .set('X-Hub-Signature-256', signature)
      .set('X-GitHub-Event', 'ping')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('ping received');
  });

  it('should safely skip push events for unlinked repositories', async () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'sha_999',
      repository: {
        id: 999999999,
        name: 'unlinked-repo',
        full_name: 'unknown/unlinked-repo',
        default_branch: 'main',
      },
    };
    const signature = generateSignature(payload);

    const res = await request(app)
      .post('/webhooks/github')
      .set('X-Hub-Signature-256', signature)
      .set('X-GitHub-Event', 'push')
      .send(payload);

    expect(res.status).toBe(202);
    expect(res.body.data.enqueued).toBe(false);
  });
});
