import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { GitHubService } from '../services/github.service';
import { GoogleService } from '../services/google.service';
import { AppError } from '../types/api.types';
import { env } from '../config/env';

const signupSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleDirectSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const updateProfileSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  avatar: z.string().nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
});

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = signupSchema.parse(req.body);
      const result = await AuthService.signup(username, email, password);

      res.status(201).json({
        status: 'ok',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await AuthService.login(email, password);

      res.status(200).json({
        status: 'ok',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async googleDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name } = googleDirectSchema.parse(req.body);
      const result = await AuthService.googleDirectLogin(email, name);

      res.status(200).json({
        status: 'ok',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const profile = await AuthService.getMe(req.user.userId);
      res.status(200).json({
        status: 'ok',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const updates = updateProfileSchema.parse(req.body);
      const profile = await AuthService.updateProfile(req.user.userId, updates);
      res.status(200).json({
        status: 'ok',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Google Mail OAuth ──
  public static async getGoogleOAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      const url = GoogleService.getAuthorizationUrl(state);

      const isHtmlAccept = req.headers.accept && req.headers.accept.includes('text/html');
      if (isHtmlAccept) {
        return res.redirect(url);
      }

      res.status(200).json({
        status: 'ok',
        data: {
          url,
          state,
          is_configured: env.GOOGLE_CLIENT_ID !== 'mock_google_client_id' && !!env.GOOGLE_CLIENT_ID,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async handleGoogleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        throw new AppError('Missing Google OAuth authorization code', 400, 'INVALID_OAUTH_CODE');
      }

      const result = await AuthService.handleGoogleOAuth(code);

      const userParam = encodeURIComponent(JSON.stringify(result.user));
      res.redirect(`http://localhost:3000/dashboard?token=${result.tokens.token}&user=${userParam}`);
    } catch (err) {
      next(err);
    }
  }

  // ── GitHub OAuth ──
  public static async getGithubOAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      const url = GitHubService.getAuthorizationUrl(state);

      const isHtmlAccept = req.headers.accept && req.headers.accept.includes('text/html');
      if (isHtmlAccept) {
        return res.redirect(url);
      }

      res.status(200).json({
        status: 'ok',
        data: {
          url,
          state,
          is_configured: env.GITHUB_CLIENT_ID !== 'mock_github_client_id' && !!env.GITHUB_CLIENT_ID,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async handleGithubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        throw new AppError('Missing OAuth authorization code', 400, 'INVALID_OAUTH_CODE');
      }

      const result = await AuthService.handleGithubOAuth(code, req.user?.userId);

      const userParam = encodeURIComponent(JSON.stringify(result.user));
      res.redirect(`http://localhost:3000/dashboard?token=${result.tokens.token}&user=${userParam}`);
    } catch (err) {
      next(err);
    }
  }
}
