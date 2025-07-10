/**
 * CategoryService - Manages password categories
 * Implements the ICategoryService interface
 */

const SQLiteAdapter = require('../database/sqlite-adapter');
const { auditLog } = require('../utils/logger');

class CategoryService {
  constructor() {
    this.adapter = new SQLiteAdapter();
  }

  /**
   * Get all password categories
   * @returns {Promise<Array>} Array of password categories
   */
  async getPasswordCategories() {
    try {
      const result = await this.adapter.query(
        'SELECT * FROM password_categories ORDER BY name ASC'
      );

      return result.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        createdBy: category.created_by,
        createdAt: category.created_at
      }));

    } catch (error) {
      throw new Error(`Failed to retrieve password categories: ${error.message}`);
    }
  }

  /**
   * Get a single password category by ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<Object|null>} Category or null if not found
   */
  async getCategoryById(categoryId) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    if (typeof categoryId !== 'number' && !Number.isInteger(Number(categoryId))) {
      throw new Error('Category ID must be a number');
    }

    try {
      const result = await this.adapter.query(
        'SELECT * FROM password_categories WHERE id = ?',
        [categoryId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const category = result.rows[0];
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        createdBy: category.created_by,
        createdAt: category.created_at
      };

    } catch (error) {
      throw new Error(`Failed to retrieve category: ${error.message}`);
    }
  }

  /**
   * Create a new password category
   * @param {Object} categoryData - Category data
   * @param {string} categoryData.name - Category name
   * @param {string} categoryData.description - Category description
   * @param {string} categoryData.color - Category color (hex)
   * @param {number} userId - ID of the user creating the category
   * @returns {Promise<Object>} Created category
   */
  async createPasswordCategory(categoryData, userId) {
    // Validate input
    if (!categoryData.name || categoryData.name.trim() === '') {
      throw new Error('Category name is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (categoryData.color && !this.isValidHexColor(categoryData.color)) {
      throw new Error('Color must be a valid hex color code');
    }

    const name = categoryData.name.trim();
    const description = categoryData.description?.trim() || null;
    const color = categoryData.color || null;

    try {
      // Check if category name already exists
      const existingResult = await this.adapter.query(
        'SELECT id FROM password_categories WHERE LOWER(name) = LOWER(?)',
        [name]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Category name already exists');
      }

      // Insert new category
      const createdAt = new Date().toISOString();
      const result = await this.adapter.query(
        'INSERT INTO password_categories (name, description, color, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [name, description, color, userId, createdAt]
      );

      // Get the created category - use the result from insert or create a new object
      const createdCategory = result.rows[0] || {
        id: result.insertId || (this.data?.password_categories?.length || 0) + 1,
        name,
        description,
        color,
        created_by: userId,
        created_at: createdAt
      };

      // Log the creation
      auditLog('category_created', userId, {
        resource: 'password_category',
        resourceId: createdCategory.id,
        success: true
      });

      return {
        id: createdCategory.id,
        name: createdCategory.name,
        description: createdCategory.description,
        color: createdCategory.color,
        createdBy: createdCategory.created_by,
        createdAt: createdCategory.created_at
      };

    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  /**
   * Update an existing password category
   * @param {number} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @param {number} userId - ID of the user updating the category
   * @returns {Promise<Object>} Updated category
   */
  async updatePasswordCategory(categoryId, updateData, userId) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Check if category exists
      const existingCategory = await this.getCategoryById(categoryId);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Validate name uniqueness if name is being updated
      if (updateData.name && updateData.name.trim() !== existingCategory.name) {
        const nameCheck = await this.adapter.query(
          'SELECT id FROM password_categories WHERE LOWER(name) = LOWER(?) AND id != ?',
          [updateData.name.trim(), categoryId]
        );

        if (nameCheck.rows.length > 0) {
          throw new Error('Category name already exists');
        }
      }

      // Validate color if provided
      if (updateData.color && !this.isValidHexColor(updateData.color)) {
        throw new Error('Color must be a valid hex color code');
      }

      // Build update query
      const updates = [];
      const params = [];

      if (updateData.name) {
        updates.push('name = ?');
        params.push(updateData.name.trim());
      }

      if (updateData.description !== undefined) {
        updates.push('description = ?');
        params.push(updateData.description?.trim() || null);
      }

      if (updateData.color !== undefined) {
        updates.push('color = ?');
        params.push(updateData.color);
      }

      if (updates.length === 0) {
        return existingCategory;
      }

      params.push(categoryId);

      await this.adapter.query(
        `UPDATE password_categories SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Get updated category
      const updatedCategory = await this.getCategoryById(categoryId);

      // Log the update
      auditLog('category_updated', userId, {
        resource: 'password_category',
        resourceId: categoryId,
        success: true
      });

      return updatedCategory;

    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  /**
   * Delete a password category
   * @param {number} categoryId - Category ID
   * @param {number} userId - ID of the user deleting the category
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deletePasswordCategory(categoryId, userId) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Check if category exists
      const existingCategory = await this.getCategoryById(categoryId);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Check if category has passwords
      const passwordCheck = await this.adapter.query(
        'SELECT id FROM passwords WHERE category = ? LIMIT 1',
        [existingCategory.name]
      );

      if (passwordCheck.rows.length > 0) {
        throw new Error('Cannot delete category that contains passwords');
      }

      // Delete category
      await this.adapter.query(
        'DELETE FROM password_categories WHERE id = ?',
        [categoryId]
      );

      // Log the deletion
      auditLog('category_deleted', userId, {
        resource: 'password_category',
        resourceId: categoryId,
        success: true
      });

      return true;

    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Get password count by category
   * @returns {Promise<Array>} Array of categories with password counts
   */
  async getCategoryStats() {
    try {
      const result = await this.adapter.query(`
        SELECT 
          pc.id,
          pc.name,
          pc.description,
          pc.color,
          COUNT(p.id) as password_count
        FROM password_categories pc
        LEFT JOIN passwords p ON pc.name = p.category
        GROUP BY pc.id, pc.name, pc.description, pc.color
        ORDER BY pc.name ASC
      `);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        passwordCount: parseInt(row.password_count)
      }));

    } catch (error) {
      throw new Error(`Failed to retrieve category statistics: ${error.message}`);
    }
  }

  /**
   * Validate hex color format
   * @param {string} color - Color string to validate
   * @returns {boolean} True if valid hex color
   */
  isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }
}

module.exports = CategoryService;
