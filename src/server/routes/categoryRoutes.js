/**
 * Category Routes - REST API endpoints for password categories
 * Implements CRUD operations with authentication and validation
 */

const express = require('express');
const CategoryService = require('../services/CategoryService');
const { auditLog } = require('../utils/logger');

const router = express.Router();

/**
 * Validate hex color format
 */
function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
}

/**
 * GET /api/categories
 * Get all password categories
 */
router.get('/', async (req, res) => {
  try {
    const categoryService = new CategoryService();
    const categories = await categoryService.getPasswordCategories();

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error retrieving categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories'
    });
  }
});

/**
 * GET /api/categories/stats
 * Get category statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const categoryService = new CategoryService();
    const categories = await categoryService.getCategoryStats();

    const totalCategories = categories.length;
    const totalPasswords = categories.reduce((sum, cat) => sum + cat.passwordCount, 0);

    res.json({
      success: true,
      data: {
        categories,
        totalCategories,
        totalPasswords
      }
    });

  } catch (error) {
    console.error('Error retrieving category statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category statistics'
    });
  }
});

/**
 * GET /api/categories/:id
 * Get category by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }

    const categoryService = new CategoryService();
    const category = await categoryService.getCategoryById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      category
    });

  } catch (error) {
    console.error('Error retrieving category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category'
    });
  }
});

/**
 * POST /api/categories
 * Create new category (admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, color } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Validate color format if provided
    if (color && !isValidHexColor(color)) {
      return res.status(400).json({
        success: false,
        error: 'Color must be a valid hex color code'
      });
    }

    const categoryData = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || null
    };

    const categoryService = new CategoryService();
    const createdCategory = await categoryService.createPasswordCategory(categoryData, req.user.userId);

    // Log the creation
    auditLog('category_created', req.user.userId, {
      resource: 'password_category',
      resourceId: createdCategory.id,
      success: true
    });

    res.status(201).json({
      success: true,
      category: createdCategory
    });

  } catch (error) {
    console.error('Error creating category:', error);

    // Handle specific error types
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Category name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

/**
 * PUT /api/categories/:id
 * Update category (admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }

    const { name, description, color } = req.body;

    // Validate color format if provided
    if (color && !isValidHexColor(color)) {
      return res.status(400).json({
        success: false,
        error: 'Color must be a valid hex color code'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;

    const categoryService = new CategoryService();
    const updatedCategory = await categoryService.updatePasswordCategory(categoryId, updateData, req.user.userId);

    res.json({
      success: true,
      category: updatedCategory
    });

  } catch (error) {
    console.error('Error updating category:', error);

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Category name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete category (admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }

    const categoryService = new CategoryService();
    await categoryService.deletePasswordCategory(categoryId, req.user.userId);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (error.message.includes('contains passwords')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category that contains passwords'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
});

module.exports = router;
