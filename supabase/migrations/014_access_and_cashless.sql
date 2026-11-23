-- Migration: 014_access_and_cashless.sql
-- Description: Adds cashless wallet and access control (QR validation).

-- 1. Cashless Wallets
CREATE TABLE IF NOT EXISTS public.cashless_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id), -- Nullable for anonymous tags
  tag_code TEXT UNIQUE, -- QR/NFC code
  balance NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallet Transactions (Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.cashless_wallets(id),
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  reference_id TEXT, -- Link to order or payment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Access Logs (Gate control)
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id INTEGER REFERENCES public.events(id),
  ticket_id TEXT, -- code or UUID
  direction TEXT CHECK (direction IN ('in', 'out')),
  method TEXT DEFAULT 'qr',
  operator_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.cashless_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Tenant members can manage wallets" ON public.cashless_wallets
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant members can view transactions" ON public.wallet_transactions
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

CREATE POLICY "Tenant members can log access" ON public.access_logs
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_tag ON public.cashless_wallets(tag_code);
CREATE INDEX IF NOT EXISTS idx_access_ticket ON public.access_logs(ticket_id);
