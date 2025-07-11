const { query, transaction } = require('../database/connection');
const { encryptPassword, decryptPassword, encryptData, decryptData } = require('../encryption/cryptoUtils');
const { validatePasswordEntry, validatePagination, validateSearchQuery } = require('../utils/validation');
const { passwordLog, auditLog } = require('../utils/logger');

/**
 * Create a new password entry
 * @param {Object} passwordData - Password entry data
 * @param {number} userId - ID of user creating the entry
 * @returns {Promise<Object>} Created password entry
 */
async function createPasswordEntry(passwordData, userId) {
  const { title, username, password, url, notes, categoryId } = passwordData;

  // Validate input data
  const validation = validatePasswordEntry(passwordData);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  try {
    // Validate category ID if provided
    if (categoryId) {
      const categoryCheck = await query(
        'SELECT id FROM password_categories WHERE id = $1',
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error('Invalid category ID');
      }
    }

    // Encrypt sensitive data
    const passwordEncrypted = encryptPassword(password);
    const notesEncrypted = notes ? encryptData(notes) : null;
    const urlEncrypted = url ? encryptData(url) : null;

    // Insert password entry
    const result = await query(
      `INSERT INTO password_entries
       (title, username, password_encrypted, url_encrypted, notes_encrypted, category_id, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING id, title, username, url_encrypted, notes_encrypted, category_id, created_by, created_at`,
      [title, username, passwordEncrypted, urlEncrypted, notesEncrypted, categoryId, userId]
    );

    const createdEntry = result.rows[0];

    // Log the creation
    passwordLog('password_created', userId, createdEntry.id, {
      title: createdEntry.title,
      categoryId: createdEntry.category_id,
      success: true
    });

    // Return entry without encrypted password
    return {
      id: createdEntry.id,
      title: createdEntry.title,
      username: createdEntry.username,
      url: createdEntry.url_encrypted ? decryptData(createdEntry.url_encrypted) : null,
      notes: createdEntry.notes_encrypted ? decryptData(createdEntry.notes_encrypted) : null,
      category: createdEntry.category,
      createdBy: createdEntry.created_by,
      createdAt: createdEntry.created_at
    };

  } catch (error) {
    passwordLog('password_create_failed', userId, null, {
      title: title,
      category: category,
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get password entries with pagination and filtering
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of password entries
 */
async function getPasswordEntries(options = {}) {
  const { page = 1, limit = 50, category, userId } = options;
  const pagination = validatePagination(page, limit);

  try {
    let whereClause = 'WHERE is_deleted = false';
    const queryParams = [];
    let paramCount = 0;

    // Add category filter
    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      queryParams.push(category);
    }

    // Build query with category join
    const countQuery = `
      SELECT COUNT(*)
      FROM password_entries pe
      LEFT JOIN password_categories pc ON pe.category_id = pc.id
      ${whereClause}
    `;
    const dataQuery = `
      SELECT pe.id, pe.title, pe.username, pe.password_encrypted, pe.url_encrypted, pe.notes_encrypted,
             pe.category_id, pe.created_by, pe.updated_by, pe.created_at, pe.updated_at,
             pc.name as category_name, pc.description as category_description, pc.color as category_color
      FROM password_entries pe
      LEFT JOIN password_categories pc ON pe.category_id = pc.id
      ${whereClause}
      ORDER BY title ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(pagination.limit, pagination.offset);

    // Execute queries
    const [countResult, dataResult] = await Promise.all([
      query(countQuery, queryParams.slice(0, paramCount)),
      query(dataQuery, queryParams)
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const entries = dataResult.rows;

    // Decrypt passwords and sensitive data
    const decryptedEntries = entries.map(entry => {
      console.log('🔧 Decrypting entry:', {
        id: entry.id,
        title: entry.title,
        password_encrypted: entry.password_encrypted ? entry.password_encrypted.substring(0, 20) + '...' : 'NULL',
        url_encrypted: entry.url_encrypted ? entry.url_encrypted.substring(0, 20) + '...' : 'NULL',
        notes_encrypted: entry.notes_encrypted ? entry.notes_encrypted.substring(0, 20) + '...' : 'NULL'
      });

      let decryptedPassword = null;
      let decryptedUrl = null;
      let decryptedNotes = null;

      try {
        decryptedPassword = entry.password_encrypted ? decryptPassword(entry.password_encrypted) : null;
        console.log('🔧 Password decrypted successfully');
      } catch (error) {
        console.error('🔧 Password decryption failed:', error.message);
      }

      try {
        decryptedUrl = entry.url_encrypted ? decryptData(entry.url_encrypted) : null;
        console.log('🔧 URL decrypted successfully');
      } catch (error) {
        console.error('🔧 URL decryption failed:', error.message);
      }

      try {
        decryptedNotes = entry.notes_encrypted ? decryptData(entry.notes_encrypted) : null;
        console.log('🔧 Notes decrypted successfully');
      } catch (error) {
        console.error('🔧 Notes decryption failed:', error.message);
      }

      const decrypted = {
        id: entry.id,
        title: entry.title,
        username: entry.username,
        password: decryptedPassword,
        url: decryptedUrl,
        notes: decryptedNotes,
        category: entry.category,
        createdBy: entry.created_by,
        updatedBy: entry.updated_by,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      };

      console.log('🔧 Decrypted result:', {
        id: decrypted.id,
        title: decrypted.title,
        password: decrypted.password ? decrypted.password.substring(0, 3) + '***' : 'NULL',
        url: decrypted.url || 'NULL',
        notes: decrypted.notes ? decrypted.notes.substring(0, 10) + '...' : 'NULL'
      });

      return decrypted;
    });

    return {
      passwords: decryptedEntries,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / pagination.limit)
      }
    };

  } catch (error) {
    throw new Error(`Failed to retrieve password entries: ${error.message}`);
  }
}

/**
 * Get a single password entry by ID
 * @param {number} passwordId - Password entry ID
 * @returns {Promise<Object|null>} Password entry or null if not found
 */
async function getPasswordById(passwordId) {
  try {
    console.log('🔧 PASSWORD SERVICE: getPasswordById called with:', passwordId);

    const result = await query(
      `SELECT id, title, username, password_encrypted, url_encrypted, notes_encrypted,
              category, created_by, updated_by, created_at, updated_at
       FROM password_entries
       WHERE id = $1 AND is_deleted = false`,
      [passwordId]
    );

    console.log('🔧 PASSWORD SERVICE: Query result rows:', result.rows.length);
    console.log('🔧 PASSWORD SERVICE: Query result:', result);

    if (result.rows.length === 0) {
      console.log('🔧 PASSWORD SERVICE: No rows found, returning null');
      return null;
    }

    const entry = result.rows[0];
    console.log('🔧 PASSWORD SERVICE: Found entry:', {
      id: entry.id,
      title: entry.title,
      username: entry.username,
      hasPasswordEncrypted: !!entry.password_encrypted,
      passwordEncryptedLength: entry.password_encrypted ? entry.password_encrypted.length : 0,
      category: entry.category
    });

    console.log('🔧 PASSWORD SERVICE: Starting decryption...');

    let decryptedPassword;
    try {
      // Handle undefined/null password_encrypted gracefully
      const passwordToDecrypt = entry.password_encrypted || '';
      decryptedPassword = decryptPassword(passwordToDecrypt);
      console.log('🔧 PASSWORD SERVICE: Password decryption successful');
    } catch (decryptError) {
      console.error('🔧 PASSWORD SERVICE: Password decryption failed:', decryptError);
      // For edit functionality, don't throw error - just return empty password
      console.log('🔧 PASSWORD SERVICE: Using empty password for edit functionality');
      decryptedPassword = '';
    }

    let decryptedUrl = null;
    if (entry.url_encrypted) {
      try {
        decryptedUrl = decryptData(entry.url_encrypted);
        console.log('🔧 PASSWORD SERVICE: URL decryption successful');
      } catch (urlError) {
        console.error('🔧 PASSWORD SERVICE: URL decryption failed:', urlError);
        // Don't throw, just set to null
      }
    }

    let decryptedNotes = null;
    if (entry.notes_encrypted) {
      try {
        decryptedNotes = decryptData(entry.notes_encrypted);
        console.log('🔧 PASSWORD SERVICE: Notes decryption successful');
      } catch (notesError) {
        console.error('🔧 PASSWORD SERVICE: Notes decryption failed:', notesError);
        // Don't throw, just set to null
      }
    }

    const result_obj = {
      id: entry.id,
      title: entry.title,
      username: entry.username,
      password: decryptedPassword,
      url: decryptedUrl,
      notes: decryptedNotes,
      categoryId: entry.category_id,
      category: entry.category_name ? {
        id: entry.category_id,
        name: entry.category_name,
        description: entry.category_description,
        color: entry.category_color
      } : null,
      createdBy: entry.created_by,
      updatedBy: entry.updated_by,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at
    };

    console.log('🔧 PASSWORD SERVICE: Returning decrypted password object');
    return result_obj;

  } catch (error) {
    console.error('🔧 PASSWORD SERVICE: Error in getPasswordById:', error);
    throw new Error(`Failed to retrieve password entry: ${error.message}`);
  }
}

/**
 * Update a password entry (admin only)
 * @param {number} passwordId - Password entry ID
 * @param {Object} updateData - Data to update
 * @param {number} userId - ID of user making the update
 * @returns {Promise<Object>} Updated password entry
 */
async function updatePasswordEntry(passwordId, updateData, userId) {
  console.log('🔧🔧🔧 UPDATED CODE LOADED - updatePasswordEntry called!');

  // IMMEDIATE SQLite check to bypass transaction issues
  const useSQLite = process.env.DATABASE_TYPE === 'sqlite' || !process.env.DATABASE_URL;
  console.log('🔧 DATABASE CHECK: useSQLite =', useSQLite);

  if (useSQLite) {
    console.log('🔧 BYPASSING TRANSACTION - Using direct SQLite update');
    return await updatePasswordDirectSQLite(passwordId, updateData, userId);
  }

  const { title, username, password, url, notes, category } = updateData;

  console.log('🔧 PASSWORD SERVICE: updatePasswordEntry called with:', {
    passwordId,
    updateData: { title, username, hasPassword: !!password, url, notes, category },
    userId
  });

  // Validate input data
  const validation = validatePasswordEntry({ title, username, password: password || 'dummy', url, notes, category });
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  try {
    console.log('🔧 PASSWORD SERVICE: Using PostgreSQL transaction method');
    return await transaction(async (client) => {
      // Get current entry for audit log
      const currentResult = await client.query(
        'SELECT * FROM password_entries WHERE id = $1 AND is_deleted = false',
        [passwordId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Password entry not found');
      }

      const currentEntry = currentResult.rows[0];

      // Prepare update data
      const updates = [];
      const values = [];
      let paramCount = 0;

      if (title !== undefined) {
        paramCount++;
        updates.push(`title = $${paramCount}`);
        values.push(title);
      }

      if (username !== undefined) {
        paramCount++;
        updates.push(`username = $${paramCount}`);
        values.push(username);
      }

      if (password !== undefined) {
        paramCount++;
        updates.push(`password_encrypted = $${paramCount}`);
        values.push(encryptPassword(password));
      }

      if (url !== undefined) {
        paramCount++;
        updates.push(`url_encrypted = $${paramCount}`);
        values.push(url ? encryptData(url) : null);
      }

      if (notes !== undefined) {
        paramCount++;
        updates.push(`notes_encrypted = $${paramCount}`);
        values.push(notes ? encryptData(notes) : null);
      }

      if (category !== undefined) {
        paramCount++;
        updates.push(`category = $${paramCount}`);
        values.push(category);
      }

      // Add updated_by and updated_at
      paramCount++;
      updates.push(`updated_by = $${paramCount}`);
      values.push(userId);

      paramCount++;
      updates.push(`updated_at = NOW()`);

      // Add WHERE clause parameter
      paramCount++;
      values.push(passwordId);

      // Execute update
      const updateQuery = `
        UPDATE password_entries 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, title, username, url_encrypted, notes_encrypted, category, 
                  created_by, updated_by, created_at, updated_at
      `;

      const result = await client.query(updateQuery, values);
      const updatedEntry = result.rows[0];

      // Log the update
      passwordLog('password_updated', userId, passwordId, {
        title: updatedEntry.title,
        category: updatedEntry.category,
        success: true
      });

      // Return decrypted entry
      return {
        id: updatedEntry.id,
        title: updatedEntry.title,
        username: updatedEntry.username,
        url: updatedEntry.url_encrypted ? decryptData(updatedEntry.url_encrypted) : null,
        notes: updatedEntry.notes_encrypted ? decryptData(updatedEntry.notes_encrypted) : null,
        category: updatedEntry.category,
        createdBy: updatedEntry.created_by,
        updatedBy: updatedEntry.updated_by,
        createdAt: updatedEntry.created_at,
        updatedAt: updatedEntry.updated_at
      };
    });

  } catch (error) {
    passwordLog('password_update_failed', userId, passwordId, {
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update password entry for SQLite (no transactions needed)
 */
async function updatePasswordSQLite(passwordId, updateData, userId) {
  const { title, username, password, url, notes, categoryId } = updateData;

  console.log('🔧 PASSWORD SERVICE: updatePasswordSQLite called');

  // Get current entry first
  const currentResult = await query(
    'SELECT * FROM password_entries WHERE id = $1 AND is_deleted = false',
    [passwordId]
  );

  if (currentResult.rows.length === 0) {
    throw new Error('Password entry not found');
  }

  const currentEntry = currentResult.rows[0];
  console.log('🔧 PASSWORD SERVICE: Current entry found:', {
    id: currentEntry.id,
    title: currentEntry.title
  });

  // Prepare update data with encryption
  const updates = [];
  const values = [];
  let paramCount = 0;

  if (title !== undefined) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    values.push(title);
  }

  if (username !== undefined) {
    paramCount++;
    updates.push(`username = $${paramCount}`);
    values.push(username);
  }

  if (password !== undefined) {
    paramCount++;
    updates.push(`password_encrypted = $${paramCount}`);
    values.push(encryptPassword(password));
    console.log('🔧 PASSWORD SERVICE: Password encrypted for update');
  }

  if (url !== undefined) {
    paramCount++;
    updates.push(`url_encrypted = $${paramCount}`);
    values.push(url ? encryptData(url) : null);
  }

  if (notes !== undefined) {
    paramCount++;
    updates.push(`notes_encrypted = $${paramCount}`);
    values.push(notes ? encryptData(notes) : null);
  }

  if (categoryId !== undefined) {
    // Validate category ID if provided
    if (categoryId !== null) {
      const categoryCheck = await query(
        'SELECT id FROM password_categories WHERE id = $1',
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error('Invalid category ID');
      }
    }

    paramCount++;
    updates.push(`category_id = $${paramCount}`);
    values.push(categoryId);
  }

  // Add updated_by and updated_at
  paramCount++;
  updates.push(`updated_by = $${paramCount}`);
  values.push(userId);

  paramCount++;
  updates.push(`updated_at = $${paramCount}`);
  values.push(new Date().toISOString());

  // Add WHERE clause parameter
  paramCount++;
  values.push(passwordId);

  console.log('🔧 PASSWORD SERVICE: Executing SQLite update with values:', values.length);

  // Execute update
  const updateQuery = `
    UPDATE password_entries
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
  `;

  const result = await query(updateQuery, values);
  console.log('🔧 PASSWORD SERVICE: SQLite update completed');

  // Get the updated entry
  const updatedResult = await query(
    'SELECT id, title, username, password_encrypted, url_encrypted, notes_encrypted, category, created_by, updated_by, created_at, updated_at FROM password_entries WHERE id = $1',
    [passwordId]
  );

  const updatedEntry = updatedResult.rows[0];

  // Log the update
  passwordLog('password_updated', userId, passwordId, {
    title: updatedEntry.title,
    category: updatedEntry.category,
    success: true
  });

  console.log('🔧 PASSWORD SERVICE: Returning decrypted SQLite update result');

  // Return decrypted entry
  return {
    id: updatedEntry.id,
    title: updatedEntry.title,
    username: updatedEntry.username,
    password: decryptPassword(updatedEntry.password_encrypted),
    url: updatedEntry.url_encrypted ? decryptData(updatedEntry.url_encrypted) : null,
    notes: updatedEntry.notes_encrypted ? decryptData(updatedEntry.notes_encrypted) : null,
    category: updatedEntry.category,
    createdBy: updatedEntry.created_by,
    updatedBy: updatedEntry.updated_by,
    createdAt: updatedEntry.created_at,
    updatedAt: updatedEntry.updated_at
  };
}

/**
 * Direct SQLite update (bypasses transaction system)
 */
async function updatePasswordDirectSQLite(passwordId, updateData, userId) {
  console.log('🔧 DIRECT SQLITE UPDATE: Starting update for password ID:', passwordId);

  const { title, username, password, url, notes, category } = updateData;

  // Validate input data
  const validation = validatePasswordEntry({ title, username, password: password || 'dummy', url, notes, category });
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  try {
    // Get current entry first
    const currentResult = await query(
      'SELECT * FROM password_entries WHERE id = $1 AND is_deleted = false',
      [passwordId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Password entry not found');
    }

    const currentEntry = currentResult.rows[0];
    console.log('🔧 DIRECT SQLITE: Current entry found:', {
      id: currentEntry.id,
      title: currentEntry.title
    });

    // Prepare encrypted data
    const encryptedPassword = password ? encryptPassword(password) : currentEntry.password_encrypted;
    const encryptedUrl = url !== undefined ? (url ? encryptData(url) : null) : currentEntry.url_encrypted;
    const encryptedNotes = notes !== undefined ? (notes ? encryptData(notes) : null) : currentEntry.notes_encrypted;

    console.log('🔧 DIRECT SQLITE: Data encrypted, executing update');

    // Execute direct update
    const updateResult = await query(`
      UPDATE password_entries
      SET title = $1, username = $2, password_encrypted = $3, url_encrypted = $4,
          notes_encrypted = $5, category = $6, updated_by = $7, updated_at = $8
      WHERE id = $9
    `, [
      title || currentEntry.title,
      username || currentEntry.username,
      encryptedPassword,
      encryptedUrl,
      encryptedNotes,
      category || currentEntry.category,
      userId,
      new Date().toISOString(),
      passwordId
    ]);

    console.log('🔧 DIRECT SQLITE: Update executed, getting updated entry');

    // Get the updated entry
    const updatedResult = await query(
      'SELECT id, title, username, password_encrypted, url_encrypted, notes_encrypted, category, created_by, updated_by, created_at, updated_at FROM password_entries WHERE id = $1',
      [passwordId]
    );

    const updatedEntry = updatedResult.rows[0];

    // Log the update
    passwordLog('password_updated', userId, passwordId, {
      title: updatedEntry.title,
      category: updatedEntry.category,
      success: true
    });

    console.log('🔧 DIRECT SQLITE: Update completed successfully');

    // Return decrypted entry
    return {
      id: updatedEntry.id,
      title: updatedEntry.title,
      username: updatedEntry.username,
      password: decryptPassword(updatedEntry.password_encrypted),
      url: updatedEntry.url_encrypted ? decryptData(updatedEntry.url_encrypted) : null,
      notes: updatedEntry.notes_encrypted ? decryptData(updatedEntry.notes_encrypted) : null,
      category: updatedEntry.category,
      createdBy: updatedEntry.created_by,
      updatedBy: updatedEntry.updated_by,
      createdAt: updatedEntry.created_at,
      updatedAt: updatedEntry.updated_at
    };

  } catch (error) {
    console.log('🔧 DIRECT SQLITE ERROR:', error.message);
    passwordLog('password_update_failed', userId, passwordId, {
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete a password entry (soft delete, admin only)
 * @param {number} passwordId - Password entry ID
 * @param {number} userId - ID of user making the deletion
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deletePasswordEntry(passwordId, userId) {
  try {
    const result = await query(
      `UPDATE password_entries 
       SET is_deleted = true, updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND is_deleted = false
       RETURNING id, title, category`,
      [userId, passwordId]
    );

    if (result.rows.length === 0) {
      return false; // Entry not found or already deleted
    }

    const deletedEntry = result.rows[0];

    // Log the deletion
    passwordLog('password_deleted', userId, passwordId, {
      title: deletedEntry.title,
      category: deletedEntry.category,
      success: true
    });

    return true;

  } catch (error) {
    passwordLog('password_delete_failed', userId, passwordId, {
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Search password entries
 * @param {string} searchQuery - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching password entries
 */
async function searchPasswords(searchQuery, options = {}) {
  const query_text = validateSearchQuery(searchQuery);
  const { page = 1, limit = 50 } = options;
  const pagination = validatePagination(page, limit);

  if (!query_text) {
    return { passwords: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
  }

  try {
    const searchPattern = `%${query_text.toLowerCase()}%`;
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM password_entries 
      WHERE is_deleted = false 
        AND (LOWER(title) LIKE $1 OR LOWER(username) LIKE $1 OR LOWER(category) LIKE $1)
    `;

    const dataQuery = `
      SELECT id, title, username, password_encrypted, url_encrypted, notes_encrypted,
             category, created_by, updated_by, created_at, updated_at
      FROM password_entries 
      WHERE is_deleted = false 
        AND (LOWER(title) LIKE $1 OR LOWER(username) LIKE $1 OR LOWER(category) LIKE $1)
      ORDER BY 
        CASE 
          WHEN LOWER(title) LIKE $1 THEN 1
          WHEN LOWER(username) LIKE $1 THEN 2
          ELSE 3
        END,
        title ASC
      LIMIT $2 OFFSET $3
    `;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, [searchPattern]),
      query(dataQuery, [searchPattern, pagination.limit, pagination.offset])
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const entries = dataResult.rows;

    // Decrypt passwords and sensitive data
    const decryptedEntries = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      username: entry.username,
      password: decryptPassword(entry.password_encrypted),
      url: entry.url_encrypted ? decryptData(entry.url_encrypted) : null,
      notes: entry.notes_encrypted ? decryptData(entry.notes_encrypted) : null,
      category: entry.category,
      createdBy: entry.created_by,
      updatedBy: entry.updated_by,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at
    }));

    return {
      passwords: decryptedEntries,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / pagination.limit)
      }
    };

  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

module.exports = {
  createPasswordEntry,
  getPasswordEntries,
  getPasswordById,
  updatePasswordEntry,
  deletePasswordEntry,
  searchPasswords
};
