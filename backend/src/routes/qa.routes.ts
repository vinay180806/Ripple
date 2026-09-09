import { Router } from 'express';
import { QAController } from '../controllers/qa.controller';
import { authenticate } from '../middleware/auth.middleware';
import { qaRateLimiter } from '../middleware/rate-limit.middleware';

export const qaRouter = Router();

qaRouter.post('/', authenticate, qaRateLimiter, QAController.answerQuestion);
qaRouter.get('/history', authenticate, QAController.getHistory);
