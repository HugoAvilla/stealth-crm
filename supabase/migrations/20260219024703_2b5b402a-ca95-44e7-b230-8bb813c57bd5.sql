
-- RPC para alterar preço global de todas as assinaturas
CREATE OR REPLACE FUNCTION public.master_change_global_price(new_price_input numeric, reason_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é o master
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Atualizar preço de todas as assinaturas
  UPDATE public.subscriptions
  SET 
    plan_price = new_price_input,
    final_price = new_price_input,
    updated_at = now();

  -- Atualizar system_config
  UPDATE public.system_config
  SET 
    monthly_price = new_price_input,
    updated_at = now()
  WHERE id = 1;

  -- Registrar ação no log
  INSERT INTO public.master_actions (
    action_type,
    old_value,
    new_value,
    reason,
    performed_by
  ) VALUES (
    'global_price_change',
    (SELECT monthly_price::text FROM public.system_config WHERE id = 1),
    new_price_input::text,
    reason_input,
    auth.uid()
  );
END;
$function$;

-- Permitir master atualizar system_config
CREATE POLICY "Master can update system config"
ON public.system_config
FOR UPDATE
USING (is_master_account(auth.uid()));
