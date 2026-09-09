import { Router } from 'express';
import { RepoController } from '../controllers/repo.controller';
import { authenticate } from '../middleware/auth.middleware';

export const repoRouter = Router();

// All repository routes require authentication
repoRouter.use(authenticate);

repoRouter.post('/connect', RepoController.connect);
repoRouter.get('/', RepoController.list);
repoRouter.get('/:id', RepoController.getById);
repoRouter.get('/:id/status', RepoController.getStatus);
repoRouter.delete('/:id', RepoController.delete);
