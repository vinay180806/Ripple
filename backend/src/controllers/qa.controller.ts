import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RepoService } from '../services/repo.service';
import { trackBService } from '../services/trackB.service';
import { cacheService } from '../services/cache.service';
import { QAHistoryRepository } from '../db/schema/qa_history.schema';
import { ActivityRepository } from '../db/schema/activity.schema';
import { AppError } from '../types/api.types';
import { QAResult } from '../clients/trackB.client';

const qaRequestSchema = z.object({
  repo_id: z.string().min(1),
  question: z.string().min(3).max(1000),
  commit_hash: z.string().optional(),
});

export class QAController {
  public static async answerQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { repo_id, question, commit_hash } = qaRequestSchema.parse(req.body);

      // Verify user has access to repository
      const repo = await RepoService.getRepoById(repo_id, req.user.userId);

      // Construct cache key — normalize query first so trivially different phrasings hit the cache
      const normalizedQuestion = question.toLowerCase().trim();
      const cacheKey = cacheService.generateKey(
        'qa',
        repo_id,
        commit_hash || 'head',
        normalizedQuestion
      );

      // Check cache
      const cached = await cacheService.get<QAResult>(cacheKey);
      if (cached) {
        // Record in history
        await QAHistoryRepository.create({
          user_id: req.user.userId,
          repo_id,
          question,
          answer: cached.answer,
          citations: (cached.sources || []).map((s) => ({
            file: s.file,
            startLine: s.lineStart,
            endLine: s.lineEnd,
            snippet: s.snippet,
          })),
        });

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
      const result = await trackBService.qa(repo_id, question, commit_hash);

      // Store in cache with 24-hour TTL (per Phase 7 spec)
      await cacheService.set(cacheKey, result, 86400);


      // Record in history
      await QAHistoryRepository.create({
        user_id: req.user.userId,
        repo_id,
        question,
        answer: result.answer,
        citations: (result.sources || []).map((s) => ({
          file: s.file,
          startLine: s.lineStart,
          endLine: s.lineEnd,
          snippet: s.snippet,
        })),
      });

      // Record in activity feed
      await ActivityRepository.create({
        user_id: req.user.userId,
        type: 'qa_query',
        title: 'Explored codebase with Q&A',
        description: `Asked: "${question.length > 60 ? question.slice(0, 57) + '...' : question}" on ${repo.name}`,
        metadata: { repo_id, repo_name: repo.name },
      });

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

  public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const repoId = req.query.repoId as string;
      if (!repoId) {
        throw new AppError('Missing repoId query parameter', 400, 'INVALID_PARAMS');
      }

      const history = await QAHistoryRepository.findByUserAndRepo(req.user.userId, repoId);
      res.status(200).json({
        status: 'ok',
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }
}
