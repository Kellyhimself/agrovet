-- Add unit column to products table
ALTER TABLE products ADD COLUMN unit text;

-- Update existing products to have a default unit of 'pcs'
UPDATE products SET unit = 'pcs' WHERE unit IS NULL;

-- Make unit column required for future inserts
ALTER TABLE products ALTER COLUMN unit SET NOT NULL; 