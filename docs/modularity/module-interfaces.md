# Module Interface Documentation
**Generated**: 2025-07-09  
**Purpose**: Define contracts for all service modules

## 🎯 Interface Design Principles

1. **Single Responsibility**: Each interface serves one domain
2. **Dependency Inversion**: Depend on abstractions, not concretions
3. **Interface Segregation**: Small, focused interfaces
4. **Liskov Substitution**: Implementations are interchangeable

## 📋 Core Service Interfaces

### **1. IAuthenticationService**

```javascript
/**
 * Authentication service interface
 * Handles user authentication, authorization, and token management
 */
interface IAuthenticationService {
  /**
   * Create a new user account
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email address
   * @param {string} userData.password - Plain text password
   * @param {string} userData.firstName - User first name
   * @param {string} userData.lastName - User last name
   * @param {string} userData.role - User role (user|admin)
   * @returns {Promise<Object>} Created user object (without password)
   * @throws {Error} Validation or creation errors
   */
  async createUser(userData);

  /**
   * Find user by email address
   * @param {string} email - User email address
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserByEmail(email);

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserById(userId);

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Stored password hash
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPasswordHash(password, hash);

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user);

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token);

  /**
   * Update user's last login timestamp
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async updateLastLogin(userId);

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If current password is incorrect or new password is invalid
   */
  async changePassword(userId, currentPassword, newPassword);
}
```

### **2. IPasswordService**

```javascript
/**
 * Password management service interface
 * Handles CRUD operations for password entries
 */
interface IPasswordService {
  /**
   * Create a new password entry
   * @param {Object} passwordData - Password entry data
   * @param {string} passwordData.title - Entry title
   * @param {string} passwordData.username - Username/login
   * @param {string} passwordData.password - Password (will be encrypted)
   * @param {string} [passwordData.url] - Website URL
   * @param {string} [passwordData.notes] - Additional notes
   * @param {string} [passwordData.category] - Category name
   * @param {number} userId - ID of user creating the entry
   * @returns {Promise<Object>} Created password entry (with encrypted fields)
   * @throws {Error} Validation or creation errors
   */
  async createPasswordEntry(passwordData, userId);

  /**
   * Get all password entries for a user
   * @param {number} userId - User ID
   * @param {Object} [pagination] - Pagination options
   * @param {number} [pagination.page] - Page number (1-based)
   * @param {number} [pagination.limit] - Items per page
   * @returns {Promise<Array>} Array of password entries (decrypted for authorized user)
   */
  async getPasswordEntries(userId, pagination);

  /**
   * Get specific password entry by ID
   * @param {number} passwordId - Password entry ID
   * @param {number} userId - Requesting user ID
   * @returns {Promise<Object|null>} Password entry (decrypted) or null if not found/unauthorized
   */
  async getPasswordById(passwordId, userId);

  /**
   * Update password entry
   * @param {number} passwordId - Password entry ID
   * @param {Object} updateData - Fields to update
   * @param {number} userId - Requesting user ID
   * @returns {Promise<Object>} Updated password entry
   * @throws {Error} If unauthorized or validation fails
   */
  async updatePasswordEntry(passwordId, updateData, userId);

  /**
   * Delete password entry
   * @param {number} passwordId - Password entry ID
   * @param {number} userId - Requesting user ID
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If unauthorized or entry not found
   */
  async deletePasswordEntry(passwordId, userId);

  /**
   * Search password entries
   * @param {string} query - Search query
   * @param {number} userId - Requesting user ID
   * @param {Object} [options] - Search options
   * @returns {Promise<Array>} Matching password entries
   */
  async searchPasswords(query, userId, options);
}
```

### **3. IDatabaseService**

```javascript
/**
 * Database service interface
 * Provides database operations abstraction
 */
interface IDatabaseService {
  /**
   * Execute a database query
   * @param {string} sql - SQL query string
   * @param {Array} [params] - Query parameters
   * @returns {Promise<Object>} Query result with rows and metadata
   * @throws {Error} Database or query errors
   */
  async query(sql, params);

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Transaction callback function
   * @returns {Promise<any>} Transaction result
   * @throws {Error} Transaction or query errors
   */
  async transaction(callback);

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection();

  /**
   * Get database health information
   * @returns {Promise<Object>} Health status and metrics
   */
  async getHealth();

  /**
   * Close database connections
   * @returns {Promise<void>}
   */
  async close();
}
```

### **4. IEncryptionService**

```javascript
/**
 * Encryption service interface
 * Handles data encryption and decryption
 */
interface IEncryptionService {
  /**
   * Encrypt password data
   * @param {string} password - Plain text password
   * @returns {string} Encrypted password (base64 encoded)
   * @throws {Error} Encryption errors
   */
  encryptPassword(password);

  /**
   * Decrypt password data
   * @param {string} encryptedPassword - Encrypted password
   * @returns {string} Plain text password
   * @throws {Error} Decryption errors
   */
  decryptPassword(encryptedPassword);

  /**
   * Encrypt general data (notes, URLs, etc.)
   * @param {string} data - Plain text data
   * @returns {string} Encrypted data (base64 encoded)
   * @throws {Error} Encryption errors
   */
  encryptData(data);

  /**
   * Decrypt general data
   * @param {string} encryptedData - Encrypted data
   * @returns {string} Plain text data
   * @throws {Error} Decryption errors
   */
  decryptData(encryptedData);

  /**
   * Generate secure random key
   * @param {number} length - Key length in bytes
   * @returns {string} Random key (hex encoded)
   */
  generateKey(length);
}
```

### **5. IEventBus**

```javascript
/**
 * Event bus interface
 * Provides publish-subscribe messaging between modules
 */
interface IEventBus {
  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler);

  /**
   * Subscribe to an event (one-time)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler);

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {boolean} Success status
   */
  off(event, handler);

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {boolean} True if event had listeners
   */
  emit(event, data);

  /**
   * Get list of registered events
   * @returns {Array<string>} Event names
   */
  getEvents();

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event);
}
```

### **6. IValidationService**

```javascript
/**
 * Validation service interface
 * Provides data validation and sanitization
 */
interface IValidationService {
  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  validateEmail(email);

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {boolean} True if meets requirements
   */
  validatePassword(password);

  /**
   * Validate user name
   * @param {string} name - Name to validate
   * @returns {boolean} True if valid
   */
  validateName(name);

  /**
   * Validate password entry data
   * @param {Object} passwordData - Password entry to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validatePasswordEntry(passwordData);

  /**
   * Sanitize string input
   * @param {string} input - String to sanitize
   * @param {Object} [options] - Sanitization options
   * @returns {string} Sanitized string
   */
  sanitizeString(input, options);

  /**
   * Validate pagination parameters
   * @param {Object} pagination - Pagination object
   * @returns {Object} Validated pagination with defaults
   */
  validatePagination(pagination);
}
```

### **7. ILoggingService**

```javascript
/**
 * Logging service interface
 * Provides structured logging capabilities
 */
interface ILoggingService {
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  info(message, meta);

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  warn(message, meta);

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  error(message, meta);

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  debug(message, meta);

  /**
   * Log audit event
   * @param {string} action - Action performed
   * @param {number} userId - User ID
   * @param {Object} details - Event details
   */
  auditLog(action, userId, details);

  /**
   * Log authentication event
   * @param {string} action - Auth action
   * @param {string} email - User email
   * @param {boolean} success - Success status
   * @param {Object} details - Event details
   */
  authLog(action, email, success, details);

  /**
   * Log password operation
   * @param {string} action - Password action
   * @param {number} userId - User ID
   * @param {number} passwordId - Password ID
   * @param {Object} details - Event details
   */
  passwordLog(action, userId, passwordId, details);
}
```

## 🔧 Implementation Guidelines

### **Interface Implementation Rules**

1. **All methods must be implemented** - No optional methods
2. **Error handling is mandatory** - All async methods must handle errors
3. **Input validation required** - Validate all parameters
4. **Return types must match** - Consistent return structures
5. **Documentation required** - JSDoc for all implementations

### **Dependency Injection Pattern**

```javascript
// Service constructor pattern
class ConcreteService implements IServiceInterface {
  constructor(dependencies) {
    this.database = dependencies.database;
    this.logger = dependencies.logger;
    this.validation = dependencies.validation;
  }

  async serviceMethod(params) {
    // Implementation using injected dependencies
  }
}
```

### **Error Handling Contract**

```javascript
// All services must throw Error objects with descriptive messages
throw new Error('Descriptive error message with context');

// Async methods must reject with Error objects
return Promise.reject(new Error('Async operation failed'));
```

### **Testing Contract**

```javascript
// All interfaces must be testable with mock implementations
class MockService implements IServiceInterface {
  // Implement all interface methods for testing
}
```

This interface documentation ensures consistent, testable, and maintainable service implementations across the entire application.
