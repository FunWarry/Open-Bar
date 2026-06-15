export interface AuthResponse {
  id: number;
  email: string;
  username: string;
  roles: string[];
  enabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  token: string;
}
