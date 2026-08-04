export interface User {
  id: number;
  email: string;
  username: string;
  nom?: string;
  prenom?: string;
  roles: string[];
  enabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}
