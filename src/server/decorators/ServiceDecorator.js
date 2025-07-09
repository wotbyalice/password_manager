/**
 * Base Service Decorator
 * Provides foundation for service decoration patterns
 */

class ServiceDecorator {
  constructor(service, options = {}) {
    this.service = service;
    this.options = options;
    this.decoratorName = this.constructor.name;
    
    // Proxy all service methods
    return this.createProxy();
  }

  /**
   * Create proxy for service method interception
   * @returns {Proxy} Proxied service
   */
  createProxy() {
    return new Proxy(this.service, {
      get: (target, prop, receiver) => {
        const originalValue = Reflect.get(target, prop, receiver);
        
        // Only intercept function calls
        if (typeof originalValue === 'function') {
          return (...args) => {
            return this.interceptMethod(prop, originalValue, args, target);
          };
        }
        
        return originalValue;
      }
    });
  }

  /**
   * Intercept method calls (to be overridden by specific decorators)
   * @param {string} methodName - Method name
   * @param {Function} originalMethod - Original method
   * @param {Array} args - Method arguments
   * @param {Object} target - Target object
   * @returns {any} Method result
   */
  interceptMethod(methodName, originalMethod, args, target) {
    // Default implementation - just call the original method
    return originalMethod.apply(target, args);
  }

  /**
   * Get decorator name
   * @returns {string} Decorator name
   */
  getDecoratorName() {
    return this.decoratorName;
  }

  /**
   * Get decorated service
   * @returns {Object} Decorated service
   */
  getService() {
    return this.service;
  }

  /**
   * Get decorator options
   * @returns {Object} Decorator options
   */
  getOptions() {
    return this.options;
  }

  /**
   * Check if method should be intercepted
   * @param {string} methodName - Method name
   * @returns {boolean} True if method should be intercepted
   */
  shouldIntercept(methodName) {
    const { includePatterns = [], excludePatterns = [] } = this.options;
    
    // Check exclude patterns first
    if (excludePatterns.length > 0) {
      for (const pattern of excludePatterns) {
        if (this.matchesPattern(methodName, pattern)) {
          return false;
        }
      }
    }
    
    // Check include patterns
    if (includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        if (this.matchesPattern(methodName, pattern)) {
          return true;
        }
      }
      return false; // If include patterns exist but none match
    }
    
    // Default: intercept all methods except internal ones
    return !methodName.startsWith('_') && 
           !methodName.startsWith('get') && 
           methodName !== 'constructor';
  }

  /**
   * Check if method name matches pattern
   * @param {string} methodName - Method name
   * @param {string|RegExp} pattern - Pattern to match
   * @returns {boolean} True if matches
   */
  matchesPattern(methodName, pattern) {
    if (pattern instanceof RegExp) {
      return pattern.test(methodName);
    }
    
    if (typeof pattern === 'string') {
      // Support wildcards
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`).test(methodName);
      }
      return methodName === pattern;
    }
    
    return false;
  }

  /**
   * Create method context for decorators
   * @param {string} methodName - Method name
   * @param {Array} args - Method arguments
   * @returns {Object} Method context
   */
  createMethodContext(methodName, args) {
    return {
      methodName,
      args,
      service: this.service.getServiceName ? this.service.getServiceName() : 'Unknown',
      decorator: this.decoratorName,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle method errors
   * @param {Error} error - Error object
   * @param {Object} context - Method context
   * @returns {Error} Processed error
   */
  handleError(error, context) {
    // Add context to error if possible
    if (error && typeof error === 'object') {
      error.decoratorContext = context;
    }
    return error;
  }

  /**
   * Process method result
   * @param {any} result - Method result
   * @param {Object} context - Method context
   * @returns {any} Processed result
   */
  processResult(result, context) {
    // Default implementation - return result as-is
    return result;
  }

  /**
   * Get decorator statistics
   * @returns {Object} Decorator statistics
   */
  getStats() {
    return {
      decorator: this.decoratorName,
      service: this.service.getServiceName ? this.service.getServiceName() : 'Unknown',
      options: this.options,
      active: true
    };
  }
}

module.exports = ServiceDecorator;
