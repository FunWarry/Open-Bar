export interface AuthResponse {
  id: number;
  email: string;
  username: string;
  roles: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  token: string;
}
