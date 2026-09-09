import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/signup', AuthController.signup);
authRouter.post('/login', AuthController.login);
authRouter.get('/me', authenticate, AuthController.getMe);
authRouter.put('/me', authenticate, AuthController.updateProfile);

// Google Mail OAuth & Direct Google Sign-in
authRouter.get('/google', AuthController.getGoogleOAuthUrl);
authRouter.get('/google/callback', AuthController.handleGoogleCallback);
authRouter.post('/google/direct', AuthController.googleDirect);

// GitHub OAuth (for linking account & connecting repos)
authRouter.get('/github', AuthController.getGithubOAuthUrl);
authRouter.get('/github/callback', AuthController.handleGithubCallback);
