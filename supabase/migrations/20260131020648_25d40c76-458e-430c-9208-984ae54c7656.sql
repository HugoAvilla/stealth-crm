-- ============================================
-- 1. ADICIONAR CÓDIGO ÚNICO ÀS EMPRESAS
-- ============================================

-- Adicionar coluna de código único
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_code text UNIQUE;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(company_code);

-- Function para gerar código único (6 caracteres alfanuméricos)
CREATE OR REPLACE FUNCTION generate_company_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Gerar código aleatório de 6 caracteres (letras maiúsculas + números)
    new_code := upper(substr(md5(random()::text), 1, 6));
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE company_code = new_code) INTO code_exists;
    
    -- Se não existe, retornar
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Gerar códigos para empresas existentes (caso haja)
UPDATE public.companies 
SET company_code = generate_company_code() 
WHERE company_code IS NULL;

-- Trigger para gerar código automaticamente ao criar empresa
CREATE OR REPLACE FUNCTION auto_generate_company_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.company_code IS NULL THEN
    NEW.company_code := generate_company_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_company_code ON public.companies;
CREATE TRIGGER trigger_auto_company_code
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION auto_generate_company_code();

-- ============================================
-- 2. CRIAR TABELA DE SOLICITAÇÕES DE ACESSO
-- ============================================

CREATE TABLE IF NOT EXISTS public.company_join_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  company_id bigint NOT NULL,
  requester_user_id uuid NOT NULL,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requested_role text NOT NULL CHECK (requested_role IN ('VENDEDOR', 'PRODUCAO')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT company_join_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_join_requests_company ON public.company_join_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_requester ON public.company_join_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.company_join_requests(status);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS update_join_requests_updated_at ON public.company_join_requests;
CREATE TRIGGER update_join_requests_updated_at 
BEFORE UPDATE ON public.company_join_requests
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. HABILITAR RLS NA TABELA DE SOLICITAÇÕES
-- ============================================

ALTER TABLE public.company_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Admin da empresa vê todas as solicitações da sua empresa
DROP POLICY IF EXISTS "Company admin can view join requests" ON public.company_join_requests;
CREATE POLICY "Company admin can view join requests"
ON public.company_join_requests FOR SELECT
USING (
  -- Admin da empresa (owner)
  company_id IN (
    SELECT id FROM public.companies 
    WHERE owner_id = auth.uid()
  )
  OR
  -- Próprio solicitante vê sua solicitação
  requester_user_id = auth.uid()
);

-- Policy: Usuários autenticados podem criar solicitações
DROP POLICY IF EXISTS "Authenticated users can create join requests" ON public.company_join_requests;
CREATE POLICY "Authenticated users can create join requests"
ON public.company_join_requests FOR INSERT
WITH CHECK (
  requester_user_id = auth.uid()
);

-- Policy: Apenas admin da empresa pode aprovar/rejeitar (via functions)
DROP POLICY IF EXISTS "Company admin can update join requests" ON public.company_join_requests;
CREATE POLICY "Company admin can update join requests"
ON public.company_join_requests FOR UPDATE
USING (
  company_id IN (
    SELECT id FROM public.companies 
    WHERE owner_id = auth.uid()
  )
);

-- ============================================
-- 4. FUNCTION PARA APROVAR SOLICITAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION approve_company_join_request(
  request_id_input bigint
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  req_record RECORD;
  company_record RECORD;
BEGIN
  -- Buscar dados da solicitação
  SELECT * INTO req_record
  FROM public.company_join_requests
  WHERE id = request_id_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Buscar empresa
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = req_record.company_id;

  -- Verificar se usuário atual é o owner da empresa
  IF company_record.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o administrador da empresa pode aprovar solicitações';
  END IF;

  -- Verificar se já não foi processada
  IF req_record.status != 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada';
  END IF;

  -- Atualizar o perfil do solicitante
  UPDATE public.profiles
  SET 
    company_id = req_record.company_id,
    updated_at = now()
  WHERE user_id = req_record.requester_user_id;

  -- Criar/atualizar role do usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (req_record.requester_user_id, req_record.requested_role::app_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Marcar solicitação como aprovada
  UPDATE public.company_join_requests
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = request_id_input;
END;
$$;

-- ============================================
-- 5. FUNCTION PARA REJEITAR SOLICITAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION reject_company_join_request(
  request_id_input bigint,
  reason_input text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  req_record RECORD;
  company_record RECORD;
BEGIN
  -- Buscar dados da solicitação
  SELECT * INTO req_record
  FROM public.company_join_requests
  WHERE id = request_id_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Buscar empresa
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = req_record.company_id;

  -- Verificar se usuário atual é o owner da empresa
  IF company_record.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o administrador da empresa pode rejeitar solicitações';
  END IF;

  -- Verificar se já não foi processada
  IF req_record.status != 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada';
  END IF;

  -- Marcar solicitação como rejeitada
  UPDATE public.company_join_requests
  SET 
    status = 'rejected',
    rejected_reason = reason_input,
    updated_at = now()
  WHERE id = request_id_input;
END;
$$;

-- ============================================
-- 6. FUNCTION PARA BUSCAR EMPRESA POR CÓDIGO (pública)
-- ============================================

CREATE OR REPLACE FUNCTION get_company_by_code(code_input text)
RETURNS TABLE (
  id bigint,
  company_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.company_name
  FROM public.companies c
  WHERE c.company_code = upper(code_input);
END;
$$;