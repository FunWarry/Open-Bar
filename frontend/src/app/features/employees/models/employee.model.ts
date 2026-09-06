/**
 * Employee profile model with shift scheduling.
 */
export interface Employee {
  id: number;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN';
  email: string;
  shiftsCompleted: number;
  shiftsTotal: number;
  totalHours: string;
  isInShift: boolean;
}
