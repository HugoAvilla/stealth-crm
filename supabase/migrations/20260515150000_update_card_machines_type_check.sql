ALTER TABLE public.card_machines DROP CONSTRAINT IF EXISTS card_machines_machine_type_check;
ALTER TABLE public.card_machines ADD CONSTRAINT card_machines_machine_type_check CHECK (machine_type = ANY (ARRAY['credit'::text, 'debit'::text, 'both'::text]));
