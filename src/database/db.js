require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

async function initDB() {
  pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',   // Support des emojis & co
  });
  console.log("Connected to MySQL database.");
}

function getPool() {
  if (!pool) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return pool;
}

module.exports = { initDB, getPool };
