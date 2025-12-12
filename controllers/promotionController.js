const db = require('../config/database');

exports.createPromotion = async (req, res) => {
    const { code, type, value, start_date, end_date, target_type, target_id, is_auto_applied } = req.body;
    const branchId = req.user.branch_id;

    // Default values
    const finalTargetType = target_type || 'order';
    const finalTargetId = target_id || null;
    const finalAutoApplied = is_auto_applied === 'on' ? 1 : 0;

    let finalCode = code;
    if (!finalCode && finalAutoApplied) {
        finalCode = 'AUTO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    try {
        await db.query(
            'INSERT INTO promotions (branch_id, code, type, value, start_date, end_date, target_type, target_id, is_auto_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [branchId, finalCode, type, value, start_date || null, end_date || null, finalTargetType, finalTargetId, finalAutoApplied]
        );
        req.flash('success_msg', 'Promotion created');
        res.redirect('/branch/promotions');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating promotion');
        res.redirect('/branch/promotions');
    }
};

exports.getPromotions = async (req, res) => {
    const branchId = req.user.branch_id;
    try {
        const [promotions] = await db.query(`
            SELECT p.*, c.name as category_name, pr.name as product_name 
            FROM promotions p 
            LEFT JOIN categories c ON p.target_id = c.id AND p.target_type = 'category'
            LEFT JOIN products pr ON p.target_id = pr.id AND p.target_type = 'product'
            WHERE p.branch_id = ?
        `, [branchId]);

        const [categories] = await db.query('SELECT * FROM categories WHERE branch_id = ?', [branchId]);
        const [products] = await db.query('SELECT * FROM products WHERE branch_id = ?', [branchId]);

        res.render('branch/promotions', { promotions, categories, products });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deletePromotion = async (req, res) => {
    const id = req.params.id;
    const branchId = req.user.branch_id;
    try {
        await db.query('DELETE FROM promotions WHERE id = ? AND branch_id = ?', [id, branchId]);
        req.flash('success_msg', 'Promotion deleted');
        res.redirect('/branch/promotions');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting promotion');
        res.redirect('/branch/promotions');
    }
};
