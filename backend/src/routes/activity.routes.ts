import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth.middleware';

export const activityRouter = Router();

activityRouter.get('/', authenticate, ActivityController.listActivity);
