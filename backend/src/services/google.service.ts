import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../types/api.types';

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export class GoogleService {
  public static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public static async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post<{ access_token: string; id_token: string }>(
        'https://oauth2.googleapis.com/token',
        {
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        throw new AppError('Failed to obtain Google access token', 400, 'GOOGLE_OAUTH_FAILED', response.data);
      }

      return response.data.access_token;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error('Google OAuth token exchange failed', {}, err);
      throw new AppError('Google OAuth token exchange error', 502, 'GOOGLE_API_ERROR');
    }
  }

  public static async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    try {
      const res = await axios.get<GoogleUserProfile>('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return res.data;
    } catch (err: any) {
      logger.error('Failed to fetch Google user profile', {}, err);
      throw new AppError('Failed to fetch Google profile', 502, 'GOOGLE_API_ERROR');
    }
  }
}
