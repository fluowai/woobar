export type UserRole = 'admin' | 'manager' | 'kitchen' | 'courier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  currentLocation?: { lat: number; lng: number }; // For couriers
  isAvailable?: boolean; // For couriers
}

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@woobar.com',
    role: 'admin',
    status: 'active',
    avatar: 'https://i.pravatar.cc/150?u=1'
  },
  {
    id: '2',
    name: 'Carlos Cozinha',
    email: 'carlos@woobar.com',
    role: 'kitchen',
    status: 'active',
    avatar: 'https://i.pravatar.cc/150?u=2'
  },
  {
    id: '3',
    name: 'Marcos Entregas',
    email: 'marcos@woobar.com',
    role: 'courier',
    status: 'active',
    isAvailable: true,
    currentLocation: { lat: -23.550520, lng: -46.633308 }, // São Paulo center approx
    avatar: 'https://i.pravatar.cc/150?u=3'
  },
  {
    id: '4',
    name: 'Julia Entregas',
    email: 'julia@woobar.com',
    role: 'courier',
    status: 'active',
    isAvailable: false,
    currentLocation: { lat: -23.555520, lng: -46.638308 },
    avatar: 'https://i.pravatar.cc/150?u=4'
  }
];
