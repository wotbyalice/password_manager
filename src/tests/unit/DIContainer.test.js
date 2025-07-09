/**
 * Unit tests for Dependency Injection Container
 * Following TDD approach - tests first, then implementation
 */

describe('DIContainer', () => {
  let DIContainer;
  let container;

  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    DIContainer = require('../../server/core/DIContainer');
    container = new DIContainer();
  });

  describe('Constructor', () => {
    test('should create empty container', () => {
      expect(container).toBeDefined();
      expect(container.services).toBeDefined();
      expect(container.singletons).toBeDefined();
      expect(container.factories).toBeDefined();
    });

    test('should initialize with empty maps', () => {
      expect(container.services.size).toBe(0);
      expect(container.singletons.size).toBe(0);
      expect(container.factories.size).toBe(0);
    });
  });

  describe('Service Registration', () => {
    test('should register service with factory function', () => {
      const factory = () => ({ test: 'service' });
      
      container.register('testService', factory);
      
      expect(container.factories.has('testService')).toBe(true);
      expect(container.factories.get('testService').factory).toBe(factory);
    });

    test('should register service with options', () => {
      const factory = () => ({ test: 'service' });
      const options = { singleton: true };
      
      container.register('testService', factory, options);
      
      const serviceConfig = container.factories.get('testService');
      expect(serviceConfig.options).toEqual(options);
    });

    test('should register multiple services', () => {
      const factory1 = () => ({ service: 1 });
      const factory2 = () => ({ service: 2 });
      
      container.register('service1', factory1);
      container.register('service2', factory2);
      
      expect(container.factories.size).toBe(2);
      expect(container.factories.has('service1')).toBe(true);
      expect(container.factories.has('service2')).toBe(true);
    });

    test('should allow overriding existing service registration', () => {
      const factory1 = () => ({ version: 1 });
      const factory2 = () => ({ version: 2 });
      
      container.register('testService', factory1);
      container.register('testService', factory2);
      
      expect(container.factories.size).toBe(1);
      expect(container.factories.get('testService').factory).toBe(factory2);
    });
  });

  describe('Service Resolution', () => {
    test('should resolve registered service', () => {
      const expectedService = { test: 'service' };
      const factory = () => expectedService;
      
      container.register('testService', factory);
      const resolved = container.resolve('testService');
      
      expect(resolved).toBe(expectedService);
    });

    test('should throw error for unregistered service', () => {
      expect(() => {
        container.resolve('nonExistentService');
      }).toThrow("Service 'nonExistentService' not registered");
    });

    test('should pass container to factory function', () => {
      let receivedContainer;
      const factory = (container) => {
        receivedContainer = container;
        return { test: 'service' };
      };
      
      container.register('testService', factory);
      container.resolve('testService');
      
      expect(receivedContainer).toBe(container);
    });

    test('should resolve dependencies between services', () => {
      const dependencyService = { name: 'dependency' };
      const dependencyFactory = () => dependencyService;
      
      const mainFactory = (container) => {
        const dependency = container.resolve('dependency');
        return { dependency, name: 'main' };
      };
      
      container.register('dependency', dependencyFactory);
      container.register('mainService', mainFactory);
      
      const resolved = container.resolve('mainService');
      
      expect(resolved.dependency).toBe(dependencyService);
      expect(resolved.name).toBe('main');
    });
  });

  describe('Singleton Services', () => {
    test('should return same instance for singleton services', () => {
      const factory = () => ({ id: Math.random() });
      
      container.register('singletonService', factory, { singleton: true });
      
      const instance1 = container.resolve('singletonService');
      const instance2 = container.resolve('singletonService');
      
      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    test('should return different instances for non-singleton services', () => {
      const factory = () => ({ id: Math.random() });
      
      container.register('transientService', factory);
      
      const instance1 = container.resolve('transientService');
      const instance2 = container.resolve('transientService');
      
      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    test('should store singleton instances', () => {
      const factory = () => ({ test: 'singleton' });
      
      container.register('singletonService', factory, { singleton: true });
      container.resolve('singletonService');
      
      expect(container.singletons.has('singletonService')).toBe(true);
    });
  });

  describe('Scoped Containers', () => {
    test('should create new scoped container', () => {
      const scopedContainer = container.createScope();
      
      expect(scopedContainer).toBeInstanceOf(DIContainer);
      expect(scopedContainer).not.toBe(container);
    });

    test('should create independent scoped container', () => {
      const factory = () => ({ test: 'service' });
      
      container.register('testService', factory);
      const scopedContainer = container.createScope();
      
      expect(scopedContainer.factories.size).toBe(0);
      expect(() => scopedContainer.resolve('testService')).toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle factory function errors gracefully', () => {
      const factory = () => {
        throw new Error('Factory error');
      };
      
      container.register('errorService', factory);
      
      expect(() => {
        container.resolve('errorService');
      }).toThrow('Factory error');
    });

    test('should handle circular dependencies', () => {
      const factory1 = (container) => {
        const service2 = container.resolve('service2');
        return { name: 'service1', dependency: service2 };
      };
      
      const factory2 = (container) => {
        const service1 = container.resolve('service1');
        return { name: 'service2', dependency: service1 };
      };
      
      container.register('service1', factory1);
      container.register('service2', factory2);
      
      expect(() => {
        container.resolve('service1');
      }).toThrow(); // Should detect circular dependency
    });

    test('should validate factory parameter', () => {
      expect(() => {
        container.register('testService', 'not-a-function');
      }).toThrow();
      
      expect(() => {
        container.register('testService', null);
      }).toThrow();
    });

    test('should validate service name parameter', () => {
      const factory = () => ({ test: 'service' });
      
      expect(() => {
        container.register('', factory);
      }).toThrow();
      
      expect(() => {
        container.register(null, factory);
      }).toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    test('should call factory function only once for singletons', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { callCount };
      };
      
      container.register('singletonService', factory, { singleton: true });
      
      container.resolve('singletonService');
      container.resolve('singletonService');
      container.resolve('singletonService');
      
      expect(callCount).toBe(1);
    });

    test('should call factory function every time for transient services', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { callCount };
      };
      
      container.register('transientService', factory);
      
      container.resolve('transientService');
      container.resolve('transientService');
      container.resolve('transientService');
      
      expect(callCount).toBe(3);
    });
  });

  describe('Container Introspection', () => {
    test('should provide method to check if service is registered', () => {
      const factory = () => ({ test: 'service' });
      
      container.register('testService', factory);
      
      expect(container.isRegistered('testService')).toBe(true);
      expect(container.isRegistered('nonExistentService')).toBe(false);
    });

    test('should provide method to get registered service names', () => {
      const factory1 = () => ({ service: 1 });
      const factory2 = () => ({ service: 2 });
      
      container.register('service1', factory1);
      container.register('service2', factory2);
      
      const serviceNames = container.getRegisteredServices();
      
      expect(serviceNames).toContain('service1');
      expect(serviceNames).toContain('service2');
      expect(serviceNames.length).toBe(2);
    });
  });
});
