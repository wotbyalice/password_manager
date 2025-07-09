/**
 * Authentication Service Interface
 * Defines the contract for user authentication and authorization operations
 */

const IBaseService = require('./IBaseService');

class IAuthService extends IBaseService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.firstName - User first name
   * @param {string} userData.lastName - User last name
   * @param {string} userData.role - User role
   * @returns {Promise<Object>} Created user (without password)
   */
  async createUser(userData) {
    throw new Error('createUser() must be implemented');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserByEmail(email) {
    throw new Error('findUserByEmail() must be implemented');
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserById(userId) {
    throw new Error('findUserById() must be implemented');
  }

  /**
   * Verify user password
   * @param {string} email - User email
   * @param {string} password - Password to verify
   * @returns {Promise<Object|null>} User object if password is correct, null otherwise
   */
  async verifyPassword(email, password) {
    throw new Error('verifyPassword() must be implemented');
  }

  /**
   * Verify password hash
   * @param {string} password - Plain text password
   * @param {string} hash - Password hash
   * @returns {Promise<boolean>} True if password matches hash
   */
  async verifyPasswordHash(password, hash) {
    throw new Error('verifyPasswordHash() must be implemented');
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @param {number} changedBy - ID of user making the change
   * @returns {Promise<boolean>} True if password changed successfully
   */
  async changePassword(userId, newPassword, changedBy) {
    throw new Error('changePassword() must be implemented');
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    throw new Error('generateToken() must be implemented');
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    throw new Error('verifyToken() must be implemented');
  }

  /**
   * Refresh JWT token
   * @param {string} token - Current JWT token
   * @returns {Promise<string|null>} New JWT token or null if refresh failed
   */
  async refreshToken(token) {
    throw new Error('refreshToken() must be implemented');
  }

  /**
   * Invalidate JWT token (logout)
   * @param {string} token - JWT token to invalidate
   * @returns {Promise<boolean>} True if token invalidated successfully
   */
  async invalidateToken(token) {
    throw new Error('invalidateToken() must be implemented');
  }

  /**
   * Get all users with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.role - Role filter
   * @returns {Promise<Object>} Paginated users
   */
  async getUsers(options) {
    throw new Error('getUsers() must be implemented');
  }

  /**
   * Update user information
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {number} updatedBy - ID of user making the update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updateData, updatedBy) {
    throw new Error('updateUser() must be implemented');
  }

  /**
   * Delete user
   * @param {number} userId - User ID
   * @param {number} deletedBy - ID of user performing the deletion
   * @returns {Promise<boolean>} True if user deleted successfully
   */
  async deleteUser(userId, deletedBy) {
    throw new Error('deleteUser() must be implemented');
  }

  /**
   * Activate user account
   * @param {number} userId - User ID
   * @param {number} activatedBy - ID of user performing the activation
   * @returns {Promise<boolean>} True if user activated successfully
   */
  async activateUser(userId, activatedBy) {
    throw new Error('activateUser() must be implemented');
  }

  /**
   * Deactivate user account
   * @param {number} userId - User ID
   * @param {number} deactivatedBy - ID of user performing the deactivation
   * @returns {Promise<boolean>} True if user deactivated successfully
   */
  async deactivateUser(userId, deactivatedBy) {
    throw new Error('deactivateUser() must be implemented');
  }

  /**
   * Change user role
   * @param {number} userId - User ID
   * @param {string} newRole - New role
   * @param {number} changedBy - ID of user making the change
   * @returns {Promise<Object>} Updated user
   */
  async changeUserRole(userId, newRole, changedBy) {
    throw new Error('changeUserRole() must be implemented');
  }

  /**
   * Check if user has permission for action
   * @param {number} userId - User ID
   * @param {string} action - Action to check
   * @param {string} resource - Resource being accessed
   * @returns {Promise<boolean>} True if user has permission
   */
  async hasPermission(userId, action, resource) {
    throw new Error('hasPermission() must be implemented');
  }

  /**
   * Get user permissions
   * @param {number} userId - User ID
   * @returns {Promise<Array<string>>} Array of user permissions
   */
  async getUserPermissions(userId) {
    throw new Error('getUserPermissions() must be implemented');
  }

  /**
   * Validate user data
   * @param {Object} userData - User data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateUserData(userData, isUpdate = false) {
    throw new Error('validateUserData() must be implemented');
  }

  /**
   * Get authentication statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Authentication statistics
   */
  async getAuthStatistics(options = {}) {
    throw new Error('getAuthStatistics() must be implemented');
  }

  /**
   * Get user login history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User login history
   */
  async getUserLoginHistory(userId, options = {}) {
    throw new Error('getUserLoginHistory() must be implemented');
  }

  /**
   * Record login attempt
   * @param {string} email - User email
   * @param {boolean} success - Whether login was successful
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async recordLoginAttempt(email, success, metadata = {}) {
    throw new Error('recordLoginAttempt() must be implemented');
  }

  /**
   * Get service name
   * @returns {string} Service name
   */
  getServiceName() {
    return 'AuthService';
  }

  /**
   * Get service dependencies
   * @returns {Array<string>} Array of dependency service names
   */
  getDependencies() {
    return ['database', 'validation', 'logger', 'eventBus', 'config'];
  }
}

module.exports = IAuthService;
