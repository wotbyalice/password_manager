/**
 * Performance Monitoring Service Decorator
 * Adds comprehensive performance monitoring to service method calls
 */

const ServiceDecorator = require('./ServiceDecorator');

class PerformanceDecorator extends ServiceDecorator {
  constructor(service, logger, options = {}) {
    const defaultOptions = {
      slowThreshold: 1000, // 1 second
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      enableMemoryMonitoring: true,
      enableCpuMonitoring: false,
      sampleRate: 1.0, // Monitor 100% of calls
      includePatterns: ['*'],
      excludePatterns: ['getHealthStatus', 'getStats'],
      alertOnSlowMethods: true,
      alertOnMemoryLeaks: true
    };

    super(service, { ...defaultOptions, ...options });
    this.logger = logger;
    this.performanceMetrics = new Map();
    this.memoryBaseline = process.memoryUsage();
    this.alertThresholds = {
      slowMethod: options.slowThreshold || 1000,
      memoryLeak: options.memoryThreshold || 50 * 1024 * 1024
    };
  }

  /**
   * Intercept method calls with performance monitoring
   */
  interceptMethod(methodName, originalMethod, args, target) {
    if (!this.shouldIntercept(methodName) || !this.shouldSample()) {
      return originalMethod.apply(target, args);
    }

    const context = this.createMethodContext(methodName, args);
    const startTime = process.hrtime.bigint();
    const startMemory = this.options.enableMemoryMonitoring ? process.memoryUsage() : null;

    try {
      const result = originalMethod.apply(target, args);

      // Handle async methods
      if (result && typeof result.then === 'function') {
        return result
          .then(asyncResult => {
            const endTime = process.hrtime.bigint();
            const endMemory = this.options.enableMemoryMonitoring ? process.memoryUsage() : null;
            this.recordPerformance(context, startTime, endTime, startMemory, endMemory, true);
            return asyncResult;
          })
          .catch(error => {
            const endTime = process.hrtime.bigint();
            const endMemory = this.options.enableMemoryMonitoring ? process.memoryUsage() : null;
            this.recordPerformance(context, startTime, endTime, startMemory, endMemory, false);
            throw error;
          });
      }

      // Handle sync methods
      const endTime = process.hrtime.bigint();
      const endMemory = this.options.enableMemoryMonitoring ? process.memoryUsage() : null;
      this.recordPerformance(context, startTime, endTime, startMemory, endMemory, true);
      return result;

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const endMemory = this.options.enableMemoryMonitoring ? process.memoryUsage() : null;
      this.recordPerformance(context, startTime, endTime, startMemory, endMemory, false);
      throw error;
    }
  }

  /**
   * Check if this call should be sampled
   * @returns {boolean} True if should be sampled
   */
  shouldSample() {
    return Math.random() < this.options.sampleRate;
  }

  /**
   * Record performance metrics
   * @param {Object} context - Method context
   * @param {bigint} startTime - Start time in nanoseconds
   * @param {bigint} endTime - End time in nanoseconds
   * @param {Object} startMemory - Start memory usage
   * @param {Object} endMemory - End memory usage
   * @param {boolean} success - Whether method succeeded
   */
  recordPerformance(context, startTime, endTime, startMemory, endMemory, success) {
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const methodName = context.methodName;

    // Initialize metrics for method if not exists
    if (!this.performanceMetrics.has(methodName)) {
      this.performanceMetrics.set(methodName, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        durations: [],
        memoryUsage: {
          totalAllocated: 0,
          maxAllocated: 0,
          avgAllocated: 0,
          samples: []
        },
        slowCalls: 0,
        lastSlowCall: null
      });
    }

    const metrics = this.performanceMetrics.get(methodName);

    // Update call counts
    metrics.totalCalls++;
    if (success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    // Update duration metrics
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.avgDuration = metrics.totalDuration / metrics.totalCalls;

    // Store duration for percentile calculations (keep last 1000)
    metrics.durations.push(duration);
    if (metrics.durations.length > 1000) {
      metrics.durations.shift();
    }

    // Calculate percentiles
    this.updatePercentiles(metrics);

    // Update memory metrics
    if (startMemory && endMemory) {
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      metrics.memoryUsage.totalAllocated += memoryDelta;
      metrics.memoryUsage.maxAllocated = Math.max(metrics.memoryUsage.maxAllocated, memoryDelta);
      metrics.memoryUsage.avgAllocated = metrics.memoryUsage.totalAllocated / metrics.totalCalls;

      // Store memory sample (keep last 100)
      metrics.memoryUsage.samples.push({
        timestamp: Date.now(),
        allocated: memoryDelta,
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal
      });

      if (metrics.memoryUsage.samples.length > 100) {
        metrics.memoryUsage.samples.shift();
      }
    }

    // Check for slow calls
    if (duration > this.alertThresholds.slowMethod) {
      metrics.slowCalls++;
      metrics.lastSlowCall = {
        timestamp: Date.now(),
        duration,
        context
      };

      if (this.options.alertOnSlowMethods) {
        this.alertSlowMethod(context, duration);
      }
    }

    // Check for memory issues
    if (endMemory && this.options.alertOnMemoryLeaks) {
      this.checkMemoryLeaks(endMemory, context);
    }

    // Log performance data
    this.logPerformanceData(context, duration, startMemory, endMemory, success);
  }

  /**
   * Update percentile calculations
   * @param {Object} metrics - Method metrics
   */
  updatePercentiles(metrics) {
    if (metrics.durations.length === 0) return;

    const sorted = [...metrics.durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    metrics.p95Duration = sorted[p95Index] || 0;
    metrics.p99Duration = sorted[p99Index] || 0;
  }

  /**
   * Alert on slow method execution
   * @param {Object} context - Method context
   * @param {number} duration - Execution duration
   */
  alertSlowMethod(context, duration) {
    this.logger.warn('Slow method execution detected', {
      service: context.service,
      method: context.methodName,
      duration,
      threshold: this.alertThresholds.slowMethod,
      requestId: context.requestId,
      type: 'performance_alert'
    });
  }

  /**
   * Check for memory leaks
   * @param {Object} currentMemory - Current memory usage
   * @param {Object} context - Method context
   */
  checkMemoryLeaks(currentMemory, context) {
    const memoryIncrease = currentMemory.heapUsed - this.memoryBaseline.heapUsed;
    
    if (memoryIncrease > this.alertThresholds.memoryLeak) {
      this.logger.warn('Potential memory leak detected', {
        service: context.service,
        method: context.methodName,
        memoryIncrease,
        currentHeapUsed: currentMemory.heapUsed,
        baselineHeapUsed: this.memoryBaseline.heapUsed,
        threshold: this.alertThresholds.memoryLeak,
        type: 'memory_alert'
      });

      // Update baseline to prevent repeated alerts
      this.memoryBaseline = currentMemory;
    }
  }

  /**
   * Log performance data
   * @param {Object} context - Method context
   * @param {number} duration - Execution duration
   * @param {Object} startMemory - Start memory usage
   * @param {Object} endMemory - End memory usage
   * @param {boolean} success - Whether method succeeded
   */
  logPerformanceData(context, duration, startMemory, endMemory, success) {
    const logData = {
      type: 'performance_metric',
      service: context.service,
      method: context.methodName,
      duration,
      success,
      requestId: context.requestId,
      timestamp: context.timestamp
    };

    if (startMemory && endMemory) {
      logData.memory = {
        allocated: endMemory.heapUsed - startMemory.heapUsed,
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal
      };
    }

    this.logger.debug('Performance metric recorded', logData);
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const baseStats = super.getStats();
    const currentMemory = process.memoryUsage();

    return {
      ...baseStats,
      performance: {
        methodMetrics: Object.fromEntries(this.performanceMetrics),
        totalMethods: this.performanceMetrics.size,
        systemMemory: {
          current: currentMemory,
          baseline: this.memoryBaseline,
          increase: currentMemory.heapUsed - this.memoryBaseline.heapUsed
        },
        alertThresholds: this.alertThresholds,
        sampleRate: this.options.sampleRate
      }
    };
  }

  /**
   * Get slowest methods
   * @param {number} limit - Number of methods to return
   * @returns {Array} Slowest methods
   */
  getSlowestMethods(limit = 5) {
    return Array.from(this.performanceMetrics.entries())
      .map(([method, metrics]) => ({
        method,
        avgDuration: metrics.avgDuration,
        maxDuration: metrics.maxDuration,
        p95Duration: metrics.p95Duration,
        p99Duration: metrics.p99Duration,
        totalCalls: metrics.totalCalls,
        slowCalls: metrics.slowCalls
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get methods with highest memory usage
   * @param {number} limit - Number of methods to return
   * @returns {Array} Methods with highest memory usage
   */
  getHighestMemoryMethods(limit = 5) {
    return Array.from(this.performanceMetrics.entries())
      .map(([method, metrics]) => ({
        method,
        avgMemoryAllocated: metrics.memoryUsage.avgAllocated,
        maxMemoryAllocated: metrics.memoryUsage.maxAllocated,
        totalCalls: metrics.totalCalls
      }))
      .filter(stats => stats.avgMemoryAllocated > 0)
      .sort((a, b) => b.avgMemoryAllocated - a.avgMemoryAllocated)
      .slice(0, limit);
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics.clear();
    this.memoryBaseline = process.memoryUsage();
  }

  /**
   * Get method performance summary
   * @param {string} methodName - Method name
   * @returns {Object|null} Method performance summary
   */
  getMethodSummary(methodName) {
    const metrics = this.performanceMetrics.get(methodName);
    if (!metrics) return null;

    return {
      method: methodName,
      totalCalls: metrics.totalCalls,
      successRate: metrics.totalCalls > 0 ? metrics.successfulCalls / metrics.totalCalls : 0,
      avgDuration: metrics.avgDuration,
      p95Duration: metrics.p95Duration,
      p99Duration: metrics.p99Duration,
      slowCallRate: metrics.totalCalls > 0 ? metrics.slowCalls / metrics.totalCalls : 0,
      avgMemoryAllocated: metrics.memoryUsage.avgAllocated,
      lastSlowCall: metrics.lastSlowCall
    };
  }
}

module.exports = PerformanceDecorator;
