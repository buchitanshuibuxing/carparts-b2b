-- Car Parts B2B - PostgreSQL Initial Schema Migration
-- Version: 001

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. Parts - 配件主数据表
-- ============================================
CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    oe_number TEXT NOT NULL UNIQUE,
    part_name_cn TEXT NOT NULL,
    part_name_en TEXT DEFAULT '',
    part_name_ko TEXT DEFAULT '',
    category TEXT DEFAULT '其他',
    sub_category TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    car_model TEXT DEFAULT '',
    engine_type TEXT DEFAULT '',
    model_year_from INTEGER,
    model_year_to INTEGER,
    part_type TEXT DEFAULT 'OEM',
    specifications JSONB DEFAULT '{}',
    unit TEXT DEFAULT '个',
    weight_kg DECIMAL(10,3) DEFAULT 0,
    dimensions_cm TEXT DEFAULT '',
    hs_code TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    updated_by INTEGER,
    search_vector tsvector,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_brand ON parts(brand);
CREATE INDEX idx_parts_car_model ON parts(car_model);
CREATE INDEX idx_parts_search ON parts USING GIN(search_vector);
CREATE INDEX idx_parts_oe_trgm ON parts USING GIN(oe_number gin_trgm_ops);
CREATE INDEX idx_parts_name_cn_trgm ON parts USING GIN(part_name_cn gin_trgm_ops);

CREATE OR REPLACE FUNCTION parts_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.oe_number, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.part_name_cn, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.part_name_en, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.brand, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(NEW.car_model, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_parts_search BEFORE INSERT OR UPDATE ON parts
FOR EACH ROW EXECUTE FUNCTION parts_search_vector_update();

-- ============================================
-- 2. Inventory - 库存表
-- ============================================
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL UNIQUE REFERENCES parts(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    warehouse_location TEXT DEFAULT '',
    warehouse_zone TEXT DEFAULT '默认',
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 99999,
    last_stock_check TIMESTAMPTZ,
    last_restock_date TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Inventory Log - 库存变动日志
-- ============================================
CREATE TABLE inventory_log (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    change_type VARCHAR(10) NOT NULL CHECK (change_type IN ('IN', 'OUT')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    reference_type VARCHAR(20) DEFAULT '',
    reference_id INTEGER,
    operator_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inv_log_part ON inventory_log(part_id);
CREATE INDEX idx_inv_log_created ON inventory_log(created_at);

-- ============================================
-- 4. Suppliers - 供应商表
-- ============================================
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    country TEXT DEFAULT '',
    payment_terms TEXT DEFAULT '',
    currency TEXT DEFAULT 'USD',
    lead_time_days INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    notes TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Supplier Parts - 供应商-配件关联表
-- ============================================
CREATE TABLE supplier_parts (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    supplier_sku TEXT DEFAULT '',
    moq INTEGER DEFAULT 1,
    lead_time_days INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    UNIQUE(supplier_id, part_id)
);

-- ============================================
-- 6. Customers - 客户表
-- ============================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    country TEXT DEFAULT '',
    region TEXT DEFAULT '',
    customer_type TEXT DEFAULT '经销商',
    customer_level TEXT DEFAULT '普通',
    currency TEXT DEFAULT 'USD',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Prices - 价格表
-- ============================================
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    price_type TEXT DEFAULT '批发价',
    currency TEXT DEFAULT 'USD',
    unit_price DECIMAL(12,2) NOT NULL,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER DEFAULT 99999,
    effective_date TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. Price Log - 价格变更日志
-- ============================================
CREATE TABLE price_log (
    id SERIAL PRIMARY KEY,
    price_id INTEGER NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
    old_price DECIMAL(12,2) NOT NULL,
    new_price DECIMAL(12,2) NOT NULL,
    change_reason TEXT DEFAULT '',
    operator TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. Orders - 订单表
-- ============================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'completed', 'cancelled')),
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    shipping_method TEXT DEFAULT '',
    shipping_address TEXT DEFAULT '',
    tracking_number TEXT DEFAULT '',
    estimated_date TIMESTAMPTZ,
    actual_date TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. Order Items - 订单明细表
-- ============================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_pct DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    fulfillment_qty INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
);

-- ============================================
-- 11. Quotation Templates - 报价模板表
-- ============================================
CREATE TABLE quotation_templates (
    id SERIAL PRIMARY KEY,
    template_name TEXT NOT NULL,
    header_text TEXT DEFAULT '',
    footer_text TEXT DEFAULT '',
    terms_text TEXT DEFAULT '',
    currency TEXT DEFAULT 'USD',
    include_image BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. Quotations - 报价单表
-- ============================================
CREATE TABLE quotations (
    id SERIAL PRIMARY KEY,
    quotation_number TEXT NOT NULL UNIQUE,
    template_id INTEGER REFERENCES quotation_templates(id),
    customer_id INTEGER REFERENCES customers(id),
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
    remark TEXT DEFAULT '',
    pdf_path TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. Quotation Items - 报价单明细表
-- ============================================
CREATE TABLE quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    oe_number TEXT NOT NULL,
    part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

-- ============================================
-- 14. Image Assets - 图片资源表 (enhanced)
-- ============================================
CREATE TABLE image_assets (
    id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    mime_type VARCHAR(50) DEFAULT 'image/jpeg',
    ocr_text TEXT DEFAULT '',
    ocr_status VARCHAR(20) DEFAULT 'pending',
    tags TEXT DEFAULT '',
    category TEXT DEFAULT '',
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    -- Enhanced fields for asset management
    classification_id INTEGER,
    thumbnail_small_path VARCHAR(500) DEFAULT '',
    thumbnail_medium_path VARCHAR(500) DEFAULT '',
    thumbnail_large_path VARCHAR(500) DEFAULT '',
    recognition_status VARCHAR(20) DEFAULT 'pending',
    recognized_oe_number TEXT DEFAULT '',
    recognized_part_type TEXT DEFAULT '',
    recognized_brand TEXT DEFAULT '',
    recognition_confidence DECIMAL(3,2) DEFAULT 0,
    recognition_result JSONB DEFAULT '{}',
    uploaded_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_image_assets_part ON image_assets(part_id);
CREATE INDEX idx_image_assets_classification ON image_assets(classification_id);
CREATE INDEX idx_image_assets_ocr_trgm ON image_assets USING GIN(ocr_text gin_trgm_ops);
CREATE INDEX idx_image_assets_oe_trgm ON image_assets USING GIN(recognized_oe_number gin_trgm_ops);

-- ============================================
-- 15. Settings - 系统设置表
-- ============================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
);

INSERT INTO settings (key, value) VALUES
    ('company_name', ''),
    ('default_currency', 'USD'),
    ('low_stock_alert', 'true'),
    ('database_version', '1');

-- ============================================
-- 16. Import History - 导入历史表
-- ============================================
CREATE TABLE import_history (
    id SERIAL PRIMARY KEY,
    import_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_details TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. Users - 用户表
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    avatar_url VARCHAR(500) DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 18. Refresh Tokens - 刷新令牌表
-- ============================================
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    user_agent VARCHAR(500) DEFAULT '',
    ip_address VARCHAR(45) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================
-- 19. Asset Classifications - 素材分类表
-- ============================================
CREATE TABLE asset_classifications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES asset_classifications(id) ON DELETE SET NULL,
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_class_parent ON asset_classifications(parent_id);

-- ============================================
-- 20. Asset Tags - 素材标签表
-- ============================================
CREATE TABLE asset_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6B7280',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 21. Image Asset Tags - 素材-标签多对多
-- ============================================
CREATE TABLE image_asset_tags (
    image_asset_id INTEGER NOT NULL REFERENCES image_assets(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES asset_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (image_asset_id, tag_id)
);

-- ============================================
-- 22. Facebook Pages - Facebook 页面表
-- ============================================
CREATE TABLE facebook_pages (
    id SERIAL PRIMARY KEY,
    page_id VARCHAR(50) NOT NULL UNIQUE,
    page_name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    token_expires TIMESTAMPTZ,
    profile_picture VARCHAR(500) DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    connected_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 23. Facebook Posts - Facebook 发帖记录
-- ============================================
CREATE TABLE facebook_posts (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES facebook_pages(id),
    fb_post_id VARCHAR(50),
    message TEXT DEFAULT '',
    image_asset_ids INTEGER[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    error_message TEXT DEFAULT '',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fb_posts_page ON facebook_posts(page_id);
CREATE INDEX idx_fb_posts_status ON facebook_posts(status);
CREATE INDEX idx_fb_posts_scheduled ON facebook_posts(scheduled_at) WHERE status = 'scheduled';

-- ============================================
-- 24. Facebook Post Schedules - 定时发帖模板
-- ============================================
CREATE TABLE facebook_post_schedules (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES facebook_pages(id),
    cron_expression VARCHAR(50) NOT NULL,
    message_template TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 25. Audit Log - 操作审计日志
-- ============================================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================
-- 26. Add foreign key for image_assets.classification_id
-- ============================================
ALTER TABLE image_assets ADD CONSTRAINT fk_image_assets_classification
    FOREIGN KEY (classification_id) REFERENCES asset_classifications(id) ON DELETE SET NULL;

-- ============================================
-- Seed: Default admin user (password: admin123)
-- ============================================
INSERT INTO users (username, email, password_hash, display_name, role)
VALUES ('admin', 'admin@carparts.local', '$2b$10$rQZ8kHxMBOx3GHNhFJlOZeYVvKj.fxJlOZeYVvKj.fxJlOZeYVvKj', 'Administrator', 'admin');
-- NOTE: The above hash is a placeholder. The real seed will hash the password in code.

-- ============================================
-- Seed: Default asset classifications
-- ============================================
INSERT INTO asset_classifications (name, description, sort_order) VALUES
    ('产品图', '配件产品照片', 1),
    ('包装图', '配件包装照片', 2),
    ('图纸', '技术图纸和尺寸图', 3),
    ('标签图', '配件标签和铭牌', 4),
    ('宣传图', '营销和宣传素材', 5);
