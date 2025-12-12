const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', (req, res) => res.redirect('/1'));
router.get('/checkout', customerController.getCheckout);
router.get('/payment-callback', customerController.handlePaymentCallback);
router.get('/order/track/:id', customerController.getTrackOrder);
router.get('/:id', customerController.getMenu);
router.get('/:id/checkout', customerController.getCheckout);
router.post('/order', customerController.postOrder);
router.post('/api/validate-promo', customerController.validatePromo);

module.exports = router;
