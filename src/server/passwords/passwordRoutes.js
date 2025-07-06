const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  createPasswordEntry,
  getPasswordEntries,
  getPasswordById,
  updatePasswordEntry,
  deletePasswordEntry,
  searchPasswords
} = require('./passwordService');
const {
  getPasswordCategories,
  getCategoryById,
  createPasswordCategory,
  updatePasswordCategory,
  deletePasswordCategory,
  getCategoryStats
} = require('./categoryService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../utils/logger');

const router = express.Router();

// Rate limiting for password operations
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many password requests, please try again later'
  }
});

const passwordCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit password creation to 10 per minute
  message: {
    success: false,
    error: 'Too many password creation attempts, please slow down'
  }
});

// Apply authentication to all password routes
router.use(authenticateToken);
router.use(passwordLimiter);

/**
 * GET /api/passwords
 * Get all password entries with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, category } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      category: category || undefined,
      userId: req.user.userId
    };

    const result = await getPasswordEntries(options);

    auditLog('passwords_viewed', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_entries',
      filters: { category, page: options.page, limit: options.limit }
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('passwords_view_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      error: error.message,
      success: false
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve passwords'
    });
  }
});

/**
 * GET /api/passwords/search
 * Search password entries
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, page, limit } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    };

    const result = await searchPasswords(query, options);

    auditLog('passwords_searched', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_entries',
      searchQuery: query.substring(0, 50) // Log first 50 chars only
    });

    res.json({
      success: true,
      query: query,
      ...result
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('passwords_search_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      error: error.message,
      success: false
    });

    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Password Categories Routes (must come before /:id route)

/**
 * GET /api/passwords/categories
 * Get all password categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await getPasswordCategories();

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories'
    });
  }
});

/**
 * GET /api/passwords/categories/stats
 * Get category statistics
 */
router.get('/categories/stats', async (req, res) => {
  try {
    const stats = await getCategoryStats();

    res.json({
      success: true,
      categories: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category statistics'
    });
  }
});

/**
 * POST /api/passwords/categories
 * Create a new password category (admin only)
 */
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const categoryData = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const createdCategory = await createPasswordCategory(categoryData, req.user.userId);

    auditLog('category_created', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_category',
      resourceId: createdCategory.id
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: createdCategory
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('category_create_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      error: error.message,
      success: false
    });

    if (error.message.includes('already exists') || error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

/**
 * GET /api/passwords/:id
 * Get a single password entry by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const passwordId = parseInt(req.params.id);
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (isNaN(passwordId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password ID'
      });
    }

    const password = await getPasswordById(passwordId);

    if (!password) {
      return res.status(404).json({
        success: false,
        error: 'Password entry not found'
      });
    }

    auditLog('password_viewed', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_entry',
      resourceId: passwordId
    });

    res.json({
      success: true,
      password
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('password_view_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      resourceId: req.params.id,
      error: error.message,
      success: false
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve password'
    });
  }
});

/**
 * POST /api/passwords
 * Create a new password entry
 */
router.post('/', passwordCreateLimiter, async (req, res) => {
  try {
    const passwordData = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const createdPassword = await createPasswordEntry(passwordData, req.user.userId);

    auditLog('password_created', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_entry',
      resourceId: createdPassword.id
    });

    res.status(201).json({
      success: true,
      message: 'Password entry created successfully',
      password: createdPassword
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('password_create_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      error: error.message,
      success: false
    });

    if (error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create password entry'
    });
  }
});

/**
 * PUT /api/passwords/:id
 * Update a password entry (admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const passwordId = parseInt(req.params.id);
    const updateData = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (isNaN(passwordId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password ID'
      });
    }

    const updatedPassword = await updatePasswordEntry(passwordId, updateData, req.user.userId);

    auditLog('password_updated', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_entry',
      resourceId: passwordId
    });

    res.json({
      success: true,
      message: 'Password entry updated successfully',
      password: updatedPassword
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('password_update_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      resourceId: req.params.id,
      error: error.message,
      success: false
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Password entry not found'
      });
    }

    if (error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update password entry'
    });
  }
});

/**
 * DELETE /api/passwords/:id
 * Delete a password entry (admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const passwordId = parseInt(req.params.id);
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (isNaN(passwordId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password ID'
      });
    }

    const deleted = await deletePasswordEntry(passwordId, req.user.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Password entry not found'
      });
    }

    auditLog('password_deleted', req.user.userId, {
      ip: clientIP,
      userAgent,
      resource: 'password_entry',
      resourceId: passwordId
    });

    res.json({
      success: true,
      message: 'Password entry deleted successfully'
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('password_delete_failed', req.user.userId, {
      ip: clientIP,
      userAgent,
      resourceId: req.params.id,
      error: error.message,
      success: false
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete password entry'
    });
  }
});

module.exports = router;
