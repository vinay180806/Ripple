import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';
import { authRouter } from './routes/auth.routes';
import { repoRouter } from './routes/repo.routes';
import { webhookRouter } from './routes/webhook.routes';
import { qaRouter } from './routes/qa.routes';
import { impactRouter } from './routes/impact.routes';
import { activityRouter } from './routes/activity.routes';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256', 'X-GitHub-Event'],
  }));

  // JSON and Raw Body Parsing for Webhooks
  app.use(express.json({
    limit: '10mb',
    verify: (req: Request, _res: Response, buf: Buffer) => {
      // Retain raw body buffer for GitHub HMAC signature verification
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true }));

  // Structured Request Logging
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`, {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      });
    });
    next();
  });

  // Global Rate Limiter
  app.use(apiRateLimiter);

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'ripple-backend',
    });
  });

  // Application API Routes
  app.use('/auth', authRouter);
  app.use('/repos', repoRouter);
  app.use('/webhooks', webhookRouter);
  app.use('/qa', qaRouter);
  app.use('/impact-report', impactRouter);
  app.use('/activity', activityRouter);

  // Fallback 404 & Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
