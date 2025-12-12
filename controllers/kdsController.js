const db = require('../config/database');

exports.getDashboard = async (req, res) => {
    const branchId = req.user.branch_id;
    try {
        // Get active orders (new, preparing) - Fetch flat list to avoid JSON_ARRAYAGG compatibility issues
        const [rows] = await db.query(`
            SELECT o.id as order_id, o.customer_name, o.status, o.created_at, o.order_type, o.prep_time_minutes,
                   o.car_type, o.car_color, o.car_plate, o.table_number,
                   oi.quantity, oi.options_details, p.name as product_name
            FROM orders o 
            JOIN order_items oi ON o.id = oi.order_id 
            JOIN products p ON oi.product_id = p.id 
            WHERE o.branch_id = ? AND o.status IN ('new', 'preparing') 
            ORDER BY o.created_at ASC`,
            [branchId]);

        // Group by order_id in JS
        const ordersMap = new Map();
        rows.forEach(row => {
            if (!ordersMap.has(row.order_id)) {
                ordersMap.set(row.order_id, {
                    id: row.order_id,
                    customer_name: row.customer_name,
                    status: row.status,
                    created_at: row.created_at,
                    order_type: row.order_type,
                    prep_time_minutes: row.prep_time_minutes,
                    car_type: row.car_type,
                    car_color: row.car_color,
                    car_plate: row.car_plate,
                    table_number: row.table_number,
                    items: []
                });
            }
            ordersMap.get(row.order_id).items.push({
                name: row.product_name,
                quantity: row.quantity,
                options: row.options_details
            });
        });

        const orders = Array.from(ordersMap.values());

        res.render('kds/dashboard', { orders, branchId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error: ' + err.message);
    }
};

exports.updateStatus = async (req, res) => {
    const { orderId, status, prep_time } = req.body;
    const branchId = req.user.branch_id;

    try {
        let query = 'UPDATE orders SET status = ? WHERE id = ? AND branch_id = ?';
        let params = [status, orderId, branchId];

        if (status === 'preparing' && prep_time) {
            query = 'UPDATE orders SET status = ?, prep_time_minutes = ? WHERE id = ? AND branch_id = ?';
            params = [status, prep_time, orderId, branchId];
        }

        await db.query(query, params);

        // Notify Customer via Socket
        const io = req.app.get('io');
        io.emit(`order_${orderId}`, { status, prep_time }); // Broadcast to order channel

        if (status === 'ready') {
            io.to(`branch_${branchId}`).emit('order_ready', { orderId });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
};
