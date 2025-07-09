/**
 * Base Service Interface
 * Defines common methods that all services should implement
 */

class IBaseService {
  /**
   * Get service name
   * @returns {string} Service name
   */
  getServiceName() {
    throw new Error('getServiceName() must be implemented by service');
  }

  /**
   * Get service version
   * @returns {string} Service version
   */
  getServiceVersion() {
    return '1.0.0';
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status object
   */
  async getHealthStatus() {
    return {
      service: this.getServiceName(),
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: this.getServiceVersion()
    };
  }

  /**
   * Get service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async getServiceStats() {
    return {
      service: this.getServiceName(),
      version: this.getServiceVersion(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize the service
   * @returns {Promise<void>}
   */
  async initialize() {
    // Default implementation - services can override
  }

  /**
   * Dispose of the service and clean up resources
   * @returns {Promise<void>}
   */
  async dispose() {
    // Default implementation - services can override
  }

  /**
   * Validate service configuration
   * @returns {Promise<Object>} Validation result
   */
  async validateConfiguration() {
    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Get service dependencies
   * @returns {Array<string>} Array of dependency service names
   */
  getDependencies() {
    return [];
  }

  /**
   * Check if service is ready
   * @returns {Promise<boolean>} True if service is ready
   */
  async isReady() {
    try {
      const health = await this.getHealthStatus();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service metadata
   * @returns {Object} Service metadata
   */
  getMetadata() {
    return {
      name: this.getServiceName(),
      version: this.getServiceVersion(),
      dependencies: this.getDependencies(),
      type: 'service'
    };
  }
}

module.exports = IBaseService;
