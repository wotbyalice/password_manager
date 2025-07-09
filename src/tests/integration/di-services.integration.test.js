/**
 * Integration tests for DI Services
 * Tests the new services work correctly with dependency injection
 */

describe('DI Services Integration', () => {
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
    process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_db';
    process.env.PORT = '3001';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_di_services.db';
    process.env.BCRYPT_ROUNDS = '4'; // Lower for faster tests

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const DIContainer = require('../../server/core/DIContainer');
    const { registerServices } = require('../../server/core/ServiceFactories');
    
    container = new DIContainer();
    registerServices(container);
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

  describe('ConfigService Integration', () => {
    test('should resolve config service with correct values', () => {
      const config = container.resolve('config');
      
      expect(config).toBeDefined();
      expect(config.get('NODE_ENV')).toBe('test');
      expect(config.get('JWT_SECRET')).toBe('test-jwt-secret-32-characters-long');
      expect(config.isTest()).toBe(true);
    });

    test('should provide configuration sections', () => {
      const config = container.resolve('config');
      
      const dbConfig = config.getSection('database');
      expect(dbConfig.useSQLite).toBe(true);
      expect(dbConfig.sqlitePath).toBe('./data/test_di_services.db');
      
      const securityConfig = config.getSection('security');
      expect(securityConfig.jwtSecret).toBe('test-jwt-secret-32-characters-long');
      expect(securityConfig.bcryptRounds).toBe(4);
    });
  });

  describe('LoggingService Integration', () => {
    test('should resolve logging service', () => {
      const logger = container.resolve('logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.auditLog).toBe('function');
      expect(typeof logger.authLog).toBe('function');
    });

    test('should log messages without errors', () => {
      const logger = container.resolve('logger');
      
      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warning message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    test('should log structured events', () => {
      const logger = container.resolve('logger');
      
      expect(() => {
        logger.auditLog('TEST_ACTION', 123, { detail: 'test' });
        logger.authLog('LOGIN', 'test@example.com', true, { ip: '127.0.0.1' });
        logger.passwordLog('CREATE', 123, 456, { title: 'Test Entry' });
      }).not.toThrow();
    });
  });

  describe('ValidationService Integration', () => {
    test('should resolve validation service', () => {
      const validation = container.resolve('validation');
      
      expect(validation).toBeDefined();
      expect(typeof validation.validateEmail).toBe('function');
      expect(typeof validation.validatePassword).toBe('function');
      expect(typeof validation.validatePasswordEntry).toBe('function');
    });

    test('should validate email addresses correctly', () => {
      const validation = container.resolve('validation');
      
      expect(validation.validateEmail('test@example.com')).toBe(true);
      expect(validation.validateEmail('invalid-email')).toBe(false);
      expect(validation.validateEmail('')).toBe(false);
      expect(validation.validateEmail(null)).toBe(false);
    });

    test('should validate passwords correctly', () => {
      const validation = container.resolve('validation');
      
      expect(validation.validatePassword('ValidPass123!')).toBe(true);
      expect(validation.validatePassword('weak')).toBe(false);
      expect(validation.validatePassword('')).toBe(false);
      expect(validation.validatePassword(null)).toBe(false);
    });

    test('should validate password entries', () => {
      const validation = container.resolve('validation');
      
      const validEntry = {
        title: 'Test Entry',
        username: 'testuser',
        password: 'testpass123',
        url: 'https://example.com',
        notes: 'Test notes'
      };
      
      const result = validation.validatePasswordEntry(validEntry);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const invalidEntry = {
        title: '',
        username: '',
        password: ''
      };
      
      const invalidResult = validation.validatePasswordEntry(invalidEntry);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('EncryptionService Integration', () => {
    test('should resolve encryption service', () => {
      const encryption = container.resolve('encryption');
      
      expect(encryption).toBeDefined();
      expect(typeof encryption.encryptPassword).toBe('function');
      expect(typeof encryption.decryptPassword).toBe('function');
      expect(typeof encryption.encryptData).toBe('function');
      expect(typeof encryption.decryptData).toBe('function');
    });

    test('should encrypt and decrypt passwords', () => {
      const encryption = container.resolve('encryption');
      
      const originalPassword = 'MySecretPassword123!';
      const encrypted = encryption.encryptPassword(originalPassword);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalPassword);
      expect(typeof encrypted).toBe('string');
      
      const decrypted = encryption.decryptPassword(encrypted);
      expect(decrypted).toBe(originalPassword);
    });

    test('should encrypt and decrypt general data', () => {
      const encryption = container.resolve('encryption');
      
      const originalData = 'Sensitive information that needs encryption';
      const encrypted = encryption.encryptData(originalData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalData);
      
      const decrypted = encryption.decryptData(encrypted);
      expect(decrypted).toBe(originalData);
    });

    test('should handle null/empty data gracefully', () => {
      const encryption = container.resolve('encryption');
      
      expect(encryption.encryptData(null)).toBeNull();
      expect(encryption.encryptData('')).toBe('');
      expect(encryption.decryptData(null)).toBeNull();
      expect(encryption.decryptData('')).toBe('');
    });

    test('should generate random keys', () => {
      const encryption = container.resolve('encryption');
      
      const key1 = encryption.generateKey(32);
      const key2 = encryption.generateKey(32);
      
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(64); // 32 bytes = 64 hex characters
    });
  });

  describe('EventBus Integration', () => {
    test('should resolve event bus service', () => {
      const eventBus = container.resolve('eventBus');
      
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.on).toBe('function');
      expect(typeof eventBus.emit).toBe('function');
      expect(typeof eventBus.off).toBe('function');
    });

    test('should handle event subscription and emission', () => {
      const eventBus = container.resolve('eventBus');
      
      let receivedData = null;
      const handler = (data) => {
        receivedData = data;
      };
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { message: 'Hello World' });
      
      expect(receivedData).toEqual({ message: 'Hello World' });
    });

    test('should handle one-time event listeners', () => {
      const eventBus = container.resolve('eventBus');
      
      let callCount = 0;
      const handler = () => {
        callCount++;
      };
      
      eventBus.once('test.once', handler);
      eventBus.emit('test.once', {});
      eventBus.emit('test.once', {});
      
      expect(callCount).toBe(1);
    });
  });

  describe('AuthService Integration', () => {
    test('should resolve auth service with all dependencies', () => {
      const authService = container.resolve('authService');
      
      expect(authService).toBeDefined();
      expect(typeof authService.createUser).toBe('function');
      expect(typeof authService.findUserByEmail).toBe('function');
      expect(typeof authService.generateToken).toBe('function');
      expect(typeof authService.verifyToken).toBe('function');
    });

    test('should generate and verify JWT tokens', () => {
      const authService = container.resolve('authService');
      
      const user = {
        id: 123,
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = authService.generateToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = authService.verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    test('should verify password hashes', async () => {
      const authService = container.resolve('authService');
      
      const password = 'TestPassword123!';
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password, 4);
      
      const isValid = await authService.verifyPasswordHash(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await authService.verifyPasswordHash('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Service Dependencies', () => {
    test('should inject dependencies correctly across services', () => {
      const authService = container.resolve('authService');
      const config = container.resolve('config');
      const logger = container.resolve('logger');
      const validation = container.resolve('validation');
      const encryption = container.resolve('encryption');
      
      // Verify services are properly injected (same instances)
      expect(authService.config).toBe(config);
      expect(authService.logger).toBe(logger);
      expect(authService.validation).toBe(validation);
      expect(encryption.logger).toBe(logger);
    });

    test('should maintain singleton behavior', () => {
      const config1 = container.resolve('config');
      const config2 = container.resolve('config');
      const logger1 = container.resolve('logger');
      const logger2 = container.resolve('logger');
      
      expect(config1).toBe(config2);
      expect(logger1).toBe(logger2);
    });
  });
});
