const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server/app');
const { 
  createPasswordEntry, 
  getPasswordEntries, 
  getPasswordById, 
  updatePasswordEntry, 
  deletePasswordEntry,
  searchPasswords 
} = require('../server/passwords/passwordService');
const { encryptPassword, decryptPassword } = require('../server/encryption/cryptoUtils');

// Mock database and encryption functions
jest.mock('../server/database/connection');
jest.mock('../server/passwords/passwordService');
jest.mock('../server/encryption/cryptoUtils');

describe('Password Management System', () => {
  let userToken, adminToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create test tokens
    userToken = jwt.sign(
      { userId: 2, email: 'user@company.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { userId: 1, email: 'admin@company.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Password Entry Creation', () => {
    test('should allow users to create new password entries', async () => {
      const passwordData = {
        title: 'Company Email',
        username: 'john.doe@company.com',
        password: 'SecureEmailPass123!',
        url: 'https://mail.company.com',
        notes: 'Main company email account',
        category: 'Email'
      };

      const mockEncryptedPassword = 'encrypted_password_data';
      encryptPassword.mockReturnValue(mockEncryptedPassword);

      const mockCreatedEntry = {
        id: 1,
        title: passwordData.title,
        username: passwordData.username,
        passwordEncrypted: mockEncryptedPassword,
        url: passwordData.url,
        notes: passwordData.notes,
        category: passwordData.category,
        createdBy: 2,
        createdAt: new Date()
      };

      createPasswordEntry.mockResolvedValue(mockCreatedEntry);

      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('password');
      expect(response.body.password).not.toHaveProperty('passwordEncrypted');
      expect(encryptPassword).toHaveBeenCalledWith(passwordData.password);
      expect(createPasswordEntry).toHaveBeenCalledWith(expect.objectContaining({
        title: passwordData.title,
        username: passwordData.username,
        passwordEncrypted: mockEncryptedPassword,
        createdBy: 2
      }));
    });

    test('should reject password creation with invalid data', async () => {
      const invalidPasswordData = {
        title: '', // Empty title
        username: 'user@company.com',
        password: 'pass'
      };

      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidPasswordData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(createPasswordEntry).not.toHaveBeenCalled();
    });

    test('should require authentication for password creation', async () => {
      const passwordData = {
        title: 'Test Password',
        username: 'test@company.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/passwords')
        .send(passwordData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('No token provided');
    });
  });

  describe('Password Entry Retrieval', () => {
    test('should allow users to view all password entries', async () => {
      const mockPasswords = [
        {
          id: 1,
          title: 'Company Email',
          username: 'user@company.com',
          passwordEncrypted: 'encrypted_data_1',
          url: 'https://mail.company.com',
          category: 'Email',
          createdBy: 1,
          createdAt: new Date()
        },
        {
          id: 2,
          title: 'WiFi Password',
          username: 'admin',
          passwordEncrypted: 'encrypted_data_2',
          category: 'WiFi',
          createdBy: 1,
          createdAt: new Date()
        }
      ];

      const mockDecryptedPasswords = mockPasswords.map(p => ({
        ...p,
        password: 'decrypted_password'
      }));

      getPasswordEntries.mockResolvedValue(mockPasswords);
      decryptPassword.mockReturnValue('decrypted_password');

      const response = await request(app)
        .get('/api/passwords')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('passwords');
      expect(response.body.passwords).toHaveLength(2);
      expect(response.body.passwords[0]).toHaveProperty('password');
      expect(response.body.passwords[0]).not.toHaveProperty('passwordEncrypted');
      expect(decryptPassword).toHaveBeenCalledTimes(2);
    });

    test('should support pagination for password entries', async () => {
      const mockPasswords = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Password ${i + 1}`,
        username: `user${i + 1}@company.com`,
        passwordEncrypted: `encrypted_data_${i + 1}`,
        createdBy: 1,
        createdAt: new Date()
      }));

      getPasswordEntries.mockResolvedValue(mockPasswords.slice(0, 3));
      decryptPassword.mockReturnValue('decrypted_password');

      const response = await request(app)
        .get('/api/passwords?page=1&limit=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.passwords).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
      expect(getPasswordEntries).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        limit: 3,
        offset: 0
      }));
    });

    test('should allow filtering by category', async () => {
      const mockEmailPasswords = [
        {
          id: 1,
          title: 'Company Email',
          username: 'user@company.com',
          passwordEncrypted: 'encrypted_data_1',
          category: 'Email',
          createdBy: 1,
          createdAt: new Date()
        }
      ];

      getPasswordEntries.mockResolvedValue(mockEmailPasswords);
      decryptPassword.mockReturnValue('decrypted_password');

      const response = await request(app)
        .get('/api/passwords?category=Email')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.passwords).toHaveLength(1);
      expect(response.body.passwords[0].category).toBe('Email');
      expect(getPasswordEntries).toHaveBeenCalledWith(expect.objectContaining({
        category: 'Email'
      }));
    });
  });

  describe('Password Entry Search', () => {
    test('should allow searching passwords by title', async () => {
      const searchQuery = 'email';
      const mockSearchResults = [
        {
          id: 1,
          title: 'Company Email',
          username: 'user@company.com',
          passwordEncrypted: 'encrypted_data_1',
          category: 'Email',
          createdBy: 1,
          createdAt: new Date()
        }
      ];

      searchPasswords.mockResolvedValue(mockSearchResults);
      decryptPassword.mockReturnValue('decrypted_password');

      const response = await request(app)
        .get(`/api/passwords/search?q=${searchQuery}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('passwords');
      expect(response.body.passwords).toHaveLength(1);
      expect(searchPasswords).toHaveBeenCalledWith(searchQuery, expect.any(Object));
    });

    test('should return empty results for no matches', async () => {
      const searchQuery = 'nonexistent';
      searchPasswords.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/passwords/search?q=${searchQuery}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.passwords).toHaveLength(0);
    });
  });

  describe('Password Entry Updates (Admin Only)', () => {
    test('should allow admins to update password entries', async () => {
      const passwordId = 1;
      const updateData = {
        title: 'Updated Company Email',
        username: 'updated.user@company.com',
        password: 'NewSecurePass123!',
        notes: 'Updated notes'
      };

      const mockUpdatedEntry = {
        id: passwordId,
        title: updateData.title,
        username: updateData.username,
        passwordEncrypted: 'new_encrypted_password',
        notes: updateData.notes,
        updatedBy: 1,
        updatedAt: new Date()
      };

      encryptPassword.mockReturnValue('new_encrypted_password');
      updatePasswordEntry.mockResolvedValue(mockUpdatedEntry);

      const response = await request(app)
        .put(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('password');
      expect(updatePasswordEntry).toHaveBeenCalledWith(passwordId, expect.objectContaining({
        title: updateData.title,
        username: updateData.username,
        passwordEncrypted: 'new_encrypted_password',
        updatedBy: 1
      }));
    });

    test('should deny regular users from updating passwords', async () => {
      const passwordId = 1;
      const updateData = {
        title: 'Updated Title',
        password: 'NewPass123!'
      };

      const response = await request(app)
        .put(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Insufficient permissions');
      expect(updatePasswordEntry).not.toHaveBeenCalled();
    });
  });

  describe('Password Entry Deletion (Admin Only)', () => {
    test('should allow admins to delete password entries', async () => {
      const passwordId = 1;
      deletePasswordEntry.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(deletePasswordEntry).toHaveBeenCalledWith(passwordId, 1);
    });

    test('should deny regular users from deleting passwords', async () => {
      const passwordId = 1;

      const response = await request(app)
        .delete(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Insufficient permissions');
      expect(deletePasswordEntry).not.toHaveBeenCalled();
    });

    test('should handle deletion of non-existent password', async () => {
      const passwordId = 999;
      deletePasswordEntry.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Password entry not found');
    });
  });

  describe('Password Categories', () => {
    test('should retrieve all password categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#FF6B6B' },
        { id: 2, name: 'WiFi', description: 'Network passwords', color: '#DDA0DD' },
        { id: 3, name: 'Banking', description: 'Financial services', color: '#45B7D1' }
      ];

      // Mock the categories service (to be implemented)
      const { getPasswordCategories } = require('../server/passwords/categoryService');
      getPasswordCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/passwords/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toHaveLength(3);
    });
  });
});
