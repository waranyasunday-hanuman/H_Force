-- Add warehouse_code to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warehouse_code VARCHAR(100);

-- Comment for documentation
COMMENT ON COLUMN profiles.warehouse_code IS 'Warehouse code assigned to the user (especially for SALE role)';
