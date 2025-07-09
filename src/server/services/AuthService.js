/**
 * Authentication Service with Dependency Injection
 * Refactored from authService.js to use DI container
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  constructor(database, encryption, validation, logger, config) {
    this.database = database;
    this.encryption = encryption;
    this.validation = validation;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Create a new user account
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object (without password)
   */
  async createUser(userData) {
    const { email, password, firstName, lastName, role = 'user' } = userData;

    // Validate input data
    if (!this.validation.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.validation.validatePassword(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }

    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const securityConfig = this.config.getSection('security');
      const saltRounds = securityConfig.bcryptRounds;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert user into database
      const result = await this.database.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, first_name, last_name, role, created_at`,
        [email.toLowerCase(), passwordHash, firstName, lastName, role]
      );

      const user = result.rows[0];
      
      this.logger.auditLog('USER_CREATED', user.id, {
        email: user.email,
        role: user.role,
        createdBy: 'system'
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      };

    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email address
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserByEmail(email) {
    try {
      const result = await this.database.query(
        'SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at, last_login FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active !== false, // Default to true if not specified
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      };

    } catch (error) {
      this.logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserById(userId) {
    try {
      const result = await this.database.query(
        'SELECT id, email, first_name, last_name, role, created_at, updated_at, last_login FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      };

    } catch (error) {
      this.logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Stored password hash
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPasswordHash(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      this.logger.error('Error verifying password hash:', error);
      return false;
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const securityConfig = this.config.getSection('security');
    const secret = securityConfig.jwtSecret;
    const expiresIn = securityConfig.jwtExpiresIn;

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      const securityConfig = this.config.getSection('security');
      const secret = securityConfig.jwtSecret;
      return jwt.verify(token, secret);
    } catch (error) {
      this.logger.debug('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Update user's last login timestamp
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async updateLastLogin(userId) {
    try {
      await this.database.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [userId]
      );

      this.logger.authLog('LOGIN', userId, true, {
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logger.error('Error updating last login:', error);
      return false;
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password hash
      const result = await this.database.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPasswordHash(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (!this.validation.validatePassword(newPassword)) {
        throw new Error('New password does not meet requirements');
      }

      // Hash new password
      const securityConfig = this.config.getSection('security');
      const saltRounds = securityConfig.bcryptRounds;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await this.database.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      this.logger.auditLog('PASSWORD_CHANGED', userId, {
        timestamp: new Date().toISOString()
      });

      return true;

    } catch (error) {
      this.logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      const result = await this.database.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_users
        FROM users
      `);

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deactivateUser(userId) {
    try {
      await this.database.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      this.logger.auditLog('USER_DEACTIVATED', userId, {
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Activate user account
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async activateUser(userId) {
    try {
      await this.database.query(
        'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      this.logger.auditLog('USER_ACTIVATED', userId, {
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logger.error('Error activating user:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
