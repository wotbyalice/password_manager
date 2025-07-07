const { Pool } = require('pg');
const logger = require('../utils/logger');
const SQLiteAdapter = require('./sqlite-adapter');

// Check if we should use SQLite
const useSQLite = process.env.USE_SQLITE === 'true';

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool or SQLite adapter
let pool;
let sqliteAdapter;

if (useSQLite) {
  sqliteAdapter = new SQLiteAdapter(process.env.SQLITE_PATH);
  logger.info('Using SQLite adapter for database operations');
} else {
  pool = new Pool(dbConfig);
  logger.info('Using PostgreSQL connection pool');
}

// Handle pool errors (only for PostgreSQL)
if (!useSQLite) {
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Handle pool connection
  pool.on('connect', () => {
    logger.info('Database connected successfully');
  });
}

/**
 * Execute a database query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params = []) {
  const start = Date.now();

  try {
    let result;
    if (useSQLite) {
      result = await sqliteAdapter.query(text, params);
    } else {
      result = await pool.query(text, params);
    }

    const duration = Date.now() - start;

    logger.debug('Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount || result.rows?.length || 0
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    logger.error('Query error', {
      query: text,
      duration: `${duration}ms`,
      error: error.message
    });

    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
  try {
    const client = await pool.connect();
    
    // Add query method to client for consistency
    const originalQuery = client.query;
    client.query = async function(text, params) {
      const start = Date.now();
      
      try {
        const result = await originalQuery.call(this, text, params);
        const duration = Date.now() - start;
        
        logger.debug('Executed transaction query', {
          query: text,
          duration: `${duration}ms`,
          rows: result.rowCount
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        logger.error('Transaction query error', {
          query: text,
          duration: `${duration}ms`,
          error: error.message
        });
        
        throw error;
      }
    };
    
    return client;
  } catch (error) {
    logger.error('Error getting database client', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Function that receives client and executes queries
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    logger.debug('Transaction completed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    logger.info('Database connection test successful', {
      currentTime: result.rows[0].current_time
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', error);
    return false;
  }
}

/**
 * Close all database connections
 */
async function closeConnections() {
  try {
    await pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', error);
  }
}

/**
 * Get database pool statistics
 * @returns {Object} Pool statistics
 */
function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await closeConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await closeConnections();
  process.exit(0);
});

module.exports = {
  query,
  getClient,
  transaction,
  testConnection,
  closeConnections,
  getPoolStats,
  pool
};
