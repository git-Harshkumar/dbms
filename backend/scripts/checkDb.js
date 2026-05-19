/**
 * Verifies PostgreSQL settings in .env — same Pool config as the API.
 * Usage: npm run db:check
 */
require('dotenv').config();

const { Pool } = require('pg');

const port = Number(process.env.DB_PORT) || 5432;

console.log('Trying PostgreSQL with:');
console.log(`  host=${process.env.DB_HOST}  user=${process.env.DB_USER}  db=${process.env.DB_NAME}  port=${port}`);
console.log('');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port,
});

pool
  .query('SELECT NOW() AS server_time, current_database() AS db')
  .then((res) => {
    console.log('Connected OK.');
    console.log('  server_time:', res.rows[0].server_time);
    console.log('  database:   ', res.rows[0].db);
    process.exit(0);
  })
  .catch((err) => {
    console.error('NOT connected:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());

