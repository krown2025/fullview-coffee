-- PostgreSQL Schema for FullView Coffee System
-- This schema is compatible with both PostgreSQL and MySQL (with minor adjustments)

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Super Admin + Branch Admins + Baristas)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'barista')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 3. Branch Settings
CREATE TABLE IF NOT EXISTS branch_settings (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    setting_key VARCHAR(50) NOT NULL,
    setting_value TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    image VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    base_price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    has_sizes BOOLEAN DEFAULT false,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 6. Product Options
CREATE TABLE IF NOT EXISTS product_options (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'generic' CHECK (type IN ('size', 'addon', 'generic')),
    is_required BOOLEAN DEFAULT false,
    choices JSONB,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 7. Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('dine_in', 'car_pickup')),
    table_number VARCHAR(50),
    car_type VARCHAR(100),
    car_color VARCHAR(50),
    car_plate VARCHAR(50),
    meta_data JSONB,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
    prep_time_minutes INTEGER DEFAULT 0,
    estimated_ready_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 8. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    options_details JSONB,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 9. Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10, 2) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Insert Default Super Admin
-- Note: Password should be hashed - use bcrypt to generate
-- Example: '$2b$10$YourHashedPasswordHere' is a placeholder
INSERT INTO users (name, username, password, role) 
VALUES ('المدير العام', 'admin', '$2b$10$YourHashedPasswordHere', 'super_admin')
ON CONFLICT (username) DO NOTHING;
