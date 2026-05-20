CREATE TABLE material_losses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES companies(id),
  space_id bigint NOT NULL REFERENCES spaces(id),
  sale_id bigint REFERENCES sales(id),
  material_id bigint NOT NULL REFERENCES materials(id),
  installer_id uuid NOT NULL REFERENCES auth.users(id),
  
  category text NOT NULL CHECK (category IN ('PPF', 'INSULFILM')),
  reason text NOT NULL,
  reason_details text,
  
  lost_meters numeric NOT NULL CHECK (lost_meters > 0),
  lost_m2 numeric NOT NULL,
  cost numeric NOT NULL,
  
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE material_loss_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES companies(id),
  category text NOT NULL CHECK (category IN ('PPF', 'INSULFILM')),
  limit_type text NOT NULL CHECK (limit_type IN ('cost', 'meters', 'count')),
  limit_value numeric NOT NULL CHECK (limit_value > 0),
  
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  
  UNIQUE (company_id, category)
);