const db = require('../config/database');

async function checkSchema() {
    try {
        console.log('Checking schema for product_options...');
        const [rows] = await db.query('DESCRIBE product_options');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
