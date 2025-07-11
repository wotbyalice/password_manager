const { query } = require('../database/connection');
const { auditLog } = require('../utils/logger');

/**
 * Get all password categories
 * @returns {Promise<Array>} Array of password categories
 */
async function getPasswordCategories() {
  console.log('🔄 CATEGORY_SERVICE: getPasswordCategories() called');
  try {
    console.log('🔄 CATEGORY_SERVICE: Executing SQL query for categories');
    const result = await query(
      `SELECT id, name, description, color, created_by, created_at
       FROM password_categories
       ORDER BY name ASC`
    );

    console.log('✅ CATEGORY_SERVICE: SQL query result:', {
      rowCount: result.rows?.length,
      rows: result.rows
    });

    const categories = result.rows.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      createdBy: category.created_by,
      createdAt: category.created_at
    }));

    console.log('✅ CATEGORY_SERVICE: Categories mapped successfully:', {
      count: categories.length,
      categories: categories
    });

    return categories;

  } catch (error) {
    console.error('❌ CATEGORY_SERVICE: getPasswordCategories error:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to retrieve password categories: ${error.message}`);
  }
}

/**
 * Get a single password category by ID
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>} Category or null if not found
 */
async function getCategoryById(categoryId) {
  try {
    const result = await query(
      `SELECT id, name, description, color, created_by, created_at
       FROM password_categories 
       WHERE id = $1`,
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
 * Create a new password category (admin only)
 * @param {Object} categoryData - Category data
 * @param {number} userId - ID of user creating the category
 * @returns {Promise<Object>} Created category
 */
async function createPasswordCategory(categoryData, userId) {
  const { name, description, color } = categoryData;

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Category name is required');
  }

  if (name.trim().length > 100) {
    throw new Error('Category name must be less than 100 characters');
  }

  if (description && description.length > 500) {
    throw new Error('Category description must be less than 500 characters');
  }

  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error('Color must be a valid hex color code (e.g., #FF6B6B)');
  }

  try {
    // Check if category name already exists
    const existingResult = await query(
      'SELECT id FROM password_categories WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('Category name already exists');
    }

    // Insert new category
    const result = await query(
      `INSERT INTO password_categories (name, description, color, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, color, created_by, created_at`,
      [name.trim(), description?.trim() || null, color || null, userId]
    );

    const createdCategory = result.rows[0];

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
    auditLog('category_create_failed', userId, {
      resource: 'password_category',
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update a password category (admin only)
 * @param {number} categoryId - Category ID
 * @param {Object} updateData - Data to update
 * @param {number} userId - ID of user making the update
 * @returns {Promise<Object>} Updated category
 */
async function updatePasswordCategory(categoryId, updateData, userId) {
  const { name, description, color } = updateData;

  // Validate input
  if (name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Category name cannot be empty');
    }
    if (name.trim().length > 100) {
      throw new Error('Category name must be less than 100 characters');
    }
  }

  if (description !== undefined && description && description.length > 500) {
    throw new Error('Category description must be less than 500 characters');
  }

  if (color !== undefined && color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error('Color must be a valid hex color code (e.g., #FF6B6B)');
  }

  try {
    // Check if category exists
    const existingResult = await query(
      'SELECT id FROM password_categories WHERE id = $1',
      [categoryId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('Category not found');
    }

    // Check for duplicate name (if name is being updated)
    if (name !== undefined) {
      const duplicateResult = await query(
        'SELECT id FROM password_categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), categoryId]
      );

      if (duplicateResult.rows.length > 0) {
        throw new Error('Category name already exists');
      }
    }

    // Prepare update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description?.trim() || null);
    }

    if (color !== undefined) {
      paramCount++;
      updates.push(`color = $${paramCount}`);
      values.push(color || null);
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add WHERE clause parameter
    paramCount++;
    values.push(categoryId);

    // Execute update
    const updateQuery = `
      UPDATE password_categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, color, created_by, created_at
    `;

    const result = await query(updateQuery, values);
    const updatedCategory = result.rows[0];

    // Log the update
    auditLog('category_updated', userId, {
      resource: 'password_category',
      resourceId: categoryId,
      success: true
    });

    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      description: updatedCategory.description,
      color: updatedCategory.color,
      createdBy: updatedCategory.created_by,
      createdAt: updatedCategory.created_at
    };

  } catch (error) {
    auditLog('category_update_failed', userId, {
      resource: 'password_category',
      resourceId: categoryId,
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete a password category (admin only)
 * @param {number} categoryId - Category ID
 * @param {number} userId - ID of user making the deletion
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deletePasswordCategory(categoryId, userId) {
  try {
    // Check if category is in use
    const usageResult = await query(
      'SELECT COUNT(*) FROM password_entries WHERE category = (SELECT name FROM password_categories WHERE id = $1) AND is_deleted = false',
      [categoryId]
    );

    const usageCount = parseInt(usageResult.rows[0].count);
    if (usageCount > 0) {
      throw new Error(`Cannot delete category: ${usageCount} password entries are using this category`);
    }

    // Delete the category
    const result = await query(
      'DELETE FROM password_categories WHERE id = $1 RETURNING id, name',
      [categoryId]
    );

    if (result.rows.length === 0) {
      return false; // Category not found
    }

    const deletedCategory = result.rows[0];

    // Log the deletion
    auditLog('category_deleted', userId, {
      resource: 'password_category',
      resourceId: categoryId,
      success: true
    });

    return true;

  } catch (error) {
    auditLog('category_delete_failed', userId, {
      resource: 'password_category',
      resourceId: categoryId,
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get password count by category
 * @returns {Promise<Array>} Array of categories with password counts
 */
async function getCategoryStats() {
  console.log('🔄 CATEGORY_SERVICE: getCategoryStats() called');
  try {
    console.log('🔄 CATEGORY_SERVICE: Executing SQL query for category stats');
    const result = await query(`
      SELECT
        pc.id,
        pc.name,
        pc.description,
        pc.color,
        COUNT(pe.id) as password_count
      FROM password_categories pc
      LEFT JOIN password_entries pe ON pc.name = pe.category AND pe.is_deleted = false
      GROUP BY pc.id, pc.name, pc.description, pc.color
      ORDER BY pc.name ASC
    `);

    console.log('✅ CATEGORY_SERVICE: SQL query result for stats:', {
      rowCount: result.rows?.length,
      rows: result.rows
    });

    const stats = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      passwordCount: parseInt(row.password_count)
    }));

    console.log('✅ CATEGORY_SERVICE: Category stats mapped successfully:', {
      count: stats.length,
      stats: stats
    });

    return stats;

  } catch (error) {
    console.error('❌ CATEGORY_SERVICE: getCategoryStats error:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to retrieve category statistics: ${error.message}`);
  }
}

module.exports = {
  getPasswordCategories,
  getCategoryById,
  createPasswordCategory,
  updatePasswordCategory,
  deletePasswordCategory,
  getCategoryStats
};
