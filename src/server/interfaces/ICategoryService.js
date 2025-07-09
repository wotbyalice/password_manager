/**
 * Category Service Interface
 * Defines the contract for password category management operations
 */

const IBaseService = require('./IBaseService');

class ICategoryService extends IBaseService {
  /**
   * Get all password categories
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @returns {Promise<Object>} Paginated categories
   */
  async getPasswordCategories(options = {}) {
    throw new Error('getPasswordCategories() must be implemented');
  }

  /**
   * Get category by ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<Object|null>} Category or null if not found
   */
  async getCategoryById(categoryId) {
    throw new Error('getCategoryById() must be implemented');
  }

  /**
   * Get category by name
   * @param {string} name - Category name
   * @returns {Promise<Object|null>} Category or null if not found
   */
  async getCategoryByName(name) {
    throw new Error('getCategoryByName() must be implemented');
  }

  /**
   * Create a new password category
   * @param {Object} categoryData - Category data
   * @param {string} categoryData.name - Category name
   * @param {string} categoryData.description - Category description
   * @param {string} categoryData.color - Category color
   * @param {number} userId - ID of the user creating the category
   * @returns {Promise<Object>} Created category
   */
  async createPasswordCategory(categoryData, userId) {
    throw new Error('createPasswordCategory() must be implemented');
  }

  /**
   * Update a password category
   * @param {number} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @param {number} userId - ID of the user updating the category
   * @returns {Promise<Object>} Updated category
   */
  async updatePasswordCategory(categoryId, updateData, userId) {
    throw new Error('updatePasswordCategory() must be implemented');
  }

  /**
   * Delete a password category
   * @param {number} categoryId - Category ID
   * @param {number} userId - ID of the user deleting the category
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deletePasswordCategory(categoryId, userId) {
    throw new Error('deletePasswordCategory() must be implemented');
  }

  /**
   * Get category statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Category statistics
   */
  async getCategoryStats(options = {}) {
    throw new Error('getCategoryStats() must be implemented');
  }

  /**
   * Get password count for category
   * @param {number} categoryId - Category ID
   * @returns {Promise<number>} Number of passwords in category
   */
  async getPasswordCountForCategory(categoryId) {
    throw new Error('getPasswordCountForCategory() must be implemented');
  }

  /**
   * Get categories with password counts
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} Categories with password counts
   */
  async getCategoriesWithCounts(options = {}) {
    throw new Error('getCategoriesWithCounts() must be implemented');
  }

  /**
   * Search categories
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchCategories(query, options = {}) {
    throw new Error('searchCategories() must be implemented');
  }

  /**
   * Get categories created by user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Categories created by user
   */
  async getCategoriesByUser(userId, options = {}) {
    throw new Error('getCategoriesByUser() must be implemented');
  }

  /**
   * Bulk create categories
   * @param {Array<Object>} categoriesData - Array of category data
   * @param {number} userId - ID of the user creating the categories
   * @returns {Promise<Object>} Bulk creation result
   */
  async bulkCreateCategories(categoriesData, userId) {
    throw new Error('bulkCreateCategories() must be implemented');
  }

  /**
   * Bulk update categories
   * @param {Array<Object>} updates - Array of update objects
   * @param {number} userId - ID of the user updating the categories
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdateCategories(updates, userId) {
    throw new Error('bulkUpdateCategories() must be implemented');
  }

  /**
   * Bulk delete categories
   * @param {Array<number>} categoryIds - Array of category IDs
   * @param {number} userId - ID of the user deleting the categories
   * @returns {Promise<Object>} Bulk deletion result
   */
  async bulkDeleteCategories(categoryIds, userId) {
    throw new Error('bulkDeleteCategories() must be implemented');
  }

  /**
   * Validate category data
   * @param {Object} categoryData - Category data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateCategoryData(categoryData, isUpdate = false) {
    throw new Error('validateCategoryData() must be implemented');
  }

  /**
   * Check for duplicate category
   * @param {string} name - Category name to check
   * @param {number} excludeId - Category ID to exclude from check
   * @returns {Promise<boolean>} True if duplicate exists
   */
  async checkDuplicateCategory(name, excludeId = null) {
    throw new Error('checkDuplicateCategory() must be implemented');
  }

  /**
   * Get category usage statistics
   * @param {number} categoryId - Category ID
   * @returns {Promise<Object>} Category usage statistics
   */
  async getCategoryUsageStats(categoryId) {
    throw new Error('getCategoryUsageStats() must be implemented');
  }

  /**
   * Get most used categories
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of categories to return
   * @returns {Promise<Array<Object>>} Most used categories
   */
  async getMostUsedCategories(options = {}) {
    throw new Error('getMostUsedCategories() must be implemented');
  }

  /**
   * Get least used categories
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of categories to return
   * @returns {Promise<Array<Object>>} Least used categories
   */
  async getLeastUsedCategories(options = {}) {
    throw new Error('getLeastUsedCategories() must be implemented');
  }

  /**
   * Get categories by color
   * @param {string} color - Color hex code
   * @returns {Promise<Array<Object>>} Categories with specified color
   */
  async getCategoriesByColor(color) {
    throw new Error('getCategoriesByColor() must be implemented');
  }

  /**
   * Get available colors for categories
   * @returns {Promise<Array<string>>} Array of available color hex codes
   */
  async getAvailableColors() {
    throw new Error('getAvailableColors() must be implemented');
  }

  /**
   * Merge categories
   * @param {number} sourceId - Source category ID
   * @param {number} targetId - Target category ID
   * @param {number} userId - ID of the user performing the merge
   * @returns {Promise<Object>} Merge result
   */
  async mergeCategories(sourceId, targetId, userId) {
    throw new Error('mergeCategories() must be implemented');
  }

  /**
   * Get service name
   * @returns {string} Service name
   */
  getServiceName() {
    return 'CategoryService';
  }

  /**
   * Get service dependencies
   * @returns {Array<string>} Array of dependency service names
   */
  getDependencies() {
    return ['database', 'validation', 'logger', 'eventBus'];
  }
}

module.exports = ICategoryService;
