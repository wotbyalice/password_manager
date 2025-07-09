/**
 * Complete Modularity Integration Test
 * Verifies all phases work together: DI, Events, Interfaces, and Decorators
 */

const request = require('supertest');
const express = require('express');

describe('Complete Modularity Integration', () => {
  let app;
  let container;
  let eventBus;
  let serviceRegistry;
  let decoratorFactory;
  let authToken;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_complete_modularity';
    process.env.PORT = '3001';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_complete_modularity.db';
    process.env.BCRYPT_ROUNDS = '4';

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const DIContainer = require('../../server/core/DIContainer');
    const { registerServices } = require('../../server/core/ServiceFactories');
    const DecoratorFactory = require('../../server/decorators/DecoratorFactory');
    const RouteFactory = require('../../server/routes/RouteFactory');
    
    // Phase 1: Initialize DI Container
    container = new DIContainer();
    registerServices(container);
    
    // Phase 2: Get core services
    eventBus = container.resolve('eventBus');
    serviceRegistry = container.resolve('serviceRegistry');
    
    // Phase 3: Set up decorator factory
    decoratorFactory = new DecoratorFactory(container);
    
    // Phase 4: Apply decorators to services
    decoratorFactory.applyDefaultDecorators('passwordService', 'read-heavy');
    decoratorFactory.applyDefaultDecorators('authService', 'critical');
    
    // Create Express app with complete modular architecture
    app = express();
    app.use(express.json());
    
    // Phase 5: Create routes with full modularity
    const routeFactory = new RouteFactory(container);
    const passwordRoutes = routeFactory.createPasswordRoutes();
    app.use('/api/passwords', passwordRoutes);

    // Generate test auth token
    const authService = container.resolve('authService');
    authToken = authService.generateToken({
      id: 123,
      email: 'test@example.com',
      role: 'admin'
    });
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

  describe('Phase 1: Dependency Injection Foundation', () => {
    test('should resolve all core services through DI', () => {
      const config = container.resolve('config');
      const logger = container.resolve('logger');
      const database = container.resolve('database');
      const encryption = container.resolve('encryption');
      const validation = container.resolve('validation');
      const eventBus = container.resolve('eventBus');
      
      expect(config).toBeDefined();
      expect(logger).toBeDefined();
      expect(database).toBeDefined();
      expect(encryption).toBeDefined();
      expect(validation).toBeDefined();
      expect(eventBus).toBeDefined();
    });

    test('should resolve business services through DI', () => {
      const authService = container.resolve('authService');
      const passwordService = container.resolve('passwordService');
      const realtimeService = container.resolve('realtimeService');
      
      expect(authService).toBeDefined();
      expect(passwordService).toBeDefined();
      expect(realtimeService).toBeDefined();
    });

    test('should maintain singleton behavior', () => {
      const logger1 = container.resolve('logger');
      const logger2 = container.resolve('logger');
      
      expect(logger1).toBe(logger2);
    });
  });

  describe('Phase 2: Database Layer Abstraction', () => {
    test('should use database service through interface', async () => {
      const database = container.resolve('database');
      
      expect(database).toBeDefined();
      expect(typeof database.query).toBe('function');
      expect(typeof database.testConnection).toBe('function');
      
      // Test connection
      await expect(database.testConnection()).resolves.not.toThrow();
    });

    test('should encrypt and decrypt data through service', () => {
      const encryption = container.resolve('encryption');
      
      const plaintext = 'test-password-123';
      const encrypted = encryption.encryptPassword(plaintext);
      const decrypted = encryption.decryptPassword(encrypted);
      
      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Phase 3: Event-Driven Architecture', () => {
    test('should emit and handle events through event bus', () => {
      let receivedEvent = null;
      
      eventBus.on('test.event', (data) => {
        receivedEvent = data;
      });
      
      eventBus.emit('test.event', { message: 'Hello Modularity!' });
      
      expect(receivedEvent).toEqual({ message: 'Hello Modularity!' });
    });

    test('should emit password events when creating passwords', async () => {
      const { PasswordEvents } = require('../../server/events/PasswordEvents');
      let passwordCreatedEvent = null;
      
      eventBus.on(PasswordEvents.CREATED, (data) => {
        passwordCreatedEvent = data;
      });

      // Mock the password service
      const passwordService = container.resolve('passwordService');
      passwordService.createPasswordEntry = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Test Password',
        username: 'testuser',
        category: 'Work',
        url: 'https://example.com',
        createdBy: 123,
        createdAt: new Date().toISOString()
      });

      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Password',
          username: 'testuser',
          password: 'testpass123',
          url: 'https://example.com',
          category: 'Work'
        });

      expect(response.status).toBe(201);
      expect(passwordCreatedEvent).toBeDefined();
      expect(passwordCreatedEvent.password.title).toBe('Test Password');
    });
  });

  describe('Phase 4: Service Layer Abstraction', () => {
    test('should use services through interfaces', () => {
      const passwordService = container.resolve('passwordService');
      
      // Verify interface compliance
      expect(passwordService.getServiceName()).toBe('PasswordService');
      expect(typeof passwordService.createPasswordEntry).toBe('function');
      expect(typeof passwordService.getPasswordEntries).toBe('function');
      expect(typeof passwordService.getPasswordById).toBe('function');
      expect(typeof passwordService.updatePasswordEntry).toBe('function');
      expect(typeof passwordService.deletePasswordEntry).toBe('function');
    });

    test('should provide service health status', async () => {
      const passwordService = container.resolve('passwordService');
      const health = await passwordService.getHealthStatus();
      
      expect(health.service).toBe('PasswordService');
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    test('should register services in service registry', () => {
      expect(serviceRegistry).toBeDefined();
      expect(typeof serviceRegistry.register).toBe('function');
      expect(typeof serviceRegistry.getInstance).toBe('function');
      expect(typeof serviceRegistry.getServiceHealth).toBe('function');
    });
  });

  describe('Service Decorators Integration', () => {
    test('should apply decorators to services', () => {
      const decoratedPasswordService = decoratorFactory.createDecoratedService(
        'passwordService',
        container.resolve('passwordService')
      );
      
      expect(decoratedPasswordService).toBeDefined();
      expect(decoratedPasswordService.getServiceName()).toBe('PasswordService');
    });

    test('should provide decorator statistics', () => {
      decoratorFactory.registerDecorators('testService', [
        { type: 'logging', options: {} },
        { type: 'caching', options: {} },
        { type: 'performance', options: {} }
      ]);

      const stats = decoratorFactory.getFactoryStats();
      
      expect(stats.registeredServices).toBeGreaterThan(0);
      expect(stats.decoratorTypes).toContain('logging');
      expect(stats.decoratorTypes).toContain('caching');
      expect(stats.decoratorTypes).toContain('performance');
    });

    test('should cache service method calls', async () => {
      const CachingDecorator = require('../../server/decorators/CachingDecorator');
      const passwordService = container.resolve('passwordService');
      
      // Mock a method for testing
      passwordService.testCacheMethod = jest.fn().mockResolvedValue({ data: 'cached' });
      
      const cachedService = new CachingDecorator(passwordService, {
        includePatterns: ['test*']
      });

      // First call should hit the service
      const result1 = await cachedService.testCacheMethod('param1');
      expect(result1).toEqual({ data: 'cached' });
      expect(passwordService.testCacheMethod).toHaveBeenCalledTimes(1);

      // Second call should hit the cache
      const result2 = await cachedService.testCacheMethod('param1');
      expect(result2).toEqual({ data: 'cached' });
      expect(passwordService.testCacheMethod).toHaveBeenCalledTimes(1); // Still 1

      const stats = cachedService.getStats();
      expect(stats.cache.hits).toBe(1);
      expect(stats.cache.misses).toBe(1);
    });

    test('should log service method calls', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const logger = container.resolve('logger');
      const passwordService = container.resolve('passwordService');
      
      // Mock a method for testing
      passwordService.testLogMethod = jest.fn().mockResolvedValue({ data: 'logged' });
      
      const loggedService = new LoggingDecorator(passwordService, logger, {
        logDuration: true
      });

      const infoSpy = jest.spyOn(logger, 'info');
      
      await loggedService.testLogMethod('param1');
      
      expect(infoSpy).toHaveBeenCalledWith('Service method started', expect.objectContaining({
        action: 'method_start',
        service: 'PasswordService',
        method: 'testLogMethod'
      }));
      
      expect(infoSpy).toHaveBeenCalledWith('Service method completed', expect.objectContaining({
        action: 'method_success',
        service: 'PasswordService',
        method: 'testLogMethod',
        success: true
      }));
    });

    test('should monitor service performance', async () => {
      const PerformanceDecorator = require('../../server/decorators/PerformanceDecorator');
      const logger = container.resolve('logger');
      const passwordService = container.resolve('passwordService');
      
      // Mock a method for testing
      passwordService.testPerfMethod = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { data: 'performance' };
      });
      
      const perfService = new PerformanceDecorator(passwordService, logger);
      
      await perfService.testPerfMethod('param1');
      
      const stats = perfService.getStats();
      const methodStats = stats.performance.methodMetrics.testPerfMethod;
      
      expect(methodStats).toBeDefined();
      expect(methodStats.totalCalls).toBe(1);
      expect(methodStats.successfulCalls).toBe(1);
      expect(methodStats.avgDuration).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Modular Flow', () => {
    test('should handle complete password creation flow with all phases', async () => {
      const { PasswordEvents } = require('../../server/events/PasswordEvents');
      let eventReceived = false;
      
      // Phase 3: Listen for events
      eventBus.on(PasswordEvents.CREATED, () => {
        eventReceived = true;
      });

      // Mock services for testing
      const passwordService = container.resolve('passwordService');
      passwordService.createPasswordEntry = jest.fn().mockResolvedValue({
        id: 456,
        title: 'Modular Password',
        username: 'modularuser',
        category: 'Test',
        url: 'https://modular.example.com',
        createdBy: 123,
        createdAt: new Date().toISOString()
      });

      // Phase 1-4: Complete modular request
      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Modular Password',
          username: 'modularuser',
          password: 'modularpass123',
          url: 'https://modular.example.com',
          category: 'Test'
        });

      // Verify all phases worked
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.password.title).toBe('Modular Password');
      expect(eventReceived).toBe(true);
    });

    test('should provide comprehensive system health status', async () => {
      const config = container.resolve('config');
      const logger = container.resolve('logger');
      const database = container.resolve('database');
      const passwordService = container.resolve('passwordService');
      const authService = container.resolve('authService');

      // Test all service health
      const configHealth = await config.getHealthStatus();
      const passwordHealth = await passwordService.getHealthStatus();
      const authHealth = await authService.getHealthStatus();

      expect(configHealth.service).toBe('ConfigService');
      expect(passwordHealth.service).toBe('PasswordService');
      expect(authHealth.service).toBe('AuthService');

      // Test database connection
      await expect(database.testConnection()).resolves.not.toThrow();

      // Test event bus
      let testEventReceived = false;
      eventBus.on('health.test', () => { testEventReceived = true; });
      eventBus.emit('health.test', {});
      expect(testEventReceived).toBe(true);
    });

    test('should provide complete system statistics', () => {
      const containerStats = container.getStats();
      const factoryStats = decoratorFactory.getFactoryStats();
      
      expect(containerStats.registeredServices).toBeGreaterThan(0);
      expect(containerStats.resolvedServices).toBeGreaterThan(0);
      
      expect(factoryStats.decoratorTypes).toContain('logging');
      expect(factoryStats.decoratorTypes).toContain('caching');
      expect(factoryStats.decoratorTypes).toContain('performance');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle service errors gracefully', async () => {
      const passwordService = container.resolve('passwordService');
      passwordService.createPasswordEntry = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Error Test',
          username: 'erroruser',
          password: 'errorpass123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle decorator errors gracefully', async () => {
      const LoggingDecorator = require('../../server/decorators/LoggingDecorator');
      const logger = container.resolve('logger');
      const passwordService = container.resolve('passwordService');
      
      // Mock a method that throws an error
      passwordService.errorMethod = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const loggedService = new LoggingDecorator(passwordService, logger);
      
      await expect(loggedService.errorMethod()).rejects.toThrow('Test error');
      
      // Verify error was logged
      const errorSpy = jest.spyOn(logger, 'error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
