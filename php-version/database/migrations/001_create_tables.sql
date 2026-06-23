-- CarParts B2B 数据库表结构

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role ENUM('admin', 'operator', 'viewer') DEFAULT 'viewer',
    avatar_url VARCHAR(500),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 配件表
CREATE TABLE IF NOT EXISTS parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oe_number VARCHAR(50),
    part_name_cn VARCHAR(200),
    part_name_en VARCHAR(200),
    brand VARCHAR(50),
    category VARCHAR(50),
    classification_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 配件分类表
CREATE TABLE IF NOT EXISTS part_classifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 库存表
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id INT NOT NULL,
    quantity INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    max_stock INT DEFAULT 0,
    warehouse_location VARCHAR(100),
    warehouse_zone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    country VARCHAR(50),
    customer_type VARCHAR(50),
    customer_level VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    country VARCHAR(50),
    main_products TEXT,
    payment_terms VARCHAR(100),
    lead_time_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_number VARCHAR(50),
    customer_id INT,
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('pending', 'confirmed', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(12,2) DEFAULT 0,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    shipping_address TEXT,
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    part_id INT,
    oe_number VARCHAR(50),
    part_name VARCHAR(200),
    brand VARCHAR(50),
    package_name VARCHAR(50),
    unit VARCHAR(20) DEFAULT 'pcs',
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) DEFAULT 0,
    discount_pct DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- 报价单表
CREATE TABLE IF NOT EXISTS quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT,
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted') DEFAULT 'draft',
    total_amount DECIMAL(12,2) DEFAULT 0,
    seller_company VARCHAR(200),
    seller_contact VARCHAR(100),
    seller_phone VARCHAR(50),
    seller_email VARCHAR(100),
    seller_address TEXT,
    buyer_company VARCHAR(200),
    buyer_contact VARCHAR(100),
    buyer_phone VARCHAR(50),
    buyer_email VARCHAR(100),
    buyer_address TEXT,
    trade_terms VARCHAR(50),
    port_loading VARCHAR(100),
    port_dest VARCHAR(100),
    delivery_time VARCHAR(100),
    valid_until DATE,
    discount_pct DECIMAL(5,2) DEFAULT 0,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 报价单明细表
CREATE TABLE IF NOT EXISTS quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    part_id INT,
    oe_number VARCHAR(50),
    part_name VARCHAR(200),
    brand VARCHAR(50),
    package_name VARCHAR(50),
    unit VARCHAR(20) DEFAULT 'pcs',
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id)
);

-- 素材表
CREATE TABLE IF NOT EXISTS image_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id INT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT DEFAULT 0,
    file_md5 VARCHAR(32),
    width INT,
    height INT,
    mime_type VARCHAR(100),
    type ENUM('image', 'video') DEFAULT 'image',
    duration INT DEFAULT 0,
    ocr_text TEXT,
    ocr_status VARCHAR(20) DEFAULT 'pending',
    tags TEXT,
    category VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    classification_id INT,
    thumbnail_small_path VARCHAR(500),
    thumbnail_medium_path VARCHAR(500),
    thumbnail_large_path VARCHAR(500),
    recognition_status VARCHAR(20) DEFAULT 'pending',
    recognized_oe_number VARCHAR(50),
    recognized_part_type VARCHAR(50),
    recognized_brand VARCHAR(50),
    part_name_cn VARCHAR(200),
    part_name_en VARCHAR(200),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 待办表
CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content VARCHAR(500) NOT NULL,
    priority ENUM('urgent', 'normal') DEFAULT 'normal',
    is_done BOOLEAN DEFAULT FALSE,
    user_id INT,
    tag VARCHAR(50),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 价格表
CREATE TABLE IF NOT EXISTS prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id INT NOT NULL,
    price_type VARCHAR(50) DEFAULT 'wholesale',
    currency VARCHAR(10) DEFAULT 'USD',
    unit_price DECIMAL(12,2) DEFAULT 0,
    min_quantity INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- 索引
CREATE INDEX idx_parts_oe_number ON parts(oe_number);
CREATE INDEX idx_parts_brand ON parts(brand);
CREATE INDEX idx_inventory_part_id ON inventory(part_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_image_assets_part_id ON image_assets(part_id);
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_is_done ON todos(is_done);
CREATE INDEX idx_settings_key ON settings(`key`);
CREATE INDEX idx_prices_part_id ON prices(part_id);
