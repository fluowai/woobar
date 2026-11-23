export type UserRole = 'superadmin' | 'admin' | 'manager' | 'waiter' | 'kitchen' | 'pantry' | 'courier' | 'attendant';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Gerente',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  pantry: 'Copa',
  courier: 'Entregador',
  attendant: 'Atendente',
};

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
