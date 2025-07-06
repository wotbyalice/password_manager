const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { validateEmail, validatePassword } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Create a new user account
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user object (without password)
 */
async function createUser(userData) {
  const { email, password, firstName, lastName, role = 'user' } = userData;

  // Validate input data
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }

  if (!validatePassword(password)) {
    throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required');
  }

  try {
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName, role]
    );

    const user = result.rows[0];
    
    logger.info(`User created successfully: ${email}`, { userId: user.id });

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at
    };

  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Find user by email address
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findUserByEmail(email) {
  try {
    const result = await query(
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
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    };

  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw error;
  }
}

/**
 * Find user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findUserById(userId) {
  try {
    const result = await query(
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
    logger.error('Error finding user by ID:', error);
    throw error;
  }
}

/**
 * Validate user password
 * @param {string} password - Plain text password
 * @param {string} passwordHash - Hashed password from database
 * @returns {Promise<boolean>} True if password is valid
 */
async function validatePassword(password, passwordHash) {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch (error) {
    logger.error('Error validating password:', error);
    return false;
  }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.verify(token, secret);
}

/**
 * Update user's last login timestamp
 * @param {number} userId - User ID
 */
async function updateLastLogin(userId) {
  try {
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  } catch (error) {
    logger.error('Error updating last login:', error);
  }
}

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
async function changePassword(userId, currentPassword, newPassword) {
  try {
    // Get current user
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get password hash for validation
    const userWithPassword = await findUserByEmail(user.email);
    
    // Validate current password
    const isCurrentPasswordValid = await validatePassword(currentPassword, userWithPassword.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      throw new Error('New password does not meet requirements');
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    logger.info(`Password changed successfully for user ID: ${userId}`);
    return true;

  } catch (error) {
    logger.error('Error changing password:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  validatePassword,
  generateToken,
  verifyToken,
  updateLastLogin,
  changePassword
};
