import { Request, Response, NextFunction } from 'express';
import { ActivityRepository } from '../db/schema/activity.schema';
import { AppError } from '../types/api.types';

export class ActivityController {
  public static async listActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const activities = await ActivityRepository.findByUserId(req.user.userId, limit);

      res.status(200).json({
        status: 'ok',
        data: activities,
      });
    } catch (err) {
      next(err);
    }
  }
}
