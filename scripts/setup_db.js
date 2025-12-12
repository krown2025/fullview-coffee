const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true
});

const schemaPath = path.join(__dirname, '../schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL');

    connection.query(schemaSql, (err, results) => {
        if (err) {
            console.error('Error executing schema:', err);
            process.exit(1);
        }
        console.log('Database and tables created successfully');
        connection.end();
    });
});
