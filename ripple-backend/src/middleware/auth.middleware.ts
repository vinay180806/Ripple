import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { AppError } from '../types/api.types';
import { JwtPayload } from '../types/auth.types';
import { SessionRepository } from '../db/schema/sessions.schema';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      rawBody?: Buffer;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new AppError('Authentication token missing', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = verifyJwt(token);

    // Verify session validity
    const session = await SessionRepository.findByToken(token);
    if (!session) {
      return next(new AppError('Session expired or invalidated', 401, 'SESSION_INVALID'));
    }

    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
  }
}
