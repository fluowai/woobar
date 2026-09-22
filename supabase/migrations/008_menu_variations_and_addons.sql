-- Migration: 008_menu_variations_and_addons.sql
-- Description: Adds tables for menu variations (sizes, flavors) and addons (toppings, extras).

-- 1. Menu Variations table (e.g., Pizza Small/Large, Beer 300ml/500ml)
CREATE TABLE IF NOT EXISTS public.menu_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  price_adjust NUMERIC(10,2) DEFAULT 0, -- Adjust relative to base price or absolute
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Menu Addons table (e.g., Extra Cheese, Bacon, Side salad)
CREATE TABLE IF NOT EXISTS public.menu_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.menu_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_addons ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Menu variations are viewable by everyone" ON public.menu_variations FOR SELECT USING (true);
CREATE POLICY "Menu addons are viewable by everyone" ON public.menu_addons FOR SELECT USING (true);

CREATE POLICY "Tenant admins can manage variations" ON public.menu_variations
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant admins can manage addons" ON public.menu_addons
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_menu_variations_item ON public.menu_variations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_addons_item ON public.menu_addons(menu_item_id);
