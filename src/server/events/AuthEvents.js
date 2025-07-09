/**
 * Authentication Events Contract
 * Defines all events related to user authentication and authorization
 */

const AuthEvents = {
  // User Registration Events
  USER_REGISTERED: 'auth.user.registered',
  REGISTRATION_FAILED: 'auth.registration.failed',
  
  // User Login Events
  USER_LOGIN: 'auth.user.login',
  LOGIN_FAILED: 'auth.login.failed',
  LOGIN_ATTEMPT: 'auth.login.attempt',
  
  // User Logout Events
  USER_LOGOUT: 'auth.user.logout',
  SESSION_EXPIRED: 'auth.session.expired',
  
  // Password Events
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset.completed',
  PASSWORD_RESET_FAILED: 'auth.password.reset.failed',
  
  // Token Events
  TOKEN_GENERATED: 'auth.token.generated',
  TOKEN_VERIFIED: 'auth.token.verified',
  TOKEN_EXPIRED: 'auth.token.expired',
  TOKEN_INVALID: 'auth.token.invalid',
  
  // Account Management Events
  ACCOUNT_ACTIVATED: 'auth.account.activated',
  ACCOUNT_DEACTIVATED: 'auth.account.deactivated',
  ACCOUNT_LOCKED: 'auth.account.locked',
  ACCOUNT_UNLOCKED: 'auth.account.unlocked',
  
  // Role and Permission Events
  ROLE_CHANGED: 'auth.role.changed',
  PERMISSION_GRANTED: 'auth.permission.granted',
  PERMISSION_DENIED: 'auth.permission.denied',
  
  // Security Events
  SUSPICIOUS_ACTIVITY: 'auth.security.suspicious',
  BRUTE_FORCE_DETECTED: 'auth.security.brute_force',
  MULTIPLE_SESSIONS: 'auth.security.multiple_sessions',
  
  // Profile Events
  PROFILE_UPDATED: 'auth.profile.updated',
  EMAIL_CHANGED: 'auth.email.changed',
  EMAIL_VERIFIED: 'auth.email.verified'
};

/**
 * Authentication Event Data Schemas
 */
const AuthEventSchemas = {
  [AuthEvents.USER_REGISTERED]: {
    user: {
      id: 'number',
      email: 'string',
      firstName: 'string',
      lastName: 'string',
      role: 'string',
      createdAt: 'string'
    },
    metadata: {
      source: 'string',
      registrationMethod: 'string', // 'admin', 'self', 'import'
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [AuthEvents.USER_LOGIN]: {
    user: {
      id: 'number',
      email: 'string',
      role: 'string',
      lastLogin: 'string'
    },
    session: {
      sessionId: 'string',
      tokenId: 'string',
      expiresAt: 'string'
    },
    metadata: {
      source: 'string',
      loginMethod: 'string', // 'password', 'token'
      userAgent: 'string|null',
      ipAddress: 'string|null',
      duration: 'number'
    }
  },
  
  [AuthEvents.LOGIN_FAILED]: {
    email: 'string',
    reason: 'string', // 'invalid_credentials', 'account_locked', 'account_inactive'
    attemptCount: 'number',
    metadata: {
      source: 'string',
      userAgent: 'string|null',
      ipAddress: 'string|null',
      timestamp: 'string'
    }
  },
  
  [AuthEvents.USER_LOGOUT]: {
    userId: 'number',
    sessionId: 'string',
    metadata: {
      source: 'string',
      logoutType: 'string', // 'manual', 'timeout', 'forced'
      sessionDuration: 'number',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [AuthEvents.PASSWORD_CHANGED]: {
    userId: 'number',
    changedBy: 'number', // Who changed it (could be admin)
    metadata: {
      source: 'string',
      changeType: 'string', // 'self', 'admin', 'reset'
      passwordStrength: 'string', // 'weak', 'medium', 'strong'
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [AuthEvents.ROLE_CHANGED]: {
    userId: 'number',
    previousRole: 'string',
    newRole: 'string',
    changedBy: 'number',
    metadata: {
      source: 'string',
      reason: 'string|null',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [AuthEvents.PERMISSION_DENIED]: {
    userId: 'number',
    resource: 'string',
    action: 'string',
    requiredRole: 'string',
    userRole: 'string',
    metadata: {
      source: 'string',
      endpoint: 'string|null',
      userAgent: 'string|null',
      ipAddress: 'string|null'
    }
  },
  
  [AuthEvents.SUSPICIOUS_ACTIVITY]: {
    userId: 'number|null',
    activityType: 'string',
    severity: 'string', // 'low', 'medium', 'high', 'critical'
    details: 'object',
    metadata: {
      source: 'string',
      detectionMethod: 'string',
      userAgent: 'string|null',
      ipAddress: 'string|null',
      timestamp: 'string'
    }
  }
};

/**
 * Validate authentication event data
 * @param {string} eventName - Event name
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result
 */
function validateAuthEvent(eventName, eventData) {
  const schema = AuthEventSchemas[eventName];
  
  if (!schema) {
    return {
      isValid: false,
      errors: [`Unknown authentication event: ${eventName}`]
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
 * Create authentication event data
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted event data
 */
function createAuthEvent(eventName, data, metadata = {}) {
  const timestamp = new Date().toISOString();
  
  const eventData = {
    ...data,
    metadata: {
      timestamp,
      eventId: generateEventId(),
      ...metadata
    }
  };
  
  const validation = validateAuthEvent(eventName, eventData);
  
  if (!validation.isValid) {
    throw new Error(`Invalid authentication event data: ${validation.errors.join(', ')}`);
  }
  
  return eventData;
}

/**
 * Generate unique event ID
 * @returns {string} Unique event ID
 */
function generateEventId() {
  return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  AuthEvents,
  AuthEventSchemas,
  validateAuthEvent,
  createAuthEvent,
  generateEventId
};
