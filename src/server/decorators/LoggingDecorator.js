/**
 * Logging Service Decorator
 * Adds comprehensive logging to service method calls
 */

const ServiceDecorator = require('./ServiceDecorator');

class LoggingDecorator extends ServiceDecorator {
  constructor(service, logger, options = {}) {
    const defaultOptions = {
      logLevel: 'info',
      logArgs: false,
      logResults: false,
      logErrors: true,
      logDuration: true,
      includePatterns: ['*'],
      excludePatterns: ['getHealthStatus', 'getStats', 'getServiceName'],
      maxArgLength: 100,
      maxResultLength: 200
    };

    super(service, { ...defaultOptions, ...options });
    this.logger = logger;
    this.callStats = new Map();
  }

  /**
   * Intercept method calls with logging
   */
  interceptMethod(methodName, originalMethod, args, target) {
    if (!this.shouldIntercept(methodName)) {
      return originalMethod.apply(target, args);
    }

    const context = this.createMethodContext(methodName, args);
    const startTime = Date.now();

    this.logMethodStart(context);

    try {
      const result = originalMethod.apply(target, args);

      // Handle async methods
      if (result && typeof result.then === 'function') {
        return result
          .then(asyncResult => {
            const duration = Date.now() - startTime;
            this.logMethodSuccess(context, asyncResult, duration);
            this.updateStats(methodName, duration, true);
            return this.processResult(asyncResult, context);
          })
          .catch(error => {
            const duration = Date.now() - startTime;
            this.logMethodError(context, error, duration);
            this.updateStats(methodName, duration, false);
            throw this.handleError(error, context);
          });
      }

      // Handle sync methods
      const duration = Date.now() - startTime;
      this.logMethodSuccess(context, result, duration);
      this.updateStats(methodName, duration, true);
      return this.processResult(result, context);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logMethodError(context, error, duration);
      this.updateStats(methodName, duration, false);
      throw this.handleError(error, context);
    }
  }

  /**
   * Log method start
   * @param {Object} context - Method context
   */
  logMethodStart(context) {
    const logData = {
      action: 'method_start',
      service: context.service,
      method: context.methodName,
      requestId: context.requestId,
      timestamp: context.timestamp
    };

    if (this.options.logArgs && context.args.length > 0) {
      logData.args = this.sanitizeArgs(context.args);
    }

    this.logger.info('Service method started', logData);
  }

  /**
   * Log method success
   * @param {Object} context - Method context
   * @param {any} result - Method result
   * @param {number} duration - Execution duration
   */
  logMethodSuccess(context, result, duration) {
    const logData = {
      action: 'method_success',
      service: context.service,
      method: context.methodName,
      requestId: context.requestId,
      success: true
    };

    if (this.options.logDuration) {
      logData.duration = duration;
    }

    if (this.options.logResults && result !== undefined) {
      logData.result = this.sanitizeResult(result);
    }

    this.logger.info('Service method completed', logData);
  }

  /**
   * Log method error
   * @param {Object} context - Method context
   * @param {Error} error - Error object
   * @param {number} duration - Execution duration
   */
  logMethodError(context, error, duration) {
    const logData = {
      action: 'method_error',
      service: context.service,
      method: context.methodName,
      requestId: context.requestId,
      success: false,
      error: error.message
    };

    if (this.options.logDuration) {
      logData.duration = duration;
    }

    if (error.stack) {
      logData.stack = error.stack;
    }

    this.logger.error('Service method failed', logData);
  }

  /**
   * Sanitize method arguments for logging
   * @param {Array} args - Method arguments
   * @returns {Array} Sanitized arguments
   */
  sanitizeArgs(args) {
    return args.map((arg, index) => {
      if (arg === null || arg === undefined) {
        return arg;
      }

      if (typeof arg === 'string') {
        return arg.length > this.options.maxArgLength 
          ? arg.substring(0, this.options.maxArgLength) + '...'
          : arg;
      }

      if (typeof arg === 'object') {
        // Remove sensitive data
        const sanitized = this.removeSensitiveData(arg);
        const stringified = JSON.stringify(sanitized);
        return stringified.length > this.options.maxArgLength
          ? stringified.substring(0, this.options.maxArgLength) + '...'
          : sanitized;
      }

      return arg;
    });
  }

  /**
   * Sanitize method result for logging
   * @param {any} result - Method result
   * @returns {any} Sanitized result
   */
  sanitizeResult(result) {
    if (result === null || result === undefined) {
      return result;
    }

    if (typeof result === 'string') {
      return result.length > this.options.maxResultLength
        ? result.substring(0, this.options.maxResultLength) + '...'
        : result;
    }

    if (typeof result === 'object') {
      const sanitized = this.removeSensitiveData(result);
      const stringified = JSON.stringify(sanitized);
      return stringified.length > this.options.maxResultLength
        ? stringified.substring(0, this.options.maxResultLength) + '...'
        : sanitized;
    }

    return result;
  }

  /**
   * Remove sensitive data from objects
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  removeSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sensitiveKeys = [
      'password', 'passwordHash', 'token', 'secret', 'key',
      'authorization', 'cookie', 'session', 'credentials'
    ];

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.removeSensitiveData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Update method call statistics
   * @param {string} methodName - Method name
   * @param {number} duration - Execution duration
   * @param {boolean} success - Whether call was successful
   */
  updateStats(methodName, duration, success) {
    if (!this.callStats.has(methodName)) {
      this.callStats.set(methodName, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0
      });
    }

    const stats = this.callStats.get(methodName);
    stats.totalCalls++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.avgDuration = stats.totalDuration / stats.totalCalls;

    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }
  }

  /**
   * Get logging decorator statistics
   * @returns {Object} Decorator statistics
   */
  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      methodStats: Object.fromEntries(this.callStats),
      totalMethods: this.callStats.size,
      totalCalls: Array.from(this.callStats.values()).reduce((sum, stats) => sum + stats.totalCalls, 0),
      totalSuccessfulCalls: Array.from(this.callStats.values()).reduce((sum, stats) => sum + stats.successfulCalls, 0),
      totalFailedCalls: Array.from(this.callStats.values()).reduce((sum, stats) => sum + stats.failedCalls, 0)
    };
  }

  /**
   * Get method statistics
   * @param {string} methodName - Method name
   * @returns {Object|null} Method statistics
   */
  getMethodStats(methodName) {
    return this.callStats.get(methodName) || null;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.callStats.clear();
  }

  /**
   * Get top slowest methods
   * @param {number} limit - Number of methods to return
   * @returns {Array} Top slowest methods
   */
  getSlowestMethods(limit = 5) {
    return Array.from(this.callStats.entries())
      .map(([method, stats]) => ({ method, ...stats }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get methods with highest error rates
   * @param {number} limit - Number of methods to return
   * @returns {Array} Methods with highest error rates
   */
  getHighestErrorRateMethods(limit = 5) {
    return Array.from(this.callStats.entries())
      .map(([method, stats]) => ({
        method,
        ...stats,
        errorRate: stats.totalCalls > 0 ? stats.failedCalls / stats.totalCalls : 0
      }))
      .filter(stats => stats.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }
}

module.exports = LoggingDecorator;
