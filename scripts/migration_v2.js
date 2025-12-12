const db = require('../config/database');

async function migrate() {
    console.log('Starting migration...');
    const connection = await db.getConnection();
    try {
        // 1. Create Promotions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS promotions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                branch_id INT NOT NULL,
                code VARCHAR(50) NOT NULL,
                type ENUM('percentage', 'fixed') NOT NULL,
                value DECIMAL(10, 2) NOT NULL,
                start_date DATE,
                end_date DATE,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
            )
        `);
        console.log('Promotions table checked/created.');

        // 2. Update Orders Table
        // Check if columns exist first to avoid errors
        const [columns] = await connection.query(`SHOW COLUMNS FROM orders`);
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('table_number')) {
            await connection.query(`ALTER TABLE orders ADD COLUMN table_number VARCHAR(50)`);
            console.log('Added table_number to orders.');
        }
        if (!columnNames.includes('car_type')) {
            await connection.query(`ALTER TABLE orders ADD COLUMN car_type VARCHAR(100)`);
            console.log('Added car_type to orders.');
        }
        if (!columnNames.includes('car_color')) {
            await connection.query(`ALTER TABLE orders ADD COLUMN car_color VARCHAR(50)`);
            console.log('Added car_color to orders.');
        }
        if (!columnNames.includes('car_plate')) {
            await connection.query(`ALTER TABLE orders ADD COLUMN car_plate VARCHAR(50)`);
            console.log('Added car_plate to orders.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
