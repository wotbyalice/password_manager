/**
 * Logging Service with Dependency Injection
 * Provides structured logging capabilities with multiple transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

class LoggingService {
  constructor(loggingConfig) {
    this.config = loggingConfig;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance
   * @returns {winston.Logger} Configured logger
   */
  createLogger() {
    // Ensure log directory exists
    const logDir = path.dirname(this.config.file);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Define console format
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        // Add metadata if present
        const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
        if (metaStr) {
          log += `\n${metaStr}`;
        }
        
        return log;
      })
    );

    // Create transports
    const transports = [];

    // File transport
    transports.push(
      new winston.transports.File({
        filename: this.config.file,
        level: this.config.level,
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Error file transport
    transports.push(
      new winston.transports.File({
        filename: this.config.file.replace('.log', '.error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Console transport (if enabled)
    if (this.config.console) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: consoleFormat
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.logger.info(message, this.sanitizeMeta(meta));
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.logger.warn(message, this.sanitizeMeta(meta));
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    // Handle Error objects
    if (meta instanceof Error) {
      meta = {
        error: meta.message,
        stack: meta.stack,
        name: meta.name
      };
    }
    
    this.logger.error(message, this.sanitizeMeta(meta));
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.logger.debug(message, this.sanitizeMeta(meta));
  }

  /**
   * Log audit event
   * @param {string} action - Action performed
   * @param {number} userId - User ID
   * @param {Object} details - Event details
   */
  auditLog(action, userId, details = {}) {
    this.logger.info('AUDIT', {
      type: 'audit',
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMeta(details)
    });
  }

  /**
   * Log authentication event
   * @param {string} action - Auth action
   * @param {string|number} userIdentifier - User email or ID
   * @param {boolean} success - Success status
   * @param {Object} details - Event details
   */
  authLog(action, userIdentifier, success, details = {}) {
    this.logger.info('AUTH', {
      type: 'authentication',
      action,
      userIdentifier,
      success,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMeta(details)
    });
  }

  /**
   * Log password operation
   * @param {string} action - Password action
   * @param {number} userId - User ID
   * @param {number} passwordId - Password ID
   * @param {Object} details - Event details
   */
  passwordLog(action, userId, passwordId, details = {}) {
    this.logger.info('PASSWORD', {
      type: 'password',
      action,
      userId,
      passwordId,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMeta(details)
    });
  }

  /**
   * Log system event
   * @param {string} action - System action
   * @param {Object} details - Event details
   */
  systemLog(action, details = {}) {
    this.logger.info('SYSTEM', {
      type: 'system',
      action,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMeta(details)
    });
  }

  /**
   * Log database operation
   * @param {string} operation - Database operation
   * @param {string} table - Database table
   * @param {Object} details - Operation details
   */
  databaseLog(operation, table, details = {}) {
    if (this.config.sqlQueries) {
      this.logger.debug('DATABASE', {
        type: 'database',
        operation,
        table,
        timestamp: new Date().toISOString(),
        ...this.sanitizeMeta(details)
      });
    }
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} details - Additional details
   */
  performanceLog(operation, duration, details = {}) {
    this.logger.info('PERFORMANCE', {
      type: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMeta(details)
    });
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {string} severity - Event severity (low, medium, high, critical)
   * @param {Object} details - Event details
   */
  securityLog(event, severity, details = {}) {
    this.logger.warn('SECURITY', {
      type: 'security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...this.sanitizeMeta(details)
    });
  }

  /**
   * Sanitize metadata to remove sensitive information
   * @param {Object} meta - Metadata object
   * @returns {Object} Sanitized metadata
   */
  sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object') {
      return meta;
    }

    const sanitized = { ...meta };
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session'
    ];

    // Remove or mask sensitive data
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create child logger with additional context
   * @param {Object} context - Additional context for all logs
   * @returns {Object} Child logger
   */
  child(context) {
    const childLogger = this.logger.child(this.sanitizeMeta(context));
    
    return {
      info: (message, meta = {}) => childLogger.info(message, this.sanitizeMeta(meta)),
      warn: (message, meta = {}) => childLogger.warn(message, this.sanitizeMeta(meta)),
      error: (message, meta = {}) => childLogger.error(message, this.sanitizeMeta(meta)),
      debug: (message, meta = {}) => childLogger.debug(message, this.sanitizeMeta(meta))
    };
  }

  /**
   * Query logs with filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Log entries
   */
  async queryLogs(options = {}) {
    const {
      level,
      startDate,
      endDate,
      limit = 100,
      type
    } = options;

    return new Promise((resolve, reject) => {
      const queryOptions = {
        from: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        until: endDate || new Date(),
        limit,
        start: 0,
        order: 'desc'
      };

      if (level) {
        queryOptions.level = level;
      }

      this.logger.query(queryOptions, (err, results) => {
        if (err) {
          reject(err);
        } else {
          let logs = results.file || [];
          
          // Filter by type if specified
          if (type) {
            logs = logs.filter(log => log.type === type);
          }
          
          resolve(logs);
        }
      });
    });
  }

  /**
   * Get logging statistics
   * @returns {Object} Logging statistics
   */
  getStats() {
    return {
      level: this.config.level,
      console: this.config.console,
      file: this.config.file,
      transports: this.logger.transports.length,
      sqlQueries: this.config.sqlQueries
    };
  }

  /**
   * Set log level dynamically
   * @param {string} level - New log level
   */
  setLevel(level) {
    this.logger.level = level;
    this.logger.transports.forEach(transport => {
      if (transport.level !== 'error') { // Don't change error file transport
        transport.level = level;
      }
    });
  }

  /**
   * Flush all log transports
   * @returns {Promise<void>}
   */
  async flush() {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  /**
   * Close all log transports
   */
  close() {
    this.logger.close();
  }
}

module.exports = LoggingService;
