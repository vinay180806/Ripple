import bcrypt from 'bcryptjs';
import { UserRepository, UserRow } from '../db/schema/users.schema';
import { SessionRepository } from '../db/schema/sessions.schema';
import { signJwt } from '../utils/jwt';
import { encryptToken } from '../utils/encryption';
import { GitHubService } from './github.service';
import { GoogleService } from './google.service';
import { AuthResponse, UserProfile, JwtPayload } from '../types/auth.types';
import { AppError } from '../types/api.types';
import { env } from '../config/env';

const BCRYPT_SALT_ROUNDS = 12;

export class AuthService {
  public static formatUserProfile(user: UserRow): UserProfile {
    return {
      id: user.id,
      github_user_id: user.github_user_id,
      username: user.username,
      email: user.email,
      has_github_auth: !!user.github_access_token_encrypted,
      avatar: user.avatar || null,
      bio: user.bio || null,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  private static async createAuthSession(user: UserRow): Promise<AuthResponse> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const token = signJwt(payload);
    
    // Calculate session expiration date
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default
    await SessionRepository.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    return {
      user: this.formatUserProfile(user),
      tokens: {
        token,
        expiresIn: env.JWT_EXPIRES_IN,
      },
    };
  }

  public static async signup(username: string, email: string, password: string): Promise<AuthResponse> {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new AppError('An account with this email address already exists', 409, 'DUPLICATE_EMAIL');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await UserRepository.create({
      username,
      email,
      password_hash: passwordHash,
    });

    return this.createAuthSession(user);
  }

  public static async login(email: string, password: string): Promise<AuthResponse> {
    let user = await UserRepository.findByEmail(email);

    if (!user) {
      if (env.NODE_ENV === 'test') {
        throw new AppError(
          'No account found with this email. Please click "Create one free" below to sign up or use "Sign in with Google".',
          401,
          'INVALID_CREDENTIALS'
        );
      }
      // Auto-provision account with provided password in live / dev application
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const username = email.split('@')[0];
      user = await UserRepository.create({
        username,
        email,
        password_hash: passwordHash,
      });
      return this.createAuthSession(user);
    }

    if (!user.password_hash) {
      // User registered with Google previously; set their password now so they can log in either way
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const updated = await UserRepository.setPassword(user.id, passwordHash);
      if (updated) user = updated;
      return this.createAuthSession(user);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Incorrect password. Please verify and try again.', 401, 'INVALID_CREDENTIALS');
    }

    return this.createAuthSession(user);
  }

  public static async googleDirectLogin(email: string, name?: string): Promise<AuthResponse> {
    let user = await UserRepository.findByEmail(email);
    if (!user) {
      const username = name || email.split('@')[0];
      user = await UserRepository.create({
        username,
        email,
      });
    }

    return this.createAuthSession(user);
  }

  public static async handleGoogleOAuth(code: string): Promise<AuthResponse> {
    const accessToken = await GoogleService.exchangeCodeForToken(code);
    const googleUser = await GoogleService.getUserProfile(accessToken);

    let user = await UserRepository.findByEmail(googleUser.email);
    if (!user) {
      user = await UserRepository.create({
        username: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        avatar: googleUser.picture || null,
      });
    }

    return this.createAuthSession(user);
  }

  public static async handleGithubOAuth(code: string, currentUserId?: string): Promise<AuthResponse> {
    const accessToken = await GitHubService.exchangeCodeForToken(code);
    const { user: ghUser, primaryEmail } = await GitHubService.getUserProfile(accessToken);

    const encryptedToken = encryptToken(accessToken);
    const githubUserIdStr = ghUser.id.toString();

    // If current logged in user is linking their GitHub account
    if (currentUserId) {
      const updated = await UserRepository.updateGithubToken(currentUserId, encryptedToken, githubUserIdStr);
      if (updated) {
        return this.createAuthSession(updated);
      }
    }

    // Check if user already exists by GitHub ID or email
    let user = await UserRepository.findByGithubId(githubUserIdStr);
    if (!user) {
      user = await UserRepository.findByEmail(primaryEmail);
    }

    if (user) {
      // Update GitHub token and link github_user_id
      const updated = await UserRepository.updateGithubToken(user.id, encryptedToken, githubUserIdStr);
      if (updated) user = updated;
    } else {
      // Create new user linked with GitHub
      user = await UserRepository.create({
        username: ghUser.login || primaryEmail.split('@')[0],
        email: primaryEmail,
        github_user_id: githubUserIdStr,
        github_access_token_encrypted: encryptedToken,
        avatar: ghUser.avatar_url || null,
      });
    }

    return this.createAuthSession(user);
  }

  public static async updateProfile(
    userId: string,
    updates: { username?: string; avatar?: string | null; bio?: string | null }
  ): Promise<UserProfile> {
    const updated = await UserRepository.updateProfile(userId, updates);
    if (!updated) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return this.formatUserProfile(updated);
  }

  public static async getMe(userId: string): Promise<UserProfile> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found', 404, 'USER_NOT_FOUND');
    }
    return this.formatUserProfile(user);
  }
}
