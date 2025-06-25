// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true, // If true, connections are queued when limit is reached.
  connectionLimit: 100,     // Max number of connections to create at once.
                            // Consider if 100 is truly necessary; too many can strain the DB.
                            // A more common range for many apps is 10-20.
  queueLimit: 0,            // No limit on queued connection requests.

  // --- Added/Recommended for ECONNRESET troubleshooting ---

  // Timeout for initial connection to the database (in milliseconds).
  // Prevents your app from hanging indefinitely trying to connect.
  // A value like 10-30 seconds is typical. Default is often 10 seconds.
  connectTimeout: 20000, // 20 seconds

  // Specifies the initial delay for TCP Keep-Alive probes (in milliseconds).
  // Helps maintain the connection over network, preventing premature closing by
  // firewalls or load balancers due to inactivity. Default is often 0 (system default).
  // A value like 5-10 minutes (300000-600000 ms) is common.
  keepAliveInitialDelay: 300000, // 5 minutes

  // Enable TCP Keep-Alive. Default is true for mysql2, but good to be explicit.
  enableKeepAlive: true,

  // You might also consider debug: true temporarily if still troubleshooting,
  // it logs connection acquisition/release/error events.
  // debug: process.env.NODE_ENV === 'development' // Only enable in development

});

// Optional: Add a connection test to confirm pool setup
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('Database pool connection test successful!');
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    console.error('Failed to establish database pool connection:', err.message);
    // Exit or handle fatal error if DB connection is critical for app start
    process.exit(1);
  }
})();

module.exports = db;