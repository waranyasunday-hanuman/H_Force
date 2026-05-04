-- SQL Schema for Products Table

CREATE TABLE IF NOT EXISTS products (
    prod_cd VARCHAR(100) PRIMARY KEY,
    prod_des VARCHAR(255) NOT NULL,
    prod_type VARCHAR(50),
    unit VARCHAR(50),
    bar_code VARCHAR(100),
    out_price NUMERIC(10, 2) DEFAULT 0,
    in_price NUMERIC(10, 2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- To sync automatically we might need a trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_products_updated_at ON products;
CREATE TRIGGER trigger_update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_updated_at();
