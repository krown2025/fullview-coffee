const db = require('../config/database');

module.exports = async (req, res, next) => {
    const host = req.hostname; // e.g., 'riyadh.localhost' or 'riyadh.example.com'

    // Logic to extract subdomain
    // If localhost, parts might be ['riyadh', 'localhost'] -> length 2
    // If example.com, parts might be ['www', 'example', 'com'] -> length 3
    // We need to define what is the "root" domain. 
    // For simplicity, we'll assume any prefix that isn't 'www' or the domain itself is a subdomain.

    const parts = host.split('.');
    let subdomain = null;

    // Basic logic for local development (localhost) and production
    if (host.includes('localhost')) {
        if (parts.length > 1 && parts[0] !== 'www') {
            subdomain = parts[0];
        }
    } else {
        // Production logic (assuming 2-level TLD like .com, or 3 like .co.uk - this is a simple check)
        // If parts.length > 2, take the first part
        if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
        }
    }

    if (!subdomain) {
        req.branch = null; // Main site / Super Admin
        res.locals.isBranchSubdomain = false;
        return next();
    }

    try {
        const [rows] = await db.query('SELECT * FROM branches WHERE subdomain = ? AND is_active = 1', [subdomain]);

        if (rows.length === 0) {
            return res.status(404).send('Branch not found');
        }

        req.branch = rows[0];
        res.locals.isBranchSubdomain = true;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};
