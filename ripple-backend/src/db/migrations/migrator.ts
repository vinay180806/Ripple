import fs from 'fs';
import path from 'path';
import { db } from '../connection';
import { logger } from '../../utils/logger';

export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations...');

  try {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      logger.warn('PostgreSQL database not reachable. Skipping live database migration.');
      return;
    }

    // Create migrations tracker table
    await db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const existing = await db.query('SELECT name FROM _migrations WHERE name = $1', [file]);
      if (existing.rows.length === 0) {
        logger.info(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.transaction(async (client) => {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        });
        logger.info(`Successfully applied migration: ${file}`);
      } else {
        logger.debug(`Migration ${file} already applied`);
      }
    }

    logger.info('All migrations processed successfully');
  } catch (err) {
    logger.error('Migration execution failed', {}, err as Error);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
