const db = require('../config/database');

async function fixSchema() {
    console.log('Starting schema fix...');

    const columns = [
        { name: 'type', query: "ADD COLUMN type ENUM('size', 'addon', 'generic') NOT NULL DEFAULT 'generic'" },
        { name: 'is_required', query: "ADD COLUMN is_required BOOLEAN DEFAULT 0" },
        { name: 'choices', query: "ADD COLUMN choices JSON" }
    ];

    for (const col of columns) {
        try {
            await db.query(`ALTER TABLE product_options ${col.query}`);
            console.log(`Added column: ${col.name}`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log(`Column ${col.name} already exists.`);
            } else {
                console.error(`Error adding ${col.name}:`, err.message);
            }
        }
    }

    console.log('Schema fix completed.');
    process.exit(0);
}

fixSchema();
