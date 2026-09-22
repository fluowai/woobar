import { supabase } from './supabase';

export const FALLBACK_TENANT_ID = '11111111-1111-1111-1111-111111111111';

let cachedTenantId: string | null | undefined;

export async function resolveTenantId(): Promise<string> {
  if (cachedTenantId !== undefined) return cachedTenantId;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.tenant_id) {
        cachedTenantId = data.tenant_id;
        return cachedTenantId;
      }
    }
  } catch (err) {
    console.error('Error resolving tenant id:', err);
  }

  // SaaS admins (super_admin / mega_admin) have no tenant; fall back to the
  // test tenant so writes keep working (same behavior as the old POS flow).
  cachedTenantId = FALLBACK_TENANT_ID;
  return cachedTenantId;
}

export function clearTenantIdCache() {
  cachedTenantId = undefined;
}