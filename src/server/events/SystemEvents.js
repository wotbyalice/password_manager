/**
 * System Events Contract
 * Defines all events related to system operations, categories, and real-time updates
 */

const SystemEvents = {
  // Category Events
  CATEGORY_CREATED: 'system.category.created',
  CATEGORY_UPDATED: 'system.category.updated',
  CATEGORY_DELETED: 'system.category.deleted',
  
  // Real-time Events
  CLIENT_CONNECTED: 'system.realtime.client.connected',
  CLIENT_DISCONNECTED: 'system.realtime.client.disconnected',
  BROADCAST_SENT: 'system.realtime.broadcast.sent',
  
  // Database Events
  DATABASE_CONNECTED: 'system.database.connected',
  DATABASE_DISCONNECTED: 'system.database.disconnected',
  DATABASE_ERROR: 'system.database.error',
  MIGRATION_STARTED: 'system.database.migration.started',
  MIGRATION_COMPLETED: 'system.database.migration.completed',
  
  // Application Events
  APPLICATION_STARTED: 'system.application.started',
  APPLICATION_STOPPED: 'system.application.stopped',
  APPLICATION_ERROR: 'system.application.error',
  
  // Performance Events
  PERFORMANCE_METRIC: 'system.performance.metric',
  SLOW_QUERY: 'system.performance.slow_query',
  HIGH_MEMORY_USAGE: 'system.performance.high_memory',
  
  // Security Events
  RATE_LIMIT_EXCEEDED: 'system.security.rate_limit_exceeded',
  INVALID_REQUEST: 'system.security.invalid_request',
  CORS_VIOLATION: 'system.security.cors_violation',
  
  // Backup and Maintenance Events
  BACKUP_STARTED: 'system.backup.started',
  BACKUP_COMPLETED: 'system.backup.completed',
  BACKUP_FAILED: 'system.backup.failed',
  MAINTENANCE_STARTED: 'system.maintenance.started',
  MAINTENANCE_COMPLETED: 'system.maintenance.completed',
  
  // Configuration Events
  CONFIG_LOADED: 'system.config.loaded',
  CONFIG_CHANGED: 'system.config.changed',
  CONFIG_ERROR: 'system.config.error'
};

/**
 * System Event Data Schemas
 */
const SystemEventSchemas = {
  [SystemEvents.CATEGORY_CREATED]: {
    category: {
      id: 'number',
      name: 'string',
      description: 'string|null',
      color: 'string|null',
      createdBy: 'number',
      createdAt: 'string'
    },
    userId: 'number',
    metadata: {
      source: 'string',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [SystemEvents.CATEGORY_UPDATED]: {
    category: {
      id: 'number',
      name: 'string',
      description: 'string|null',
      color: 'string|null',
      updatedBy: 'number',
      updatedAt: 'string'
    },
    previousData: {
      name: 'string',
      description: 'string|null',
      color: 'string|null'
    },
    userId: 'number',
    metadata: {
      source: 'string',
      changedFields: 'array',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [SystemEvents.CATEGORY_DELETED]: {
    categoryId: 'number',
    categoryData: {
      name: 'string',
      description: 'string|null',
      passwordCount: 'number'
    },
    userId: 'number',
    metadata: {
      source: 'string',
      reason: 'string|null',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [SystemEvents.CLIENT_CONNECTED]: {
    clientId: 'string',
    userId: 'number|null',
    connectionInfo: {
      userAgent: 'string|null',
      ipAddress: 'string|null',
      timestamp: 'string'
    },
    metadata: {
      source: 'string',
      connectionType: 'string' // 'websocket', 'sse'
    }
  },
  
  [SystemEvents.CLIENT_DISCONNECTED]: {
    clientId: 'string',
    userId: 'number|null',
    disconnectionInfo: {
      reason: 'string',
      duration: 'number',
      timestamp: 'string'
    },
    metadata: {
      source: 'string',
      connectionType: 'string'
    }
  },
  
  [SystemEvents.BROADCAST_SENT]: {
    eventType: 'string',
    recipientCount: 'number',
    data: 'object',
    metadata: {
      source: 'string',
      broadcastId: 'string',
      timestamp: 'string',
      duration: 'number'
    }
  },
  
  [SystemEvents.DATABASE_ERROR]: {
    error: {
      message: 'string',
      code: 'string|null',
      query: 'string|null'
    },
    metadata: {
      source: 'string',
      severity: 'string', // 'low', 'medium', 'high', 'critical'
      timestamp: 'string',
      context: 'object|null'
    }
  },
  
  [SystemEvents.PERFORMANCE_METRIC]: {
    metric: {
      name: 'string',
      value: 'number',
      unit: 'string',
      threshold: 'number|null'
    },
    metadata: {
      source: 'string',
      timestamp: 'string',
      tags: 'object|null'
    }
  },
  
  [SystemEvents.RATE_LIMIT_EXCEEDED]: {
    clientInfo: {
      ipAddress: 'string',
      userAgent: 'string|null',
      userId: 'number|null'
    },
    limitInfo: {
      limit: 'number',
      window: 'number',
      current: 'number'
    },
    metadata: {
      source: 'string',
      endpoint: 'string|null',
      timestamp: 'string'
    }
  }
};

/**
 * Validate system event data
 * @param {string} eventName - Event name
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result
 */
function validateSystemEvent(eventName, eventData) {
  const schema = SystemEventSchemas[eventName];
  
  if (!schema) {
    return {
      isValid: false,
      errors: [`Unknown system event: ${eventName}`]
    };
  }
  
  const errors = [];
  
  // Basic validation - check required fields exist
  function validateObject(obj, schemaObj, path = '') {
    for (const [key, type] of Object.entries(schemaObj)) {
      const fullPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      
      if (type.includes('|null') && (value === null || value === undefined)) {
        continue; // Nullable field
      }
      
      if (value === undefined) {
        errors.push(`Missing required field: ${fullPath}`);
        continue;
      }
      
      const expectedType = type.replace('|null', '');
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`Field ${fullPath} must be a string, got ${actualType}`);
      } else if (expectedType === 'number' && actualType !== 'number') {
        errors.push(`Field ${fullPath} must be a number, got ${actualType}`);
      } else if (expectedType === 'object' && actualType !== 'object') {
        errors.push(`Field ${fullPath} must be an object, got ${actualType}`);
      } else if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Field ${fullPath} must be an array, got ${actualType}`);
      } else if (typeof schemaObj[key] === 'object' && !Array.isArray(schemaObj[key])) {
        validateObject(value, schemaObj[key], fullPath);
      }
    }
  }
  
  validateObject(eventData, schema);
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create system event data
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted event data
 */
function createSystemEvent(eventName, data, metadata = {}) {
  const timestamp = new Date().toISOString();
  
  const eventData = {
    ...data,
    metadata: {
      timestamp,
      eventId: generateEventId(),
      ...metadata
    }
  };
  
  const validation = validateSystemEvent(eventName, eventData);
  
  if (!validation.isValid) {
    throw new Error(`Invalid system event data: ${validation.errors.join(', ')}`);
  }
  
  return eventData;
}

/**
 * Generate unique event ID
 * @returns {string} Unique event ID
 */
function generateEventId() {
  return `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  SystemEvents,
  SystemEventSchemas,
  validateSystemEvent,
  createSystemEvent,
  generateEventId
};
