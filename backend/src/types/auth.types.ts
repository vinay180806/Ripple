export interface UserProfile {
  id: string;
  github_user_id: string | null;
  username: string;
  email: string;
  has_github_auth: boolean;
  avatar?: string | null;
  bio?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokens {
  token: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}
