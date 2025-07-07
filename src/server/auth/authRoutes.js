const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPasswordHash,
  generateToken,
  updateLastLogin,
  changePassword
} = require('./authService');
const { validateEmail, validatePassword: validatePasswordStrength, validateName } = require('../utils/validation');
const { authLog, auditLog } = require('../utils/logger');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Import mock authentication for testing
const mockAuth = require('../services/mockAuth');

const router = express.Router();

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later'
  }
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate input
    if (!validateEmail(email)) {
      authLog('register_failed', email, false, { 
        ip: clientIP, 
        userAgent, 
        error: 'Invalid email format' 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (!validatePasswordStrength(password)) {
      authLog('register_failed', email, false, { 
        ip: clientIP, 
        userAgent, 
        error: 'Weak password' 
      });
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      });
    }

    if (!validateName(firstName) || !validateName(lastName)) {
      authLog('register_failed', email, false, { 
        ip: clientIP, 
        userAgent, 
        error: 'Invalid name format' 
      });
      return res.status(400).json({
        success: false,
        error: 'First name and last name must contain only letters, spaces, hyphens, and apostrophes'
      });
    }

    // Create user
    const user = await createUser({
      email,
      password,
      firstName,
      lastName,
      role
    });

    authLog('register_success', email, true, { ip: clientIP, userAgent });
    auditLog('user_created', user.id, { 
      ip: clientIP, 
      userAgent, 
      resource: 'user', 
      resourceId: user.id 
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (error.message.includes('already exists')) {
      authLog('register_failed', req.body.email, false, { 
        ip: clientIP, 
        userAgent, 
        error: 'Email already exists' 
      });
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }

    authLog('register_failed', req.body.email, false, { 
      ip: clientIP, 
      userAgent, 
      error: error.message 
    });

    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate input
    if (!email || !password) {
      authLog('login_failed', email, false, {
        ip: clientIP,
        userAgent,
        error: 'Missing credentials'
      });
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Use mock authentication if database connection is skipped
    if (process.env.SKIP_DB_CONNECTION === 'true') {
      try {
        const result = await mockAuth.login(email, password);

        authLog('login_success', email, true, { ip: clientIP, userAgent });

        res.json({
          success: true,
          message: 'Login successful',
          token: result.token,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            role: result.user.role,
            lastLogin: result.user.last_login
          }
        });
        return;
      } catch (mockError) {
        authLog('login_failed', email, false, {
          ip: clientIP,
          userAgent,
          error: mockError.message
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
    }

    // Original database authentication logic
    const user = await findUserByEmail(email);
    if (!user) {
      authLog('login_failed', email, false, {
        ip: clientIP,
        userAgent,
        error: 'User not found'
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      authLog('login_failed', email, false, {
        ip: clientIP,
        userAgent,
        error: 'Account disabled'
      });
      return res.status(401).json({
        success: false,
        error: 'Account is disabled'
      });
    }

    // Validate password
    const isPasswordValid = await verifyPasswordHash(password, user.passwordHash);
    if (!isPasswordValid) {
      authLog('login_failed', email, false, {
        ip: clientIP,
        userAgent,
        error: 'Invalid password'
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user);

    authLog('login_success', email, true, { ip: clientIP, userAgent });
    auditLog('user_login', user.id, { ip: clientIP, userAgent });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: new Date()
      }
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    authLog('login_failed', req.body.email, false, {
      ip: clientIP,
      userAgent,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
 */
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters with uppercase, lowercase, number, and special character'
      });
    }

    // Change password
    await changePassword(userId, currentPassword, newPassword);

    auditLog('password_changed', userId, { ip: clientIP, userAgent });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('password_change_failed', req.user.userId, { 
      ip: clientIP, 
      userAgent, 
      error: error.message 
    });

    if (error.message.includes('Current password is incorrect')) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Password change failed'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate token on client side)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    auditLog('user_logout', req.user.userId, { ip: clientIP, userAgent });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

module.exports = router;
