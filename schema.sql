CREATE DATABASE IF NOT EXISTS fullview;
USE fullview;

-- 1. Branches Table
CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Super Admin + Branch Admins + Baristas)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NULL, -- NULL for Super Admin
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'branch_admin', 'barista') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 3. Branch Settings
CREATE TABLE branch_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    setting_key VARCHAR(50) NOT NULL,
    setting_value TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 4. Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    image VARCHAR(255),
    sort_order INT DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 5. Products
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    base_price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT 1,
    has_sizes BOOLEAN DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 6. Product Options
CREATE TABLE product_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('size', 'addon', 'generic') NOT NULL DEFAULT 'generic',
    is_required BOOLEAN DEFAULT 0,
    choices JSON,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 7. Orders
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    order_type ENUM('dine_in', 'car_pickup') NOT NULL,
    meta_data JSON,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    status ENUM('new', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'new',
    prep_time_minutes INT DEFAULT 0,
    estimated_ready_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 8. Order Items
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    options_details JSON,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 9. Promotions
CREATE TABLE promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    type ENUM('percentage', 'fixed') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Update Orders Table (Add these columns manually if table exists)
-- ALTER TABLE orders ADD COLUMN table_number VARCHAR(50);
-- ALTER TABLE orders ADD COLUMN car_type VARCHAR(100);
-- ALTER TABLE orders ADD COLUMN car_color VARCHAR(50);
-- ALTER TABLE orders ADD COLUMN car_plate VARCHAR(50);


-- Insert Default Super Admin
-- Note: Password 'admin330' should be hashed in production.
-- For this script, we insert a placeholder or plain text if testing (but app should hash it).
-- We will assume the app handles hashing or we use a known hash for 'admin330'.
-- $2b$10$EpOu/.. is just an example.
INSERT INTO users (name, username, password, role) VALUES ('المدير العام', 'admin', '$2b$10$YourHashedPasswordHere', 'super_admin');
