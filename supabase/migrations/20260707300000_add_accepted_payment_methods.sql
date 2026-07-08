-- Add accepted_payment_methods column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT ARRAY['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência']::text[];
