import type { UserRole } from '../lib/database.types';

export type { UserRole };

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  currentLocation?: { lat: number; lng: number };
  isAvailable?: boolean;
  created_at?: string;
  updated_at?: string;
}
