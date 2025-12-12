const db = require('../config/database');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Update product_options
        try {
            await db.query(`
                ALTER TABLE product_options
                ADD COLUMN type ENUM('size', 'addon', 'generic') NOT NULL DEFAULT 'generic',
                ADD COLUMN is_required BOOLEAN DEFAULT 0,
                ADD COLUMN choices JSON
            `);
            console.log('Updated product_options table.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('product_options columns already exist.');
            } else {
                console.error('Error updating product_options:', err.message);
            }
        }

        // 2. Update order_items
        try {
            await db.query(`ALTER TABLE order_items ADD COLUMN options_details JSON`);
            console.log('Added options_details to order_items.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('options_details column already exists in order_items.');
            } else {
                console.error('Error adding options_details:', err.message);
            }
        }

        try {
            await db.query(`ALTER TABLE order_items DROP COLUMN options_summary`);
            console.log('Dropped options_summary from order_items.');
        } catch (err) {
            console.error('Error dropping options_summary (might not exist):', err.message);
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
