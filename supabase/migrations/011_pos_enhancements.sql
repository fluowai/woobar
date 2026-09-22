-- Migration: 011_pos_enhancements.sql
-- Description: Adds payment providers and printer configurations.

-- 1. Payment Providers table (Credentials should be in Vault, this is just metadata)
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL, -- 'Stripe', 'MercadoPago', 'Asaas', 'OpenPix'
  is_active BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}', -- e.g., { "webhook_url": "...", "public_key": "..." }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Printers table
CREATE TABLE IF NOT EXISTS public.printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('network', 'usb', 'bluetooth', 'cloud')),
  address TEXT, -- IP address or device path
  kitchen_stations TEXT[] DEFAULT '{general}', -- Stations assigned to this printer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Tenant admins can manage payment providers" ON public.payment_providers
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant members can manage printers" ON public.printers
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);
