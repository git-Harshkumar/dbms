const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
      }
);

async function seed() {
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    const studentHash = await bcrypt.hash('student123', 10);

    await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES
        ('Admin User',    'admin@exam.com',   $1, 'admin'),
        ('Student One',   'student@exam.com', $2, 'student')
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash, studentHash]);

    console.log('✅ Demo users seeded:');
    console.log('   Admin   → admin@exam.com   / admin123');
    console.log('   Student → student@exam.com / student123');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
