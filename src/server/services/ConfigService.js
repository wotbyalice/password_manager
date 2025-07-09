/**
 * Configuration Service
 * Centralized configuration management with validation and environment support
 */

class ConfigService {
  constructor() {
    this.config = this.loadConfiguration();
    this.validate();
    
    // Freeze configuration to prevent modification
    Object.freeze(this.config);
  }

  /**
   * Load configuration from environment variables
   * @returns {Object} Configuration object
   */
  loadConfiguration() {
    const config = {
      // Environment
      NODE_ENV: process.env.NODE_ENV || 'development',
      
      // Server
      PORT: this.parsePort(process.env.PORT || '3000'),
      SERVER_URL: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`,
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
      
      // Security
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      MASTER_KEY_SALT: process.env.MASTER_KEY_SALT || 'default-salt-change-in-production',
      BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
      SESSION_SECRET: process.env.SESSION_SECRET,
      
      // Database
      DB_HOST: process.env.DB_HOST,
      DB_PORT: parseInt(process.env.DB_PORT) || 5432,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DATABASE_URL: process.env.DATABASE_URL,
      USE_SQLITE: process.env.USE_SQLITE === 'true',
      SQLITE_PATH: process.env.SQLITE_PATH || './data/password_manager.db',
      
      // Logging
      LOG_LEVEL: process.env.LOG_LEVEL || this.getDefaultLogLevel(),
      LOG_FILE: process.env.LOG_FILE || 'logs/password-manager.log',
      LOG_CONSOLE: process.env.LOG_CONSOLE !== 'false',
      LOG_SQL_QUERIES: process.env.LOG_SQL_QUERIES === 'true',
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5,
      
      // CORS
      CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001',
      TRUST_PROXY: process.env.TRUST_PROXY === 'true',
      SECURE_COOKIES: process.env.SECURE_COOKIES === 'true',
      
      // Real-time
      SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001',
      
      // Admin User
      ADMIN_FIRST_NAME: process.env.ADMIN_FIRST_NAME || 'System',
      ADMIN_LAST_NAME: process.env.ADMIN_LAST_NAME || 'Administrator',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@company.com',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
      
      // Feature Flags
      FEATURE_USER_REGISTRATION: process.env.FEATURE_USER_REGISTRATION === 'true',
      FEATURE_PASSWORD_SHARING: process.env.FEATURE_PASSWORD_SHARING !== 'false',
      FEATURE_AUDIT_EXPORT: process.env.FEATURE_AUDIT_EXPORT !== 'false',
      FEATURE_BULK_IMPORT: process.env.FEATURE_BULK_IMPORT !== 'false',
      
      // Auto-updater
      GH_TOKEN: process.env.GH_TOKEN,
      GITHUB_OWNER: process.env.GITHUB_OWNER,
      GITHUB_REPO: process.env.GITHUB_REPO,
      UPDATE_SERVER_URL: process.env.UPDATE_SERVER_URL,
      UPDATE_CHECK_INTERVAL: parseInt(process.env.UPDATE_CHECK_INTERVAL) || 24,
      
      // Testing
      SKIP_DB_CONNECTION: process.env.SKIP_DB_CONNECTION === 'true'
    };

    return config;
  }

  /**
   * Get default log level based on environment
   * @returns {string} Log level
   */
  getDefaultLogLevel() {
    const env = process.env.NODE_ENV || 'development';
    switch (env) {
      case 'production':
        return 'info';
      case 'test':
        return 'error';
      case 'development':
      default:
        return 'debug';
    }
  }

  /**
   * Parse port number with validation
   * @param {string} portStr - Port string
   * @returns {number} Port number
   */
  parsePort(portStr) {
    const port = parseInt(portStr);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('PORT must be a valid number between 1 and 65535');
    }
    return port;
  }

  /**
   * Validate required configuration
   * @throws {Error} If required configuration is missing or invalid
   */
  validate() {
    const required = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'DB_HOST',
      'DB_NAME'
    ];

    // Check for missing required configuration
    const missing = required.filter(key => !this.config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate JWT_SECRET length
    if (this.config.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Validate ENCRYPTION_KEY length
    if (this.config.ENCRYPTION_KEY.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Validate PORT
    if (typeof this.config.PORT !== 'number') {
      throw new Error('PORT must be a valid number');
    }

    // Validate BCRYPT_ROUNDS
    if (this.config.BCRYPT_ROUNDS < 4 || this.config.BCRYPT_ROUNDS > 20) {
      throw new Error('BCRYPT_ROUNDS must be between 4 and 20');
    }
  }

  /**
   * Get configuration value by key
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Get configuration section
   * @param {string} section - Section name
   * @returns {Object} Configuration section
   */
  getSection(section) {
    const sections = {
      database: {
        host: this.config.DB_HOST,
        port: this.config.DB_PORT,
        name: this.config.DB_NAME,
        user: this.config.DB_USER,
        password: this.config.DB_PASSWORD,
        connectionString: this.config.DATABASE_URL,
        useSQLite: this.config.USE_SQLITE,
        sqlitePath: this.config.SQLITE_PATH
      },
      security: {
        jwtSecret: this.config.JWT_SECRET,
        jwtExpiresIn: this.config.JWT_EXPIRES_IN,
        encryptionKey: this.config.ENCRYPTION_KEY,
        masterKeySalt: this.config.MASTER_KEY_SALT,
        bcryptRounds: this.config.BCRYPT_ROUNDS,
        sessionSecret: this.config.SESSION_SECRET
      },
      server: {
        port: this.config.PORT,
        environment: this.config.NODE_ENV,
        serverUrl: this.config.SERVER_URL,
        frontendUrl: this.config.FRONTEND_URL,
        trustProxy: this.config.TRUST_PROXY,
        secureCookies: this.config.SECURE_COOKIES
      },
      logging: {
        level: this.config.LOG_LEVEL,
        file: this.config.LOG_FILE,
        console: this.config.LOG_CONSOLE,
        sqlQueries: this.config.LOG_SQL_QUERIES
      },
      rateLimiting: {
        windowMs: this.config.RATE_LIMIT_WINDOW_MS,
        maxRequests: this.config.RATE_LIMIT_MAX_REQUESTS,
        loginMaxAttempts: this.config.LOGIN_RATE_LIMIT_MAX_ATTEMPTS
      },
      cors: {
        origins: this.config.CORS_ORIGINS.split(',').map(o => o.trim()),
        socketOrigins: this.config.SOCKET_CORS_ORIGIN.split(',').map(o => o.trim())
      },
      features: {
        userRegistration: this.config.FEATURE_USER_REGISTRATION,
        passwordSharing: this.config.FEATURE_PASSWORD_SHARING,
        auditExport: this.config.FEATURE_AUDIT_EXPORT,
        bulkImport: this.config.FEATURE_BULK_IMPORT
      }
    };

    const sectionConfig = sections[section] || {};
    return Object.freeze({ ...sectionConfig });
  }

  /**
   * Check if running in development environment
   * @returns {boolean} True if development
   */
  isDevelopment() {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Check if running in production environment
   * @returns {boolean} True if production
   */
  isProduction() {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in test environment
   * @returns {boolean} True if test
   */
  isTest() {
    return this.config.NODE_ENV === 'test';
  }

  /**
   * Reload configuration from environment
   */
  reload() {
    this.config = this.loadConfiguration();
    this.validate();
    Object.freeze(this.config);
  }

  /**
   * Get all configuration (for debugging)
   * @returns {Object} Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }
}

module.exports = ConfigService;
