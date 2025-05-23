-- Add quantity_per_unit column to products table
ALTER TABLE products ADD COLUMN quantity_per_unit numeric;

-- Update existing products to have a default quantity_per_unit of 1
UPDATE products SET quantity_per_unit = 1 WHERE quantity_per_unit IS NULL;

-- Make quantity_per_unit column required for future inserts
ALTER TABLE products ALTER COLUMN quantity_per_unit SET NOT NULL; 