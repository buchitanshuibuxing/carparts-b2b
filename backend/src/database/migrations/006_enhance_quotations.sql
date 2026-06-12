-- 006: Enhance quotations system - payment accounts, seller/buyer info, trade terms

-- Section A: Create payment_accounts table
CREATE TABLE IF NOT EXISTS payment_accounts (
    id SERIAL PRIMARY KEY,
    account_name TEXT NOT NULL,
    beneficiary_name TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    bank_address TEXT DEFAULT '',
    swift_code TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    currency TEXT DEFAULT 'USD',
    remark TEXT DEFAULT '',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Section B: Add columns to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS seller_company TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS seller_contact TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS seller_phone TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS seller_email TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS seller_address TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS buyer_company TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS buyer_contact TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS buyer_phone TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS buyer_email TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS buyer_address TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS trade_terms TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS port_loading TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS port_dest TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_pct DECIMAL(5,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_stages JSONB DEFAULT '[]';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_account_id INTEGER REFERENCES payment_accounts(id);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Section C: Add columns to quotation_items table
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '';
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS package_name TEXT DEFAULT '';
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
