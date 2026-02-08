-- Add fixed_price and product_type_id to vehicle_regions for linked services
ALTER TABLE vehicle_regions 
ADD COLUMN IF NOT EXISTS fixed_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_type_id INTEGER REFERENCES product_types(id) ON DELETE SET NULL;