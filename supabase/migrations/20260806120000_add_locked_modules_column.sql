-- Permissões por funcionário (deny-list).
-- A coluna já pode existir no banco (criada pelo painel Supabase); esta migration
-- apenas garante que ela exista e esteja versionada. Idempotente.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS locked_modules text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.locked_modules IS
    'Deny-list de permissões do funcionário. Cada item = "modulo_acao" (ex.: "vendas_delete"). Ausente = permitido.';
