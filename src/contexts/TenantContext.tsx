import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Tenant } from '../lib/database.types';

interface TenantContextType {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTenant();
    } else {
      setTenant(null);
      setIsLoading(false);
    }
  }, [user]);

  async function loadTenant() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user!.id)
        .single();

      if (error || !data?.tenant_id) {
        setTenant(null);
        return;
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', data.tenant_id)
        .single();

      if (!tenantError && tenantData) {
        setTenant(tenantData as Tenant);
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TenantContext.Provider value={{ tenant, setTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
