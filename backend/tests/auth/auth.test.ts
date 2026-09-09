import request from 'supertest';
import { createApp } from '../../src/app';
import { UserRepository } from '../../src/db/schema/users.schema';
import { SessionRepository } from '../../src/db/schema/sessions.schema';

describe('Phase 3 & 4: Authentication & GitHub OAuth Tests', () => {
  const app = createApp();

  beforeEach(async () => {
    await UserRepository.clear();
    await SessionRepository.clear();
  });

  describe('POST /auth/signup', () => {
    it('should register a new user, return JWT and sanitize password_hash', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          username: 'johndoe',
          email: 'john@example.com',
          password: 'securePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe('johndoe');
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.user.password_hash).toBeUndefined(); // Sensitive field redacted
      expect(res.body.data.tokens.token).toBeDefined();
      expect(res.body.data.tokens.expiresIn).toBeDefined();
    });

    it('should reject signup with duplicate email (409 Conflict)', async () => {
      await request(app).post('/auth/signup').send({
        username: 'john1',
        email: 'duplicate@example.com',
        password: 'password123',
      });

      const res = await request(app).post('/auth/signup').send({
        username: 'john2',
        email: 'DUPLICATE@example.com',
        password: 'password456',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should reject invalid email or short password (400 Bad Request)', async () => {
      const res = await request(app).post('/auth/signup').send({
        username: 'j',
        email: 'invalid-email',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/signup').send({
        username: 'tester',
        email: 'tester@example.com',
        password: 'correctPassword123',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'tester@example.com',
        password: 'correctPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.user.email).toBe('tester@example.com');
      expect(res.body.data.tokens.token).toBeDefined();
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'tester@example.com',
        password: 'wrongPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'anyPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me (Protected Route)', () => {
    let authToken: string;

    beforeEach(async () => {
      const signupRes = await request(app).post('/auth/signup').send({
        username: 'protectedUser',
        email: 'protected@example.com',
        password: 'password12345',
      });
      authToken = signupRes.body.data.tokens.token;
    });

    it('should return user profile for authenticated request', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.email).toBe('protected@example.com');
      expect(res.body.data.username).toBe('protectedUser');
    });

    it('should reject request without Authorization header (401)', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid Bearer token (401)', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /auth/github (OAuth URL)', () => {
    it('should return GitHub OAuth authorization URL with state', async () => {
      const res = await request(app).get('/auth/github');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.url).toContain('https://github.com/login/oauth/authorize');
      expect(res.body.data.state).toBeDefined();
    });
  });
});
