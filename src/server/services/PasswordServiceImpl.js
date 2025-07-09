/**
 * Password Service Implementation
 * Implements IPasswordService interface with full functionality
 */

const IPasswordService = require('../interfaces/IPasswordService');
const { PasswordEvents, createPasswordEvent } = require('../events/PasswordEvents');

class PasswordServiceImpl extends IPasswordService {
  constructor(database, encryption, validation, logger, eventBus) {
    super();
    this.database = database;
    this.encryption = encryption;
    this.validation = validation;
    this.logger = logger;
    this.eventBus = eventBus;
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Validate dependencies
      if (!this.database || !this.encryption || !this.validation || !this.logger || !this.eventBus) {
        throw new Error('Missing required dependencies');
      }

      // Test database connection
      await this.database.testConnection();
      
      this.isInitialized = true;
      this.logger.info('PasswordService initialized successfully');
      
    } catch (error) {
      this.logger.error('Error initializing PasswordService:', error);
      throw error;
    }
  }

  /**
   * Create a new password entry
   */
  async createPasswordEntry(passwordData, userId) {
    try {
      // Validate input data
      const validation = await this.validatePasswordData(passwordData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicates
      const duplicateCheck = await this.checkDuplicatePassword(passwordData);
      if (duplicateCheck.isDuplicate) {
        throw new Error('A password entry with this title and username already exists');
      }

      // Encrypt the password
      const encryptedPassword = this.encryption.encryptPassword(passwordData.password);
      
      // Prepare data for database
      const dbData = {
        title: passwordData.title,
        username: passwordData.username,
        password: encryptedPassword,
        url: passwordData.url || null,
        notes: passwordData.notes || null,
        category: passwordData.category || null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert into database
      const result = await this.database.query(
        `INSERT INTO passwords (title, username, password, url, notes, category, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dbData.title, dbData.username, dbData.password, dbData.url, dbData.notes, dbData.category, dbData.created_by, dbData.created_at, dbData.updated_at]
      );

      const passwordId = result.insertId || result.lastID;

      // Get the created password
      const createdPassword = await this.getPasswordById(passwordId);

      this.logger.info('Password entry created', {
        passwordId,
        title: passwordData.title,
        userId
      });

      return createdPassword;

    } catch (error) {
      this.logger.error('Error creating password entry:', error);
      throw error;
    }
  }

  /**
   * Get password entries with pagination and filtering
   */
  async getPasswordEntries(options) {
    try {
      const { page = 1, limit = 50, category, userId } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, title, username, url, notes, category, created_by, created_at, updated_at
        FROM passwords
        WHERE 1=1
      `;
      const params = [];

      // Add category filter
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      // Add ordering and pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      // Execute query
      const passwords = await this.database.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM passwords WHERE 1=1';
      const countParams = [];
      
      if (category) {
        countQuery += ' AND category = ?';
        countParams.push(category);
      }

      const countResult = await this.database.query(countQuery, countParams);
      const total = countResult[0].total;

      return {
        passwords: passwords.map(p => this.formatPasswordForResponse(p)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      this.logger.error('Error getting password entries:', error);
      throw error;
    }
  }

  /**
   * Get a single password entry by ID
   */
  async getPasswordById(passwordId) {
    try {
      const result = await this.database.query(
        'SELECT id, title, username, password, url, notes, category, created_by, created_at, updated_at FROM passwords WHERE id = ?',
        [passwordId]
      );

      if (result.length === 0) {
        return null;
      }

      const password = result[0];
      
      // Decrypt password for response
      const decryptedPassword = this.encryption.decryptPassword(password.password);
      
      return {
        ...this.formatPasswordForResponse(password),
        password: decryptedPassword
      };

    } catch (error) {
      this.logger.error('Error getting password by ID:', error);
      throw error;
    }
  }

  /**
   * Update a password entry
   */
  async updatePasswordEntry(passwordId, updateData, userId) {
    try {
      // Get existing password
      const existingPassword = await this.getPasswordById(passwordId);
      if (!existingPassword) {
        throw new Error('Password entry not found');
      }

      // Validate update data
      const validation = await this.validatePasswordData(updateData, true);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare update data
      const updateFields = [];
      const updateParams = [];

      if (updateData.title !== undefined) {
        updateFields.push('title = ?');
        updateParams.push(updateData.title);
      }

      if (updateData.username !== undefined) {
        updateFields.push('username = ?');
        updateParams.push(updateData.username);
      }

      if (updateData.password !== undefined) {
        const encryptedPassword = this.encryption.encryptPassword(updateData.password);
        updateFields.push('password = ?');
        updateParams.push(encryptedPassword);
      }

      if (updateData.url !== undefined) {
        updateFields.push('url = ?');
        updateParams.push(updateData.url);
      }

      if (updateData.notes !== undefined) {
        updateFields.push('notes = ?');
        updateParams.push(updateData.notes);
      }

      if (updateData.category !== undefined) {
        updateFields.push('category = ?');
        updateParams.push(updateData.category);
      }

      updateFields.push('updated_at = ?');
      updateParams.push(new Date().toISOString());

      // Add WHERE clause parameters
      updateParams.push(passwordId);

      // Execute update
      await this.database.query(
        `UPDATE passwords SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );

      // Get updated password
      const updatedPassword = await this.getPasswordById(passwordId);

      this.logger.info('Password entry updated', {
        passwordId,
        userId,
        updatedFields: Object.keys(updateData)
      });

      return updatedPassword;

    } catch (error) {
      this.logger.error('Error updating password entry:', error);
      throw error;
    }
  }

  /**
   * Delete a password entry
   */
  async deletePasswordEntry(passwordId, userId) {
    try {
      // Check if password exists
      const existingPassword = await this.getPasswordById(passwordId);
      if (!existingPassword) {
        return false;
      }

      // Delete from database
      const result = await this.database.query(
        'DELETE FROM passwords WHERE id = ?',
        [passwordId]
      );

      const deleted = result.affectedRows > 0;

      if (deleted) {
        this.logger.info('Password entry deleted', {
          passwordId,
          userId
        });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Error deleting password entry:', error);
      throw error;
    }
  }

  /**
   * Search password entries
   */
  async searchPasswords(query, options) {
    try {
      const { page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;
      const searchTerm = `%${query}%`;

      const searchQuery = `
        SELECT id, title, username, url, notes, category, created_by, created_at, updated_at
        FROM passwords
        WHERE title LIKE ? OR username LIKE ? OR url LIKE ? OR notes LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const passwords = await this.database.query(searchQuery, [
        searchTerm, searchTerm, searchTerm, searchTerm, limit, offset
      ]);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM passwords
        WHERE title LIKE ? OR username LIKE ? OR url LIKE ? OR notes LIKE ?
      `;

      const countResult = await this.database.query(countQuery, [
        searchTerm, searchTerm, searchTerm, searchTerm
      ]);

      const total = countResult[0].total;

      return {
        passwords: passwords.map(p => this.formatPasswordForResponse(p)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      this.logger.error('Error searching passwords:', error);
      throw error;
    }
  }

  /**
   * Validate password entry data
   */
  async validatePasswordData(passwordData, isUpdate = false) {
    return this.validation.validatePasswordEntry(passwordData);
  }

  /**
   * Check for duplicate password entries
   */
  async checkDuplicatePassword(passwordData, excludeId = null) {
    try {
      let query = 'SELECT id FROM passwords WHERE title = ? AND username = ?';
      const params = [passwordData.title, passwordData.username];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await this.database.query(query, params);

      return {
        isDuplicate: result.length > 0,
        existingId: result.length > 0 ? result[0].id : null
      };

    } catch (error) {
      this.logger.error('Error checking duplicate password:', error);
      throw error;
    }
  }

  /**
   * Format password for response (remove sensitive data)
   */
  formatPasswordForResponse(password) {
    return {
      id: password.id,
      title: password.title,
      username: password.username,
      url: password.url,
      notes: password.notes,
      category: password.category,
      createdBy: password.created_by,
      createdAt: password.created_at,
      updatedAt: password.updated_at
    };
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      // Test database connection
      await this.database.testConnection();
      
      return {
        service: this.getServiceName(),
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.getServiceVersion(),
        initialized: this.isInitialized
      };

    } catch (error) {
      return {
        service: this.getServiceName(),
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        initialized: this.isInitialized
      };
    }
  }

  // Placeholder implementations for interface compliance
  async getPasswordsByCategory(category, options) { throw new Error('Not implemented'); }
  async getPasswordsByUser(userId, options) { throw new Error('Not implemented'); }
  async bulkCreatePasswords(passwordsData, userId) { throw new Error('Not implemented'); }
  async bulkUpdatePasswords(updates, userId) { throw new Error('Not implemented'); }
  async bulkDeletePasswords(passwordIds, userId) { throw new Error('Not implemented'); }
  async exportPasswords(options, userId) { throw new Error('Not implemented'); }
  async importPasswords(importData, userId) { throw new Error('Not implemented'); }
  async getPasswordStatistics(options = {}) { throw new Error('Not implemented'); }
}

module.exports = PasswordServiceImpl;
