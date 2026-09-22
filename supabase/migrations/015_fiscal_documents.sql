-- Migration: 015_fiscal_documents.sql
-- Description: Adds fiscal document tracking layer (Brasil: NFC-e, NF-e).

-- 1. Fiscal Documents table
CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id TEXT REFERENCES public.orders(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('NFC-e', 'NF-e', 'NFS-e', 'CF-e')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'cancelled', 'error', 'contingency')),
  access_key TEXT UNIQUE,
  xml_path TEXT,
  customer_cpf TEXT,
  total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Tenant admins can manage fiscal documents" ON public.fiscal_documents
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('mega_admin', 'super_admin'))
);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_fiscal_access_key ON public.fiscal_documents(access_key);
