/**
 * Authentication response containing user token information.
 */
export interface LoginResponse {
  token: string;
  username: string;
  role: string;
}
