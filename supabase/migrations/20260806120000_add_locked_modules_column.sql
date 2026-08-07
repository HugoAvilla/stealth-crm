-- Permissões por funcionário (deny-list).
-- A coluna já pode existir no banco (criada pelo painel Supabase); esta migration
-- garante que ela exista, esteja versionada e com o TIPO CORRETO (text[]). Idempotente.

-- 1. Garante que a coluna exista (como text[] em bancos novos).
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS locked_modules text[] NOT NULL DEFAULT '{}';

-- 2. Auto-correção: se a coluna já existia como jsonb (criada pelo painel do Supabase),
--    converte para text[]. O código (RPC update_member_locked_modules, fn_is_locked e o
--    frontend) espera text[] — com jsonb, a gravação de permissões e a RLS quebram.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'locked_modules'
      AND udt_name = 'jsonb'
  ) THEN
    -- Helper temporário (subquery não é permitida direto na cláusula USING do ALTER COLUMN)
    CREATE OR REPLACE FUNCTION public._jsonb_to_text_array(j jsonb)
    RETURNS text[] LANGUAGE sql IMMUTABLE AS $fn$
      SELECT CASE
        WHEN j IS NULL THEN '{}'::text[]
        WHEN jsonb_typeof(j) = 'array' THEN array(SELECT jsonb_array_elements_text(j))
        ELSE '{}'::text[]
      END;
    $fn$;

    ALTER TABLE public.profiles
      ALTER COLUMN locked_modules DROP DEFAULT,
      ALTER COLUMN locked_modules TYPE text[] USING public._jsonb_to_text_array(locked_modules),
      ALTER COLUMN locked_modules SET DEFAULT '{}',
      ALTER COLUMN locked_modules SET NOT NULL;

    DROP FUNCTION public._jsonb_to_text_array(jsonb);
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.locked_modules IS
    'Deny-list de permissões do funcionário. Cada item = "modulo_acao" (ex.: "vendas_delete"). Ausente = permitido.';
