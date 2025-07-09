/**
 * Database Service Implementation
 * Provides database operations with connection pooling and error handling
 */

const IDatabaseService = require('../interfaces/IDatabaseService');

class DatabaseService extends IDatabaseService {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.pool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    
    this.initialize();
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      if (this.config.useSQLite) {
        await this.initializeSQLite();
      } else {
        await this.initializePostgreSQL();
      }
      this.isConnected = true;
      this.logger.info('Database service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite connection
   */
  async initializeSQLite() {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');

    // Ensure directory exists
    const dbDir = path.dirname(this.config.sqlitePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.pool = new Database(this.config.sqlitePath);
    this.pool.pragma('journal_mode = WAL');
    this.pool.pragma('foreign_keys = ON');
    
    this.logger.info(`SQLite database initialized: ${this.config.sqlitePath}`);
  }

  /**
   * Initialize PostgreSQL connection
   */
  async initializePostgreSQL() {
    const { Pool } = require('pg');
    
    const poolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.name,
      user: this.config.user,
      password: this.config.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    if (this.config.connectionString) {
      poolConfig.connectionString = this.config.connectionString;
    }

    this.pool = new Pool(poolConfig);
    
    // Test connection
    const client = await this.pool.connect();
    client.release();
    
    this.logger.info('PostgreSQL connection pool initialized');
  }

  /**
   * Execute a database query
   * @param {string} sql - SQL query string
   * @param {Array} [params] - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.useSQLite) {
        return await this.querySQLite(sql, params);
      } else {
        return await this.queryPostgreSQL(sql, params);
      }
    } catch (error) {
      this.logger.error('Database query error:', { sql, params, error: error.message });
      throw error;
    }
  }

  /**
   * Execute SQLite query
   * @param {string} sql - SQL query
   * @param {Array} params - Parameters
   * @returns {Object} Query result
   */
  async querySQLite(sql, params) {
    const isSelect = sql.trim().toLowerCase().startsWith('select');
    
    if (isSelect) {
      const stmt = this.pool.prepare(sql);
      const rows = stmt.all(params);
      return { rows, rowCount: rows.length };
    } else {
      const stmt = this.pool.prepare(sql);
      const result = stmt.run(params);
      return { 
        rows: [], 
        rowCount: result.changes,
        insertId: result.lastInsertRowid
      };
    }
  }

  /**
   * Execute PostgreSQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Parameters
   * @returns {Object} Query result
   */
  async queryPostgreSQL(sql, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    if (this.config.useSQLite) {
      return await this.transactionSQLite(callback);
    } else {
      return await this.transactionPostgreSQL(callback);
    }
  }

  /**
   * Execute SQLite transaction
   * @param {Function} callback - Transaction callback
   * @returns {any} Transaction result
   */
  async transactionSQLite(callback) {
    const transaction = this.pool.transaction(callback);
    return transaction();
  }

  /**
   * Execute PostgreSQL transaction
   * @param {Function} callback - Transaction callback
   * @returns {any} Transaction result
   */
  async transactionPostgreSQL(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactionClient = {
        query: async (sql, params) => {
          const result = await client.query(sql, params);
          return {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields
          };
        }
      };
      
      const result = await callback(transactionClient);
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      if (this.config.useSQLite) {
        const result = await this.query('SELECT 1 as test');
        return result.rows.length > 0;
      } else {
        const result = await this.query('SELECT 1 as test');
        return result.rows.length > 0;
      }
    } catch (error) {
      this.logger.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database health information
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      const isConnected = await this.testConnection();
      const stats = await this.getPoolStats();
      
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected,
        type: this.config.useSQLite ? 'SQLite' : 'PostgreSQL',
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get connection pool statistics
   * @returns {Promise<Object>} Pool statistics
   */
  async getPoolStats() {
    if (this.config.useSQLite) {
      return {
        type: 'SQLite',
        path: this.config.sqlitePath,
        inTransaction: this.pool.inTransaction
      };
    } else {
      return {
        type: 'PostgreSQL',
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
    }
  }

  /**
   * Execute query with retry logic
   * @param {string} sql - SQL query
   * @param {Array} params - Parameters
   * @param {number} maxRetries - Maximum retries
   * @returns {Promise<Object>} Query result
   */
  async queryWithRetry(sql, params = [], maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.query(sql, params);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Query attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Begin a new transaction
   * @returns {Promise<Object>} Transaction client
   */
  async beginTransaction() {
    if (this.config.useSQLite) {
      throw new Error('Use transaction() method for SQLite');
    }
    
    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    return {
      query: async (sql, params) => {
        const result = await client.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount,
          fields: result.fields
        };
      },
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      }
    };
  }

  /**
   * Close database connections
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.pool) {
        if (this.config.useSQLite) {
          this.pool.close();
        } else {
          await this.pool.end();
        }
        this.isConnected = false;
        this.logger.info('Database connections closed');
      }
    } catch (error) {
      this.logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DatabaseService;
