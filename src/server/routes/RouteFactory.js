/**
 * Route Factory
 * Creates route instances with proper dependency injection
 */

const PasswordRoutes = require('./passwordRoutes');

class RouteFactory {
  constructor(container) {
    this.container = container;
  }

  /**
   * Create password routes with injected dependencies
   * @returns {Object} Express router for password routes
   */
  createPasswordRoutes() {
    const passwordService = this.container.resolve('passwordService');
    const categoryService = this.container.resolve('categoryService');
    const authMiddleware = this.createAuthMiddleware();
    const validationService = this.container.resolve('validation');
    const logger = this.container.resolve('logger');
    const eventBus = this.container.resolve('eventBus');

    const passwordRoutes = new PasswordRoutes(
      passwordService,
      categoryService,
      authMiddleware,
      validationService,
      logger,
      eventBus
    );

    return passwordRoutes.getRouter();
  }

  /**
   * Create authentication middleware wrapper
   * @returns {Object} Authentication middleware functions
   */
  createAuthMiddleware() {
    const authService = this.container.resolve('authService');
    const logger = this.container.resolve('logger');

    return {
      /**
       * Authenticate JWT token middleware
       */
      authenticateToken: (req, res, next) => {
        try {
          const authHeader = req.headers['authorization'];
          const token = authHeader && authHeader.split(' ')[1];

          if (!token) {
            return res.status(401).json({
              success: false,
              error: 'Access token required'
            });
          }

          const decoded = authService.verifyToken(token);
          if (!decoded) {
            return res.status(401).json({
              success: false,
              error: 'Invalid or expired token'
            });
          }

          req.user = decoded;
          next();

        } catch (error) {
          logger.error('Authentication error:', error);
          res.status(401).json({
            success: false,
            error: 'Authentication failed'
          });
        }
      },

      /**
       * Require admin role middleware
       */
      requireAdmin: (req, res, next) => {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        if (req.user.role !== 'admin') {
          logger.warn('Admin access denied', {
            userId: req.user.userId,
            role: req.user.role,
            endpoint: req.originalUrl
          });

          return res.status(403).json({
            success: false,
            error: 'Admin access required'
          });
        }

        next();
      }
    };
  }

  /**
   * Create user routes with injected dependencies
   * @returns {Object} Express router for user routes
   */
  createUserRoutes() {
    // This would be implemented when we create UserRoutes class
    // For now, return a placeholder
    const express = require('express');
    const router = express.Router();
    
    router.get('/placeholder', (req, res) => {
      res.json({ message: 'User routes not yet implemented with DI' });
    });
    
    return router;
  }

  /**
   * Create authentication routes with injected dependencies
   * @returns {Object} Express router for auth routes
   */
  createAuthRoutes() {
    // This would be implemented when we create AuthRoutes class
    // For now, return a placeholder
    const express = require('express');
    const router = express.Router();
    
    router.get('/placeholder', (req, res) => {
      res.json({ message: 'Auth routes not yet implemented with DI' });
    });
    
    return router;
  }

  /**
   * Create all application routes
   * @returns {Object} Object containing all route routers
   */
  createAllRoutes() {
    return {
      passwords: this.createPasswordRoutes(),
      users: this.createUserRoutes(),
      auth: this.createAuthRoutes()
    };
  }
}

module.exports = RouteFactory;
