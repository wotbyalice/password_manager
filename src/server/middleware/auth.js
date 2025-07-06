const jwt = require('jsonwebtoken');
const { findUserById } = require('../auth/authService');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify token
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, secret);

    // Check if user still exists and is active
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Middleware to require admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn(`Access denied for user ${req.user.userId} to admin route ${req.path}`);
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions'
    });
  }

  next();
}

/**
 * Middleware to require specific role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Express middleware function
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.userId} with role ${req.user.role} to route ${req.path}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Middleware to check if user owns resource or is admin
 * @param {string} userIdField - Field name containing user ID in request params/body
 * @returns {Function} Express middleware function
 */
function requireOwnershipOrAdmin(userIdField = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    const currentUserId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && parseInt(resourceUserId) !== currentUserId) {
      logger.warn(`Access denied for user ${currentUserId} to resource owned by ${resourceUserId}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Adds user info to request if token is provided, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, secret);

    const user = await findUserById(decoded.userId);
    if (user) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        firstName: user.firstName,
        lastName: user.lastName
      };
    }

    next();

  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
}

/**
 * Middleware to extract and validate API key (for server-to-server communication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.error('API_KEY not configured in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn(`Invalid API key attempt from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requireOwnershipOrAdmin,
  optionalAuth,
  authenticateApiKey
};
