/**
 * Integration tests for Event-Driven Architecture
 * Tests event emission, handling, and real-time integration
 */

describe('Event-Driven Architecture Integration', () => {
  let container;
  let eventBus;
  let realtimeService;
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

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const DIContainer = require('../../server/core/DIContainer');
    const { registerServices } = require('../../server/core/ServiceFactories');
    
    container = new DIContainer();
    registerServices(container);
    
    eventBus = container.resolve('eventBus');
    realtimeService = container.resolve('realtimeService');
    logger = container.resolve('logger');
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

  describe('Event Bus Integration', () => {
    test('should resolve event bus service', () => {
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.on).toBe('function');
      expect(typeof eventBus.emit).toBe('function');
      expect(typeof eventBus.off).toBe('function');
    });

    test('should handle event subscription and emission', () => {
      let receivedData = null;
      const handler = (data) => {
        receivedData = data;
      };
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { message: 'Hello World' });
      
      expect(receivedData).toEqual({ message: 'Hello World' });
    });

    test('should handle multiple event listeners', () => {
      const results = [];
      
      const handler1 = (data) => results.push(`handler1: ${data.value}`);
      const handler2 = (data) => results.push(`handler2: ${data.value}`);
      
      eventBus.on('multi.test', handler1);
      eventBus.on('multi.test', handler2);
      eventBus.emit('multi.test', { value: 'test' });
      
      expect(results).toContain('handler1: test');
      expect(results).toContain('handler2: test');
      expect(results).toHaveLength(2);
    });

    test('should handle event unsubscription', () => {
      let callCount = 0;
      const handler = () => callCount++;
      
      const unsubscribe = eventBus.on('unsub.test', handler);
      eventBus.emit('unsub.test', {});
      expect(callCount).toBe(1);
      
      unsubscribe();
      eventBus.emit('unsub.test', {});
      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('Password Events', () => {
    const { PasswordEvents, createPasswordEvent } = require('../../server/events/PasswordEvents');

    test('should create valid password created event', () => {
      const eventData = createPasswordEvent(PasswordEvents.CREATED, {
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

      expect(eventData.password.id).toBe(123);
      expect(eventData.password.title).toBe('Test Password');
      expect(eventData.userId).toBe(456);
      expect(eventData.metadata.eventId).toBeDefined();
      expect(eventData.metadata.timestamp).toBeDefined();
    });

    test('should emit and handle password created event', () => {
      let receivedEvent = null;
      
      eventBus.on(PasswordEvents.CREATED, (data) => {
        receivedEvent = data;
      });

      const eventData = {
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
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString(),
          eventId: 'test-event-id'
        }
      };

      eventBus.emit(PasswordEvents.CREATED, eventData);
      
      expect(receivedEvent).toEqual(eventData);
      expect(receivedEvent.password.title).toBe('Test Password');
    });

    test('should validate password event data', () => {
      const { validatePasswordEvent } = require('../../server/events/PasswordEvents');
      
      const validData = {
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
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString(),
          eventId: 'test-event-id'
        }
      };

      const validation = validatePasswordEvent(PasswordEvents.CREATED, validData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid password event data', () => {
      const { validatePasswordEvent } = require('../../server/events/PasswordEvents');
      
      const invalidData = {
        password: {
          id: 'not-a-number', // Should be number
          title: 'Test Password'
          // Missing required fields
        },
        userId: 456
        // Missing metadata
      };

      const validation = validatePasswordEvent(PasswordEvents.CREATED, invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Events', () => {
    const { AuthEvents, createAuthEvent } = require('../../server/events/AuthEvents');

    test('should create valid user login event', () => {
      const eventData = createAuthEvent(AuthEvents.USER_LOGIN, {
        user: {
          id: 123,
          email: 'test@example.com',
          role: 'user',
          lastLogin: new Date().toISOString()
        },
        session: {
          sessionId: 'session-123',
          tokenId: 'token-456',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        metadata: {
          source: 'web',
          loginMethod: 'password',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
          duration: 150
        }
      });

      expect(eventData.user.id).toBe(123);
      expect(eventData.user.email).toBe('test@example.com');
      expect(eventData.session.sessionId).toBe('session-123');
      expect(eventData.metadata.eventId).toBeDefined();
    });

    test('should emit and handle user login event', () => {
      let receivedEvent = null;
      
      eventBus.on(AuthEvents.USER_LOGIN, (data) => {
        receivedEvent = data;
      });

      const eventData = {
        user: {
          id: 123,
          email: 'test@example.com',
          role: 'user',
          lastLogin: new Date().toISOString()
        },
        session: {
          sessionId: 'session-123',
          tokenId: 'token-456',
          expiresAt: new Date().toISOString()
        },
        metadata: {
          source: 'web',
          loginMethod: 'password',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
          duration: 150,
          timestamp: new Date().toISOString(),
          eventId: 'test-event-id'
        }
      };

      eventBus.emit(AuthEvents.USER_LOGIN, eventData);
      
      expect(receivedEvent).toEqual(eventData);
      expect(receivedEvent.user.email).toBe('test@example.com');
    });
  });

  describe('System Events', () => {
    const { SystemEvents, createSystemEvent } = require('../../server/events/SystemEvents');

    test('should create valid category created event', () => {
      const eventData = createSystemEvent(SystemEvents.CATEGORY_CREATED, {
        category: {
          id: 123,
          name: 'Test Category',
          description: 'Test description',
          color: '#FF5722',
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

      expect(eventData.category.id).toBe(123);
      expect(eventData.category.name).toBe('Test Category');
      expect(eventData.userId).toBe(456);
      expect(eventData.metadata.eventId).toBeDefined();
    });

    test('should emit and handle category created event', () => {
      let receivedEvent = null;
      
      eventBus.on(SystemEvents.CATEGORY_CREATED, (data) => {
        receivedEvent = data;
      });

      const eventData = {
        category: {
          id: 123,
          name: 'Test Category',
          description: 'Test description',
          color: '#FF5722',
          createdBy: 456,
          createdAt: new Date().toISOString()
        },
        userId: 456,
        metadata: {
          source: 'web',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString(),
          eventId: 'test-event-id'
        }
      };

      eventBus.emit(SystemEvents.CATEGORY_CREATED, eventData);
      
      expect(receivedEvent).toEqual(eventData);
      expect(receivedEvent.category.name).toBe('Test Category');
    });
  });

  describe('Real-time Service Integration', () => {
    test('should resolve real-time service', () => {
      expect(realtimeService).toBeDefined();
      expect(typeof realtimeService.initialize).toBe('function');
      expect(typeof realtimeService.broadcastToAll).toBe('function');
      expect(typeof realtimeService.sendToUser).toBe('function');
    });

    test('should provide service statistics', () => {
      const stats = realtimeService.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.initialized).toBe('boolean');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.authenticatedConnections).toBe('number');
      expect(typeof stats.uniqueUsers).toBe('number');
    });

    test('should handle service disposal', () => {
      expect(() => {
        realtimeService.dispose();
      }).not.toThrow();
    });
  });

  describe('Event Error Handling', () => {
    test('should handle event handler errors gracefully', () => {
      const errorHandler = () => {
        throw new Error('Test error');
      };
      
      eventBus.on('error.test', errorHandler);
      
      // Should not throw when emitting to error handler
      expect(() => {
        eventBus.emit('error.test', {});
      }).not.toThrow();
    });

    test('should handle invalid event names', () => {
      expect(() => {
        eventBus.on('', () => {});
      }).toThrow();
      
      expect(() => {
        eventBus.on(null, () => {});
      }).toThrow();
    });

    test('should handle invalid event handlers', () => {
      expect(() => {
        eventBus.on('test.event', 'not-a-function');
      }).toThrow();
      
      expect(() => {
        eventBus.on('test.event', null);
      }).toThrow();
    });
  });
});
