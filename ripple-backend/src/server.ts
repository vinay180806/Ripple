import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { db } from './db/connection';
import { cacheService } from './services/cache.service';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';

// Note: routes will be attached to app before error handlers
export async function bootstrap() {
  const app = createApp();

  // Attach 404 and Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(env.PORT, () => {
    logger.info(`Ripple Backend Platform running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await db.close();
        await cacheService.close();
        logger.info('Database and Cache connections closed successfully');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown', {}, err as Error);
        process.exit(1);
      }
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, server };
}

// Start server if run directly
if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Fatal error during application startup', {}, err);
    process.exit(1);
  });
}
