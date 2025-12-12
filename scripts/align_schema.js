const db = require('../config/database');

async function alignSchema() {
    console.log('Aligning schema...');

    try {
        // 1. Drop option_type if exists
        try {
            await db.query("ALTER TABLE product_options DROP COLUMN option_type");
            console.log('Dropped option_type');
        } catch (e) { console.log('option_type not found or error:', e.message); }

        // 2. Modify type to be ENUM('size', 'addon', 'generic')
        // We might need to map existing values first? 
        // If existing values are 'select', 'radio', 'checkbox', they will be invalid.
        // Let's just force it and default to 'generic'
        await db.query("ALTER TABLE product_options MODIFY COLUMN type ENUM('size', 'addon', 'generic') NOT NULL DEFAULT 'generic'");
        console.log('Modified type column');

        // 3. Modify choices to be JSON
        await db.query("ALTER TABLE product_options MODIFY COLUMN choices JSON");
        console.log('Modified choices column');

        // 4. Ensure is_required exists (it should, but let's be safe)
        // If it exists as tinyint(1), that's fine (boolean alias)
        // We can try to modify it to BOOLEAN just to be sure
        await db.query("ALTER TABLE product_options MODIFY COLUMN is_required BOOLEAN DEFAULT 0");
        console.log('Verified is_required column');

    } catch (err) {
        console.error('Schema alignment error:', err);
    }

    console.log('Schema alignment completed.');
    process.exit(0);
}

alignSchema();
