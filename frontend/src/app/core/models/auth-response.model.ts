/**
 * Authentication response payload containing JWT access token, refresh token, and user profile.
 */
export interface AuthResponse {
  id: number;
  email: string;
  username: string;
  roles: string[];
  enabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  token: string;
  refreshToken: string;
}
