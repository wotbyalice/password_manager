/**
 * Integration tests for Service Decorators
 * Tests decorator functionality and integration with services
 */

describe('Service Decorators Integration', () => {
  let container;
  let decoratorFactory;
  let testService;
  let logger;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_db';
    process.env.PORT = '3001';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_service_decorators.db';
    process.env.BCRYPT_ROUNDS = '4';

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const DIContainer = require('../../server/core/DIContainer');
    const { registerServices } = require('../../server/core/ServiceFactories');
    const DecoratorFactory = require('../../server/decorators/DecoratorFactory');
    
    container = new DIContainer();
    registerServices(container);
    
    logger = container.resolve('logger');
    decoratorFactory = new DecoratorFactory(container);

    // Create test service
    class TestService {
      getServiceName() { return 'TestService'; }
      
      async getHealthStatus() {
        return { status: 'healthy' };
      }

      async getData(id) {
        await this.delay(100);
        return { id, data: `test-data-${id}` };
      }

      async createData(data) {
        await this.delay(50);
        return { id: Math.random(), ...data };
      }

      async updateData(id, data) {
        await this.delay(75);
        return { id, ...data, updated: true };
      }

      async deleteData(id) {
        await this.delay(25);
        return { deleted: true, id };
      }

      async slowMethod() {
        await this.delay(1500); // Intentionally slow
        return 'slow result';
      }

      async errorMethod() {
        throw new Error('Test error');
      }

      delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    }

    testService = new TestService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    
    // Dispose container if it exists
    if (container) {
      try {
        container.dispose();
      } catch (error) {
        // Ignore disposal errors in tests
      }
    }
  });

  describe('Logging Decorator', () => {
    test('should create logging decorator', () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const decorated = new LoggingDecorator(testService, logger);
      
      expect(decorated).toBeDefined();
      expect(decorated.getServiceName()).toBe('TestService');
    });

    test('should log method calls', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const decorated = new LoggingDecorator(testService, logger, {
        logArgs: true,
        logResults: true
      });

      const infoSpy = jest.spyOn(logger, 'info');
      
      const result = await decorated.getData(123);
      
      expect(result).toEqual({ id: 123, data: 'test-data-123' });
      expect(infoSpy).toHaveBeenCalledWith('Service method started', expect.objectContaining({
        action: 'method_start',
        service: 'TestService',
        method: 'getData'
      }));
      expect(infoSpy).toHaveBeenCalledWith('Service method completed', expect.objectContaining({
        action: 'method_success',
        service: 'TestService',
        method: 'getData',
        success: true
      }));
    });

    test('should log method errors', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const decorated = new LoggingDecorator(testService, logger);

      const errorSpy = jest.spyOn(logger, 'error');
      
      await expect(decorated.errorMethod()).rejects.toThrow('Test error');
      
      expect(errorSpy).toHaveBeenCalledWith('Service method failed', expect.objectContaining({
        action: 'method_error',
        service: 'TestService',
        method: 'errorMethod',
        success: false,
        error: 'Test error'
      }));
    });

    test('should provide logging statistics', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const decorated = new LoggingDecorator(testService, logger);

      await decorated.getData(1);
      await decorated.getData(2);
      await decorated.createData({ name: 'test' });

      const stats = decorated.getStats();
      
      expect(stats.totalMethods).toBe(2);
      expect(stats.totalCalls).toBe(3);
      expect(stats.methodStats.getData.totalCalls).toBe(2);
      expect(stats.methodStats.createData.totalCalls).toBe(1);
    });
  });

  describe('Caching Decorator', () => {
    test('should create caching decorator', () => {
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const decorated = new CachingDecorator(testService);
      
      expect(decorated).toBeDefined();
      expect(decorated.getServiceName()).toBe('TestService');
    });

    test('should cache read operations', async () => {
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const decorated = new CachingDecorator(testService, {
        includePatterns: ['get*']
      });

      // First call should hit the service
      const result1 = await decorated.getData(123);
      expect(result1).toEqual({ id: 123, data: 'test-data-123' });

      // Second call should hit the cache
      const result2 = await decorated.getData(123);
      expect(result2).toEqual({ id: 123, data: 'test-data-123' });

      const stats = decorated.getStats();
      expect(stats.cache.hits).toBe(1);
      expect(stats.cache.misses).toBe(1);
    });

    test('should not cache write operations', async () => {
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const decorated = new CachingDecorator(testService);

      const result1 = await decorated.createData({ name: 'test1' });
      const result2 = await decorated.createData({ name: 'test2' });

      expect(result1.name).toBe('test1');
      expect(result2.name).toBe('test2');

      const stats = decorated.getStats();
      expect(stats.cache.hits).toBe(0);
      expect(stats.cache.misses).toBe(0);
    });

    test('should invalidate cache on write operations', async () => {
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const decorated = new CachingDecorator(testService, {
        includePatterns: ['get*']
      });

      // Cache a read operation
      await decorated.getData(123);
      
      let stats = decorated.getStats();
      expect(stats.cache.currentSize).toBe(1);

      // Write operation should invalidate cache
      await decorated.createData({ name: 'test' });
      
      stats = decorated.getStats();
      expect(stats.cache.currentSize).toBe(0);
    });

    test('should provide cache statistics', async () => {
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const decorated = new CachingDecorator(testService, {
        includePatterns: ['get*']
      });

      await decorated.getData(1);
      await decorated.getData(2);
      await decorated.getData(1); // Cache hit

      const stats = decorated.getStats();
      
      expect(stats.cache.hits).toBe(1);
      expect(stats.cache.misses).toBe(2);
      expect(stats.cache.hitRate).toBeCloseTo(0.33, 2);
      expect(stats.cache.currentSize).toBe(2);
    });
  });

  describe('Performance Decorator', () => {
    test('should create performance decorator', () => {
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');
      const decorated = new PerformanceDecorator(testService, logger);
      
      expect(decorated).toBeDefined();
      expect(decorated.getServiceName()).toBe('TestService');
    });

    test('should monitor method performance', async () => {
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');
      const decorated = new PerformanceDecorator(testService, logger, {
        slowThreshold: 200
      });

      await decorated.getData(123);
      
      const stats = decorated.getStats();
      const methodStats = stats.performance.methodMetrics.getData;
      
      expect(methodStats).toBeDefined();
      expect(methodStats.totalCalls).toBe(1);
      expect(methodStats.successfulCalls).toBe(1);
      expect(methodStats.avgDuration).toBeGreaterThan(0);
    });

    test('should detect slow methods', async () => {
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');
      const decorated = new PerformanceDecorator(testService, logger, {
        slowThreshold: 1000,
        alertOnSlowMethods: true
      });

      const warnSpy = jest.spyOn(logger, 'warn');
      
      await decorated.slowMethod();
      
      expect(warnSpy).toHaveBeenCalledWith('Slow method execution detected', expect.objectContaining({
        service: 'TestService',
        method: 'slowMethod',
        type: 'performance_alert'
      }));
    });

    test('should provide performance statistics', async () => {
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');
      const decorated = new PerformanceDecorator(testService, logger);

      await decorated.getData(1);
      await decorated.getData(2);
      await decorated.createData({ name: 'test' });

      const stats = decorated.getStats();
      
      expect(stats.performance.methodMetrics.getData.totalCalls).toBe(2);
      expect(stats.performance.methodMetrics.createData.totalCalls).toBe(1);
      expect(stats.performance.totalMethods).toBe(2);
    });
  });

  describe('Decorator Factory', () => {
    test('should create decorated service with multiple decorators', () => {
      decoratorFactory.registerDecorators('TestService', [
        { type: 'logging', options: { logDuration: true } },
        { type: 'caching', options: { defaultTtl: 60000 } },
        { type: 'performance', options: { slowThreshold: 500 } }
      ]);

      const decorated = decoratorFactory.createDecoratedService('TestService', testService);
      
      expect(decorated).toBeDefined();
      expect(decorated.getServiceName()).toBe('TestService');
    });

    test('should apply default decorators', () => {
      decoratorFactory.applyDefaultDecorators('TestService', 'read-heavy');
      
      const decorated = decoratorFactory.createDecoratedService('TestService', testService);
      
      expect(decorated).toBeDefined();
      expect(decoratorFactory.hasDecorator('TestService', 'caching')).toBe(true);
      expect(decoratorFactory.hasDecorator('TestService', 'performance')).toBe(true);
      expect(decoratorFactory.hasDecorator('TestService', 'logging')).toBe(true);
    });

    test('should provide decorator statistics', async () => {
      decoratorFactory.registerDecorators('TestService', [
        { type: 'logging', options: {} },
        { type: 'performance', options: {} }
      ]);

      const decorated = decoratorFactory.createDecoratedService('TestService', testService);
      
      await decorated.getData(123);
      
      const stats = decoratorFactory.getServiceDecoratorStats('TestService');
      
      expect(stats.service).toBe('TestService');
      expect(stats.decorators).toHaveLength(2);
      expect(stats.decorators[0].type).toBe('logging');
      expect(stats.decorators[1].type).toBe('performance');
    });

    test('should manage cache operations', async () => {
      decoratorFactory.registerDecorators('TestService', [
        { type: 'caching', options: { includePatterns: ['get*'] } }
      ]);

      const decorated = decoratorFactory.createDecoratedService('TestService', testService);
      
      await decorated.getData(123);
      
      let cacheStats = decoratorFactory.getServiceCacheStats('TestService');
      expect(cacheStats.cache.currentSize).toBe(1);
      
      decoratorFactory.clearServiceCache('TestService');
      
      cacheStats = decoratorFactory.getServiceCacheStats('TestService');
      expect(cacheStats.cache.currentSize).toBe(0);
    });

    test('should provide factory statistics', () => {
      decoratorFactory.registerDecorators('Service1', [
        { type: 'logging', options: {} }
      ]);
      decoratorFactory.registerDecorators('Service2', [
        { type: 'caching', options: {} },
        { type: 'performance', options: {} }
      ]);

      const stats = decoratorFactory.getFactoryStats();
      
      expect(stats.registeredServices).toBe(2);
      expect(stats.decoratorTypes).toContain('logging');
      expect(stats.decoratorTypes).toContain('caching');
      expect(stats.decoratorTypes).toContain('performance');
    });
  });

  describe('Decorator Chaining', () => {
    test('should chain multiple decorators correctly', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');

      // Chain decorators: Performance -> Caching -> Logging -> Service
      let decorated = new LoggingDecorator(testService, logger);
      decorated = new CachingDecorator(decorated, { includePatterns: ['get*'] });
      decorated = new PerformanceDecorator(decorated, logger);

      const result1 = await decorated.getData(123);
      const result2 = await decorated.getData(123); // Should hit cache

      expect(result1).toEqual({ id: 123, data: 'test-data-123' });
      expect(result2).toEqual({ id: 123, data: 'test-data-123' });

      // All decorators should have recorded the calls
      const perfStats = decorated.getStats();
      expect(perfStats.performance.methodMetrics.getData.totalCalls).toBe(2);
    });

    test('should handle errors through decorator chain', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');

      let decorated = new LoggingDecorator(testService, logger);
      decorated = new PerformanceDecorator(decorated, logger);

      const errorSpy = jest.spyOn(logger, 'error');

      await expect(decorated.errorMethod()).rejects.toThrow('Test error');

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
