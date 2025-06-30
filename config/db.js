// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

let db;

const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 100,         // For 400 clients, use a safe max pool size (80–100)
    queueLimit: 0,                // No limit on queued connection requests
    connectTimeout: 20000,        // 20s connection timeout
    keepAliveInitialDelay: 300000,
    enableKeepAlive: true
  });
};

db = createPool();

// Connection retry logic
async function testConnectionWithRetry(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await db.getConnection();
      await conn.ping();
      console.log('✅ Database pool connection test successful!');
      conn.release();
      return;
    } catch (err) {
      console.error(`❌ Attempt ${attempt}: Failed to connect - ${err.message}`);
      if (attempt < retries) {
        console.log(`🔁 Retrying in ${delayMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('❌ All retry attempts failed. Exiting...');
        process.exit(1);
      }
    }
  }
}

testConnectionWithRetry();

module.exports = db;
