-- Habilitar RLS nas tabelas
ALTER TABLE material_losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_loss_limits ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- Políticas para material_losses
-- ----------------------------------------------------

-- SELECT: Apenas usuários autenticados da mesma company_id
CREATE POLICY "Users can view material_losses from their company"
  ON material_losses FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- INSERT: Admin e Produção (com mesma company_id)
CREATE POLICY "Admin and Producao can insert material_losses"
  ON material_losses FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
  );

-- UPDATE: Admin e Produção (com mesma company_id)
CREATE POLICY "Admin and Producao can update material_losses"
  ON material_losses FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
  );

-- DELETE: Admin apenas (com mesma company_id)
CREATE POLICY "Admin can delete material_losses"
  ON material_losses FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- ----------------------------------------------------
-- Políticas para material_loss_limits
-- ----------------------------------------------------

-- SELECT: Usuários autenticados da mesma company_id
CREATE POLICY "Users can view material_loss_limits from their company"
  ON material_loss_limits FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- INSERT: Admin apenas
CREATE POLICY "Admin can insert material_loss_limits"
  ON material_loss_limits FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- UPDATE: Admin apenas
CREATE POLICY "Admin can update material_loss_limits"
  ON material_loss_limits FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- DELETE: Admin apenas
CREATE POLICY "Admin can delete material_loss_limits"
  ON material_loss_limits FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'ADMIN'::app_role)
  );
