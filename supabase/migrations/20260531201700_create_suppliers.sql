CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company suppliers"
  ON suppliers FOR SELECT
  USING (company_id = (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own company suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (company_id = (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own company suppliers"
  ON suppliers FOR UPDATE
  USING (company_id = (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (company_id = (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own company suppliers"
  ON suppliers FOR DELETE
  USING (company_id = (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE INDEX suppliers_company_id_is_active_name_idx ON suppliers (company_id, is_active, name);
