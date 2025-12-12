module.exports = {
    ensureAuthenticated: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/admin/login');
    },
    ensureSuperAdmin: function (req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'super_admin') {
            return next();
        }
        req.flash('error_msg', 'Not Authorized');
        res.redirect('/admin/login');
    },
    ensureBranchAdmin: function (req, res, next) {
        if (req.isAuthenticated() && (req.user.role === 'branch_admin' || req.user.role === 'super_admin')) {
            // If super admin, they can access everything, or maybe we restrict?
            // For now allow super admin to access branch panels too if needed, 
            // but usually super admin manages branches from outside.
            // Let's stick to role check.
            return next();
        }
        req.flash('error_msg', 'Not Authorized');
        res.redirect('/branch/login');
    }
};
