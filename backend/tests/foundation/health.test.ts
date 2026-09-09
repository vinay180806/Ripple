import request from 'supertest';
import { createApp } from '../../src/app';
import { notFoundHandler, errorHandler } from '../../src/middleware/error.middleware';

describe('Phase 1: Backend Foundation Tests', () => {
  const app = createApp();
  app.use(notFoundHandler);
  app.use(errorHandler);

  it('GET /health should return 200 and health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'ripple-backend',
    });
  });

  it('GET /non-existent-route should return 404 with standard error structure', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
