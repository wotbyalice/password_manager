const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'password-manager' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write audit logs to audit.log
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Security audit logging
function auditLog(action, userId, details = {}) {
  logger.info('AUDIT', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent,
    resource: details.resource,
    resourceId: details.resourceId,
    success: details.success !== false,
    error: details.error
  });
}

// Authentication logging
function authLog(action, email, success, details = {}) {
  logger.info('AUTH', {
    action,
    email,
    success,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent,
    error: details.error
  });
}

// Password operation logging
function passwordLog(action, userId, passwordId, details = {}) {
  logger.info('PASSWORD', {
    action,
    userId,
    passwordId,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    title: details.title, // Don't log actual passwords
    category: details.category,
    success: details.success !== false,
    error: details.error
  });
}

// System operation logging
function systemLog(action, details = {}) {
  logger.info('SYSTEM', {
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Error logging with context
function errorLog(error, context = {}) {
  logger.error('ERROR', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
}

module.exports = {
  // Winston logger instance
  ...logger,
  
  // Specialized logging functions
  auditLog,
  authLog,
  passwordLog,
  systemLog,
  errorLog
};
