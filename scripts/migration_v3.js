const db = require('../config/database');

async function migrate() {
    console.log('Starting migration v3...');
    const connection = await db.getConnection();
    try {
        // Check if columns exist
        const [columns] = await connection.query(`SHOW COLUMNS FROM promotions`);
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('target_type')) {
            await connection.query(`ALTER TABLE promotions ADD COLUMN target_type ENUM('order', 'category', 'product') DEFAULT 'order'`);
            console.log('Added target_type to promotions.');
        }
        if (!columnNames.includes('target_id')) {
            await connection.query(`ALTER TABLE promotions ADD COLUMN target_id INT NULL`);
            console.log('Added target_id to promotions.');
        }
        if (!columnNames.includes('is_auto_applied')) {
            await connection.query(`ALTER TABLE promotions ADD COLUMN is_auto_applied BOOLEAN DEFAULT 0`);
            console.log('Added is_auto_applied to promotions.');
        }

        console.log('Migration v3 completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration v3 failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
