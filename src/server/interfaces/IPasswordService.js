/**
 * Password Service Interface
 * Defines the contract for password management operations
 */

const IBaseService = require('./IBaseService');

class IPasswordService extends IBaseService {
  /**
   * Create a new password entry
   * @param {Object} passwordData - Password entry data
   * @param {number} userId - ID of the user creating the password
   * @returns {Promise<Object>} Created password entry
   */
  async createPasswordEntry(passwordData, userId) {
    throw new Error('createPasswordEntry() must be implemented');
  }

  /**
   * Get password entries with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.category - Category filter
   * @param {number} options.userId - User ID for filtering
   * @returns {Promise<Object>} Paginated password entries
   */
  async getPasswordEntries(options) {
    throw new Error('getPasswordEntries() must be implemented');
  }

  /**
   * Get a single password entry by ID
   * @param {number} passwordId - Password entry ID
   * @returns {Promise<Object|null>} Password entry or null if not found
   */
  async getPasswordById(passwordId) {
    throw new Error('getPasswordById() must be implemented');
  }

  /**
   * Update a password entry
   * @param {number} passwordId - Password entry ID
   * @param {Object} updateData - Data to update
   * @param {number} userId - ID of the user updating the password
   * @returns {Promise<Object>} Updated password entry
   */
  async updatePasswordEntry(passwordId, updateData, userId) {
    throw new Error('updatePasswordEntry() must be implemented');
  }

  /**
   * Delete a password entry
   * @param {number} passwordId - Password entry ID
   * @param {number} userId - ID of the user deleting the password
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deletePasswordEntry(passwordId, userId) {
    throw new Error('deletePasswordEntry() must be implemented');
  }

  /**
   * Search password entries
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @returns {Promise<Object>} Search results
   */
  async searchPasswords(query, options) {
    throw new Error('searchPasswords() must be implemented');
  }

  /**
   * Get password entries by category
   * @param {string} category - Category name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Password entries in category
   */
  async getPasswordsByCategory(category, options) {
    throw new Error('getPasswordsByCategory() must be implemented');
  }

  /**
   * Get password entries created by a specific user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Password entries created by user
   */
  async getPasswordsByUser(userId, options) {
    throw new Error('getPasswordsByUser() must be implemented');
  }

  /**
   * Bulk create password entries
   * @param {Array<Object>} passwordsData - Array of password data
   * @param {number} userId - ID of the user creating the passwords
   * @returns {Promise<Object>} Bulk creation result
   */
  async bulkCreatePasswords(passwordsData, userId) {
    throw new Error('bulkCreatePasswords() must be implemented');
  }

  /**
   * Bulk update password entries
   * @param {Array<Object>} updates - Array of update objects
   * @param {number} userId - ID of the user updating the passwords
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdatePasswords(updates, userId) {
    throw new Error('bulkUpdatePasswords() must be implemented');
  }

  /**
   * Bulk delete password entries
   * @param {Array<number>} passwordIds - Array of password IDs
   * @param {number} userId - ID of the user deleting the passwords
   * @returns {Promise<Object>} Bulk deletion result
   */
  async bulkDeletePasswords(passwordIds, userId) {
    throw new Error('bulkDeletePasswords() must be implemented');
  }

  /**
   * Export password entries
   * @param {Object} options - Export options
   * @param {string} options.format - Export format (csv, json)
   * @param {Array<number>} options.passwordIds - Specific password IDs to export
   * @param {number} userId - ID of the user exporting
   * @returns {Promise<Object>} Export result
   */
  async exportPasswords(options, userId) {
    throw new Error('exportPasswords() must be implemented');
  }

  /**
   * Import password entries
   * @param {Object} importData - Import data
   * @param {string} importData.format - Import format
   * @param {string|Buffer} importData.data - Import data content
   * @param {number} userId - ID of the user importing
   * @returns {Promise<Object>} Import result
   */
  async importPasswords(importData, userId) {
    throw new Error('importPasswords() must be implemented');
  }

  /**
   * Validate password entry data
   * @param {Object} passwordData - Password data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validatePasswordData(passwordData, isUpdate = false) {
    throw new Error('validatePasswordData() must be implemented');
  }

  /**
   * Check for duplicate password entries
   * @param {Object} passwordData - Password data to check
   * @param {number} excludeId - Password ID to exclude from check
   * @returns {Promise<Object>} Duplicate check result
   */
  async checkDuplicatePassword(passwordData, excludeId = null) {
    throw new Error('checkDuplicatePassword() must be implemented');
  }

  /**
   * Get password statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Password statistics
   */
  async getPasswordStatistics(options = {}) {
    throw new Error('getPasswordStatistics() must be implemented');
  }

  /**
   * Get service name
   * @returns {string} Service name
   */
  getServiceName() {
    return 'PasswordService';
  }

  /**
   * Get service dependencies
   * @returns {Array<string>} Array of dependency service names
   */
  getDependencies() {
    return ['database', 'encryption', 'validation', 'logger', 'eventBus'];
  }
}

module.exports = IPasswordService;
