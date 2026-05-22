-- Migration: fix_product_types_rls_master
-- Descrição: Ajusta a função get_user_company_id para fazer fallback na tabela de assinaturas (subscriptions)
-- caso o company_id no perfil do usuário seja nulo (como acontece na conta master).
-- Restabelece a política de RLS estrita de product_types baseada exclusivamente no get_user_company_id,
-- garantindo isolamento total de multi-tenant e sem privilégios de visualização de outras empresas para ninguém (inclusive o master).

-- 1. Atualizar a função get_user_company_id para fazer fallback em subscriptions
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS int8
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id int8;
BEGIN
  -- Busca primeiro no perfil
  SELECT company_id INTO v_company_id 
  FROM public.profiles 
  WHERE user_id = _user_id 
  LIMIT 1;

  -- Se for nulo no perfil, busca na tabela de assinaturas (como no caso da conta master)
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id 
    FROM public.subscriptions 
    WHERE user_id = _user_id 
    LIMIT 1;
  END IF;

  RETURN v_company_id;
END;
$$;

-- 2. Remover políticas anteriores de product_types para reiniciá-las de forma limpa
DROP POLICY IF EXISTS "Users can manage product_types from their company" ON public.product_types;
DROP POLICY IF EXISTS "Users can view product_types from their company" ON public.product_types;

-- 3. Recriar política de gerenciamento baseada EXCLUSIVAMENTE no isolamento estrito de company_id
CREATE POLICY "Users can manage product_types from their company"
  ON public.product_types FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- 4. Recriar política de visualização baseada EXCLUSIVAMENTE no isolamento estrito de company_id
CREATE POLICY "Users can view product_types from their company"
  ON public.product_types FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
