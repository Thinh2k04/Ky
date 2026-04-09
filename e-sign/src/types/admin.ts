import type { ContractFormData } from './contract';

export interface AdminUser {
  username: string;
  displayName: string;
  role: 'admin' | 'contract';
}

export interface AdminSession {
  token: string;
  user: AdminUser;
}

export interface StoredContractRecord {
  id: string;
  createdAt: string;
  formData: ContractFormData;
  signatures: string[];
  savedAtClient: string | null;
}
