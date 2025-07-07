const fs = require('fs');
const path = require('path');

/**
 * Simple SQLite-like adapter using JSON file storage
 * This is a temporary solution for development/testing
 */
class SQLiteAdapter {
  constructor(dbPath = './data/password_manager.json') {
    this.dbPath = dbPath;
    this.data = {
      users: [],
      passwords: [],
      audit_logs: []
    };
    
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Load existing data
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileContent);
      }
    } catch (error) {
      console.warn('Could not load existing data, starting fresh:', error.message);
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save data:', error.message);
      throw error;
    }
  }

  // Simulate SQL query interface
  async query(sql, params = []) {
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.includes('create table')) {
      // Tables are automatically created in our JSON structure
      return { rows: [], rowCount: 0 };
    }

    if (sqlLower.includes('select now()')) {
      return { rows: [{ current_time: new Date().toISOString() }] };
    }
    
    if (sqlLower.includes('insert into users')) {
      return this.insertUser(params);
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('from users') && sqlLower.includes('where email')) {
      return this.findUserByEmail(params[0]);
    }

    if (sqlLower.includes('select') && sqlLower.includes('from users') && sqlLower.includes('where id')) {
      return this.findUserById(params[0]);
    }
    
    if (sqlLower.includes('insert into passwords') || sqlLower.includes('insert into password_entries')) {
      return this.insertPassword(params);
    }
    
    if (sqlLower.includes('select count(*) from password_entries')) {
      return this.getPasswordCount(params);
    }

    // Handle individual password retrieval by ID
    if (sqlLower.includes('from password_entries') && sqlLower.includes('where id = $1')) {
      return this.getPasswordById(params[0]);
    }

    if (sqlLower.includes('select * from passwords') || sqlLower.includes('from password_entries')) {
      return this.getPasswords(params);
    }

    // Handle password updates (UPDATE password_entries SET ...)
    if (sqlLower.includes('update password_entries') && sqlLower.includes('set') && !sqlLower.includes('is_deleted = true')) {
      return this.updatePassword(params);
    }

    // Handle password deletion (soft delete: UPDATE password_entries SET is_deleted = true)
    if (sqlLower.includes('update password_entries') && sqlLower.includes('is_deleted = true')) {
      return this.deletePassword(params);
    }
    
    // Default response for unhandled queries
    return { rows: [], rowCount: 0 };
  }

  insertUser(params) {
    const [email, hashedPassword, role, firstName, lastName] = params;
    const user = {
      id: this.data.users.length + 1,
      email,
      password_hash: hashedPassword,
      role: role || 'user',
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.data.users.push(user);
    this.saveData();
    
    return { rows: [user], rowCount: 1 };
  }

  findUserByEmail(email) {
    const user = this.data.users.find(u => u.email === email);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  findUserById(userId) {
    const user = this.data.users.find(u => u.id === parseInt(userId));
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  insertPassword(params) {
    const [title, username, encryptedPassword, urlEncrypted, notesEncrypted, category, userId] = params;
    const password = {
      id: this.data.passwords.length + 1,
      title,
      username,
      encrypted_password: encryptedPassword,
      url: urlEncrypted,
      notes: notesEncrypted,
      category,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.data.passwords.push(password);
    this.saveData();

    // Return in the format expected by the RETURNING clause
    const returnedPassword = {
      id: password.id,
      title: password.title,
      username: password.username,
      password_encrypted: password.encrypted_password,
      url_encrypted: password.url,
      notes_encrypted: password.notes,
      category: password.category,
      created_by: password.user_id,
      created_at: password.created_at
    };

    return { rows: [returnedPassword], rowCount: 1 };
  }

  getPasswords(params) {
    let passwords = [...this.data.passwords];

    // Convert our JSON structure to match expected database structure
    passwords = passwords.map(p => {
      return {
        id: p.id,
        title: p.title,
        username: p.username,
        password_encrypted: p.encrypted_password,
        url_encrypted: p.url,
        notes_encrypted: p.notes,
        category: p.category,
        created_by: p.user_id,
        updated_by: p.user_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
        is_deleted: false
      };
    });

    // For the complex query, params are [limit, offset], not userId filter
    // We don't need to filter by user since admin can see all passwords

    return { rows: passwords, rowCount: passwords.length };
  }

  getPasswordById(id) {
    const passwordId = parseInt(id);
    const password = this.data.passwords.find(p => p.id === passwordId);

    if (!password) {
      return { rows: [], rowCount: 0 };
    }

    // Convert our JSON structure to match expected database structure
    const fakeEncrypted = Buffer.from(password.password).toString('base64');

    const convertedPassword = {
      id: password.id,
      title: password.title,
      username: password.username,
      password_encrypted: fakeEncrypted,
      url_encrypted: password.url ? Buffer.from(password.url).toString('base64') : null,
      notes_encrypted: password.notes ? Buffer.from(password.notes).toString('base64') : null,
      category: password.category,
      created_by: password.user_id,
      updated_by: password.user_id,
      created_at: password.created_at,
      updated_at: password.updated_at,
      is_deleted: false
    };

    return { rows: [convertedPassword], rowCount: 1 };
  }

  getPasswordCount(params) {
    let passwords = [...this.data.passwords];

    // Apply same filtering as getPasswords
    if (params && params.length > 0) {
      const userId = params[0];
      passwords = passwords.filter(p => p.user_id === userId);
    }

    return { rows: [{ count: passwords.length.toString() }], rowCount: 1 };
  }

  updatePassword(params) {
    // For UPDATE password_entries queries, the last parameter is the password ID
    const passwordId = parseInt(params[params.length - 1]);
    const passwordIndex = this.data.passwords.findIndex(p => p.id === passwordId);

    if (passwordIndex === -1) {
      return { rows: [], rowCount: 0 };
    }

    // Extract update values (all params except the last one which is the ID)
    const updateValues = params.slice(0, -1);
    const password = this.data.passwords[passwordIndex];

    // Update the password with new values
    // The order depends on what fields are being updated
    // For now, we'll handle the most common case: title, username, password, url, notes, category
    if (updateValues.length >= 6) {
      const [title, username, encryptedPassword, urlEncrypted, notesEncrypted, category] = updateValues;

      this.data.passwords[passwordIndex] = {
        ...password,
        title: title || password.title,
        username: username || password.username,
        password: encryptedPassword ? Buffer.from(encryptedPassword, 'base64').toString() : password.password,
        url: urlEncrypted ? Buffer.from(urlEncrypted, 'base64').toString() : password.url,
        notes: notesEncrypted ? Buffer.from(notesEncrypted, 'base64').toString() : password.notes,
        category: category || password.category,
        updated_at: new Date().toISOString()
      };
    }

    this.saveData();

    // Return in expected database format
    const updatedPassword = this.data.passwords[passwordIndex];
    const fakeEncrypted = Buffer.from(updatedPassword.password).toString('base64');

    const convertedPassword = {
      id: updatedPassword.id,
      title: updatedPassword.title,
      username: updatedPassword.username,
      password_encrypted: fakeEncrypted,
      url_encrypted: updatedPassword.url ? Buffer.from(updatedPassword.url).toString('base64') : null,
      notes_encrypted: updatedPassword.notes ? Buffer.from(updatedPassword.notes).toString('base64') : null,
      category: updatedPassword.category,
      created_by: updatedPassword.user_id,
      updated_by: updatedPassword.user_id,
      created_at: updatedPassword.created_at,
      updated_at: updatedPassword.updated_at
    };

    return { rows: [convertedPassword], rowCount: 1 };
  }

  deletePassword(params) {
    // For soft delete: UPDATE password_entries SET is_deleted = true WHERE id = $2
    // params = [userId, passwordId]
    const [userId, passwordId] = params;
    const passwordIndex = this.data.passwords.findIndex(p => p.id === parseInt(passwordId));

    if (passwordIndex === -1) {
      return { rows: [], rowCount: 0 };
    }

    // For our JSON storage, we'll actually remove the password (simulating soft delete)
    const deletedPassword = this.data.passwords[passwordIndex];
    this.data.passwords.splice(passwordIndex, 1);
    this.saveData();

    // Return the deleted password info in expected format
    return {
      rows: [{
        id: deletedPassword.id,
        title: deletedPassword.title,
        category: deletedPassword.category
      }],
      rowCount: 1
    };
  }

  async connect() {
    // No-op for file-based storage
    return Promise.resolve();
  }

  async end() {
    // No-op for file-based storage
    return Promise.resolve();
  }
}

module.exports = SQLiteAdapter;
