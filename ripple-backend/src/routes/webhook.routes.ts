import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

export const webhookRouter = Router();

webhookRouter.post('/github', WebhookController.handleGithubWebhook);
