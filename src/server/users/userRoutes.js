/**
 * User Routes for Password Manager
 * Handles user management operations
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // For now, return mock data since we don't have a full user service
    const users = [
      {
        id: 1,
        email: 'admin@company.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    ];

    logger.info('Users retrieved successfully', {
      service: 'password-manager',
      userId: req.user.id,
      count: users.length
    });

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    logger.error('Error retrieving users', {
      service: 'password-manager',
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
});

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, role = 'user' } = req.body;

    // Basic validation
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, first name, and last name are required'
      });
    }

    // For now, return mock response
    const newUser = {
      id: Date.now(), // Mock ID
      email,
      firstName,
      lastName,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    logger.info('User created successfully', {
      service: 'password-manager',
      userId: req.user.id,
      newUserId: newUser.id,
      email: newUser.email
    });

    res.status(201).json({
      success: true,
      user: newUser
    });

  } catch (error) {
    logger.error('Error creating user', {
      service: 'password-manager',
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, firstName, lastName, role, isActive } = req.body;

    // For now, return mock response
    const updatedUser = {
      id: userId,
      email: email || 'admin@company.com',
      firstName: firstName || 'System',
      lastName: lastName || 'Administrator',
      role: role || 'admin',
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    logger.info('User updated successfully', {
      service: 'password-manager',
      userId: req.user.id,
      updatedUserId: userId
    });

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    logger.error('Error updating user', {
      service: 'password-manager',
      error: error.message,
      userId: req.user?.id,
      targetUserId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    logger.info('User deleted successfully', {
      service: 'password-manager',
      userId: req.user.id,
      deletedUserId: userId
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting user', {
      service: 'password-manager',
      error: error.message,
      userId: req.user?.id,
      targetUserId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

module.exports = router;
