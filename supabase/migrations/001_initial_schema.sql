-- Woobar Database Schema for Supabase

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'kitchen', 'courier')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar TEXT,
  current_location JSONB,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  image TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0
);

-- Sold items (fichas/tokens) table
CREATE TABLE IF NOT EXISTS public.sold_items (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  item_id INTEGER,
  price NUMERIC(10,2) NOT NULL,
  purchase_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used')),
  type TEXT NOT NULL CHECK (type IN ('token', 'ticket')),
  order_id INTEGER
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  customer_phone TEXT,
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled')),
  time TEXT,
  address TEXT,
  location JSONB,
  courier_id UUID REFERENCES public.users(id),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cover charge transactions table
CREATE TABLE IF NOT EXISTS public.cover_charge_transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('pix', 'credit', 'debit', 'cash')),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Tables (restaurant tables) table
CREATE TABLE IF NOT EXISTS public.tables (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  seats INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved', 'dirty')),
  orders JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  image TEXT,
  tickets JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier positions table
CREATE TABLE IF NOT EXISTS public.courier_positions (
  id SERIAL PRIMARY KEY,
  courier_id UUID REFERENCES public.users(id),
  lat NUMERIC(10,6) NOT NULL,
  lng NUMERIC(10,6) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES public.orders(id),
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'system')),
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sold_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_charge_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Menu items are viewable by everyone" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Sold items are viewable by everyone" ON public.sold_items FOR SELECT USING (true);
CREATE POLICY "Orders are viewable by everyone" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Cover charge transactions are viewable by everyone" ON public.cover_charge_transactions FOR SELECT USING (true);
CREATE POLICY "Tables are viewable by everyone" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Courier positions are viewable by everyone" ON public.courier_positions FOR SELECT USING (true);
CREATE POLICY "Chat messages are viewable by everyone" ON public.chat_messages FOR SELECT USING (true);

-- Insert policies (authenticated users can insert)
CREATE POLICY "Users can be created" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Menu items can be created" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Sold items can be created" ON public.sold_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders can be created" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Cover charge transactions can be created" ON public.cover_charge_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Tables can be created" ON public.tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Events can be created" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Courier positions can be created" ON public.courier_positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Chat messages can be created" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Users can be updated" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Menu items can be updated" ON public.menu_items FOR UPDATE USING (true);
CREATE POLICY "Sold items can be updated" ON public.sold_items FOR UPDATE USING (true);
CREATE POLICY "Orders can be updated" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Cover charge transactions can be updated" ON public.cover_charge_transactions FOR UPDATE USING (true);
CREATE POLICY "Tables can be updated" ON public.tables FOR UPDATE USING (true);
CREATE POLICY "Events can be updated" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Courier positions can be updated" ON public.courier_positions FOR UPDATE USING (true);
CREATE POLICY "Chat messages can be updated" ON public.chat_messages FOR UPDATE USING (true);

-- Delete policies
CREATE POLICY "Users can be deleted" ON public.users FOR DELETE USING (true);
CREATE POLICY "Menu items can be deleted" ON public.menu_items FOR DELETE USING (true);
CREATE POLICY "Sold items can be deleted" ON public.sold_items FOR DELETE USING (true);
CREATE POLICY "Orders can be deleted" ON public.orders FOR DELETE USING (true);
CREATE POLICY "Cover charge transactions can be deleted" ON public.cover_charge_transactions FOR DELETE USING (true);
CREATE POLICY "Tables can be deleted" ON public.tables FOR DELETE USING (true);
CREATE POLICY "Events can be deleted" ON public.events FOR DELETE USING (true);
CREATE POLICY "Courier positions can be deleted" ON public.courier_positions FOR DELETE USING (true);
CREATE POLICY "Chat messages can be deleted" ON public.chat_messages FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_sold_items_code ON public.sold_items(code);
CREATE INDEX IF NOT EXISTS idx_sold_items_status ON public.sold_items(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON public.orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_cover_charge_transactions_timestamp ON public.cover_charge_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_courier_positions_courier_id ON public.courier_positions(courier_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON public.chat_messages(order_id);

-- Insert default users
INSERT INTO public.users (id, name, email, role, status, avatar, is_available, current_location) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Admin User', 'admin@woobar.com', 'admin', 'active', 'https://i.pravatar.cc/150?u=1', true, NULL),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Carlos Cozinha', 'carlos@woobar.com', 'kitchen', 'active', 'https://i.pravatar.cc/150?u=2', true, NULL),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Marcos Entregas', 'marcos@woobar.com', 'courier', 'active', 'https://i.pravatar.cc/150?u=3', true, '{"lat": -23.550520, "lng": -46.633308}'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Julia Entregas', 'julia@woobar.com', 'courier', 'active', 'https://i.pravatar.cc/150?u=4', false, '{"lat": -23.555520, "lng": -46.638308}')
ON CONFLICT (id) DO NOTHING;

-- Insert default menu items
INSERT INTO public.menu_items (id, name, description, price, category, image, is_available) VALUES
  (1, 'Woobar Classic', 'Burger artesanal 180g, queijo cheddar, bacon crocante e molho especial.', 32.90, 'Burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', true),
  (2, 'Smash Duplo', 'Dois smashes de 90g, queijo prato, cebola caramelizada e picles.', 28.90, 'Burgers', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80', true),
  (3, 'Veggie Supreme', 'Burger de grão de bico, rúcula, tomate seco e maionese de ervas.', 30.90, 'Burgers', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', true),
  (4, 'Batata Rústica', 'Batatas cortadas à mão com alecrim e alho.', 18.90, 'Porções', 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80', true),
  (5, 'Coxinha da Asa', 'Porção com 10 unidades, acompanha molho barbecue.', 24.90, 'Porções', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80', true),
  (6, 'Heineken Long Neck', '330ml, gelada.', 12.00, 'Bebidas', 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?auto=format&fit=crop&w=800&q=80', true),
  (7, 'Gin Tônica', 'Gin importado, tônica, limão siciliano e alecrim.', 28.00, 'Drinks', 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?auto=format&fit=crop&w=800&q=80', true),
  (8, 'Moscow Mule', 'Vodka, ginger beer e espuma de gengibre.', 30.00, 'Drinks', 'https://images.unsplash.com/photo-1530991037531-51f5568d93cd?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Insert default categories
INSERT INTO public.categories (name, display_order) VALUES
  ('Burgers', 1),
  ('Porções', 2),
  ('Bebidas', 3),
  ('Drinks', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default tables
INSERT INTO public.tables (id, name, seats, status) VALUES
  (1, 'Mesa 1', 2, 'free'),
  (2, 'Mesa 2', 4, 'free'),
  (3, 'Mesa 3', 6, 'free'),
  (4, 'Mesa 4', 2, 'free'),
  (5, 'Mesa 5', 4, 'free'),
  (6, 'Mesa 6', 6, 'free'),
  (7, 'Mesa 7', 2, 'free'),
  (8, 'Mesa 8', 4, 'free'),
  (9, 'Mesa 9', 6, 'free'),
  (10, 'Mesa 10', 2, 'free'),
  (11, 'Mesa 11', 4, 'free'),
  (12, 'Mesa 12', 6, 'free'),
  (13, 'Mesa 13', 2, 'free'),
  (14, 'Mesa 14', 4, 'free'),
  (15, 'Mesa 15', 6, 'free'),
  (16, 'Mesa 16', 2, 'free')
ON CONFLICT (id) DO NOTHING;

-- Insert sample events
INSERT INTO public.events (title, date, time, location, image, tickets) VALUES
  ('Samba de Domingo', '2026-04-12', '16:00', 'Palco Principal', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80', '[{"id": "gen", "name": "Pista", "price": 30.00, "available": 120}, {"id": "vip", "name": "Área VIP", "price": 80.00, "available": 45}]'),
  ('Noite de Jazz', '2026-04-15', '20:00', 'Lounge Bar', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80', '[{"id": "gen", "name": "Entrada", "price": 50.00, "available": 80}, {"id": "table", "name": "Mesa (4 lugares)", "price": 250.00, "available": 10}]'),
  ('Rock Classics', '2026-04-18', '21:00', 'Palco Principal', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80', '[{"id": "gen", "name": "Pista", "price": 40.00, "available": 200}, {"id": "vip", "name": "Camarote", "price": 100.00, "available": 30}]')
ON CONFLICT (id) DO NOTHING;