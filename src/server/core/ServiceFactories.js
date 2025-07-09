/**
 * Service Factories
 * Factory functions for creating service instances with proper dependencies
 */

const ConfigService = require('../services/ConfigService');

/**
 * Service factory functions
 * Each factory receives the DI container and returns a configured service instance
 */
const serviceFactories = {
  /**
   * Configuration service factory
   * @param {DIContainer} container - DI container
   * @returns {ConfigService} Configuration service instance
   */
  config: (container) => {
    return new ConfigService();
  },

  /**
   * Database service factory
   * @param {DIContainer} container - DI container
   * @returns {DatabaseService} Database service instance
   */
  database: (container) => {
    const DatabaseService = require('../services/DatabaseService');
    const config = container.resolve('config');
    const logger = container.resolve('logger');
    
    return new DatabaseService(config.getSection('database'), logger);
  },

  /**
   * Encryption service factory
   * @param {DIContainer} container - DI container
   * @returns {EncryptionService} Encryption service instance
   */
  encryption: (container) => {
    const EncryptionService = require('../services/EncryptionService');
    const config = container.resolve('config');
    const logger = container.resolve('logger');
    
    return new EncryptionService(config.getSection('security'), logger);
  },

  /**
   * Validation service factory
   * @param {DIContainer} container - DI container
   * @returns {ValidationService} Validation service instance
   */
  validation: (container) => {
    const ValidationService = require('../services/ValidationService');
    const config = container.resolve('config');
    
    return new ValidationService(config);
  },

  /**
   * Logging service factory
   * @param {DIContainer} container - DI container
   * @returns {LoggingService} Logging service instance
   */
  logger: (container) => {
    const LoggingService = require('../services/LoggingService');
    const config = container.resolve('config');
    
    return new LoggingService(config.getSection('logging'));
  },

  /**
   * Event bus service factory
   * @param {DIContainer} container - DI container
   * @returns {EventBus} Event bus instance
   */
  eventBus: (container) => {
    const EventBus = require('./EventBus');
    const logger = container.resolve('logger');
    
    return new EventBus(logger);
  },

  /**
   * Authentication service factory
   * @param {DIContainer} container - DI container
   * @returns {AuthService} Authentication service instance
   */
  authService: (container) => {
    const AuthService = require('../services/AuthService');
    const database = container.resolve('database');
    const encryption = container.resolve('encryption');
    const validation = container.resolve('validation');
    const logger = container.resolve('logger');
    const config = container.resolve('config');
    
    return new AuthService(database, encryption, validation, logger, config);
  },

  /**
   * Password service factory
   * @param {DIContainer} container - DI container
   * @returns {PasswordService} Password service instance
   */
  passwordService: (container) => {
    const PasswordService = require('../services/PasswordService');
    const database = container.resolve('database');
    const encryption = container.resolve('encryption');
    const validation = container.resolve('validation');
    const logger = container.resolve('logger');
    const eventBus = container.resolve('eventBus');
    
    return new PasswordService(database, encryption, validation, logger, eventBus);
  },

  /**
   * User service factory
   * @param {DIContainer} container - DI container
   * @returns {UserService} User service instance
   */
  userService: (container) => {
    const UserService = require('../services/UserService');
    const database = container.resolve('database');
    const validation = container.resolve('validation');
    const logger = container.resolve('logger');
    const authService = container.resolve('authService');
    
    return new UserService(database, validation, logger, authService);
  },

  /**
   * Category service factory
   * @param {DIContainer} container - DI container
   * @returns {CategoryService} Category service instance
   */
  categoryService: (container) => {
    const CategoryService = require('../services/CategoryService');
    const database = container.resolve('database');
    const validation = container.resolve('validation');
    const logger = container.resolve('logger');
    const eventBus = container.resolve('eventBus');
    
    return new CategoryService(database, validation, logger, eventBus);
  },

  /**
   * Real-time service factory
   * @param {DIContainer} container - DI container
   * @returns {RealtimeService} Real-time service instance
   */
  realtimeService: (container) => {
    const RealtimeService = require('../services/RealtimeService');
    const eventBus = container.resolve('eventBus');
    const logger = container.resolve('logger');
    const config = container.resolve('config');
    
    return new RealtimeService(eventBus, logger, config);
  },

  /**
   * Audit service factory
   * @param {DIContainer} container - DI container
   * @returns {AuditService} Audit service instance
   */
  auditService: (container) => {
    const AuditService = require('../services/AuditService');
    const database = container.resolve('database');
    const logger = container.resolve('logger');
    const eventBus = container.resolve('eventBus');
    
    return new AuditService(database, logger, eventBus);
  }
};

/**
 * Register all services with the DI container
 * @param {DIContainer} container - DI container instance
 */
function registerServices(container) {
  // Core infrastructure services (singletons)
  container.register('config', serviceFactories.config, { singleton: true });
  container.register('logger', serviceFactories.logger, { singleton: true });
  container.register('database', serviceFactories.database, { singleton: true });
  container.register('encryption', serviceFactories.encryption, { singleton: true });
  container.register('validation', serviceFactories.validation, { singleton: true });
  container.register('eventBus', serviceFactories.eventBus, { singleton: true });

  // Business services (singletons for consistency)
  container.register('authService', serviceFactories.authService, { singleton: true });
  container.register('passwordService', serviceFactories.passwordService, { singleton: true });
  container.register('userService', serviceFactories.userService, { singleton: true });
  container.register('categoryService', serviceFactories.categoryService, { singleton: true });
  container.register('realtimeService', serviceFactories.realtimeService, { singleton: true });
  container.register('auditService', serviceFactories.auditService, { singleton: true });
}

/**
 * Create and configure a new DI container with all services
 * @returns {DIContainer} Configured DI container
 */
function createContainer() {
  const DIContainer = require('./DIContainer');
  const container = new DIContainer();
  
  registerServices(container);
  
  return container;
}

/**
 * Create a test container with mock services
 * @returns {DIContainer} Test DI container
 */
function createTestContainer() {
  const DIContainer = require('./DIContainer');
  const container = new DIContainer();
  
  // Register mock services for testing
  container.register('config', () => ({
    get: jest.fn(),
    getSection: jest.fn(),
    isDevelopment: jest.fn(() => false),
    isProduction: jest.fn(() => false),
    isTest: jest.fn(() => true)
  }), { singleton: true });

  container.register('logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    auditLog: jest.fn(),
    authLog: jest.fn(),
    passwordLog: jest.fn()
  }), { singleton: true });

  container.register('database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
    testConnection: jest.fn(),
    close: jest.fn()
  }), { singleton: true });

  container.register('encryption', () => ({
    encryptPassword: jest.fn(),
    decryptPassword: jest.fn(),
    encryptData: jest.fn(),
    decryptData: jest.fn()
  }), { singleton: true });

  container.register('validation', () => ({
    validateEmail: jest.fn(),
    validatePassword: jest.fn(),
    validatePasswordEntry: jest.fn(),
    sanitizeString: jest.fn()
  }), { singleton: true });

  container.register('eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn()
  }), { singleton: true });

  return container;
}

module.exports = {
  serviceFactories,
  registerServices,
  createContainer,
  createTestContainer
};
