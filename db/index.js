const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  // Additional timeout settings for better resilience
  statement_timeout: 30000, // 30 seconds for query execution
  query_timeout: 30000, // 30 seconds for query timeout
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
});

// Handle connection errors
pool.on('connect', (client) => {
  console.log('✅ Database connection established');
});

pool.on('acquire', (client) => {
  console.log('🔗 Database client acquired from pool');
});

pool.on('release', (client) => {
  console.log('🔓 Database client released back to pool');
});

// Health check function
async function healthCheck() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database health check passed');
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
}

// Pool status monitoring
function getPoolStatus() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

module.exports = { pool, healthCheck, getPoolStatus };
