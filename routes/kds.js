const express = require('express');
const router = express.Router();
const kdsController = require('../controllers/kdsController');
const { ensureAuthenticated } = require('../middleware/auth');

// Middleware to ensure user is barista or branch admin
const ensureStaff = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'barista' || req.user.role === 'branch_admin')) {
        return next();
    }
    req.flash('error_msg', 'Not Authorized');
    res.redirect('/admin/login');
};

router.get('/dashboard', ensureStaff, kdsController.getDashboard);
router.post('/update-status', ensureStaff, kdsController.updateStatus);

module.exports = router;
