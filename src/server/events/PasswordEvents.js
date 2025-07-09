/**
 * Password Events Contract
 * Defines all events related to password operations
 */

const PasswordEvents = {
  // Password CRUD Events
  CREATED: 'password.created',
  UPDATED: 'password.updated',
  DELETED: 'password.deleted',
  VIEWED: 'password.viewed',
  
  // Password Search Events
  SEARCHED: 'password.searched',
  
  // Password Security Events
  DECRYPTED: 'password.decrypted',
  ENCRYPTION_FAILED: 'password.encryption.failed',
  DECRYPTION_FAILED: 'password.decryption.failed',
  
  // Password Sharing Events
  SHARED: 'password.shared',
  SHARE_REVOKED: 'password.share.revoked',
  
  // Password Import/Export Events
  IMPORTED: 'password.imported',
  EXPORTED: 'password.exported',
  BULK_CREATED: 'password.bulk.created',
  BULK_UPDATED: 'password.bulk.updated',
  BULK_DELETED: 'password.bulk.deleted',
  
  // Password Validation Events
  VALIDATION_FAILED: 'password.validation.failed',
  DUPLICATE_DETECTED: 'password.duplicate.detected',
  
  // Password Category Events
  CATEGORY_ASSIGNED: 'password.category.assigned',
  CATEGORY_REMOVED: 'password.category.removed'
};

/**
 * Password Event Data Schemas
 * Defines the expected data structure for each event
 */
const PasswordEventSchemas = {
  [PasswordEvents.CREATED]: {
    password: {
      id: 'number',
      title: 'string',
      username: 'string',
      category: 'string|null',
      url: 'string|null',
      createdBy: 'number',
      createdAt: 'string'
    },
    userId: 'number',
    metadata: {
      source: 'string', // 'web', 'api', 'import', etc.
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [PasswordEvents.UPDATED]: {
    password: {
      id: 'number',
      title: 'string',
      username: 'string',
      category: 'string|null',
      url: 'string|null',
      updatedBy: 'number',
      updatedAt: 'string'
    },
    previousData: {
      title: 'string',
      username: 'string',
      category: 'string|null'
    },
    userId: 'number',
    metadata: {
      source: 'string',
      changedFields: 'array',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [PasswordEvents.DELETED]: {
    passwordId: 'number',
    passwordData: {
      title: 'string',
      username: 'string',
      category: 'string|null'
    },
    userId: 'number',
    metadata: {
      source: 'string',
      reason: 'string|null',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [PasswordEvents.VIEWED]: {
    passwordId: 'number',
    passwordTitle: 'string',
    userId: 'number',
    metadata: {
      source: 'string',
      viewType: 'string', // 'list', 'detail', 'search'
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [PasswordEvents.SEARCHED]: {
    query: 'string',
    resultsCount: 'number',
    userId: 'number',
    metadata: {
      source: 'string',
      searchType: 'string', // 'title', 'username', 'category', 'all'
      duration: 'number',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  }
};

/**
 * Validate password event data
 * @param {string} eventName - Event name
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result
 */
function validatePasswordEvent(eventName, eventData) {
  const schema = PasswordEventSchemas[eventName];
  
  if (!schema) {
    return {
      isValid: false,
      errors: [`Unknown password event: ${eventName}`]
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
 * Create password event data
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted event data
 */
function createPasswordEvent(eventName, data, metadata = {}) {
  const timestamp = new Date().toISOString();
  
  const eventData = {
    ...data,
    metadata: {
      timestamp,
      eventId: generateEventId(),
      ...metadata
    }
  };
  
  const validation = validatePasswordEvent(eventName, eventData);
  
  if (!validation.isValid) {
    throw new Error(`Invalid password event data: ${validation.errors.join(', ')}`);
  }
  
  return eventData;
}

/**
 * Generate unique event ID
 * @returns {string} Unique event ID
 */
function generateEventId() {
  return `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  PasswordEvents,
  PasswordEventSchemas,
  validatePasswordEvent,
  createPasswordEvent,
  generateEventId
};
