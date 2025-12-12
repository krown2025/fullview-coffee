const db = require('../config/database');
const bcrypt = require('bcrypt');
const passport = require('passport');

exports.getLogin = (req, res) => {
    res.render('admin/login');
};

exports.postLogin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            req.flash('error_msg', info.message);
            return res.redirect('/admin/login');
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }

            if (user.role === 'super_admin') {
                return res.redirect('/admin/dashboard');
            } else if (user.role === 'branch_admin') {
                return res.redirect('/branch/dashboard');
            } else if (user.role === 'barista') {
                return res.redirect('/kds/dashboard');
            }
            res.redirect('/');
        });
    })(req, res, next);
};

exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/admin/login');
    });
};

exports.getDashboard = async (req, res) => {
    try {
        const [branches] = await db.query('SELECT * FROM branches');
        // Update users query to join with branches to get branch name
        const [users] = await db.query(`
            SELECT u.*, b.name as branch_name 
            FROM users u 
            LEFT JOIN branches b ON u.branch_id = b.id 
            WHERE u.role != "super_admin"
        `);

        res.render('admin/dashboard', { branches, users });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getReports = async (req, res) => {
    try {
        // REPORT QUERIES
        // 1. Total Sales (Paid)
        const [totalSalesResult] = await db.query('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = "paid"');
        const totalSales = parseFloat(totalSalesResult[0].total || 0);

        // 2. Sales by Branch
        const [salesByBranch] = await db.query(`
            SELECT b.name, COUNT(o.id) as count, COALESCE(SUM(o.total_amount), 0) as total 
            FROM branches b 
            LEFT JOIN orders o ON b.id = o.branch_id AND o.payment_status = "paid" 
            GROUP BY b.id
        `);

        salesByBranch.forEach(b => b.total = parseFloat(b.total));

        // 3. Top Selling Products
        const [topProducts] = await db.query(`
            SELECT p.name, b.name as branch_name, COUNT(oi.id) as sold 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            JOIN branches b ON p.branch_id = b.id
            GROUP BY p.id 
            ORDER BY sold DESC 
            LIMIT 5
        `);

        res.render('admin/reports', { totalSales, salesByBranch, topProducts });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Branch CRUD
exports.createBranch = async (req, res) => {
    const { name, subdomain, description } = req.body;
    try {
        await db.query('INSERT INTO branches (name, subdomain, description) VALUES (?, ?, ?)', [name, subdomain, description]);
        req.flash('success_msg', 'Branch created successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating branch');
        res.redirect('/admin/dashboard');
    }
};

exports.editBranch = async (req, res) => {
    const { id } = req.params;
    const { name, subdomain, description } = req.body;
    try {
        await db.query('UPDATE branches SET name = ?, subdomain = ?, description = ? WHERE id = ?', [name, subdomain, description, id]);
        req.flash('success_msg', 'Branch updated successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating branch');
        res.redirect('/admin/dashboard');
    }
};

exports.deleteBranch = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM branches WHERE id = ?', [id]);
        req.flash('success_msg', 'Branch deleted successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting branch');
        res.redirect('/admin/dashboard');
    }
};

exports.toggleBranchStatus = async (req, res) => {
    const { id } = req.params;
    try {
        // First get current status
        const [branch] = await db.query('SELECT is_active FROM branches WHERE id = ?', [id]);
        if (branch.length === 0) {
            req.flash('error_msg', 'Branch not found');
            return res.redirect('/admin/dashboard');
        }

        const newStatus = !branch[0].is_active;
        await db.query('UPDATE branches SET is_active = ? WHERE id = ?', [newStatus, id]);

        req.flash('success_msg', `Branch ${newStatus ? 'activated' : 'paused'} successfully`);
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating branch status');
        res.redirect('/admin/dashboard');
    }
};

// User CRUD (Branch Admin)
exports.createBranchAdmin = async (req, res) => {
    const { name, username, password, branch_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, username, password, role, branch_id) VALUES (?, ?, ?, "branch_admin", ?)',
            [name, username, hashedPassword, branch_id]);
        req.flash('success_msg', 'Branch Admin created successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating user');
        res.redirect('/admin/dashboard');
    }
};

// Global Product Management
exports.createGlobalProduct = async (req, res) => {
    const { name, description, base_price, category_name, image, target_branches } = req.body;

    // target_branches can be 'all' or an array of IDs
    let branchIds = [];

    try {
        if (target_branches === 'all') {
            const [branches] = await db.query('SELECT id FROM branches');
            branchIds = branches.map(b => b.id);
        } else {
            branchIds = Array.isArray(target_branches) ? target_branches : [target_branches];
        }

        for (const branchId of branchIds) {
            // 1. Check/Create Category
            let categoryId;
            const [cats] = await db.query('SELECT id FROM categories WHERE branch_id = ? AND name = ?', [branchId, category_name]);

            if (cats.length > 0) {
                categoryId = cats[0].id;
            } else {
                const [newCat] = await db.query('INSERT INTO categories (branch_id, name, sort_order) VALUES (?, ?, 0)', [branchId, category_name]);
                categoryId = newCat.insertId;
            }

            // 2. Create Product
            await db.query(`
                INSERT INTO products (branch_id, category_id, name, description, base_price, image, is_available) 
                VALUES (?, ?, ?, ?, ?, ?, 1)
            `, [branchId, categoryId, name, description, base_price, image]);
        }

        req.flash('success_msg', `Product "${name}" added to ${branchIds.length} branches.`);
        res.redirect('/admin/dashboard');

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating global product');
        res.redirect('/admin/dashboard');
    }
};
