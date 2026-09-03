import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../types/api.types';

export class WorkspaceService {
  private static baseDir = path.resolve(env.WORKSPACE_DIR);

  private static ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Safely resolves and validates a workspace path, preventing path traversal.
   */
  public static resolveWorkspacePath(jobId: string): string {
    this.ensureBaseDir();

    // Sanitize jobId to prevent directory traversal
    const sanitizedId = jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetPath = path.resolve(this.baseDir, sanitizedId);

    // Verify target path remains within base directory
    const relative = path.relative(this.baseDir, targetPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new AppError('Invalid workspace identifier or path traversal attempt', 400, 'SECURITY_ERROR');
    }

    return targetPath;
  }

  /**
   * Creates an isolated workspace directory for a job.
   */
  public static async createWorkspace(jobId: string): Promise<string> {
    const workspacePath = this.resolveWorkspacePath(jobId);
    if (!fs.existsSync(workspacePath)) {
      await fs.promises.mkdir(workspacePath, { recursive: true });
      logger.debug(`Created isolated workspace at ${workspacePath}`);
    }
    return workspacePath;
  }

  /**
   * Safely deletes an isolated workspace directory.
   */
  public static async cleanupWorkspace(jobId: string): Promise<void> {
    try {
      const workspacePath = this.resolveWorkspacePath(jobId);
      if (fs.existsSync(workspacePath)) {
        await fs.promises.rm(workspacePath, { recursive: true, force: true });
        logger.debug(`Cleaned up workspace at ${workspacePath}`);
      }
    } catch (err) {
      logger.warn(`Failed to cleanup workspace for job ${jobId}`, {}, err as Error);
    }
  }

  /**
   * Higher-order helper to manage workspace lifecycle with automatic cleanup in finally.
   */
  public static async withWorkspace<T>(
    jobId: string,
    action: (workspacePath: string) => Promise<T>
  ): Promise<T> {
    const workspacePath = await this.createWorkspace(jobId);
    try {
      return await action(workspacePath);
    } finally {
      await this.cleanupWorkspace(jobId);
    }
  }
}
