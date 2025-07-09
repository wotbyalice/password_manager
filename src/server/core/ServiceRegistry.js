/**
 * Service Registry
 * Manages service registration, discovery, and lifecycle
 */

class ServiceRegistry {
  constructor(logger) {
    this.logger = logger;
    this.services = new Map();
    this.serviceInstances = new Map();
    this.serviceMetadata = new Map();
    this.serviceHealth = new Map();
    this.serviceDependencies = new Map();
    this.isInitialized = false;
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Function} serviceClass - Service class constructor
   * @param {Object} options - Registration options
   * @param {string} options.lifecycle - Service lifecycle (singleton, transient)
   * @param {Array<string>} options.dependencies - Service dependencies
   * @param {Object} options.metadata - Service metadata
   */
  register(name, serviceClass, options = {}) {
    try {
      if (this.services.has(name)) {
        throw new Error(`Service '${name}' is already registered`);
      }

      const serviceInfo = {
        name,
        serviceClass,
        lifecycle: options.lifecycle || 'singleton',
        dependencies: options.dependencies || [],
        metadata: options.metadata || {},
        registeredAt: new Date().toISOString()
      };

      this.services.set(name, serviceInfo);
      this.serviceDependencies.set(name, serviceInfo.dependencies);
      this.serviceMetadata.set(name, serviceInfo.metadata);

      this.logger.info('Service registered', {
        service: name,
        lifecycle: serviceInfo.lifecycle,
        dependencies: serviceInfo.dependencies
      });

    } catch (error) {
      this.logger.error('Error registering service:', error);
      throw error;
    }
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   */
  async unregister(name) {
    try {
      if (!this.services.has(name)) {
        throw new Error(`Service '${name}' is not registered`);
      }

      // Dispose of service instance if it exists
      if (this.serviceInstances.has(name)) {
        const instance = this.serviceInstances.get(name);
        if (typeof instance.dispose === 'function') {
          await instance.dispose();
        }
        this.serviceInstances.delete(name);
      }

      // Remove from all maps
      this.services.delete(name);
      this.serviceMetadata.delete(name);
      this.serviceHealth.delete(name);
      this.serviceDependencies.delete(name);

      this.logger.info('Service unregistered', { service: name });

    } catch (error) {
      this.logger.error('Error unregistering service:', error);
      throw error;
    }
  }

  /**
   * Get service instance
   * @param {string} name - Service name
   * @param {Object} container - DI container for dependency resolution
   * @param {Object} options - Instance options
   * @param {boolean} options.withProxy - Whether to wrap with proxy for interception
   * @returns {Object} Service instance
   */
  getInstance(name, container, options = {}) {
    try {
      if (!this.services.has(name)) {
        throw new Error(`Service '${name}' is not registered`);
      }

      const serviceInfo = this.services.get(name);

      // For singleton services, return existing instance if available
      if (serviceInfo.lifecycle === 'singleton' && this.serviceInstances.has(name)) {
        const instance = this.serviceInstances.get(name);
        return options.withProxy ? this.createServiceProxy(instance, name) : instance;
      }

      // Create new instance
      const instance = this.createServiceInstance(serviceInfo, container);

      // Store singleton instances
      if (serviceInfo.lifecycle === 'singleton') {
        this.serviceInstances.set(name, instance);
      }

      // Return with or without proxy
      return options.withProxy ? this.createServiceProxy(instance, name) : instance;

    } catch (error) {
      this.logger.error('Error getting service instance:', error);
      throw error;
    }
  }

  /**
   * Create service proxy for method interception
   * @param {Object} instance - Service instance
   * @param {string} serviceName - Service name
   * @returns {Proxy} Proxied service instance
   */
  createServiceProxy(instance, serviceName) {
    const logger = this.logger;

    return new Proxy(instance, {
      get(target, prop, receiver) {
        const originalValue = Reflect.get(target, prop, receiver);

        // Only intercept function calls
        if (typeof originalValue === 'function') {
          return function(...args) {
            const startTime = Date.now();
            const methodName = prop.toString();

            logger.debug('Service method called', {
              service: serviceName,
              method: methodName,
              args: args.length
            });

            try {
              const result = originalValue.apply(target, args);

              // Handle async methods
              if (result && typeof result.then === 'function') {
                return result
                  .then(asyncResult => {
                    const duration = Date.now() - startTime;
                    logger.debug('Service method completed', {
                      service: serviceName,
                      method: methodName,
                      duration,
                      success: true
                    });
                    return asyncResult;
                  })
                  .catch(error => {
                    const duration = Date.now() - startTime;
                    logger.error('Service method failed', {
                      service: serviceName,
                      method: methodName,
                      duration,
                      error: error.message
                    });
                    throw error;
                  });
              }

              // Handle sync methods
              const duration = Date.now() - startTime;
              logger.debug('Service method completed', {
                service: serviceName,
                method: methodName,
                duration,
                success: true
              });

              return result;

            } catch (error) {
              const duration = Date.now() - startTime;
              logger.error('Service method failed', {
                service: serviceName,
                method: methodName,
                duration,
                error: error.message
              });
              throw error;
            }
          };
        }

        return originalValue;
      }
    });
  }

  /**
   * Create service instance with dependency injection
   * @param {Object} serviceInfo - Service information
   * @param {Object} container - DI container
   * @returns {Object} Service instance
   */
  createServiceInstance(serviceInfo, container) {
    try {
      const { serviceClass, dependencies } = serviceInfo;

      // Resolve dependencies
      const resolvedDependencies = dependencies.map(dep => {
        if (container && typeof container.resolve === 'function') {
          return container.resolve(dep);
        }
        throw new Error(`Cannot resolve dependency '${dep}' - container not available`);
      });

      // Create instance with dependencies
      const instance = new serviceClass(...resolvedDependencies);

      // Validate that instance implements required interface
      this.validateServiceInstance(instance, serviceInfo);

      return instance;

    } catch (error) {
      this.logger.error('Error creating service instance:', error);
      throw error;
    }
  }

  /**
   * Validate service instance
   * @param {Object} instance - Service instance
   * @param {Object} serviceInfo - Service information
   */
  validateServiceInstance(instance, serviceInfo) {
    // Check if instance has required methods
    const requiredMethods = ['getServiceName', 'getHealthStatus'];
    
    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        throw new Error(`Service '${serviceInfo.name}' must implement method '${method}'`);
      }
    }

    // Verify service name matches
    if (instance.getServiceName() !== serviceInfo.name) {
      this.logger.warn('Service name mismatch', {
        registered: serviceInfo.name,
        actual: instance.getServiceName()
      });
    }
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if service is registered
   */
  isRegistered(name) {
    return this.services.has(name);
  }

  /**
   * Get all registered services
   * @returns {Array<string>} Array of service names
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Get service metadata
   * @param {string} name - Service name
   * @returns {Object|null} Service metadata or null if not found
   */
  getServiceMetadata(name) {
    return this.serviceMetadata.get(name) || null;
  }

  /**
   * Get service dependencies
   * @param {string} name - Service name
   * @returns {Array<string>} Service dependencies
   */
  getServiceDependencies(name) {
    return this.serviceDependencies.get(name) || [];
  }

  /**
   * Get service health status
   * @param {string} name - Service name
   * @returns {Promise<Object>} Service health status
   */
  async getServiceHealth(name) {
    try {
      if (!this.serviceInstances.has(name)) {
        return {
          service: name,
          status: 'not_instantiated',
          timestamp: new Date().toISOString()
        };
      }

      const instance = this.serviceInstances.get(name);
      const health = await instance.getHealthStatus();
      
      // Cache health status
      this.serviceHealth.set(name, {
        ...health,
        lastChecked: new Date().toISOString()
      });

      return health;

    } catch (error) {
      const errorHealth = {
        service: name,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.serviceHealth.set(name, errorHealth);
      return errorHealth;
    }
  }

  /**
   * Get health status for all services
   * @returns {Promise<Object>} Health status for all services
   */
  async getAllServiceHealth() {
    const healthStatuses = {};
    const serviceNames = this.getRegisteredServices();

    for (const name of serviceNames) {
      healthStatuses[name] = await this.getServiceHealth(name);
    }

    return {
      services: healthStatuses,
      totalServices: serviceNames.length,
      healthyServices: Object.values(healthStatuses).filter(h => h.status === 'healthy').length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize all services
   * @param {Object} container - DI container
   * @returns {Promise<Object>} Initialization result
   */
  async initializeServices(container) {
    try {
      const serviceNames = this.getRegisteredServices();
      const initResults = {};

      this.logger.info('Initializing services', { count: serviceNames.length });

      for (const name of serviceNames) {
        try {
          const instance = this.getInstance(name, container);
          
          if (typeof instance.initialize === 'function') {
            await instance.initialize();
          }

          initResults[name] = { success: true };
          this.logger.info('Service initialized', { service: name });

        } catch (error) {
          initResults[name] = { success: false, error: error.message };
          this.logger.error('Service initialization failed', { service: name, error: error.message });
        }
      }

      this.isInitialized = true;
      
      return {
        success: true,
        results: initResults,
        initializedCount: Object.values(initResults).filter(r => r.success).length,
        totalCount: serviceNames.length
      };

    } catch (error) {
      this.logger.error('Error initializing services:', error);
      throw error;
    }
  }

  /**
   * Dispose of all services
   * @returns {Promise<void>}
   */
  async dispose() {
    try {
      const serviceNames = Array.from(this.serviceInstances.keys());
      
      this.logger.info('Disposing services', { count: serviceNames.length });

      for (const name of serviceNames) {
        try {
          const instance = this.serviceInstances.get(name);
          if (typeof instance.dispose === 'function') {
            await instance.dispose();
          }
          this.serviceInstances.delete(name);
          
          this.logger.info('Service disposed', { service: name });

        } catch (error) {
          this.logger.error('Error disposing service', { service: name, error: error.message });
        }
      }

      this.isInitialized = false;

    } catch (error) {
      this.logger.error('Error disposing services:', error);
      throw error;
    }
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    return {
      registeredServices: this.services.size,
      instantiatedServices: this.serviceInstances.size,
      initialized: this.isInitialized,
      services: Array.from(this.services.entries()).map(([name, info]) => ({
        name,
        lifecycle: info.lifecycle,
        dependencies: info.dependencies,
        instantiated: this.serviceInstances.has(name),
        registeredAt: info.registeredAt
      }))
    };
  }
}

module.exports = ServiceRegistry;
