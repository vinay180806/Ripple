import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  
  // PostgreSQL Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ripple'),
  DB_MAX_CONNECTIONS: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(5000),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT & Security
  JWT_SECRET: z.string().min(16).default('development_super_secret_jwt_key_32_bytes_long_ripple'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // 32-byte hexadecimal key (64 characters) for AES-256-GCM encryption
  TOKEN_ENCRYPTION_KEY: z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default('mock_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().default('mock_google_client_secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/auth/google/callback'),

  // GitHub OAuth & Webhooks (For connecting repo & linking inside dashboard)
  GITHUB_CLIENT_ID: z.string().default('mock_github_client_id'),
  GITHUB_CLIENT_SECRET: z.string().default('mock_github_client_secret'),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:4000/auth/github/callback'),
  GITHUB_WEBHOOK_SECRET: z.string().default('mock_github_webhook_secret_key'),

  // Track A & Track B Boundaries (Integration URLs)
  TRACK_A_URL: z.string().url().default('http://localhost:5001'),
  TRACK_B_URL: z.string().url().default('http://localhost:5002'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
  QA_RATE_LIMIT_MAX: z.coerce.number().default(30),

  // Workspace
  WORKSPACE_DIR: z.string().default(path.resolve(process.cwd(), 'tmp_workspaces')),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.format();
    console.error('Environment configuration validation failed:', JSON.stringify(errorDetails, null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
