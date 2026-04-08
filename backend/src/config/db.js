const { Pool } = require('pg');
require('dotenv').config();

// Render provides a DATABASE_URL; local dev uses individual env vars
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required for Render's hosted Postgres
      }
    : {
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     process.env.DB_PORT || 5432,
      }
);

module.exports = pool;