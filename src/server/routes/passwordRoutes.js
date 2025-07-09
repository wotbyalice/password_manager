/**
 * Event-Driven Password Routes
 * Decoupled from real-time system using event emission
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { PasswordEvents, createPasswordEvent } = require('../events/PasswordEvents');
const { SystemEvents, createSystemEvent } = require('../events/SystemEvents');

class PasswordRoutes {
  constructor(passwordService, categoryService, authMiddleware, validationService, logger, eventBus) {
    this.passwordService = passwordService;
    this.categoryService = categoryService;
    this.authMiddleware = authMiddleware;
    this.validation = validationService;
    this.logger = logger;
    this.eventBus = eventBus;
    this.router = express.Router();
    
    this.setupRateLimiting();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up rate limiting
   */
  setupRateLimiting() {
    this.passwordLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // Limit each IP to 200 requests per windowMs
      message: {
        success: false,
        error: 'Too many password requests, please try again later'
      }
    });

    this.passwordCreateLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Limit password creation to 10 per minute
      message: {
        success: false,
        error: 'Too many password creation attempts, please slow down'
      }
    });
  }

  /**
   * Set up middleware
   */
  setupMiddleware() {
    this.router.use(this.authMiddleware.authenticateToken);
    this.router.use(this.passwordLimiter);
  }

  /**
   * Set up all routes
   */
  setupRoutes() {
    // Password CRUD routes
    this.router.get('/', this.getPasswordEntries.bind(this));
    this.router.get('/search', this.searchPasswords.bind(this));
    this.router.get('/:id', this.getPasswordById.bind(this));
    this.router.post('/', this.passwordCreateLimiter, this.createPasswordEntry.bind(this));
    this.router.put('/:id', this.authMiddleware.requireAdmin, this.updatePasswordEntry.bind(this));
    this.router.delete('/:id', this.authMiddleware.requireAdmin, this.deletePasswordEntry.bind(this));

    // Category routes
    this.router.get('/categories', this.getPasswordCategories.bind(this));
    this.router.get('/categories/stats', this.getCategoryStats.bind(this));
    this.router.post('/categories', this.authMiddleware.requireAdmin, this.createPasswordCategory.bind(this));
  }

  /**
   * GET /api/passwords
   * Get all password entries with pagination and filtering
   */
  async getPasswordEntries(req, res) {
    try {
      const { page, limit, category } = req.query;
      const metadata = this.extractRequestMetadata(req);

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        category: category || undefined,
        userId: req.user.userId
      };

      const result = await this.passwordService.getPasswordEntries(options);

      // Emit password viewed event
      this.eventBus.emit(PasswordEvents.VIEWED, createPasswordEvent(
        PasswordEvents.VIEWED,
        {
          passwordId: null, // Multiple passwords viewed
          passwordTitle: 'Password List',
          userId: req.user.userId,
          metadata: {
            ...metadata,
            viewType: 'list',
            filters: { category, page: options.page, limit: options.limit }
          }
        }
      ));

      this.logger.auditLog('passwords_viewed', req.user.userId, {
        ...metadata,
        resource: 'password_entries',
        filters: { category, page: options.page, limit: options.limit }
      });

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      this.handleError(error, req, res, 'passwords_view_failed', 'Failed to retrieve passwords');
    }
  }

  /**
   * GET /api/passwords/search
   * Search password entries
   */
  async searchPasswords(req, res) {
    try {
      const { q: query, page, limit } = req.query;
      const metadata = this.extractRequestMetadata(req);

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

      const startTime = Date.now();
      const result = await this.passwordService.searchPasswords(query, options);
      const duration = Date.now() - startTime;

      // Emit password searched event
      this.eventBus.emit(PasswordEvents.SEARCHED, createPasswordEvent(
        PasswordEvents.SEARCHED,
        {
          query: query.trim(),
          resultsCount: result.passwords ? result.passwords.length : 0,
          userId: req.user.userId,
          metadata: {
            ...metadata,
            searchType: 'all',
            duration
          }
        }
      ));

      this.logger.auditLog('passwords_searched', req.user.userId, {
        ...metadata,
        resource: 'password_entries',
        searchQuery: query.substring(0, 50) // Log first 50 chars only
      });

      res.json({
        success: true,
        query: query,
        ...result
      });

    } catch (error) {
      this.handleError(error, req, res, 'passwords_search_failed', 'Search failed');
    }
  }

  /**
   * GET /api/passwords/:id
   * Get a single password entry by ID
   */
  async getPasswordById(req, res) {
    try {
      const passwordId = parseInt(req.params.id);
      const metadata = this.extractRequestMetadata(req);

      if (isNaN(passwordId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password ID'
        });
      }

      const password = await this.passwordService.getPasswordById(passwordId);

      if (!password) {
        return res.status(404).json({
          success: false,
          error: 'Password entry not found'
        });
      }

      // Emit password viewed event
      this.eventBus.emit(PasswordEvents.VIEWED, createPasswordEvent(
        PasswordEvents.VIEWED,
        {
          passwordId,
          passwordTitle: password.title,
          userId: req.user.userId,
          metadata: {
            ...metadata,
            viewType: 'detail'
          }
        }
      ));

      this.logger.auditLog('password_viewed', req.user.userId, {
        ...metadata,
        resource: 'password_entry',
        resourceId: passwordId
      });

      res.json({
        success: true,
        password
      });

    } catch (error) {
      this.handleError(error, req, res, 'password_view_failed', 'Failed to retrieve password');
    }
  }

  /**
   * POST /api/passwords
   * Create a new password entry
   */
  async createPasswordEntry(req, res) {
    try {
      const passwordData = req.body;
      const metadata = this.extractRequestMetadata(req);

      const createdPassword = await this.passwordService.createPasswordEntry(passwordData, req.user.userId);

      // Emit password created event (this will trigger real-time updates)
      this.eventBus.emit(PasswordEvents.CREATED, createPasswordEvent(
        PasswordEvents.CREATED,
        {
          password: {
            id: createdPassword.id,
            title: createdPassword.title,
            username: createdPassword.username,
            category: createdPassword.category,
            url: createdPassword.url,
            createdBy: createdPassword.createdBy,
            createdAt: createdPassword.createdAt
          },
          userId: req.user.userId,
          metadata
        }
      ));

      this.logger.auditLog('password_created', req.user.userId, {
        ...metadata,
        resource: 'password_entry',
        resourceId: createdPassword.id
      });

      res.status(201).json({
        success: true,
        message: 'Password entry created successfully',
        password: createdPassword
      });

    } catch (error) {
      this.handleError(error, req, res, 'password_create_failed', 'Failed to create password entry', 400);
    }
  }

  /**
   * PUT /api/passwords/:id
   * Update a password entry (admin only)
   */
  async updatePasswordEntry(req, res) {
    try {
      const passwordId = parseInt(req.params.id);
      const updateData = req.body;
      const metadata = this.extractRequestMetadata(req);

      if (isNaN(passwordId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password ID'
        });
      }

      // Get previous data for comparison
      const previousPassword = await this.passwordService.getPasswordById(passwordId);
      if (!previousPassword) {
        return res.status(404).json({
          success: false,
          error: 'Password entry not found'
        });
      }

      const updatedPassword = await this.passwordService.updatePasswordEntry(passwordId, updateData, req.user.userId);

      // Determine changed fields
      const changedFields = this.getChangedFields(previousPassword, updatedPassword);

      // Emit password updated event (this will trigger real-time updates)
      this.eventBus.emit(PasswordEvents.UPDATED, createPasswordEvent(
        PasswordEvents.UPDATED,
        {
          password: {
            id: updatedPassword.id,
            title: updatedPassword.title,
            username: updatedPassword.username,
            category: updatedPassword.category,
            url: updatedPassword.url,
            updatedBy: updatedPassword.updatedBy,
            updatedAt: updatedPassword.updatedAt
          },
          previousData: {
            title: previousPassword.title,
            username: previousPassword.username,
            category: previousPassword.category
          },
          userId: req.user.userId,
          metadata: {
            ...metadata,
            changedFields
          }
        }
      ));

      this.logger.auditLog('password_updated', req.user.userId, {
        ...metadata,
        resource: 'password_entry',
        resourceId: passwordId
      });

      res.json({
        success: true,
        message: 'Password entry updated successfully',
        password: updatedPassword
      });

    } catch (error) {
      this.handleError(error, req, res, 'password_update_failed', 'Failed to update password entry', 400);
    }
  }

  /**
   * DELETE /api/passwords/:id
   * Delete a password entry (admin only)
   */
  async deletePasswordEntry(req, res) {
    try {
      const passwordId = parseInt(req.params.id);
      const metadata = this.extractRequestMetadata(req);

      if (isNaN(passwordId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password ID'
        });
      }

      // Get password data before deletion
      const passwordToDelete = await this.passwordService.getPasswordById(passwordId);
      if (!passwordToDelete) {
        return res.status(404).json({
          success: false,
          error: 'Password entry not found'
        });
      }

      const deleted = await this.passwordService.deletePasswordEntry(passwordId, req.user.userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Password entry not found'
        });
      }

      // Emit password deleted event (this will trigger real-time updates)
      this.eventBus.emit(PasswordEvents.DELETED, createPasswordEvent(
        PasswordEvents.DELETED,
        {
          passwordId,
          passwordData: {
            title: passwordToDelete.title,
            username: passwordToDelete.username,
            category: passwordToDelete.category
          },
          userId: req.user.userId,
          metadata
        }
      ));

      this.logger.auditLog('password_deleted', req.user.userId, {
        ...metadata,
        resource: 'password_entry',
        resourceId: passwordId
      });

      res.json({
        success: true,
        message: 'Password entry deleted successfully'
      });

    } catch (error) {
      this.handleError(error, req, res, 'password_delete_failed', 'Failed to delete password entry');
    }
  }

  /**
   * GET /api/passwords/categories
   * Get all password categories
   */
  async getPasswordCategories(req, res) {
    try {
      const categories = await this.categoryService.getPasswordCategories();

      res.json({
        success: true,
        categories
      });

    } catch (error) {
      this.handleError(error, req, res, 'categories_view_failed', 'Failed to retrieve categories');
    }
  }

  /**
   * GET /api/passwords/categories/stats
   * Get category statistics
   */
  async getCategoryStats(req, res) {
    try {
      const stats = await this.categoryService.getCategoryStats();

      res.json({
        success: true,
        categories: stats
      });

    } catch (error) {
      this.handleError(error, req, res, 'category_stats_failed', 'Failed to retrieve category statistics');
    }
  }

  /**
   * POST /api/passwords/categories
   * Create a new password category (admin only)
   */
  async createPasswordCategory(req, res) {
    try {
      const categoryData = req.body;
      const metadata = this.extractRequestMetadata(req);

      const createdCategory = await this.categoryService.createPasswordCategory(categoryData, req.user.userId);

      // Emit category created event
      this.eventBus.emit(SystemEvents.CATEGORY_CREATED, createSystemEvent(
        SystemEvents.CATEGORY_CREATED,
        {
          category: {
            id: createdCategory.id,
            name: createdCategory.name,
            description: createdCategory.description,
            color: createdCategory.color,
            createdBy: createdCategory.createdBy,
            createdAt: createdCategory.createdAt
          },
          userId: req.user.userId,
          metadata
        }
      ));

      this.logger.auditLog('category_created', req.user.userId, {
        ...metadata,
        resource: 'password_category',
        resourceId: createdCategory.id
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        category: createdCategory
      });

    } catch (error) {
      this.handleError(error, req, res, 'category_create_failed', 'Failed to create category', 400);
    }
  }

  /**
   * Extract request metadata for events and logging
   * @param {Object} req - Express request object
   * @returns {Object} Request metadata
   */
  extractRequestMetadata(req) {
    return {
      source: 'web',
      userAgent: req.get('User-Agent') || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    };
  }

  /**
   * Get changed fields between two objects
   * @param {Object} previous - Previous object
   * @param {Object} current - Current object
   * @returns {Array} Array of changed field names
   */
  getChangedFields(previous, current) {
    const changedFields = [];
    const fieldsToCheck = ['title', 'username', 'category', 'url', 'notes'];

    fieldsToCheck.forEach(field => {
      if (previous[field] !== current[field]) {
        changedFields.push(field);
      }
    });

    return changedFields;
  }

  /**
   * Handle errors consistently
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} auditAction - Audit log action
   * @param {string} userMessage - User-facing error message
   * @param {number} statusCode - HTTP status code for validation errors
   */
  handleError(error, req, res, auditAction, userMessage, statusCode = 500) {
    const metadata = this.extractRequestMetadata(req);

    this.logger.auditLog(auditAction, req.user.userId, {
      ...metadata,
      resourceId: req.params.id,
      error: error.message,
      success: false
    });

    // Handle validation errors
    if (error.message.includes('Validation failed') || 
        error.message.includes('required') || 
        error.message.includes('must be') ||
        error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Handle not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    // Generic error response
    res.status(statusCode).json({
      success: false,
      error: userMessage
    });
  }

  /**
   * Get the Express router
   * @returns {Object} Express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = PasswordRoutes;
