import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// In development & test environments, skip rate limiting to prevent developer lockout.
const isDevOrTest = () => env.NODE_ENV !== 'production';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  skip: isDevOrTest,
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  skip: isDevOrTest,
});

export const qaRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.QA_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    error: {
      code: 'QA_RATE_LIMIT_EXCEEDED',
      message: 'Too many Q&A queries submitted, please try again later.',
    },
  },
  skip: isDevOrTest,
});

export const impactRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.QA_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    error: {
      code: 'IMPACT_RATE_LIMIT_EXCEEDED',
      message: 'Too many impact reports requested, please try again later.',
    },
  },
  skip: isDevOrTest,
});
