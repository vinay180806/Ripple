import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RepoService } from '../services/repo.service';
import { trackBService } from '../services/trackB.service';
import { cacheService } from '../services/cache.service';
import { AppError } from '../types/api.types';
import { ImpactReportResult } from '../clients/trackB.client';

const impactRequestSchema = z.object({
  repo_id: z.string().min(1),
  diff_ref: z.string().min(1).max(200),
  changed_files: z.array(z.string()).optional(),
});

export class ImpactController {
  public static async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { repo_id, diff_ref, changed_files } = impactRequestSchema.parse(req.body);

      // Verify user has access to repository
      await RepoService.getRepoById(repo_id, req.user.userId);

      // Construct cache key
      const cacheKey = cacheService.generateKey(
        'impact',
        repo_id,
        diff_ref,
        changed_files ? changed_files.sort().join(',') : 'default'
      );

      // Check cache
      const cached = await cacheService.get<ImpactReportResult>(cacheKey);
      if (cached) {
        res.status(200).json({
          status: 'ok',
          data: {
            ...cached,
            cached: true,
          },
        });
        return;
      }

      // Delegate to Track B client interface
      const result = await trackBService.impactReport(repo_id, diff_ref, changed_files);

      // Store in cache with 1 hour TTL
      await cacheService.set(cacheKey, result, 3600);

      res.status(200).json({
        status: 'ok',
        data: {
          ...result,
          cached: false,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
