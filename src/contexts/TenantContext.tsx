import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Tenant } from '../lib/database.types';

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  setTenant: (tenant: Tenant | null) => void;
  isImpersonating: boolean;
  originalTenantId: string | null;
  impersonateTenant: (tenant: Tenant) => void;
  stopImpersonation: () => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalTenantId, setOriginalTenantId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTenant();
    } else {
      setTenantState(null);
      setIsImpersonating(false);
      setOriginalTenantId(null);
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
        setTenantState(null);
        return;
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', data.tenant_id)
        .single();

      if (!tenantError && tenantData) {
        setTenantState(tenantData as Tenant);
        setOriginalTenantId(data.tenant_id);
        // Se está impersonating, mantém o tenant atual
        if (!isImpersonating) {
          setIsImpersonating(false);
        }
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const impersonateTenant = (tenantToImpersonate: Tenant) => {
    const currentTenantId = tenant?.id;
    if (currentTenantId && !isImpersonating) {
      setOriginalTenantId(currentTenantId);
    }
    setTenantState(tenantToImpersonate);
    setIsImpersonating(true);
  };

  const stopImpersonation = () => {
    if (originalTenantId) {
      // Recarregar o tenant original
      supabase
        .from('tenants')
        .select('*')
        .eq('id', originalTenantId)
        .single()
        .then(({ data }) => {
          if (data) {
            setTenantState(data as Tenant);
          }
        });
    }
    setIsImpersonating(false);
    setOriginalTenantId(null);
  };

  const setTenant = (newTenant: Tenant | null) => {
    if (!isImpersonating) {
      setTenantState(newTenant);
    }
  };

  return (
    <TenantContext.Provider value={{ 
      tenant, 
      tenantId: tenant?.id || null, 
      setTenant, 
      isImpersonating,
      originalTenantId,
      impersonateTenant,
      stopImpersonation,
      isLoading 
    }}>
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

// Hook para detectar se está impersonating
export function useIsImpersonating() {
  const { isImpersonating } = useTenant();
  return isImpersonating;
}
