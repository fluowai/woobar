-- Migration: 009_tables_and_orders_refactor.sql
-- Description: Normalizes table orders and adds kitchen station / split-check support.

-- 1. Create table_orders to link tables and orders (N-N)
CREATE TABLE IF NOT EXISTS public.table_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id INTEGER REFERENCES public.tables(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'split')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add kitchen_station and priority to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS kitchen_station TEXT DEFAULT 'general' CHECK (kitchen_station IN ('general', 'kitchen', 'bar', 'grill', 'pizza', 'dessert')),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 3. Add table_id and split_from to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS table_id INTEGER REFERENCES public.tables(id),
ADD COLUMN IF NOT EXISTS split_from TEXT REFERENCES public.orders(id);

-- 4. Enable RLS
ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Tenant members can manage table orders" ON public.table_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND (
      users.tenant_id = (SELECT tenant_id FROM tables WHERE id = table_id) OR
      users.role IN ('mega_admin', 'super_admin')
    )
  )
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_table_orders_table ON public.table_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_table_orders_order ON public.table_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_station ON public.orders(kitchen_station);
