const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureSuperAdmin } = require('../middleware/auth');

// Login
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

// Dashboard
router.get('/dashboard', ensureSuperAdmin, adminController.getDashboard);

// Reports
router.get('/reports', ensureSuperAdmin, adminController.getReports);

// Branch CRUD
router.post('/branch/create', ensureSuperAdmin, adminController.createBranch);
router.post('/branch/edit/:id', ensureSuperAdmin, adminController.editBranch);
router.post('/branch/delete/:id', ensureSuperAdmin, adminController.deleteBranch);
router.post('/branch/toggle-status/:id', ensureSuperAdmin, adminController.toggleBranchStatus);

// User CRUD
router.post('/user/create', ensureSuperAdmin, adminController.createBranchAdmin);

// Global Product
router.post('/product/global-create', ensureSuperAdmin, adminController.createGlobalProduct);

module.exports = router;
