-- Migration: 016_audit_log_trigger.sql
-- Description: Adds an audit trigger helper for critical tables.

-- 1. Create audit_log_entries table
CREATE TABLE IF NOT EXISTS public.audit_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,        -- e.g., INSERT, UPDATE, DELETE
  entity_type TEXT NOT NULL,   -- e.g., 'orders', 'sold_items'
  entity_id TEXT,              -- Primary key of the changed row
  old_data JSONB,              -- Data before change
  new_data JSONB,              -- Data after change
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Tenant admins can view audit logs" ON public.audit_log_entries
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 4. Generic trigger function (can be called by triggers on monitored tables)
CREATE OR REPLACE FUNCTION public.audit_entity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log_entries (tenant_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (
      NEW.tenant_id,
      auth.uid()::text::uuid,
      'INSERT',
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, NULL),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log_entries (tenant_id, user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      NEW.tenant_id,
      auth.uid()::text::uuid,
      'UPDATE',
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, NULL),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log_entries (tenant_id, user_id, action, entity_type, entity_id, old_data)
    VALUES (
      OLD.tenant_id,
      auth.uid()::text::uuid,
      'DELETE',
      TG_TABLE_NAME,
      COALESCE(OLD.id::text, NULL),
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Example triggers (attach to critical tables)
DROP TRIGGER IF EXISTS audit_orders_trigger ON public.orders;
CREATE TRIGGER audit_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_entity();
