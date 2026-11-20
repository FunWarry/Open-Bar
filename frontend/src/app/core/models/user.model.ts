/**
 * Application user profile and authorization role details.
 */
export interface User {
  id: number;
  email: string;
  username: string;
  nom?: string;
  prenom?: string;
  roles: string[];
  remoteAccessEnabled?: boolean;
  enabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}
