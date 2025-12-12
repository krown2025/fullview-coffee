const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const promotionController = require('../controllers/promotionController');
const staffController = require('../controllers/staffController');
const { ensureAuthenticated, ensureBranchAdmin } = require('../middleware/auth');
const upload = require('../config/multer');

// Dashboard
router.get('/dashboard', ensureBranchAdmin, branchController.getDashboard);

// Category
router.post('/category/create', ensureBranchAdmin, upload.single('image'), branchController.createCategory);
router.post('/category/edit/:id', ensureBranchAdmin, upload.single('image'), branchController.updateCategory);
router.post('/category/delete/:id', ensureBranchAdmin, branchController.deleteCategory);

// Product
router.post('/product/create', ensureBranchAdmin, upload.single('image'), branchController.createProduct);
router.get('/product/edit/:id', ensureBranchAdmin, branchController.getEditProduct);
router.post('/product/edit/:id', ensureBranchAdmin, upload.single('image'), branchController.updateProduct);
router.post('/product/delete/:id', ensureBranchAdmin, branchController.deleteProduct);

// Product Options
router.post('/product/option/add/:id', ensureBranchAdmin, branchController.createProductOption);
router.post('/product/option/delete/:id', ensureBranchAdmin, branchController.deleteProductOption);

// Settings
router.get('/settings', ensureBranchAdmin, branchController.getSettings);
router.post('/settings', ensureBranchAdmin, branchController.updateSettings);

// Reports
router.get('/reports', ensureBranchAdmin, branchController.getReports);

// Promotions
router.get('/promotions', ensureBranchAdmin, promotionController.getPromotions);
router.post('/promotions/create', ensureBranchAdmin, promotionController.createPromotion);
router.post('/promotions/delete/:id', ensureBranchAdmin, promotionController.deletePromotion);

// Staff
router.get('/staff', ensureBranchAdmin, staffController.getStaff);
router.post('/staff/create', ensureBranchAdmin, staffController.createStaff);
router.post('/staff/edit/:id', ensureBranchAdmin, staffController.editStaff);
router.post('/staff/delete/:id', ensureBranchAdmin, staffController.deleteStaff);

module.exports = router;
