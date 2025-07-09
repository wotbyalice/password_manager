/**
 * Dependency Injection Container
 * Provides service registration, resolution, and lifecycle management
 */

class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.resolutionStack = new Set(); // For circular dependency detection
  }

  /**
   * Register a service with the container
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {Object} options - Registration options
   * @param {boolean} options.singleton - Whether service should be singleton
   * @throws {Error} If name or factory is invalid
   */
  register(name, factory, options = {}) {
    // Validate parameters
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Service name must be a non-empty string');
    }

    if (typeof factory !== 'function') {
      throw new Error('Factory must be a function');
    }

    // Store factory and options
    this.factories.set(name, {
      factory,
      options: { ...options }
    });
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {any} Service instance
   * @throws {Error} If service is not registered or circular dependency detected
   */
  resolve(name) {
    // Check if service is registered
    if (!this.factories.has(name)) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Check for circular dependency
    if (this.resolutionStack.has(name)) {
      const stackArray = Array.from(this.resolutionStack);
      throw new Error(`Circular dependency detected: ${stackArray.join(' -> ')} -> ${name}`);
    }

    // Check if singleton instance already exists
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    const serviceConfig = this.factories.get(name);

    try {
      // Add to resolution stack for circular dependency detection
      this.resolutionStack.add(name);

      // Create service instance
      const instance = serviceConfig.factory(this);

      // Remove from resolution stack
      this.resolutionStack.delete(name);

      // Store singleton instance if configured
      if (serviceConfig.options.singleton) {
        this.singletons.set(name, instance);
      }

      return instance;

    } catch (error) {
      // Clean up resolution stack on error
      this.resolutionStack.delete(name);
      throw error;
    }
  }

  /**
   * Create a new scoped container
   * @returns {DIContainer} New container instance
   */
  createScope() {
    return new DIContainer();
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if service is registered
   */
  isRegistered(name) {
    return this.factories.has(name);
  }

  /**
   * Get list of registered service names
   * @returns {Array<string>} Array of service names
   */
  getRegisteredServices() {
    return Array.from(this.factories.keys());
  }

  /**
   * Get service configuration
   * @param {string} name - Service name
   * @returns {Object|null} Service configuration or null if not found
   */
  getServiceConfig(name) {
    return this.factories.get(name) || null;
  }

  /**
   * Check if service is singleton
   * @param {string} name - Service name
   * @returns {boolean} True if service is configured as singleton
   */
  isSingleton(name) {
    const config = this.getServiceConfig(name);
    return config ? !!config.options.singleton : false;
  }

  /**
   * Clear all registrations and instances
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.resolutionStack.clear();
  }

  /**
   * Dispose of singleton instances (call dispose method if available)
   */
  dispose() {
    for (const [name, instance] of this.singletons) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.error(`Error disposing service '${name}':`, error);
        }
      }
    }
    this.clear();
  }

  /**
   * Get container statistics
   * @returns {Object} Container statistics
   */
  getStats() {
    return {
      registeredServices: this.factories.size,
      singletonInstances: this.singletons.size,
      activeResolutions: this.resolutionStack.size,
      services: this.getRegisteredServices().map(name => ({
        name,
        singleton: this.isSingleton(name),
        instantiated: this.singletons.has(name)
      }))
    };
  }
}

module.exports = DIContainer;
