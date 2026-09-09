import { Router } from 'express';
import { ImpactController } from '../controllers/impact.controller';
import { authenticate } from '../middleware/auth.middleware';
import { impactRateLimiter } from '../middleware/rate-limit.middleware';

export const impactRouter = Router();

impactRouter.post('/', authenticate, impactRateLimiter, ImpactController.generateReport);
