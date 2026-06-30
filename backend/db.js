const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 4000,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: true },
  connectTimeout: 30000
});

pool.getConnection()
  .then(conn => {
    console.log('OK TiDB connecte');
    conn.release();
  })
  .catch(err => {
    console.error('ERREUR BD:', err.message);
  });

module.exports = pool;