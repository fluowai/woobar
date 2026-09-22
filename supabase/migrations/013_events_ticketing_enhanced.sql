-- Migration: 013_events_ticketing_enhanced.sql
-- Description: Enhances events with lots, quotas, and coupons.

-- 1. Event Lots (Lotes de Ingressos)
CREATE TABLE IF NOT EXISTS public.event_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity_limit INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Event Coupons (Cupons de Desconto)
CREATE TABLE IF NOT EXISTS public.event_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update events table structure (adding capacity and status)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Enable RLS
ALTER TABLE public.event_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_coupons ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public can view active lots" ON public.event_lots FOR SELECT USING (is_active = true);
CREATE POLICY "Tenant admins can manage lots" ON public.event_lots
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant admins can manage coupons" ON public.event_coupons
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_event_lots_event ON public.event_lots(event_id);
CREATE INDEX IF NOT EXISTS idx_event_coupons_code ON public.event_coupons(code);
