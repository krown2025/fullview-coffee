const db = require('../config/database');

async function updateDb() {
    try {
        console.log('Adding description column to branches table...');
        await db.query('ALTER TABLE branches ADD COLUMN description TEXT');
        console.log('Column added successfully.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error('Error updating database:', err);
        }
    }
    process.exit();
}

updateDb();
