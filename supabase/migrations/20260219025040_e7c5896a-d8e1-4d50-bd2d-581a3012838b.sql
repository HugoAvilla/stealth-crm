
-- Update system_config with correct PIX data
UPDATE public.system_config
SET 
  pix_key = 'Hg.lavila@gmail.com',
  beneficiary_name = 'Hugo Luz de Avila',
  beneficiary_cnpj = NULL,
  bank_name = 'PicPay',
  agency = NULL,
  account = NULL,
  pix_qr_code_url = NULL,
  updated_at = now()
WHERE id = 1;
