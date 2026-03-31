ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS include_in_cac boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cac_bucket text,
ADD COLUMN IF NOT EXISTS cac_origin text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_cac_bucket_check'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_cac_bucket_check
    CHECK (cac_bucket IS NULL OR cac_bucket IN ('marketing', 'vendas'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_cac_bucket_required_check'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_cac_bucket_required_check
    CHECK (NOT include_in_cac OR cac_bucket IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_cac_lookup
ON public.transactions (company_id, include_in_cac, transaction_date);
