-- Migration: 007_normalize_roles_and_secure_rls.sql
-- Description: Normalizes user roles using a check constraint (Supabase doesn't support custom types in migrations easily without extensions, so we use a check constraint for portability) 
-- and refines RLS policies to prevent data leakage.

-- 1. Normalize Roles in Users table
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('mega_admin', 'super_admin', 'tenant_admin', 'waiter', 'kitchen', 'courier', 'cashier', 'manager', 'admin'));

-- 2. Update RLS for Sold Items (Restrict public read)
DROP POLICY IF EXISTS "Sold items are viewable by everyone" ON public.sold_items;
DROP POLICY IF EXISTS "Allow public read access" ON public.sold_items;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.sold_items;

CREATE POLICY "Tenant members can view their own sold items" ON public.sold_items
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant members can insert sold items" ON public.sold_items
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 3. Update RLS for Events (Restrict public read of sensitive fields if needed, but here we just ensure tenant isolation for management)
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Allow public read access" ON public.events;

CREATE POLICY "Events are viewable by everyone" ON public.events
FOR SELECT USING (true); -- Keep public for catalog, but restricted for write

DROP POLICY IF EXISTS "Allow authenticated write access" ON public.events;
CREATE POLICY "Tenant admins can manage events" ON public.events
FOR ALL USING (
  (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) AND 
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('tenant_admin', 'manager', 'admin'))) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 4. Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  (tenant_id::text = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) AND 
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('tenant_admin', 'manager', 'admin'))) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 5. Add tenant_id to users if not already enforced (already exists in some contexts, ensuring consistency)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tenant_id') THEN
    ALTER TABLE public.users ADD COLUMN tenant_id UUID;
  END IF;
END $$;
