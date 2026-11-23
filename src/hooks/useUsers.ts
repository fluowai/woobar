import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../data/users';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      setUsers((data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar: u.avatar,
        currentLocation: u.current_location,
        isAvailable: u.is_available,
        created_at: u.created_at,
        updated_at: u.updated_at
      })));
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserStatus = useCallback(async (userId: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    } catch (err) {
      console.error('Error updating user status:', err);
      throw err;
    }
  }, []);

  const updateCourierLocation = useCallback(async (userId: string, location: { lat: number; lng: number }) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ current_location: location })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, currentLocation: location } : u));
    } catch (err) {
      console.error('Error updating courier location:', err);
      throw err;
    }
  }, []);

  const toggleCourierAvailability = useCallback(async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newAvailability = !user.isAvailable;
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_available: newAvailability })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAvailable: newAvailability } : u));
    } catch (err) {
      console.error('Error toggling courier availability:', err);
      throw err;
    }
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    updateUserStatus,
    updateCourierLocation,
    toggleCourierAvailability
  };
}

export function useCouriers() {
  const [couriers, setCouriers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCouriers() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'courier')
        .order('name');

      if (!error && data) {
        setCouriers(data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          avatar: u.avatar,
          currentLocation: u.current_location,
          isAvailable: u.is_available,
          created_at: u.created_at,
          updated_at: u.updated_at
        })));
      }
      setLoading(false);
    }

    fetchCouriers();
  }, []);

  return { couriers, loading };
}
