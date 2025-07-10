/**
 * CategoriesManager - Frontend Categories Management
 * Handles client-side category operations and real-time updates
 */

class CategoriesManager {
  constructor(socket) {
    this.categories = [];
    this.socket = socket;
    this.apiBaseUrl = `${window.location.origin}/api`;
    
    // Set up socket event listeners for real-time updates
    this.setupSocketListeners();
  }

  /**
   * Set up socket event listeners for real-time category updates
   */
  setupSocketListeners() {
    if (this.socket) {
      this.socket.on('category_created', (category) => {
        this.handleCategoryCreated(category);
      });

      this.socket.on('category_updated', (category) => {
        this.handleCategoryUpdated(category);
      });

      this.socket.on('category_deleted', (data) => {
        this.handleCategoryDeleted(data);
      });
    }
  }

  /**
   * Load all categories from the server
   * @returns {Promise<Array>} Array of categories
   */
  async loadCategories() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      this.categories = data.categories;
      return this.categories;

    } catch (error) {
      throw new Error(`Failed to load categories: ${error.message}`);
    }
  }

  /**
   * Get category by ID
   * @param {number} categoryId - Category ID
   * @returns {Object|null} Category or null if not found
   */
  getCategoryById(categoryId) {
    if (!categoryId || typeof categoryId !== 'number') {
      return null;
    }

    return this.categories.find(category => category.id === categoryId) || null;
  }

  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @param {string} categoryData.name - Category name
   * @param {string} categoryData.description - Category description
   * @param {string} categoryData.color - Category color (hex)
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData) {
    // Validate input
    if (!categoryData.name || categoryData.name.trim() === '') {
      throw new Error('Category name is required');
    }

    if (categoryData.color && !this.isValidHexColor(categoryData.color)) {
      throw new Error('Color must be a valid hex color code');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      return data.category;

    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  /**
   * Update an existing category
   * @param {number} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(categoryId, updateData) {
    // Validate input
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    if (typeof categoryId !== 'number') {
      throw new Error('Category ID must be a number');
    }

    if (updateData.color && !this.isValidHexColor(updateData.color)) {
      throw new Error('Color must be a valid hex color code');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      return data.category;

    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  /**
   * Delete a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteCategory(categoryId) {
    // Validate input
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      return true;

    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Object>} Category statistics
   */
  async getCategoryStats() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/categories/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      return data.data;

    } catch (error) {
      throw new Error(`Failed to get category statistics: ${error.message}`);
    }
  }

  /**
   * Handle real-time category created event
   * @param {Object} category - Created category
   */
  handleCategoryCreated(category) {
    this.categories.push(category);
    
    // Trigger custom event for UI updates
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('categoryCreated', { detail: category }));
    }
  }

  /**
   * Handle real-time category updated event
   * @param {Object} category - Updated category
   */
  handleCategoryUpdated(category) {
    const index = this.categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      this.categories[index] = category;
      
      // Trigger custom event for UI updates
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('categoryUpdated', { detail: category }));
      }
    }
  }

  /**
   * Handle real-time category deleted event
   * @param {Object} data - Deleted category data
   */
  handleCategoryDeleted(data) {
    const index = this.categories.findIndex(c => c.id === data.id);
    if (index !== -1) {
      const deletedCategory = this.categories.splice(index, 1)[0];
      
      // Trigger custom event for UI updates
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('categoryDeleted', { detail: deletedCategory }));
      }
    }
  }

  /**
   * Validate hex color format
   * @param {string} color - Color string to validate
   * @returns {boolean} True if valid hex color
   */
  isValidHexColor(color) {
    if (!color || typeof color !== 'string') {
      return false;
    }
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Get categories filtered by name
   * @param {string} searchTerm - Search term
   * @returns {Array} Filtered categories
   */
  searchCategories(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.categories;
    }

    const term = searchTerm.toLowerCase().trim();
    return this.categories.filter(category => 
      category.name.toLowerCase().includes(term) ||
      (category.description && category.description.toLowerCase().includes(term))
    );
  }

  /**
   * Get categories sorted by name
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted categories
   */
  getSortedCategories(order = 'asc') {
    const sorted = [...this.categories];
    return sorted.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Clean up socket listeners
   */
  destroy() {
    if (this.socket) {
      this.socket.off('category_created');
      this.socket.off('category_updated');
      this.socket.off('category_deleted');
    }
  }
}

// Export for both Node.js (testing) and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoriesManager;
} else if (typeof window !== 'undefined') {
  window.CategoriesManager = CategoriesManager;
}
