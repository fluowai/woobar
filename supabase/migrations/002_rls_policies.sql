-- Migração para adicionar Row Level Security (RLS) adequado
-- e corrigir políticas de acesso

-- 1. Tabela sold_items: permitir INSERT/SELECT para usuários autenticados
ALTER TABLE sold_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access" ON sold_items;
CREATE POLICY "Allow authenticated full access" ON sold_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 2. Tabela orders: permitir INSERT/SELECT para usuários autenticados
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access" ON orders;
CREATE POLICY "Allow authenticated full access" ON orders
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Tabela cover_charge_transactions
ALTER TABLE cover_charge_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access" ON cover_charge_transactions;
CREATE POLICY "Allow authenticated full access" ON cover_charge_transactions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Tabela tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access" ON tables;
CREATE POLICY "Allow authenticated full access" ON tables
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Tabela events (leitura pública, escrita autenticada)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON events;
DROP POLICY IF EXISTS "Allow authenticated write access" ON events;
CREATE POLICY "Allow public read access" ON events
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write access" ON events
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Tabela users (apenas admins podem modificar)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read own data" ON users;
DROP POLICY IF EXISTS "Allow admins full access" ON users;
CREATE POLICY "Allow users to read own data" ON users
  FOR SELECT USING (
    auth.uid()::text = id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
  );
CREATE POLICY "Allow admins full access" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
  );

-- 7. Tabela menu_items (leitura pública, escrita autenticada)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON menu_items;
DROP POLICY IF EXISTS "Allow authenticated write access" ON menu_items;
CREATE POLICY "Allow public read access" ON menu_items
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write access" ON menu_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 8. Tabela categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON categories;
CREATE POLICY "Allow public read access" ON categories
  FOR SELECT USING (true);

-- 9. Tabela courier_positions
ALTER TABLE courier_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access" ON courier_positions;
CREATE POLICY "Allow authenticated access" ON courier_positions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 10. Tabela chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access" ON chat_messages;
CREATE POLICY "Allow authenticated access" ON chat_messages
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 11. Criar índice único para códigos (evitar duplicatas)
DROP INDEX IF EXISTS idx_sold_items_code_unique;
CREATE UNIQUE INDEX idx_sold_items_code_unique ON sold_items(code);

-- 12. Função para gerar código único no banco (trigger)
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gera código de 5 dígitos (10000-99999)
    new_code := floor(random() * 90000 + 10000)::TEXT;
    
    SELECT EXISTS(SELECT 1 FROM sold_items WHERE code = new_code) INTO code_exists;
    
    IF NOT code_exists THEN
      NEW.code := new_code;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se existir
DROP TRIGGER IF EXISTS ensure_unique_code ON sold_items;

-- Criar trigger para garantir código único
CREATE TRIGGER ensure_unique_code
  BEFORE INSERT ON sold_items
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_unique_code();
