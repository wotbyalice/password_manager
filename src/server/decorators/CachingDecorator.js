/**
 * Caching Service Decorator
 * Adds intelligent caching to service method calls
 */

const ServiceDecorator = require('./ServiceDecorator');

class CachingDecorator extends ServiceDecorator {
  constructor(service, options = {}) {
    const defaultOptions = {
      defaultTtl: 300000, // 5 minutes
      maxCacheSize: 1000,
      includePatterns: ['get*', 'find*', 'search*'],
      excludePatterns: ['getHealthStatus', 'getStats'],
      keyGenerator: null, // Custom key generator function
      serializer: JSON.stringify,
      deserializer: JSON.parse,
      enableStats: true
    };

    super(service, { ...defaultOptions, ...options });
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    this.methodTtls = new Map();
  }

  /**
   * Intercept method calls with caching
   */
  interceptMethod(methodName, originalMethod, args, target) {
    if (!this.shouldIntercept(methodName)) {
      return originalMethod.apply(target, args);
    }

    // Only cache read operations (methods that don't modify state)
    if (!this.isReadOperation(methodName)) {
      // For write operations, invalidate related cache entries
      this.invalidateRelatedCache(methodName);
      return originalMethod.apply(target, args);
    }

    const cacheKey = this.generateCacheKey(methodName, args);
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult !== null) {
      this.cacheStats.hits++;
      return this.deserializeResult(cachedResult.value);
    }

    this.cacheStats.misses++;

    try {
      const result = originalMethod.apply(target, args);

      // Handle async methods
      if (result && typeof result.then === 'function') {
        return result.then(asyncResult => {
          this.setCache(cacheKey, asyncResult, methodName);
          return asyncResult;
        });
      }

      // Handle sync methods
      this.setCache(cacheKey, result, methodName);
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if method is a read operation
   * @param {string} methodName - Method name
   * @returns {boolean} True if read operation
   */
  isReadOperation(methodName) {
    const readPatterns = [
      /^get/i, /^find/i, /^search/i, /^list/i, /^fetch/i,
      /^retrieve/i, /^query/i, /^check/i, /^validate/i
    ];

    const writePatterns = [
      /^create/i, /^add/i, /^insert/i, /^save/i, /^update/i,
      /^modify/i, /^edit/i, /^delete/i, /^remove/i, /^destroy/i,
      /^set/i, /^put/i, /^post/i, /^patch/i
    ];

    // Check if it's explicitly a write operation
    if (writePatterns.some(pattern => pattern.test(methodName))) {
      return false;
    }

    // Check if it's explicitly a read operation
    if (readPatterns.some(pattern => pattern.test(methodName))) {
      return true;
    }

    // Default to not caching if uncertain
    return false;
  }

  /**
   * Generate cache key for method call
   * @param {string} methodName - Method name
   * @param {Array} args - Method arguments
   * @returns {string} Cache key
   */
  generateCacheKey(methodName, args) {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(methodName, args);
    }

    const serviceName = this.service.getServiceName ? this.service.getServiceName() : 'Unknown';
    const argsKey = this.serializeArgs(args);
    return `${serviceName}:${methodName}:${argsKey}`;
  }

  /**
   * Serialize arguments for cache key
   * @param {Array} args - Method arguments
   * @returns {string} Serialized arguments
   */
  serializeArgs(args) {
    try {
      // Remove functions and undefined values
      const cleanArgs = args.map(arg => {
        if (typeof arg === 'function' || arg === undefined) {
          return null;
        }
        return arg;
      });

      return this.options.serializer(cleanArgs);
    } catch (error) {
      // Fallback to simple string representation
      return args.map(arg => String(arg)).join('|');
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();
    return entry;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string} methodName - Method name for TTL lookup
   */
  setCache(key, value, methodName) {
    try {
      // Check cache size limit
      if (this.cache.size >= this.options.maxCacheSize) {
        this.evictLeastRecentlyUsed();
      }

      const ttl = this.getMethodTtl(methodName);
      const serializedValue = this.serializeResult(value);

      const entry = {
        value: serializedValue,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + ttl,
        methodName
      };

      this.cache.set(key, entry);
      this.cacheStats.sets++;

    } catch (error) {
      // Silently fail cache sets to not break the application
      console.warn('Cache set failed:', error.message);
    }
  }

  /**
   * Get TTL for specific method
   * @param {string} methodName - Method name
   * @returns {number} TTL in milliseconds
   */
  getMethodTtl(methodName) {
    return this.methodTtls.get(methodName) || this.options.defaultTtl;
  }

  /**
   * Set TTL for specific method
   * @param {string} methodName - Method name
   * @param {number} ttl - TTL in milliseconds
   */
  setMethodTtl(methodName, ttl) {
    this.methodTtls.set(methodName, ttl);
  }

  /**
   * Serialize result for caching
   * @param {any} result - Result to serialize
   * @returns {string} Serialized result
   */
  serializeResult(result) {
    try {
      return this.options.serializer(result);
    } catch (error) {
      throw new Error(`Failed to serialize cache result: ${error.message}`);
    }
  }

  /**
   * Deserialize cached result
   * @param {string} serializedResult - Serialized result
   * @returns {any} Deserialized result
   */
  deserializeResult(serializedResult) {
    try {
      return this.options.deserializer(serializedResult);
    } catch (error) {
      throw new Error(`Failed to deserialize cache result: ${error.message}`);
    }
  }

  /**
   * Evict least recently used cache entry
   */
  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Invalidate cache entries related to a write operation
   * @param {string} methodName - Write method name
   */
  invalidateRelatedCache(methodName) {
    const serviceName = this.service.getServiceName ? this.service.getServiceName() : 'Unknown';
    const keysToDelete = [];

    // Invalidate all cache entries for this service
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${serviceName}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheStats.deletes++;
    });
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheStats.deletes += size;
  }

  /**
   * Clear cache entries for specific method
   * @param {string} methodName - Method name
   */
  clearMethodCache(methodName) {
    const serviceName = this.service.getServiceName ? this.service.getServiceName() : 'Unknown';
    const prefix = `${serviceName}:${methodName}:`;
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheStats.deletes++;
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const baseStats = super.getStats();
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0;

    return {
      ...baseStats,
      cache: {
        ...this.cacheStats,
        hitRate: Math.round(hitRate * 100) / 100,
        currentSize: this.cache.size,
        maxSize: this.options.maxCacheSize,
        memoryUsage: this.estimateMemoryUsage()
      }
    };
  }

  /**
   * Estimate memory usage of cache
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // Approximate string size
      totalSize += entry.value.length * 2; // Approximate serialized value size
      totalSize += 100; // Approximate overhead for entry object
    }

    return totalSize;
  }

  /**
   * Get cache entries for debugging
   * @returns {Array} Cache entries
   */
  getCacheEntries() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      methodName: entry.methodName,
      createdAt: new Date(entry.createdAt).toISOString(),
      lastAccessed: new Date(entry.lastAccessed).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      isExpired: Date.now() > entry.expiresAt,
      valueSize: entry.value.length
    }));
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheStats.deletes++;
    });

    return keysToDelete.length;
  }
}

module.exports = CachingDecorator;
