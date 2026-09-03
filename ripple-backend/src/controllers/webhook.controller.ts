import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhook.service';
import { AppError } from '../types/api.types';
import { logger } from '../utils/logger';

export class WebhookController {
  public static async handleGithubWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
      const eventType = req.headers['x-github-event'] as string | undefined;

      // Use rawBody buffer captured by express.json verify callback, or fallback to serialized body
      const payloadBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body));

      const isValid = WebhookService.verifySignature(signatureHeader, payloadBuffer);
      if (!isValid) {
        logger.warn('Rejected GitHub webhook with invalid signature', {
          event: eventType,
          hasSignature: !!signatureHeader,
        });
        throw new AppError('Invalid GitHub webhook signature', 401, 'INVALID_SIGNATURE');
      }

      if (eventType === 'ping') {
        res.status(200).json({
          status: 'ok',
          message: 'GitHub webhook ping received successfully',
        });
        return;
      }

      if (eventType === 'push') {
        const result = await WebhookService.handlePushEvent(req.body);
        res.status(202).json({
          status: 'ok',
          message: result.enqueued ? 'Update job enqueued' : 'Repository not linked, event skipped',
          data: result,
        });
        return;
      }

      // Other events acknowledged
      res.status(200).json({
        status: 'ok',
        message: `Event type ${eventType} acknowledged`,
      });
    } catch (err) {
      next(err);
    }
  }
}
