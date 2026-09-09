import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RepoService } from '../services/repo.service';
import { AppError } from '../types/api.types';

const connectRepoSchema = z.object({
  github_url: z.string().min(1),
  github_repo_id: z.string().optional(),
  name: z.string().optional(),
  full_name: z.string().optional(),
  default_branch: z.string().default('main').optional(),
  personal_access_token: z.string().optional(),
});

function getParamId(req: Request): string {
  const { id } = req.params;
  if (!id) {
    throw new AppError('Missing repository identifier in request path', 400, 'INVALID_PARAMS');
  }
  return Array.isArray(id) ? id[0] : id;
}

export class RepoController {
  public static async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const input = connectRepoSchema.parse(req.body);
      const repo = await RepoService.connectRepo(req.user.userId, input);

      // Record activity event
      try {
        const { ActivityRepository } = await import('../db/schema/activity.schema');
        await ActivityRepository.create({
          user_id: req.user.userId,
          type: 'repo_connected',
          title: 'Connected GitHub repository',
          description: `Linked ${repo.full_name} (${repo.default_branch})`,
          metadata: { repo_id: repo.id, full_name: repo.full_name },
        });
      } catch {
        // Non-blocking
      }

      res.status(201).json({
        status: 'ok',
        data: repo,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const repos = await RepoService.listUserRepos(req.user.userId);
      res.status(200).json({
        status: 'ok',
        data: repos,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const repoId = getParamId(req);
      const repo = await RepoService.getRepoById(repoId, req.user.userId);
      res.status(200).json({
        status: 'ok',
        data: repo,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const repoId = getParamId(req);
      const status = await RepoService.getRepoStatus(repoId, req.user.userId);
      res.status(200).json({
        status: 'ok',
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const repoId = getParamId(req);
      await RepoService.deleteRepo(repoId, req.user.userId);
      res.status(200).json({
        status: 'ok',
        data: { message: 'Repository disconnected successfully' },
      });
    } catch (err) {
      next(err);
    }
  }
}
