const db = require('../config/database');

exports.getMenu = async (req, res) => {
    let branchId = null;
    let branch = req.branch;

    // If accessed via subdomain, req.branch is already set
    if (branch) {
        branchId = branch.id;
    }
    // If accessed via path /:id
    else if (req.params.id) {
        branchId = req.params.id;
        try {
            const [rows] = await db.query('SELECT * FROM branches WHERE id = ?', [branchId]);
            if (rows.length > 0) {
                branch = rows[0];
                // Set req.branch for downstream use if needed, though local var is safer here
            } else {
                return res.status(404).send('Branch not found');
            }
        } catch (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }
    } else {
        // Fallback or error if neither subdomain nor ID
        return res.redirect('/1');
    }

    try {
        const [categories] = await db.query('SELECT * FROM categories WHERE branch_id = ? ORDER BY sort_order', [branchId]);
        const [products] = await db.query('SELECT * FROM products WHERE branch_id = ? AND is_available = 1', [branchId]);

        // Fetch active auto-applied promotions
        const [promotions] = await db.query(`
            SELECT * FROM promotions 
            WHERE branch_id = ? 
            AND is_active = 1 
            AND is_auto_applied = 1 
            AND (start_date IS NULL OR start_date <= CURDATE()) 
            AND (end_date IS NULL OR end_date >= CURDATE())
        `, [branchId]);

        // Fetch options
        const [options] = await db.query(`
            SELECT po.* FROM product_options po
            JOIN products p ON po.product_id = p.id
            WHERE p.branch_id = ?
        `, [branchId]);

        // Attach options and calculate discounts
        products.forEach(p => {
            p.options = options.filter(o => o.product_id === p.id);

            // Calculate Discount
            let discount = 0;
            let bestPromo = null;

            // Check for Product-specific promotion (Highest priority)
            const productPromo = promotions.find(promo => promo.target_type === 'product' && promo.target_id === p.id);
            if (productPromo) {
                bestPromo = productPromo;
            } else {
                // Check for Category-specific promotion
                const categoryPromo = promotions.find(promo => promo.target_type === 'category' && promo.target_id === p.category_id);
                if (categoryPromo) {
                    bestPromo = categoryPromo;
                }
            }

            if (bestPromo) {
                if (bestPromo.type === 'percentage') {
                    discount = (parseFloat(p.base_price) * parseFloat(bestPromo.value)) / 100;
                } else if (bestPromo.type === 'fixed') {
                    discount = parseFloat(bestPromo.value);
                }
            }

            p.discounted_price = Math.max(0, parseFloat(p.base_price) - discount).toFixed(2);
            p.has_discount = discount > 0;
            p.original_price = parseFloat(p.base_price).toFixed(2);
        });

        res.render('customer/menu', { branch: branch, categories, products });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getCheckout = async (req, res) => {
    let branchId = null;
    let branch = req.branch;

    // If accessed via subdomain, req.branch is already set
    if (branch) {
        branchId = branch.id;
    }
    // If accessed via path /:id/checkout
    else if (req.params.id) {
        branchId = req.params.id;
        try {
            const [rows] = await db.query('SELECT * FROM branches WHERE id = ?', [branchId]);
            if (rows.length > 0) {
                branch = rows[0];
            } else {
                return res.status(404).send('Branch not found');
            }
        } catch (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }
    } else {
        return res.redirect('/1');
    }

    res.render('customer/checkout', {
        branch: branch,
        moyasarPublishableKey: process.env.MOYASAR_PUBLISHABLE_KEY
    });
};

exports.postOrder = async (req, res) => {
    if (!req.branch) return res.status(400).json({ error: 'No branch' });

    const { customer_name, customer_phone, order_type, meta_data, cart_items, total_amount, payment_method } = req.body;
    const branchId = req.branch.id;

    // Extract specific fields from meta_data (which comes as a JSON object from frontend)
    const table_number = meta_data.table_no || null;
    const car_type = meta_data.car_type || null;
    const car_color = meta_data.color || null;
    const car_plate = meta_data.plate || null;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // MOCK PAYMENT PROCESSING
        // In a real app, you would call Stripe/Moyasar API here.
        // For now, we assume payment is successful if it's an online order.
        const payment_status = 'paid';
        const transaction_id = 'MOCK_' + Date.now();

        // Create Order
        const [orderResult] = await connection.query(
            `INSERT INTO orders 
            (branch_id, customer_name, customer_phone, order_type, table_number, car_type, car_color, car_plate, meta_data, total_amount, payment_status, transaction_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "new")`,
            [branchId, customer_name, customer_phone, order_type, table_number, car_type, car_color, car_plate, JSON.stringify(meta_data), total_amount, payment_status, transaction_id]
        );

        const orderId = orderResult.insertId;

        // Create Order Items
        for (const item of cart_items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price, options_details) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price, JSON.stringify(item.options || [])]
            );
        }

        await connection.commit();

        // Emit Socket Event to Branch Room
        const io = req.app.get('io');
        io.to(`branch_${branchId}`).emit('new_order', {
            orderId,
            customer_name,
            total_amount,
            items: cart_items,
            order_type,
            table_number,
            car_details: order_type === 'car_pickup' ? `${car_type} - ${car_color} (${car_plate})` : null
        });

        res.json({ success: true, orderId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Order failed: ' + err.message });
    } finally {
        connection.release();
    }
};

exports.getTrackOrder = async (req, res) => {
    if (!req.branch) return res.redirect('/');

    const orderId = req.params.id;
    const branchId = req.branch.id;

    try {
        const [order] = await db.query('SELECT * FROM orders WHERE id = ? AND branch_id = ?', [orderId, branchId]);

        if (order.length === 0) {
            return res.status(404).send('Order not found');
        }

        res.render('customer/track', { branch: req.branch, order: order[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.validatePromo = async (req, res) => {
    if (!req.branch) return res.status(400).json({ error: 'No branch' });

    const { code, cart_total, cart_items } = req.body;
    const branchId = req.branch.id;

    try {
        const [promotions] = await db.query(`
            SELECT * FROM promotions 
            WHERE branch_id = ? 
            AND code = ? 
            AND is_active = 1 
            AND (start_date IS NULL OR start_date <= CURDATE()) 
            AND (end_date IS NULL OR end_date >= CURDATE())
        `, [branchId, code]);

        if (promotions.length === 0) {
            return res.json({ success: false, message: 'Invalid or expired promo code' });
        }

        const promo = promotions[0];
        let discountAmount = 0;

        if (promo.target_type === 'order') {
            if (promo.type === 'percentage') {
                discountAmount = (parseFloat(cart_total) * parseFloat(promo.value)) / 100;
            } else {
                discountAmount = parseFloat(promo.value);
            }
        } else if (promo.target_type === 'category' || promo.target_type === 'product') {
            // Calculate discount based on matching items in cart
            if (cart_items && Array.isArray(cart_items) && cart_items.length > 0) {
                // Fetch product details to check categories
                const productIds = cart_items.map(item => item.product_id);

                // If no items, no discount
                if (productIds.length === 0) {
                    return res.json({ success: false, message: 'Cart is empty' });
                }

                const [products] = await db.query(`SELECT id, category_id, base_price FROM products WHERE id IN (?)`, [productIds]);

                // Create a map for quick lookup
                const productMap = {};
                products.forEach(p => productMap[p.id] = p);

                cart_items.forEach(item => {
                    const product = productMap[item.product_id];
                    if (product) {
                        let isMatch = false;
                        if (promo.target_type === 'product' && promo.target_id === product.id) {
                            isMatch = true;
                        } else if (promo.target_type === 'category' && promo.target_id === product.category_id) {
                            isMatch = true;
                        }

                        if (isMatch) {
                            // Calculate discount for this item
                            let itemDiscount = 0;
                            const itemTotal = parseFloat(item.price) * item.quantity;

                            if (promo.type === 'percentage') {
                                itemDiscount = (itemTotal * parseFloat(promo.value)) / 100;
                            } else {
                                // Fixed amount per item
                                itemDiscount = parseFloat(promo.value) * item.quantity;
                            }
                            discountAmount += itemDiscount;
                        }
                    }
                });

                if (discountAmount === 0) {
                    return res.json({ success: false, message: 'Promo code not applicable to any items in cart' });
                }
            } else {
                return res.json({ success: false, message: 'Cart is empty' });
            }
        }

        // Cap discount at total amount
        discountAmount = Math.min(discountAmount, parseFloat(cart_total));

        res.json({
            success: true,
            discount_amount: discountAmount.toFixed(2),
            new_total: (parseFloat(cart_total) - discountAmount).toFixed(2),
            message: 'Promo code applied!',
            promo_id: promo.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.handlePaymentCallback = async (req, res) => {
    const paymentId = req.query.id;

    if (!paymentId) {
        return res.status(400).send('Payment ID is required');
    }

    try {
        // Fetch payment details from Moyasar API
        const https = require('https');
        const secretKey = process.env.MOYASAR_SECRET_KEY;
        const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

        const options = {
            hostname: 'api.moyasar.com',
            path: `/v1/payments/${paymentId}`,
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        };

        const payment = await new Promise((resolve, reject) => {
            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            apiReq.on('error', reject);
            apiReq.end();
        });

        // Verify payment status
        if (payment.status !== 'paid') {
            req.flash('error_msg', 'Payment was not successful. Please try again.');
            return res.redirect('/checkout');
        }

        // Get branch from payment metadata or session
        const branchId = req.branch ? req.branch.id : payment.metadata?.branch_id;

        if (!branchId) {
            return res.status(400).send('Branch information missing');
        }

        // Get order data from payment metadata
        const orderData = payment.metadata;

        if (!orderData) {
            return res.status(400).send('Order data missing');
        }

        // Create order in database
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [orderResult] = await connection.query(
                `INSERT INTO orders 
                (branch_id, customer_name, customer_phone, order_type, table_number, car_type, car_color, car_plate, meta_data, total_amount, payment_status, transaction_id, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "new")`,
                [
                    branchId,
                    orderData.customer_name,
                    orderData.customer_phone,
                    orderData.order_type,
                    orderData.table_number || null,
                    orderData.car_type || null,
                    orderData.car_color || null,
                    orderData.car_plate || null,
                    JSON.stringify(orderData.meta_data || {}),
                    payment.amount / 100, // Convert from halalas to SAR
                    'paid',
                    paymentId
                ]
            );

            const orderId = orderResult.insertId;

            // Create Order Items
            const cartItems = JSON.parse(orderData.cart_items || '[]');
            for (const item of cartItems) {
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price, options_details) VALUES (?, ?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price, JSON.stringify(item.options || [])]
                );
            }

            await connection.commit();

            // Emit Socket Event to Branch Room
            const io = req.app.get('io');
            io.to(`branch_${branchId}`).emit('new_order', {
                orderId,
                customer_name: orderData.customer_name,
                total_amount: payment.amount / 100,
                items: cartItems,
                order_type: orderData.order_type
            });

            // Redirect to order tracking page
            res.redirect(`/order/track/${orderId}`);
        } catch (err) {
            await connection.rollback();
            console.error('Order creation error:', err);
            req.flash('error_msg', 'Failed to create order. Please contact support.');
            res.redirect('/checkout');
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error('Payment verification error:', err);
        req.flash('error_msg', 'Failed to verify payment. Please contact support.');
        res.redirect('/checkout');
    }
};
