/**
 * Event Bus Implementation
 * Provides publish-subscribe messaging between modules
 */

class EventBus {
  constructor(logger) {
    this.logger = logger;
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.maxListeners = 100;
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    this.validateEvent(event);
    this.validateHandler(handler);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event);
    
    // Check max listeners limit
    if (eventListeners.size >= this.maxListeners) {
      this.logger.warn(`Maximum listeners (${this.maxListeners}) reached for event: ${event}`);
    }

    eventListeners.add(handler);
    
    this.logger.debug(`Event listener added for: ${event}`);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (one-time)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    this.validateEvent(event);
    this.validateHandler(handler);

    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    this.onceListeners.get(event).add(handler);
    
    this.logger.debug(`One-time event listener added for: ${event}`);

    // Return unsubscribe function
    return () => {
      const onceHandlers = this.onceListeners.get(event);
      if (onceHandlers) {
        onceHandlers.delete(handler);
      }
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {boolean} Success status
   */
  off(event, handler) {
    this.validateEvent(event);
    this.validateHandler(handler);

    let removed = false;

    // Remove from regular listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      removed = eventListeners.delete(handler);
      
      // Clean up empty listener sets
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }

    // Remove from once listeners
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      const onceRemoved = onceHandlers.delete(handler);
      removed = removed || onceRemoved;
      
      // Clean up empty listener sets
      if (onceHandlers.size === 0) {
        this.onceListeners.delete(event);
      }
    }

    if (removed) {
      this.logger.debug(`Event listener removed for: ${event}`);
    }

    return removed;
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {boolean} True if event had listeners
   */
  emit(event, data) {
    this.validateEvent(event);

    const timestamp = new Date().toISOString();
    let listenerCount = 0;

    // Add to event history
    this.addToHistory(event, data, timestamp);

    try {
      // Execute regular listeners
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        for (const handler of eventListeners) {
          try {
            handler(data, { event, timestamp });
            listenerCount++;
          } catch (error) {
            this.logger.error(`Event handler error for ${event}:`, error);
          }
        }
      }

      // Execute once listeners
      const onceHandlers = this.onceListeners.get(event);
      if (onceHandlers) {
        const handlersToExecute = Array.from(onceHandlers);
        onceHandlers.clear(); // Clear before execution to prevent re-execution
        
        for (const handler of handlersToExecute) {
          try {
            handler(data, { event, timestamp });
            listenerCount++;
          } catch (error) {
            this.logger.error(`One-time event handler error for ${event}:`, error);
          }
        }

        // Clean up empty once listener sets
        if (onceHandlers.size === 0) {
          this.onceListeners.delete(event);
        }
      }

      if (listenerCount > 0) {
        this.logger.debug(`Event emitted: ${event} (${listenerCount} listeners)`);
      }

      return listenerCount > 0;

    } catch (error) {
      this.logger.error(`Error emitting event ${event}:`, error);
      return false;
    }
  }

  /**
   * Get list of registered events
   * @returns {Array<string>} Event names
   */
  getEvents() {
    const regularEvents = Array.from(this.listeners.keys());
    const onceEvents = Array.from(this.onceListeners.keys());
    
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const regularCount = this.listeners.get(event)?.size || 0;
    const onceCount = this.onceListeners.get(event)?.size || 0;
    
    return regularCount + onceCount;
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   * @returns {boolean} Success status
   */
  removeAllListeners(event) {
    if (event) {
      this.validateEvent(event);
      
      const hadListeners = this.listeners.has(event) || this.onceListeners.has(event);
      this.listeners.delete(event);
      this.onceListeners.delete(event);
      
      if (hadListeners) {
        this.logger.debug(`All listeners removed for event: ${event}`);
      }
      
      return hadListeners;
    } else {
      // Remove all listeners for all events
      const hadListeners = this.listeners.size > 0 || this.onceListeners.size > 0;
      this.listeners.clear();
      this.onceListeners.clear();
      
      if (hadListeners) {
        this.logger.debug('All event listeners removed');
      }
      
      return hadListeners;
    }
  }

  /**
   * Get event statistics
   * @returns {Object} Event bus statistics
   */
  getStats() {
    const events = this.getEvents();
    const totalListeners = events.reduce((sum, event) => sum + this.listenerCount(event), 0);
    
    return {
      totalEvents: events.length,
      totalListeners,
      eventHistory: this.eventHistory.length,
      events: events.map(event => ({
        name: event,
        listeners: this.listenerCount(event)
      }))
    };
  }

  /**
   * Get recent event history
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Recent events
   */
  getHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    this.logger.debug('Event history cleared');
  }

  /**
   * Set maximum number of listeners per event
   * @param {number} max - Maximum listeners
   */
  setMaxListeners(max) {
    if (typeof max !== 'number' || max < 1) {
      throw new Error('Max listeners must be a positive number');
    }
    this.maxListeners = max;
  }

  /**
   * Validate event name
   * @param {string} event - Event name
   */
  validateEvent(event) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
  }

  /**
   * Validate event handler
   * @param {Function} handler - Event handler
   */
  validateHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }
  }

  /**
   * Add event to history
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @param {string} timestamp - Event timestamp
   */
  addToHistory(event, data, timestamp) {
    this.eventHistory.push({
      event,
      data,
      timestamp
    });

    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Dispose of the event bus
   */
  dispose() {
    this.removeAllListeners();
    this.clearHistory();
    this.logger.debug('Event bus disposed');
  }
}

module.exports = EventBus;
