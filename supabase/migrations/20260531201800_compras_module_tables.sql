-- T2: purchases
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_name_snapshot VARCHAR(255) NOT NULL,
  supplier_phone_snapshot VARCHAR(50),
  purchase_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL,
  installments_count INTEGER NOT NULL DEFAULT 1,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  status VARCHAR(20) NOT NULL DEFAULT 'em_aberto',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company purchases" ON purchases FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own company purchases" ON purchases FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own company purchases" ON purchases FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own company purchases" ON purchases FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX purchases_company_id_status_idx ON purchases (company_id, status);
CREATE INDEX purchases_company_id_purchase_date_idx ON purchases (company_id, purchase_date);
CREATE INDEX purchases_supplier_id_idx ON purchases (supplier_id);

-- T3: purchase_installments
CREATE TABLE purchase_installments (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  paid_at TIMESTAMPTZ,
  transaction_id INTEGER REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchase_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase installments" ON purchase_installments FOR SELECT USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can insert own purchase installments" ON purchase_installments FOR INSERT WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can update own purchase installments" ON purchase_installments FOR UPDATE USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))) WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can delete own purchase installments" ON purchase_installments FOR DELETE USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

CREATE INDEX purchase_installments_purchase_id_idx ON purchase_installments (purchase_id);
CREATE INDEX purchase_installments_due_date_status_idx ON purchase_installments (due_date, status);

-- T4: purchase_items
CREATE TABLE purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  description VARCHAR(500),
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'un',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT purchase_items_desc_or_mat_check CHECK (description IS NOT NULL OR material_id IS NOT NULL)
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase items" ON purchase_items FOR SELECT USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can insert own purchase items" ON purchase_items FOR INSERT WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can update own purchase items" ON purchase_items FOR UPDATE USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))) WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can delete own purchase items" ON purchase_items FOR DELETE USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

-- T5: purchase_attachments
CREATE TABLE purchase_attachments (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchase_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase attachments" ON purchase_attachments FOR SELECT USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can insert own purchase attachments" ON purchase_attachments FOR INSERT WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can update own purchase attachments" ON purchase_attachments FOR UPDATE USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))) WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Users can delete own purchase attachments" ON purchase_attachments FOR DELETE USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

-- T6: purchase-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase-attachments', 'purchase-attachments', false) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can insert own purchase attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'purchase-attachments' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can select own purchase attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'purchase-attachments' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete own purchase attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'purchase-attachments' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE user_id = auth.uid())
);
