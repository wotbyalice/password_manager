/**
 * Unit tests for Configuration Service
 * Following TDD approach - tests first, then implementation
 */

describe('ConfigService', () => {
  let ConfigService;
  let configService;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    delete require.cache[require.resolve('../../server/services/ConfigService')];
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_db';
    process.env.PORT = '3001';
    
    ConfigService = require('../../server/services/ConfigService');
    configService = new ConfigService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Constructor', () => {
    test('should load configuration on initialization', () => {
      expect(configService.config).toBeDefined();
      expect(typeof configService.config).toBe('object');
    });

    test('should validate required configuration on initialization', () => {
      // Remove required config
      delete process.env.JWT_SECRET;
      
      expect(() => {
        new ConfigService();
      }).toThrow('Missing required configuration: JWT_SECRET');
    });

    test('should load environment variables', () => {
      expect(configService.config.JWT_SECRET).toBe('test-jwt-secret');
      expect(configService.config.ENCRYPTION_KEY).toBe('test-encryption-key-32-characters-long');
      expect(configService.config.NODE_ENV).toBe('test');
    });
  });

  describe('Configuration Access', () => {
    test('should get configuration value by key', () => {
      const jwtSecret = configService.get('JWT_SECRET');
      expect(jwtSecret).toBe('test-jwt-secret');
    });

    test('should return default value for missing key', () => {
      const missingValue = configService.get('MISSING_KEY', 'default-value');
      expect(missingValue).toBe('default-value');
    });

    test('should return null for missing key without default', () => {
      const missingValue = configService.get('MISSING_KEY');
      expect(missingValue).toBeNull();
    });

    test('should get configuration section', () => {
      const dbSection = configService.getSection('database');
      expect(dbSection).toBeDefined();
      expect(typeof dbSection).toBe('object');
    });

    test('should return empty object for missing section', () => {
      const missingSection = configService.getSection('missing_section');
      expect(missingSection).toEqual({});
    });
  });

  describe('Environment-Specific Configuration', () => {
    test('should load development configuration', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = new ConfigService();
      
      expect(devConfig.get('NODE_ENV')).toBe('development');
      expect(devConfig.isDevelopment()).toBe(true);
      expect(devConfig.isProduction()).toBe(false);
      expect(devConfig.isTest()).toBe(false);
    });

    test('should load production configuration', () => {
      process.env.NODE_ENV = 'production';
      const prodConfig = new ConfigService();
      
      expect(prodConfig.get('NODE_ENV')).toBe('production');
      expect(prodConfig.isDevelopment()).toBe(false);
      expect(prodConfig.isProduction()).toBe(true);
      expect(prodConfig.isTest()).toBe(false);
    });

    test('should load test configuration', () => {
      process.env.NODE_ENV = 'test';
      const testConfig = new ConfigService();
      
      expect(testConfig.get('NODE_ENV')).toBe('test');
      expect(testConfig.isDevelopment()).toBe(false);
      expect(testConfig.isProduction()).toBe(false);
      expect(testConfig.isTest()).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate all required configuration keys', () => {
      const requiredKeys = [
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'DB_HOST',
        'DB_NAME'
      ];

      requiredKeys.forEach(key => {
        delete process.env[key];
        expect(() => new ConfigService()).toThrow(`Missing required configuration: ${key}`);
        process.env[key] = 'test-value'; // Restore for next iteration
      });
    });

    test('should validate JWT_SECRET minimum length', () => {
      process.env.JWT_SECRET = 'short';
      
      expect(() => {
        new ConfigService();
      }).toThrow('JWT_SECRET must be at least 32 characters long');
    });

    test('should validate ENCRYPTION_KEY minimum length', () => {
      process.env.ENCRYPTION_KEY = 'short';
      
      expect(() => {
        new ConfigService();
      }).toThrow('ENCRYPTION_KEY must be at least 32 characters long');
    });

    test('should validate PORT is a number', () => {
      process.env.PORT = 'not-a-number';
      
      expect(() => {
        new ConfigService();
      }).toThrow('PORT must be a valid number');
    });
  });

  describe('Database Configuration', () => {
    test('should provide database configuration section', () => {
      const dbConfig = configService.getSection('database');
      
      expect(dbConfig.host).toBe('localhost');
      expect(dbConfig.name).toBe('test_db');
      expect(dbConfig.port).toBeDefined();
    });

    test('should handle SQLite configuration', () => {
      process.env.USE_SQLITE = 'true';
      process.env.SQLITE_PATH = './data/test.db';
      
      const sqliteConfig = new ConfigService();
      const dbConfig = sqliteConfig.getSection('database');
      
      expect(dbConfig.useSQLite).toBe(true);
      expect(dbConfig.sqlitePath).toBe('./data/test.db');
    });

    test('should handle PostgreSQL configuration', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      
      const pgConfig = new ConfigService();
      const dbConfig = pgConfig.getSection('database');
      
      expect(dbConfig.connectionString).toBe('postgresql://user:pass@localhost:5432/db');
    });
  });

  describe('Security Configuration', () => {
    test('should provide security configuration section', () => {
      const securityConfig = configService.getSection('security');
      
      expect(securityConfig.jwtSecret).toBe('test-jwt-secret');
      expect(securityConfig.encryptionKey).toBe('test-encryption-key-32-characters-long');
      expect(securityConfig.bcryptRounds).toBeDefined();
    });

    test('should set default bcrypt rounds', () => {
      const securityConfig = configService.getSection('security');
      expect(securityConfig.bcryptRounds).toBe(12);
    });

    test('should use custom bcrypt rounds', () => {
      process.env.BCRYPT_ROUNDS = '8';
      const customConfig = new ConfigService();
      const securityConfig = customConfig.getSection('security');
      
      expect(securityConfig.bcryptRounds).toBe(8);
    });
  });

  describe('Server Configuration', () => {
    test('should provide server configuration section', () => {
      const serverConfig = configService.getSection('server');
      
      expect(serverConfig.port).toBe(3001);
      expect(serverConfig.environment).toBe('test');
    });

    test('should use default port if not specified', () => {
      delete process.env.PORT;
      const defaultConfig = new ConfigService();
      const serverConfig = defaultConfig.getSection('server');
      
      expect(serverConfig.port).toBe(3000);
    });
  });

  describe('Logging Configuration', () => {
    test('should provide logging configuration section', () => {
      const loggingConfig = configService.getSection('logging');
      
      expect(loggingConfig.level).toBeDefined();
      expect(loggingConfig.console).toBeDefined();
      expect(loggingConfig.file).toBeDefined();
    });

    test('should set appropriate log level for environment', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = new ConfigService();
      const loggingConfig = devConfig.getSection('logging');
      
      expect(loggingConfig.level).toBe('debug');
    });
  });

  describe('Configuration Immutability', () => {
    test('should not allow modification of configuration object', () => {
      const config = configService.config;
      
      expect(() => {
        config.JWT_SECRET = 'modified';
      }).toThrow();
    });

    test('should return frozen configuration sections', () => {
      const dbConfig = configService.getSection('database');
      
      expect(Object.isFrozen(dbConfig)).toBe(true);
    });
  });

  describe('Configuration Reload', () => {
    test('should provide method to reload configuration', () => {
      expect(typeof configService.reload).toBe('function');
    });

    test('should reload configuration from environment', () => {
      const originalSecret = configService.get('JWT_SECRET');
      
      process.env.JWT_SECRET = 'new-secret-value';
      configService.reload();
      
      const newSecret = configService.get('JWT_SECRET');
      expect(newSecret).toBe('new-secret-value');
      expect(newSecret).not.toBe(originalSecret);
    });
  });
});
