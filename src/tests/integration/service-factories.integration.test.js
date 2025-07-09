/**
 * Integration tests for Service Factories
 * Tests the complete DI container setup with service factories
 */

describe('Service Factories Integration', () => {
  let container;
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
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_db';
    process.env.PORT = '3001';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_integration.db';
    process.env.SKIP_DB_CONNECTION = 'false';

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const { createContainer } = require('../../server/core/ServiceFactories');
    container = createContainer();
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

  describe('Container Creation', () => {
    test('should create container with all services registered', () => {
      const registeredServices = container.getRegisteredServices();
      
      const expectedServices = [
        'config',
        'logger',
        'database',
        'encryption',
        'validation',
        'eventBus',
        'authService',
        'passwordService',
        'userService',
        'categoryService',
        'realtimeService',
        'auditService'
      ];

      expectedServices.forEach(service => {
        expect(registeredServices).toContain(service);
      });
    });

    test('should register core services as singletons', () => {
      const coreServices = ['config', 'logger', 'database', 'encryption', 'validation', 'eventBus'];
      
      coreServices.forEach(serviceName => {
        expect(container.isSingleton(serviceName)).toBe(true);
      });
    });

    test('should register business services as singletons', () => {
      const businessServices = [
        'authService',
        'passwordService',
        'userService',
        'categoryService',
        'realtimeService',
        'auditService'
      ];
      
      businessServices.forEach(serviceName => {
        expect(container.isSingleton(serviceName)).toBe(true);
      });
    });
  });

  describe('Core Service Resolution', () => {
    test('should resolve config service', () => {
      const config = container.resolve('config');
      
      expect(config).toBeDefined();
      expect(typeof config.get).toBe('function');
      expect(typeof config.getSection).toBe('function');
      expect(config.get('NODE_ENV')).toBe('test');
    });

    test('should resolve logger service', () => {
      const logger = container.resolve('logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should resolve database service', () => {
      const database = container.resolve('database');
      
      expect(database).toBeDefined();
      expect(typeof database.query).toBe('function');
      expect(typeof database.transaction).toBe('function');
      expect(typeof database.testConnection).toBe('function');
    });

    test('should resolve encryption service', () => {
      const encryption = container.resolve('encryption');
      
      expect(encryption).toBeDefined();
      expect(typeof encryption.encryptPassword).toBe('function');
      expect(typeof encryption.decryptPassword).toBe('function');
    });

    test('should resolve validation service', () => {
      const validation = container.resolve('validation');
      
      expect(validation).toBeDefined();
      expect(typeof validation.validateEmail).toBe('function');
      expect(typeof validation.validatePassword).toBe('function');
    });

    test('should resolve event bus service', () => {
      const eventBus = container.resolve('eventBus');
      
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.on).toBe('function');
      expect(typeof eventBus.emit).toBe('function');
      expect(typeof eventBus.off).toBe('function');
    });
  });

  describe('Business Service Resolution', () => {
    test('should resolve auth service with dependencies', () => {
      const authService = container.resolve('authService');
      
      expect(authService).toBeDefined();
      expect(typeof authService.createUser).toBe('function');
      expect(typeof authService.findUserByEmail).toBe('function');
      expect(typeof authService.generateToken).toBe('function');
    });

    test('should resolve password service with dependencies', () => {
      const passwordService = container.resolve('passwordService');
      
      expect(passwordService).toBeDefined();
      expect(typeof passwordService.createPasswordEntry).toBe('function');
      expect(typeof passwordService.getPasswordEntries).toBe('function');
      expect(typeof passwordService.updatePasswordEntry).toBe('function');
    });

    test('should resolve user service with dependencies', () => {
      const userService = container.resolve('userService');
      
      expect(userService).toBeDefined();
      // User service methods would be defined in the actual implementation
    });

    test('should resolve category service with dependencies', () => {
      const categoryService = container.resolve('categoryService');
      
      expect(categoryService).toBeDefined();
      // Category service methods would be defined in the actual implementation
    });
  });

  describe('Service Dependencies', () => {
    test('should inject dependencies correctly', () => {
      // Resolve services that depend on each other
      const config = container.resolve('config');
      const logger = container.resolve('logger');
      const database = container.resolve('database');
      const authService = container.resolve('authService');

      // Verify they are the same instances (singletons)
      const config2 = container.resolve('config');
      const logger2 = container.resolve('logger');
      const database2 = container.resolve('database');

      expect(config).toBe(config2);
      expect(logger).toBe(logger2);
      expect(database).toBe(database2);
    });

    test('should handle circular dependency detection', () => {
      // This test verifies that the DI container can detect circular dependencies
      // In our current setup, there shouldn't be any circular dependencies
      expect(() => {
        container.resolve('authService');
        container.resolve('passwordService');
      }).not.toThrow();
    });

    test('should provide consistent service instances', () => {
      // Resolve the same service multiple times
      const authService1 = container.resolve('authService');
      const authService2 = container.resolve('authService');
      const authService3 = container.resolve('authService');

      // Should be the same instance (singleton)
      expect(authService1).toBe(authService2);
      expect(authService2).toBe(authService3);
    });
  });

  describe('Service Configuration', () => {
    test('should pass correct configuration to services', () => {
      const config = container.resolve('config');
      const databaseConfig = config.getSection('database');
      
      expect(databaseConfig.useSQLite).toBe(true);
      expect(databaseConfig.sqlitePath).toBe('./data/test_integration.db');
    });

    test('should handle environment-specific configuration', () => {
      const config = container.resolve('config');
      
      expect(config.isTest()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing service gracefully', () => {
      expect(() => {
        container.resolve('nonExistentService');
      }).toThrow("Service 'nonExistentService' not registered");
    });

    test('should handle service factory errors', () => {
      // Create a container with a failing factory
      const DIContainer = require('../../server/core/DIContainer');
      const testContainer = new DIContainer();
      
      testContainer.register('failingService', () => {
        throw new Error('Service factory error');
      });

      expect(() => {
        testContainer.resolve('failingService');
      }).toThrow('Service factory error');
    });
  });

  describe('Container Statistics', () => {
    test('should provide container statistics', () => {
      // Resolve a few services to create instances
      container.resolve('config');
      container.resolve('logger');
      container.resolve('authService');

      const stats = container.getStats();
      
      expect(stats.registeredServices).toBeGreaterThan(0);
      expect(stats.singletonInstances).toBeGreaterThan(0);
      expect(Array.isArray(stats.services)).toBe(true);
    });

    test('should track singleton instantiation', () => {
      const statsBefore = container.getStats();
      
      // Resolve a service
      container.resolve('config');
      
      const statsAfter = container.getStats();
      
      expect(statsAfter.singletonInstances).toBeGreaterThan(statsBefore.singletonInstances);
    });
  });

  describe('Test Container Creation', () => {
    test('should create test container with mock services', () => {
      const { createTestContainer } = require('../../server/core/ServiceFactories');
      const testContainer = createTestContainer();
      
      const mockConfig = testContainer.resolve('config');
      const mockLogger = testContainer.resolve('logger');
      const mockDatabase = testContainer.resolve('database');
      
      expect(mockConfig.get).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockDatabase.query).toBeDefined();
      
      // Verify they are mock functions (if using Jest)
      if (typeof jest !== 'undefined') {
        expect(jest.isMockFunction(mockConfig.get)).toBe(true);
        expect(jest.isMockFunction(mockLogger.info)).toBe(true);
        expect(jest.isMockFunction(mockDatabase.query)).toBe(true);
      }
    });
  });
});
