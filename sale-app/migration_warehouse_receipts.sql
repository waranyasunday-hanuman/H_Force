CREATE TABLE IF NOT EXISTS warehouse_receipt_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    type VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL,
    cust_code VARCHAR(100),
    emp_code VARCHAR(100),
    pjt_code VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES warehouse_receipt_requests(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    in_warehouse_code VARCHAR(50),
    receipt_type VARCHAR(100),
    lot_no VARCHAR(100),
    expire_date DATE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    price NUMERIC(10, 2),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
