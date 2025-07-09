/**
 * Integration tests for Service Interfaces
 * Tests service interface compliance and service registry functionality
 */

describe('Service Interfaces Integration', () => {
  let container;
  let serviceRegistry;
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
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_service_interfaces.db';
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
    
    serviceRegistry = container.resolve('serviceRegistry');
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

  describe('Service Registry', () => {
    test('should resolve service registry', () => {
      expect(serviceRegistry).toBeDefined();
      expect(typeof serviceRegistry.register).toBe('function');
      expect(typeof serviceRegistry.getInstance).toBe('function');
      expect(typeof serviceRegistry.getRegisteredServices).toBe('function');
    });

    test('should register and retrieve services', () => {
      class TestService {
        getServiceName() { return 'TestService'; }
        getHealthStatus() { return { status: 'healthy' }; }
      }

      serviceRegistry.register('testService', TestService, {
        lifecycle: 'singleton',
        dependencies: [],
        metadata: { version: '1.0.0' }
      });

      expect(serviceRegistry.isRegistered('testService')).toBe(true);
      
      const instance = serviceRegistry.getInstance('testService', container);
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getServiceName()).toBe('TestService');
    });

    test('should handle singleton lifecycle correctly', () => {
      class SingletonService {
        constructor() {
          this.id = Math.random();
        }
        getServiceName() { return 'SingletonService'; }
        getHealthStatus() { return { status: 'healthy' }; }
      }

      serviceRegistry.register('singletonService', SingletonService, {
        lifecycle: 'singleton'
      });

      const instance1 = serviceRegistry.getInstance('singletonService', container);
      const instance2 = serviceRegistry.getInstance('singletonService', container);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    test('should handle transient lifecycle correctly', () => {
      class TransientService {
        constructor() {
          this.id = Math.random();
        }
        getServiceName() { return 'TransientService'; }
        getHealthStatus() { return { status: 'healthy' }; }
      }

      serviceRegistry.register('transientService', TransientService, {
        lifecycle: 'transient'
      });

      const instance1 = serviceRegistry.getInstance('transientService', container);
      const instance2 = serviceRegistry.getInstance('transientService', container);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    test('should provide service health status', async () => {
      class HealthyService {
        getServiceName() { return 'HealthyService'; }
        async getHealthStatus() {
          return {
            service: 'HealthyService',
            status: 'healthy',
            timestamp: new Date().toISOString()
          };
        }
      }

      serviceRegistry.register('healthyService', HealthyService);
      serviceRegistry.getInstance('healthyService', container);

      const health = await serviceRegistry.getServiceHealth('healthyService');
      expect(health.service).toBe('HealthyService');
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
    });

    test('should handle service errors gracefully', async () => {
      class ErrorService {
        getServiceName() { return 'ErrorService'; }
        async getHealthStatus() {
          throw new Error('Service is down');
        }
      }

      serviceRegistry.register('errorService', ErrorService);
      serviceRegistry.getInstance('errorService', container);

      const health = await serviceRegistry.getServiceHealth('errorService');
      expect(health.service).toBe('ErrorService');
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Service is down');
    });
  });

  describe('Password Service Interface Compliance', () => {
    test('should implement IPasswordService interface', () => {
      const passwordService = container.resolve('passwordService');
      
      expect(passwordService).toBeDefined();
      expect(passwordService.getServiceName()).toBe('PasswordService');
      
      // Check required methods exist
      const requiredMethods = [
        'createPasswordEntry',
        'getPasswordEntries',
        'getPasswordById',
        'updatePasswordEntry',
        'deletePasswordEntry',
        'searchPasswords',
        'validatePasswordData',
        'checkDuplicatePassword',
        'getHealthStatus',
        'getDependencies'
      ];

      requiredMethods.forEach(method => {
        expect(typeof passwordService[method]).toBe('function');
      });
    });

    test('should have correct dependencies', () => {
      const passwordService = container.resolve('passwordService');
      const dependencies = passwordService.getDependencies();
      
      expect(dependencies).toContain('database');
      expect(dependencies).toContain('encryption');
      expect(dependencies).toContain('validation');
      expect(dependencies).toContain('logger');
      expect(dependencies).toContain('eventBus');
    });

    test('should provide health status', async () => {
      const passwordService = container.resolve('passwordService');
      const health = await passwordService.getHealthStatus();
      
      expect(health.service).toBe('PasswordService');
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBeDefined();
    });

    test('should validate password data', async () => {
      const passwordService = container.resolve('passwordService');
      
      const validData = {
        title: 'Test Password',
        username: 'testuser',
        password: 'testpass123',
        url: 'https://example.com'
      };

      const validation = await passwordService.validatePasswordData(validData);
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Authentication Service Interface Compliance', () => {
    test('should implement IAuthService interface', () => {
      const authService = container.resolve('authService');
      
      expect(authService).toBeDefined();
      expect(authService.getServiceName()).toBe('AuthService');
      
      // Check required methods exist
      const requiredMethods = [
        'createUser',
        'findUserByEmail',
        'findUserById',
        'verifyPassword',
        'verifyPasswordHash',
        'changePassword',
        'generateToken',
        'verifyToken',
        'getHealthStatus',
        'getDependencies'
      ];

      requiredMethods.forEach(method => {
        expect(typeof authService[method]).toBe('function');
      });
    });

    test('should have correct dependencies', () => {
      const authService = container.resolve('authService');
      const dependencies = authService.getDependencies();
      
      expect(dependencies).toContain('database');
      expect(dependencies).toContain('validation');
      expect(dependencies).toContain('logger');
      expect(dependencies).toContain('eventBus');
      expect(dependencies).toContain('config');
    });

    test('should provide health status', async () => {
      const authService = container.resolve('authService');
      const health = await authService.getHealthStatus();
      
      expect(health.service).toBe('AuthService');
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Service Proxy Functionality', () => {
    test('should create service proxy for method interception', () => {
      class TestService {
        getServiceName() { return 'TestService'; }
        getHealthStatus() { return { status: 'healthy' }; }
        testMethod() { return 'test result'; }
      }

      serviceRegistry.register('proxyTestService', TestService);
      
      const proxiedInstance = serviceRegistry.getInstance('proxyTestService', container, { withProxy: true });
      
      expect(proxiedInstance).toBeDefined();
      expect(proxiedInstance.testMethod()).toBe('test result');
    });

    test('should log method calls through proxy', () => {
      class LogTestService {
        getServiceName() { return 'LogTestService'; }
        getHealthStatus() { return { status: 'healthy' }; }
        loggedMethod() { return 'logged'; }
      }

      serviceRegistry.register('logTestService', LogTestService);
      
      const logger = container.resolve('logger');
      const debugSpy = jest.spyOn(logger, 'debug');
      
      const proxiedInstance = serviceRegistry.getInstance('logTestService', container, { withProxy: true });
      proxiedInstance.loggedMethod();
      
      expect(debugSpy).toHaveBeenCalledWith('Service method called', expect.objectContaining({
        service: 'logTestService',
        method: 'loggedMethod'
      }));
    });
  });

  describe('Service Registry Statistics', () => {
    test('should provide registry statistics', () => {
      const stats = serviceRegistry.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.registeredServices).toBe('number');
      expect(typeof stats.instantiatedServices).toBe('number');
      expect(typeof stats.initialized).toBe('boolean');
      expect(Array.isArray(stats.services)).toBe(true);
    });

    test('should track service registration and instantiation', () => {
      class StatsTestService {
        getServiceName() { return 'StatsTestService'; }
        getHealthStatus() { return { status: 'healthy' }; }
      }

      const initialStats = serviceRegistry.getStats();
      
      serviceRegistry.register('statsTestService', StatsTestService);
      const afterRegisterStats = serviceRegistry.getStats();
      
      expect(afterRegisterStats.registeredServices).toBe(initialStats.registeredServices + 1);
      
      serviceRegistry.getInstance('statsTestService', container);
      const afterInstanceStats = serviceRegistry.getStats();
      
      expect(afterInstanceStats.instantiatedServices).toBe(initialStats.instantiatedServices + 1);
    });
  });

  describe('Service Disposal', () => {
    test('should dispose services properly', async () => {
      class DisposableService {
        constructor() {
          this.disposed = false;
        }
        getServiceName() { return 'DisposableService'; }
        getHealthStatus() { return { status: 'healthy' }; }
        async dispose() {
          this.disposed = true;
        }
      }

      serviceRegistry.register('disposableService', DisposableService);
      const instance = serviceRegistry.getInstance('disposableService', container);
      
      expect(instance.disposed).toBe(false);
      
      await serviceRegistry.dispose();
      
      expect(instance.disposed).toBe(true);
    });
  });
});
