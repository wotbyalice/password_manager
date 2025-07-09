/**
 * Integration tests for database service
 * Tests actual database connections and operations
 */

const { query, testConnection, transaction } = require('../../server/database/connection');

describe('Database Service Integration', () => {
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.SKIP_DB_CONNECTION = 'false';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_password_manager.db';
  });

  afterAll(async () => {
    // Clean up test environment
    delete process.env.SKIP_DB_CONNECTION;
  });

  describe('Database Connection', () => {
    test('should establish database connection', async () => {
      const isConnected = await testConnection();
      expect(isConnected).toBe(true);
    });

    test('should handle connection errors gracefully', async () => {
      // Temporarily break connection
      const originalPath = process.env.SQLITE_PATH;
      process.env.SQLITE_PATH = '/invalid/path/database.db';
      
      try {
        const isConnected = await testConnection();
        expect(isConnected).toBe(false);
      } finally {
        // Restore connection
        process.env.SQLITE_PATH = originalPath;
      }
    });
  });

  describe('Query Operations', () => {
    test('should execute simple SELECT query', async () => {
      const result = await query('SELECT 1 as test_value');
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
    });

    test('should handle query parameters safely', async () => {
      const testValue = 'test_parameter';
      const result = await query('SELECT $1 as param_value', [testValue]);
      expect(result.rows[0].param_value).toBe(testValue);
    });

    test('should handle query errors gracefully', async () => {
      await expect(query('INVALID SQL SYNTAX')).rejects.toThrow();
    });
  });

  describe('Transaction Operations', () => {
    test('should execute transaction successfully', async () => {
      const result = await transaction(async (client) => {
        const result1 = await client.query('SELECT 1 as value1');
        const result2 = await client.query('SELECT 2 as value2');
        return { result1, result2 };
      });

      expect(result.result1.rows[0].value1).toBe(1);
      expect(result.result2.rows[0].value2).toBe(2);
    });

    test('should rollback transaction on error', async () => {
      await expect(
        transaction(async (client) => {
          await client.query('SELECT 1');
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle multiple concurrent queries', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        query('SELECT $1 as query_number', [i])
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.rows[0].query_number).toBe(index);
      });
    });

    test('should maintain connection pool efficiently', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        await query('SELECT $1 as iteration', [i]);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
