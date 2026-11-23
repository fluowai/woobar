-- Migration: 010_inventory_and_bom.sql
-- Description: Adds inventory tracking, suppliers, and Bill of Materials (BOM).

-- 1. Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ingredients / Raw materials table
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- e.g., 'kg', 'g', 'ml', 'unit'
  cost_price NUMERIC(10,2) DEFAULT 0,
  min_stock NUMERIC(10,2) DEFAULT 0,
  current_stock NUMERIC(10,2) DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bill of Materials (BOM) / Ficha Técnica
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Tenant members can manage suppliers" ON public.suppliers
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant members can manage ingredients" ON public.ingredients
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant members can manage BOM" ON public.menu_item_ingredients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND (
      users.tenant_id = (SELECT tenant_id FROM ingredients WHERE id = ingredient_id) OR
      users.role IN ('mega_admin', 'super_admin')
    )
  )
);

-- 6. Function to auto-decrement stock on order (Simplified)
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a simplified trigger that would run when an order is 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- For each item in the order, find its ingredients and decrement stock
    -- Note: This requires complex logic to parse JSONB items, 
    -- in a real scenario we'd use a dedicated order_items table.
    -- For now, this is a placeholder for the logic.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
