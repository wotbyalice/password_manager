/**
 * Database Service Interface
 * Defines the contract for database operations
 */

class IDatabaseService {
  /**
   * Execute a database query
   * @param {string} sql - SQL query string
   * @param {Array} [params] - Query parameters
   * @returns {Promise<Object>} Query result with rows and metadata
   * @throws {Error} Database or query errors
   */
  async query(sql, params = []) {
    throw new Error('IDatabaseService.query() must be implemented');
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Transaction callback function
   * @returns {Promise<any>} Transaction result
   * @throws {Error} Transaction or query errors
   */
  async transaction(callback) {
    throw new Error('IDatabaseService.transaction() must be implemented');
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    throw new Error('IDatabaseService.testConnection() must be implemented');
  }

  /**
   * Get database health information
   * @returns {Promise<Object>} Health status and metrics
   */
  async getHealth() {
    throw new Error('IDatabaseService.getHealth() must be implemented');
  }

  /**
   * Close database connections
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('IDatabaseService.close() must be implemented');
  }

  /**
   * Get connection pool statistics
   * @returns {Promise<Object>} Pool statistics
   */
  async getPoolStats() {
    throw new Error('IDatabaseService.getPoolStats() must be implemented');
  }

  /**
   * Execute a query with retry logic
   * @param {string} sql - SQL query string
   * @param {Array} [params] - Query parameters
   * @param {number} [maxRetries] - Maximum retry attempts
   * @returns {Promise<Object>} Query result
   */
  async queryWithRetry(sql, params = [], maxRetries = 3) {
    throw new Error('IDatabaseService.queryWithRetry() must be implemented');
  }

  /**
   * Begin a new transaction
   * @returns {Promise<Object>} Transaction client
   */
  async beginTransaction() {
    throw new Error('IDatabaseService.beginTransaction() must be implemented');
  }

  /**
   * Commit a transaction
   * @param {Object} client - Transaction client
   * @returns {Promise<void>}
   */
  async commitTransaction(client) {
    throw new Error('IDatabaseService.commitTransaction() must be implemented');
  }

  /**
   * Rollback a transaction
   * @param {Object} client - Transaction client
   * @returns {Promise<void>}
   */
  async rollbackTransaction(client) {
    throw new Error('IDatabaseService.rollbackTransaction() must be implemented');
  }

  /**
   * Execute a prepared statement
   * @param {string} name - Statement name
   * @param {string} sql - SQL query
   * @param {Array} params - Parameters
   * @returns {Promise<Object>} Query result
   */
  async executePrepared(name, sql, params) {
    throw new Error('IDatabaseService.executePrepared() must be implemented');
  }

  /**
   * Dispose of the database service
   * @returns {Promise<void>}
   */
  async dispose() {
    await this.close();
  }
}

module.exports = IDatabaseService;
