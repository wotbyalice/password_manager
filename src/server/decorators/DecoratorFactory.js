/**
 * Decorator Factory
 * Creates and manages service decorators
 */

const LoggingDecorator = require('./LoggingDecorator');
const CachingDecorator = require('./CachingDecorator');
const PerformanceDecorator = require('./PerformanceDecorator');

class DecoratorFactory {
  constructor(container) {
    this.container = container;
    this.decoratorConfigs = new Map();
    this.activeDecorators = new Map();
  }

  /**
   * Register decorator configuration
   * @param {string} serviceName - Service name
   * @param {Array} decorators - Array of decorator configurations
   */
  registerDecorators(serviceName, decorators) {
    this.decoratorConfigs.set(serviceName, decorators);
  }

  /**
   * Create decorated service
   * @param {string} serviceName - Service name
   * @param {Object} service - Original service instance
   * @returns {Object} Decorated service
   */
  createDecoratedService(serviceName, service) {
    const decoratorConfigs = this.decoratorConfigs.get(serviceName) || [];
    
    if (decoratorConfigs.length === 0) {
      return service;
    }

    let decoratedService = service;
    const appliedDecorators = [];

    // Apply decorators in order
    for (const config of decoratorConfigs) {
      try {
        const decorator = this.createDecorator(config.type, decoratedService, config.options);
        decoratedService = decorator;
        appliedDecorators.push({
          type: config.type,
          decorator,
          options: config.options
        });
      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Failed to apply decorator', {
          service: serviceName,
          decoratorType: config.type,
          error: error.message
        });
      }
    }

    // Store active decorators for management
    if (appliedDecorators.length > 0) {
      this.activeDecorators.set(serviceName, appliedDecorators);
    }

    return decoratedService;
  }

  /**
   * Create specific decorator instance
   * @param {string} type - Decorator type
   * @param {Object} service - Service to decorate
   * @param {Object} options - Decorator options
   * @returns {Object} Decorator instance
   */
  createDecorator(type, service, options = {}) {
    switch (type.toLowerCase()) {
      case 'logging':
        return this.createLoggingDecorator(service, options);
      
      case 'caching':
        return this.createCachingDecorator(service, options);
      
      case 'performance':
        return this.createPerformanceDecorator(service, options);
      
      default:
        throw new Error(`Unknown decorator type: ${type}`);
    }
  }

  /**
   * Create logging decorator
   * @param {Object} service - Service to decorate
   * @param {Object} options - Decorator options
   * @returns {LoggingDecorator} Logging decorator
   */
  createLoggingDecorator(service, options) {
    const logger = this.container.resolve('logger');
    return new LoggingDecorator(service, logger, options);
  }

  /**
   * Create caching decorator
   * @param {Object} service - Service to decorate
   * @param {Object} options - Decorator options
   * @returns {CachingDecorator} Caching decorator
   */
  createCachingDecorator(service, options) {
    return new CachingDecorator(service, options);
  }

  /**
   * Create performance decorator
   * @param {Object} service - Service to decorate
   * @param {Object} options - Decorator options
   * @returns {PerformanceDecorator} Performance decorator
   */
  createPerformanceDecorator(service, options) {
    const logger = this.container.resolve('logger');
    return new PerformanceDecorator(service, logger, options);
  }

  /**
   * Get decorator statistics for service
   * @param {string} serviceName - Service name
   * @returns {Object} Decorator statistics
   */
  getServiceDecoratorStats(serviceName) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) {
      return { service: serviceName, decorators: [] };
    }

    return {
      service: serviceName,
      decorators: decorators.map(({ type, decorator, options }) => ({
        type,
        options,
        stats: decorator.getStats ? decorator.getStats() : {}
      }))
    };
  }

  /**
   * Get all decorator statistics
   * @returns {Object} All decorator statistics
   */
  getAllDecoratorStats() {
    const stats = {};
    
    for (const serviceName of this.activeDecorators.keys()) {
      stats[serviceName] = this.getServiceDecoratorStats(serviceName);
    }

    return {
      services: stats,
      totalServices: Object.keys(stats).length,
      totalDecorators: Object.values(stats).reduce((sum, service) => sum + service.decorators.length, 0)
    };
  }

  /**
   * Clear cache for service (if caching decorator is applied)
   * @param {string} serviceName - Service name
   * @param {string} methodName - Optional method name
   */
  clearServiceCache(serviceName, methodName = null) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) return;

    for (const { type, decorator } of decorators) {
      if (type === 'caching' && decorator.clearCache) {
        if (methodName) {
          decorator.clearMethodCache(methodName);
        } else {
          decorator.clearCache();
        }
      }
    }
  }

  /**
   * Reset performance metrics for service
   * @param {string} serviceName - Service name
   */
  resetServicePerformanceMetrics(serviceName) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) return;

    for (const { type, decorator } of decorators) {
      if (type === 'performance' && decorator.resetMetrics) {
        decorator.resetMetrics();
      }
    }
  }

  /**
   * Get caching statistics for service
   * @param {string} serviceName - Service name
   * @returns {Object|null} Caching statistics
   */
  getServiceCacheStats(serviceName) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) return null;

    for (const { type, decorator } of decorators) {
      if (type === 'caching' && decorator.getStats) {
        return decorator.getStats();
      }
    }

    return null;
  }

  /**
   * Get performance statistics for service
   * @param {string} serviceName - Service name
   * @returns {Object|null} Performance statistics
   */
  getServicePerformanceStats(serviceName) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) return null;

    for (const { type, decorator } of decorators) {
      if (type === 'performance' && decorator.getStats) {
        return decorator.getStats();
      }
    }

    return null;
  }

  /**
   * Get logging statistics for service
   * @param {string} serviceName - Service name
   * @returns {Object|null} Logging statistics
   */
  getServiceLoggingStats(serviceName) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) return null;

    for (const { type, decorator } of decorators) {
      if (type === 'logging' && decorator.getStats) {
        return decorator.getStats();
      }
    }

    return null;
  }

  /**
   * Configure default decorators for common service patterns
   * @param {string} pattern - Service pattern (read-heavy, write-heavy, etc.)
   * @returns {Array} Default decorator configurations
   */
  getDefaultDecorators(pattern) {
    switch (pattern) {
      case 'read-heavy':
        return [
          { type: 'caching', options: { defaultTtl: 300000, includePatterns: ['get*', 'find*', 'search*'] } },
          { type: 'performance', options: { slowThreshold: 500 } },
          { type: 'logging', options: { logLevel: 'info', logDuration: true } }
        ];

      case 'write-heavy':
        return [
          { type: 'performance', options: { slowThreshold: 1000, enableMemoryMonitoring: true } },
          { type: 'logging', options: { logLevel: 'info', logArgs: true, logDuration: true } }
        ];

      case 'critical':
        return [
          { type: 'performance', options: { slowThreshold: 200, alertOnSlowMethods: true } },
          { type: 'logging', options: { logLevel: 'debug', logArgs: true, logResults: true, logDuration: true } }
        ];

      case 'basic':
        return [
          { type: 'logging', options: { logLevel: 'info', logDuration: true } }
        ];

      default:
        return [
          { type: 'performance', options: { slowThreshold: 1000 } },
          { type: 'logging', options: { logLevel: 'info', logDuration: true } }
        ];
    }
  }

  /**
   * Apply default decorators to service
   * @param {string} serviceName - Service name
   * @param {string} pattern - Service pattern
   */
  applyDefaultDecorators(serviceName, pattern = 'default') {
    const decorators = this.getDefaultDecorators(pattern);
    this.registerDecorators(serviceName, decorators);
  }

  /**
   * Remove decorators from service
   * @param {string} serviceName - Service name
   */
  removeDecorators(serviceName) {
    this.decoratorConfigs.delete(serviceName);
    this.activeDecorators.delete(serviceName);
  }

  /**
   * Get registered services with decorators
   * @returns {Array} Service names with decorators
   */
  getDecoratedServices() {
    return Array.from(this.decoratorConfigs.keys());
  }

  /**
   * Check if service has specific decorator type
   * @param {string} serviceName - Service name
   * @param {string} decoratorType - Decorator type
   * @returns {boolean} True if service has decorator
   */
  hasDecorator(serviceName, decoratorType) {
    const decorators = this.activeDecorators.get(serviceName);
    
    if (!decorators) return false;

    return decorators.some(({ type }) => type === decoratorType);
  }

  /**
   * Get factory statistics
   * @returns {Object} Factory statistics
   */
  getFactoryStats() {
    return {
      registeredServices: this.decoratorConfigs.size,
      activeServices: this.activeDecorators.size,
      totalDecorators: Array.from(this.activeDecorators.values())
        .reduce((sum, decorators) => sum + decorators.length, 0),
      decoratorTypes: ['logging', 'caching', 'performance']
    };
  }
}

module.exports = DecoratorFactory;
