// Node script to generate PBKDF2 hash and SQL INSERT
const crypto = require('crypto');
if (process.argv.length < 4) { console.error('Usage: node generate_admin_seed.js email password'); process.exit(1); }
const email = process.argv[2].toLowerCase();
const password = process.argv[3];
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('base64');
console.log('--- SQL INSERT ---');
console.log(`INSERT INTO users (id, email, password_hash, password_salt, display_name, role, created_at) VALUES ('user_admin_1', '${email}', '${hash}', '${salt.toString('base64')}', 'Admin', 'admin', ${Date.now()});`);
console.log('--- Done ---');
