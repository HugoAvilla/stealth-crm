-- Correção Estrutural: Definir o company_id no perfil do usuário master na tabela profiles.
-- Isso resolve de forma permanente e nativa os problemas de RLS e de carregamento de dados no frontend.

DO $$
DECLARE
  v_master_uid uuid;
  v_company_id bigint;
BEGIN
  -- 1. Obter o UUID do usuário master pelo e-mail
  SELECT id INTO v_master_uid 
  FROM auth.users 
  WHERE email = 'hg.lavila@gmail.com' 
  LIMIT 1;

  IF v_master_uid IS NOT NULL THEN
    -- 2. Obter o company_id associado à assinatura do master
    SELECT company_id INTO v_company_id 
    FROM public.subscriptions 
    WHERE user_id = v_master_uid 
    LIMIT 1;

    -- Se não encontrar na assinatura, faz fallback para a primeira empresa do banco (geralmente WFE Evolution, id=1)
    IF v_company_id IS NULL THEN
      SELECT id INTO v_company_id 
      FROM public.companies 
      ORDER BY id ASC 
      LIMIT 1;
    END IF;

    -- 3. Atualizar de forma permanente o company_id do perfil do master Hugo na tabela profiles
    IF v_company_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET company_id = v_company_id,
          updated_at = now()
      WHERE user_id = v_master_uid;
      
      RAISE NOTICE 'Perfil do master atualizado com sucesso. User ID: %, Company ID: %', v_master_uid, v_company_id;
    ELSE
      RAISE WARNING 'Não foi possível encontrar uma empresa para associar ao perfil do master.';
    END IF;
  ELSE
    RAISE WARNING 'Usuário master hg.lavila@gmail.com não encontrado na tabela auth.users.';
  END IF;
END;
$$;

-- Garantir que a RLS de materials dê acesso total ao master independentemente
-- de qualquer outra validação, para evitar de vez o erro "Erro ao cadastrar material".
DROP POLICY IF EXISTS "Users can manage materials in their company" ON public.materials;
CREATE POLICY "Users can manage materials in their company"
ON public.materials FOR ALL
USING (
  (company_id = get_user_company_id(auth.uid()) OR is_master_account(auth.uid()))
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

-- Garantir o mesmo para visualização
DROP POLICY IF EXISTS "Users can view materials in their company" ON public.materials;
CREATE POLICY "Users can view materials in their company"
ON public.materials FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid()) OR is_master_account(auth.uid()))
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

-- Garantir que a RLS de stock_movements dê acesso total ao master
DROP POLICY IF EXISTS "Users can view stock movements in their company" ON public.stock_movements;
CREATE POLICY "Users can view stock movements in their company"
ON public.stock_movements FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid()) OR is_master_account(auth.uid()))
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

DROP POLICY IF EXISTS "Users can insert stock movements in their company" ON public.stock_movements;
CREATE POLICY "Users can insert stock movements in their company"
ON public.stock_movements FOR INSERT
WITH CHECK (
  (company_id = get_user_company_id(auth.uid()) OR is_master_account(auth.uid()))
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);
