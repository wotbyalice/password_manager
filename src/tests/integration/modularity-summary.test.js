/**
 * Modularity Summary Test
 * Quick verification that all modular components work together
 */

describe('Modularity Summary Test', () => {
  let container;
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_modularity_summary.db';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_db';
    process.env.PORT = '3001';
    process.env.BCRYPT_ROUNDS = '4';

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const DIContainer = require('../../server/core/DIContainer');
    const { registerServices } = require('../../server/core/ServiceFactories');
    
    container = new DIContainer();
    registerServices(container);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (container) {
      try {
        container.dispose();
      } catch (error) {
        // Ignore disposal errors
      }
    }
  });

  test('Phase 1: Dependency Injection - All services resolve correctly', () => {
    const services = [
      'config', 'logger', 'database', 'encryption', 'validation', 'eventBus',
      'authService', 'passwordService', 'realtimeService', 'serviceRegistry'
    ];

    services.forEach(serviceName => {
      const service = container.resolve(serviceName);
      expect(service).toBeDefined();
    });

    const stats = container.getStats();
    expect(stats.registeredServices).toBeGreaterThan(8);
    expect(stats.resolvedServices).toBeGreaterThan(0);
  });

  test('Phase 2: Database Layer - Services use proper interfaces', async () => {
    const database = container.resolve('database');
    const encryption = container.resolve('encryption');
    
    expect(typeof database.query).toBe('function');
    expect(typeof database.testConnection).toBe('function');
    
    const testData = 'test-password-123';
    const encrypted = encryption.encryptPassword(testData);
    const decrypted = encryption.decryptPassword(encrypted);
    
    expect(encrypted).not.toBe(testData);
    expect(decrypted).toBe(testData);
  });

  test('Phase 3: Event-Driven Architecture - Event bus works correctly', () => {
    const eventBus = container.resolve('eventBus');
    let eventReceived = false;
    let eventData = null;

    eventBus.on('test.modularity', (data) => {
      eventReceived = true;
      eventData = data;
    });

    eventBus.emit('test.modularity', { message: 'Modularity works!' });

    expect(eventReceived).toBe(true);
    expect(eventData.message).toBe('Modularity works!');
  });

  test('Phase 4: Service Interfaces - Services implement interfaces correctly', async () => {
    const passwordService = container.resolve('passwordService');
    const authService = container.resolve('authService');
    const serviceRegistry = container.resolve('serviceRegistry');

    // Test interface compliance
    expect(passwordService.getServiceName()).toBe('PasswordService');
    expect(authService.getServiceName()).toBe('AuthService');
    
    // Test health status
    const passwordHealth = await passwordService.getHealthStatus();
    const authHealth = await authService.getHealthStatus();
    
    expect(passwordHealth.service).toBe('PasswordService');
    expect(passwordHealth.status).toBeDefined();
    expect(authHealth.service).toBe('AuthService');
    expect(authHealth.status).toBeDefined();

    // Test service registry
    expect(typeof serviceRegistry.register).toBe('function');
    expect(typeof serviceRegistry.getInstance).toBe('function');
  });

  test('Service Decorators - Decorators can be applied and work correctly', async () => {
    const DecoratorFactory = require('../../server/decorators/DecoratorFactory');
    const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
    const CachingDecorator = require('../../server/decorators/CachingDecorator');
    
    const decoratorFactory = new DecoratorFactory(container);
    const logger = container.resolve('logger');
    
    // Create test service
    class TestService {
      getServiceName() { return 'TestService'; }
      async testMethod(param) {
        return { result: `processed-${param}` };
      }
    }
    
    const testService = new TestService();
    
    // Test logging decorator
    const loggedService = new LoggingDecorator(testService, logger);
    const result1 = await loggedService.testMethod('test1');
    expect(result1.result).toBe('processed-test1');
    
    // Test caching decorator
    const cachedService = new CachingDecorator(testService, {
      includePatterns: ['test*']
    });
    
    const result2 = await cachedService.testMethod('test2');
    const result3 = await cachedService.testMethod('test2'); // Should hit cache
    
    expect(result2.result).toBe('processed-test2');
    expect(result3.result).toBe('processed-test2');
    
    const cacheStats = cachedService.getStats();
    expect(cacheStats.cache.hits).toBe(1);
    expect(cacheStats.cache.misses).toBe(1);
  });

  test('Event-Driven Routes - Routes emit events correctly', () => {
    const { PasswordEvents, createPasswordEvent } = require('../../server/events/PasswordEvents');
    const eventBus = container.resolve('eventBus');
    
    let eventReceived = false;
    let eventData = null;

    eventBus.on(PasswordEvents.CREATED, (data) => {
      eventReceived = true;
      eventData = data;
    });

    // Simulate event emission from routes
    const testEvent = createPasswordEvent(PasswordEvents.CREATED, {
      password: {
        id: 123,
        title: 'Test Password',
        username: 'testuser',
        category: 'Work',
        url: 'https://example.com',
        createdBy: 456,
        createdAt: new Date().toISOString()
      },
      userId: 456,
      metadata: {
        source: 'web',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      }
    });

    eventBus.emit(PasswordEvents.CREATED, testEvent);

    expect(eventReceived).toBe(true);
    expect(eventData.password.title).toBe('Test Password');
    expect(eventData.userId).toBe(456);
    expect(eventData.metadata.eventId).toBeDefined();
  });

  test('Complete Integration - All phases work together', async () => {
    // Phase 1: DI Container
    const logger = container.resolve('logger');
    const eventBus = container.resolve('eventBus');
    
    // Phase 2: Database and Services
    const passwordService = container.resolve('passwordService');
    const encryption = container.resolve('encryption');
    
    // Phase 3: Event System
    let eventCount = 0;
    eventBus.on('integration.test', () => eventCount++);
    
    // Phase 4: Service Decorators
    const DecoratorFactory = require('../../server/decorators/DecoratorFactory');
    const decoratorFactory = new DecoratorFactory(container);
    
    // Test complete flow
    expect(logger).toBeDefined();
    expect(passwordService).toBeDefined();
    expect(encryption).toBeDefined();
    
    // Test encryption
    const encrypted = encryption.encryptPassword('test123');
    const decrypted = encryption.decryptPassword(encrypted);
    expect(decrypted).toBe('test123');
    
    // Test events
    eventBus.emit('integration.test', {});
    eventBus.emit('integration.test', {});
    expect(eventCount).toBe(2);
    
    // Test service health
    const health = await passwordService.getHealthStatus();
    expect(health.service).toBe('PasswordService');
    
    // Test decorator factory
    const factoryStats = decoratorFactory.getFactoryStats();
    expect(factoryStats.decoratorTypes).toContain('logging');
    expect(factoryStats.decoratorTypes).toContain('caching');
    expect(factoryStats.decoratorTypes).toContain('performance');
  });

  test('System Statistics - All components provide statistics', () => {
    const containerStats = container.getStats();
    const eventBus = container.resolve('eventBus');
    const DecoratorFactory = require('../../server/decorators/DecoratorFactory');
    const decoratorFactory = new DecoratorFactory(container);
    
    // Container statistics
    expect(containerStats.registeredServices).toBeGreaterThan(0);
    expect(containerStats.resolvedServices).toBeGreaterThan(0);
    expect(containerStats.singletonServices).toBeGreaterThan(0);
    
    // Event bus statistics
    const eventStats = eventBus.getStats();
    expect(eventStats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(eventStats.totalListeners).toBeGreaterThanOrEqual(0);
    
    // Decorator factory statistics
    const factoryStats = decoratorFactory.getFactoryStats();
    expect(Array.isArray(factoryStats.decoratorTypes)).toBe(true);
    expect(factoryStats.decoratorTypes.length).toBe(3);
  });

  test('Error Handling - System handles errors gracefully', async () => {
    const logger = container.resolve('logger');
    const eventBus = container.resolve('eventBus');
    
    // Test event error handling
    eventBus.on('error.test', () => {
      throw new Error('Test error');
    });
    
    // Should not throw when emitting to error handler
    expect(() => {
      eventBus.emit('error.test', {});
    }).not.toThrow();
    
    // Test service error handling
    const passwordService = container.resolve('passwordService');
    
    // Mock method to throw error
    passwordService.testErrorMethod = () => {
      throw new Error('Service error');
    };
    
    expect(() => {
      passwordService.testErrorMethod();
    }).toThrow('Service error');
  });
});
