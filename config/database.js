require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'mysql'; // 'mysql' or 'postgres'

let pgParams = params || [];

if (params && params.length > 0) {
    let paramIndex = 1;
    pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
}

const result = await pool.query(pgSql, pgParams);

// Make result format compatible with MySQL
if (result.command === 'INSERT') {
    return [{ insertId: result.rows[0]?.id, affectedRows: result.rowCount }];
} else if (result.command === 'UPDATE' || result.command === 'DELETE') {
    return [{ affectedRows: result.rowCount }];
} else {
    return [result.rows];
}
        },
getConnection: async () => {
    const client = await pool.connect();
    return {
        query: async (sql, params) => {
            let pgSql = sql;
            let pgParams = params || [];

            if (params && params.length > 0) {
                let paramIndex = 1;
                pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
            }

            const result = await client.query(pgSql, pgParams);

            if (result.command === 'INSERT') {
                return [{ insertId: result.rows[0]?.id, affectedRows: result.rowCount }];
            } else if (result.command === 'UPDATE' || result.command === 'DELETE') {
                return [{ affectedRows: result.rowCount }];
            } else {
                return [result.rows];
            }
        },
        beginTransaction: async () => {
            await client.query('BEGIN');
        },
        commit: async () => {
            await client.query('COMMIT');
        },
        rollback: async () => {
            await client.query('ROLLBACK');
        },
        release: () => {
            client.release();
        }
    };
}
    };
} else {
    // MySQL Configuration
    const mysql = require('mysql2');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    db = pool.promise();
}

module.exports = db;
