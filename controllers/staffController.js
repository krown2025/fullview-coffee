const db = require('../config/database');
const bcrypt = require('bcryptjs');

exports.getStaff = async (req, res) => {
    const branchId = req.user.branch_id;
    try {
        const [staff] = await db.query('SELECT * FROM users WHERE branch_id = ? AND role = "barista"', [branchId]);
        res.render('branch/staff', { staff });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createStaff = async (req, res) => {
    const { name, username, password } = req.body;
    const branchId = req.user.branch_id;

    try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            'INSERT INTO users (branch_id, name, username, password, password_plain, role) VALUES (?, ?, ?, ?, ?, "barista")',
            [branchId, name, username, hashedPassword, password]
        );
        req.flash('success_msg', 'Staff member created');
        res.redirect('/branch/staff');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating staff (Username might be taken)');
        res.redirect('/branch/staff');
    }
};

exports.editStaff = async (req, res) => {
    const id = req.params.id;
    const { name, username, password } = req.body;
    const branchId = req.user.branch_id;

    try {
        // If password is provided, hash it and update with password
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query(
                'UPDATE users SET name = ?, username = ?, password = ?, password_plain = ? WHERE id = ? AND branch_id = ?',
                [name, username, hashedPassword, password, id, branchId]
            );
        } else {
            // Update without changing password
            await db.query(
                'UPDATE users SET name = ?, username = ? WHERE id = ? AND branch_id = ?',
                [name, username, id, branchId]
            );
        }
        req.flash('success_msg', 'Staff member updated');
        res.redirect('/branch/staff');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating staff (Username might be taken)');
        res.redirect('/branch/staff');
    }
};

exports.deleteStaff = async (req, res) => {
    const id = req.params.id;
    const branchId = req.user.branch_id;
    try {
        await db.query('DELETE FROM users WHERE id = ? AND branch_id = ?', [id, branchId]);
        req.flash('success_msg', 'Staff member deleted');
        res.redirect('/branch/staff');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting staff');
        res.redirect('/branch/staff');
    }
};
