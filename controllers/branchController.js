const db = require('../config/database');
const QRCode = require('qrcode');

exports.getDashboard = async (req, res) => {
    try {
        const branchId = req.user.branch_id;
        const [categories] = await db.query('SELECT * FROM categories WHERE branch_id = ?', [branchId]);
        const [products] = await db.query('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.branch_id = ?', [branchId]);

        // Generate QR Code for the branch URL
        const [branch] = await db.query('SELECT * FROM branches WHERE id = ?', [branchId]);
        const branchUrl = `http://${branch[0].subdomain}.localhost:3000`;
        const qrCodeUrl = await QRCode.toDataURL(branchUrl);

        res.render('branch/dashboard', { categories, products, qrCodeUrl, branch: branch[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Category CRUD
exports.createCategory = async (req, res) => {
    const { name } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const branchId = req.user.branch_id;

    try {
        await db.query('INSERT INTO categories (branch_id, name, image) VALUES (?, ?, ?)', [branchId, name, image]);
        req.flash('success_msg', 'Category created');
        res.redirect('/branch/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating category');
        res.redirect('/branch/dashboard');
    }
};

exports.updateCategory = async (req, res) => {
    const { name } = req.body;
    const categoryId = req.params.id;
    const branchId = req.user.branch_id;

    try {
        let query = 'UPDATE categories SET name = ?';
        let params = [name];

        if (req.file) {
            query += ', image = ?';
            params.push('/uploads/' + req.file.filename);
        }

        query += ' WHERE id = ? AND branch_id = ?';
        params.push(categoryId, branchId);

        await db.query(query, params);
        req.flash('success_msg', 'Category updated');
        res.redirect('/branch/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating category');
        res.redirect('/branch/dashboard');
    }
};

exports.deleteCategory = async (req, res) => {
    const categoryId = req.params.id;
    const branchId = req.user.branch_id;

    try {
        // Check if category has products
        const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);

        if (products[0].count > 0) {
            req.flash('error_msg', 'Cannot delete category with existing products');
            return res.redirect('/branch/dashboard');
        }

        await db.query('DELETE FROM categories WHERE id = ? AND branch_id = ?', [categoryId, branchId]);
        req.flash('success_msg', 'Category deleted');
        res.redirect('/branch/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting category');
        res.redirect('/branch/dashboard');
    }
};


// Product CRUD
exports.createProduct = async (req, res) => {
    const { name, description, base_price, category_id } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const branchId = req.user.branch_id;

    try {
        await db.query('INSERT INTO products (branch_id, category_id, name, description, image, base_price) VALUES (?, ?, ?, ?, ?, ?)',
            [branchId, category_id, name, description, image, base_price]);
        req.flash('success_msg', 'Product created');
        res.redirect('/branch/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating product');
        res.redirect('/branch/dashboard');
    }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
    const productId = req.params.id;
    const branchId = req.user.branch_id;

    try {
        await db.query('DELETE FROM products WHERE id = ? AND branch_id = ?', [productId, branchId]);
        req.flash('success_msg', 'Product deleted');
        res.redirect('/branch/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting product');
        res.redirect('/branch/dashboard');
    }
};



// Edit Product
exports.getEditProduct = async (req, res) => {
    const productId = req.params.id;
    const branchId = req.user.branch_id;

    try {
        const [product] = await db.query('SELECT * FROM products WHERE id = ? AND branch_id = ?', [productId, branchId]);
        const [categories] = await db.query('SELECT * FROM categories WHERE branch_id = ?', [branchId]);
        const [options] = await db.query('SELECT * FROM product_options WHERE product_id = ?', [productId]);

        if (product.length === 0) {
            req.flash('error_msg', 'Product not found');
            return res.redirect('/branch/dashboard');
        }

        res.render('branch/edit_product', { product: product[0], categories, options });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.updateProduct = async (req, res) => {
    const productId = req.params.id;
    const branchId = req.user.branch_id;
    const { name, description, base_price, category_id } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : req.body.current_image;

    try {
        await db.query('UPDATE products SET name = ?, description = ?, base_price = ?, category_id = ?, image = ? WHERE id = ? AND branch_id = ?',
            [name, description, base_price, category_id, image, productId, branchId]);

        req.flash('success_msg', 'Product updated');
        res.redirect('/branch/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating product');
        res.redirect('/branch/dashboard');


    }
};

// Product Options
exports.createProductOption = async (req, res) => {
    const productId = req.params.id;
    const { name, type, is_required, choice_name, choice_price } = req.body;

    // Construct choices JSON
    console.log('Create Option Body:', req.body); // Debugging

    let choices = [];

    // Ensure arrays
    const names = Array.isArray(choice_name) ? choice_name : (choice_name ? [choice_name] : []);
    const prices = Array.isArray(choice_price) ? choice_price : (choice_price ? [choice_price] : []);

    for (let i = 0; i < names.length; i++) {
        if (names[i] && names[i].trim() !== '') {
            choices.push({
                name: names[i].trim(),
                price: parseFloat(prices[i]) || 0
            });
        }
    }

    try {
        await db.query('INSERT INTO product_options (product_id, name, type, is_required, choices) VALUES (?, ?, ?, ?, ?)',
            [productId, name, type, is_required ? 1 : 0, JSON.stringify(choices)]);
        req.flash('success_msg', 'Option added');
        res.redirect('/branch/product/edit/' + productId);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding option');
        res.redirect('/branch/product/edit/' + productId);
    }
};

exports.deleteProductOption = async (req, res) => {
    const optionId = req.params.id;
    const productId = req.body.product_id; // Need to pass this to redirect back

    try {
        await db.query('DELETE FROM product_options WHERE id = ?', [optionId]);
        req.flash('success_msg', 'Option deleted');
        res.redirect('/branch/product/edit/' + productId);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting option');
        res.redirect('/branch/dashboard');
    }
};

// Settings
exports.getSettings = async (req, res) => {
    try {
        const branchId = req.user.branch_id;
        const [settings] = await db.query('SELECT * FROM branch_settings WHERE branch_id = ?', [branchId]);
        res.render('branch/settings', { settings });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.updateSettings = async (req, res) => {
    const branchId = req.user.branch_id;
    const { stripe_key, vat_number } = req.body;

    try {
        const keys = { stripe_key, vat_number };

        for (const [key, value] of Object.entries(keys)) {
            const [exists] = await db.query('SELECT * FROM branch_settings WHERE branch_id = ? AND setting_key = ?', [branchId, key]);
            if (exists.length > 0) {
                await db.query('UPDATE branch_settings SET setting_value = ? WHERE branch_id = ? AND setting_key = ?', [value, branchId, key]);
            } else {
                await db.query('INSERT INTO branch_settings (branch_id, setting_key, setting_value) VALUES (?, ?, ?)', [branchId, key, value]);
            }
        }

        req.flash('success_msg', 'Settings updated');
        res.redirect('/branch/settings');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating settings');
        res.redirect('/branch/settings');
    }
};

exports.getReports = async (req, res) => {
    const branchId = req.user.branch_id;
    const { range } = req.query; // 'daily', 'weekly', 'monthly', 'yearly'

    try {
        let query = '';
        let labelFormat = '';

        switch (range) {
            case 'weekly':
                query = `
                    SELECT DATE_FORMAT(created_at, '%Y-%u') as date, COUNT(*) as count, SUM(total_amount) as total 
                    FROM orders 
                    WHERE branch_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
                    GROUP BY date 
                    ORDER BY date DESC`;
                break;
            case 'monthly':
                query = `
                    SELECT DATE_FORMAT(created_at, '%Y-%m') as date, COUNT(*) as count, SUM(total_amount) as total 
                    FROM orders 
                    WHERE branch_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
                    GROUP BY date 
                    ORDER BY date DESC`;
                break;
            case 'yearly':
                query = `
                    SELECT DATE_FORMAT(created_at, '%Y') as date, COUNT(*) as count, SUM(total_amount) as total 
                    FROM orders 
                    WHERE branch_id = ? 
                    GROUP BY date 
                    ORDER BY date DESC`;
                break;
            default: // Daily
                query = `
                    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as total 
                    FROM orders 
                    WHERE branch_id = ? 
                    GROUP BY DATE(created_at) 
                    ORDER BY date DESC LIMIT 30`;
        }

        const [data] = await db.query(query, [branchId]);

        const selectedRange = range || 'daily';
        res.render('branch/reports', { data, range: selectedRange });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
exports.getPromotions = async (req, res) => {
    try {
        const branchId = req.user.branch_id;
        const [promotions] = await db.query(`
            SELECT p.*, 
                   c.name as category_name, 
                   prod.name as product_name 
            FROM promotions p 
            LEFT JOIN categories c ON p.target_type = 'category' AND p.target_id = c.id 
            LEFT JOIN products prod ON p.target_type = 'product' AND p.target_id = prod.id 
            WHERE p.branch_id = ?`, [branchId]);

        const [categories] = await db.query('SELECT * FROM categories WHERE branch_id = ?', [branchId]);
        const [products] = await db.query('SELECT * FROM products WHERE branch_id = ?', [branchId]);

        res.render('branch/promotions', { promotions, categories, products });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createPromotion = async (req, res) => {
    const { code, type, value, start_date, end_date, target_type, target_id, is_auto_applied } = req.body;
    const branchId = req.user.branch_id;

    try {
        await db.query(
            'INSERT INTO promotions (branch_id, code, type, value, start_date, end_date, target_type, target_id, is_auto_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [branchId, code, type, value, start_date || null, end_date || null, target_type || 'order', target_id || null, is_auto_applied ? 1 : 0]
        );
        req.flash('success_msg', 'Promotion created');
        res.redirect('/branch/promotions');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating promotion');
        res.redirect('/branch/promotions');
    }
};

exports.deletePromotion = async (req, res) => {
    const id = req.params.id;
    try {
        await db.query('DELETE FROM promotions WHERE id = ?', [id]);
        req.flash('success_msg', 'Promotion deleted');
        res.redirect('/branch/promotions');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting promotion');
        res.redirect('/branch/promotions');
    }
};
