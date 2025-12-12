const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

const password = 'admin330';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) throw err;

    connection.query('UPDATE users SET password = ? WHERE username = "admin"', [hash], (err, result) => {
        if (err) throw err;
        console.log('Admin password updated successfully');
        console.log('Hash:', hash);
        connection.end();
    });
});
