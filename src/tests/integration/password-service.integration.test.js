/**
 * Integration tests for password service
 * Tests actual password service integration with database, encryption, and validation
 */

const {
  createPasswordEntry,
  getPasswordEntries,
  getPasswordById,
  updatePasswordEntry,
  deletePasswordEntry,
  searchPasswords
} = require('../../server/passwords/passwordService');

const { createUser } = require('../../server/auth/authService');

describe('Password Service Integration', () => {
  let testUser;
  let testUserId;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_password_manager.db';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';
  });

  beforeEach(async () => {
    // Create a test user for each test
    testUser = {
      email: `test-${Date.now()}@company.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    };

    const createdUser = await createUser(testUser);
    testUserId = createdUser.id;
  });

  describe('Password Entry Creation', () => {
    test('should create password entry with encryption', async () => {
      const passwordData = {
        title: 'Test Website',
        username: 'testuser',
        password: 'SecretPassword123!',
        url: 'https://example.com',
        notes: 'Test notes',
        category: 'Work'
      };

      const createdPassword = await createPasswordEntry(passwordData, testUserId);

      expect(createdPassword).toBeDefined();
      expect(createdPassword.id).toBeDefined();
      expect(createdPassword.title).toBe(passwordData.title);
      expect(createdPassword.username).toBe(passwordData.username);
      expect(createdPassword.category).toBe(passwordData.category);
      expect(createdPassword.createdBy).toBe(testUserId);
      
      // Password should be encrypted (not plain text)
      expect(createdPassword.password).not.toBe(passwordData.password);
      expect(createdPassword.password).toBeDefined();
      
      // URL and notes should be encrypted if provided
      if (passwordData.url) {
        expect(createdPassword.url).not.toBe(passwordData.url);
      }
      if (passwordData.notes) {
        expect(createdPassword.notes).not.toBe(passwordData.notes);
      }
    });

    test('should handle missing optional fields', async () => {
      const passwordData = {
        title: 'Minimal Entry',
        username: 'user',
        password: 'Password123!'
      };

      const createdPassword = await createPasswordEntry(passwordData, testUserId);

      expect(createdPassword).toBeDefined();
      expect(createdPassword.title).toBe(passwordData.title);
      expect(createdPassword.url).toBeNull();
      expect(createdPassword.notes).toBeNull();
      expect(createdPassword.category).toBeNull();
    });

    test('should validate required fields', async () => {
      const invalidPasswordData = {
        title: '', // Empty title
        username: 'user',
        password: 'Password123!'
      };

      await expect(
        createPasswordEntry(invalidPasswordData, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('Password Entry Retrieval', () => {
    let testPasswordId;

    beforeEach(async () => {
      const passwordData = {
        title: 'Test Retrieval',
        username: 'testuser',
        password: 'SecretPassword123!',
        url: 'https://example.com',
        notes: 'Test notes',
        category: 'Work'
      };

      const createdPassword = await createPasswordEntry(passwordData, testUserId);
      testPasswordId = createdPassword.id;
    });

    test('should retrieve password entries for user', async () => {
      const passwords = await getPasswordEntries(testUserId);

      expect(passwords).toBeDefined();
      expect(Array.isArray(passwords)).toBe(true);
      expect(passwords.length).toBeGreaterThan(0);

      const testPassword = passwords.find(p => p.id === testPasswordId);
      expect(testPassword).toBeDefined();
      expect(testPassword.title).toBe('Test Retrieval');
    });

    test('should retrieve specific password by ID', async () => {
      const password = await getPasswordById(testPasswordId, testUserId);

      expect(password).toBeDefined();
      expect(password.id).toBe(testPasswordId);
      expect(password.title).toBe('Test Retrieval');
      expect(password.username).toBe('testuser');
      
      // Should decrypt password for authorized user
      expect(password.password).toBe('SecretPassword123!');
      expect(password.url).toBe('https://example.com');
      expect(password.notes).toBe('Test notes');
    });

    test('should not retrieve password for unauthorized user', async () => {
      // Create another user
      const otherUser = await createUser({
        email: `other-${Date.now()}@company.com`,
        password: 'OtherPassword123!',
        firstName: 'Other',
        lastName: 'User',
        role: 'user'
      });

      const password = await getPasswordById(testPasswordId, otherUser.id);
      expect(password).toBeNull();
    });
  });

  describe('Password Entry Updates', () => {
    let testPasswordId;

    beforeEach(async () => {
      const passwordData = {
        title: 'Test Update',
        username: 'testuser',
        password: 'OriginalPassword123!',
        category: 'Work'
      };

      const createdPassword = await createPasswordEntry(passwordData, testUserId);
      testPasswordId = createdPassword.id;
    });

    test('should update password entry successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        username: 'updateduser',
        password: 'UpdatedPassword123!',
        url: 'https://updated.com',
        notes: 'Updated notes',
        category: 'Personal'
      };

      const updatedPassword = await updatePasswordEntry(
        testPasswordId,
        updateData,
        testUserId
      );

      expect(updatedPassword).toBeDefined();
      expect(updatedPassword.title).toBe(updateData.title);
      expect(updatedPassword.username).toBe(updateData.username);
      expect(updatedPassword.category).toBe(updateData.category);
      expect(updatedPassword.updatedBy).toBe(testUserId);

      // Verify password was re-encrypted
      const retrieved = await getPasswordById(testPasswordId, testUserId);
      expect(retrieved.password).toBe(updateData.password);
      expect(retrieved.url).toBe(updateData.url);
      expect(retrieved.notes).toBe(updateData.notes);
    });

    test('should not update password for unauthorized user', async () => {
      const otherUser = await createUser({
        email: `other-${Date.now()}@company.com`,
        password: 'OtherPassword123!',
        firstName: 'Other',
        lastName: 'User',
        role: 'user'
      });

      const updateData = {
        title: 'Unauthorized Update'
      };

      await expect(
        updatePasswordEntry(testPasswordId, updateData, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Password Entry Deletion', () => {
    let testPasswordId;

    beforeEach(async () => {
      const passwordData = {
        title: 'Test Delete',
        username: 'testuser',
        password: 'DeletePassword123!',
        category: 'Work'
      };

      const createdPassword = await createPasswordEntry(passwordData, testUserId);
      testPasswordId = createdPassword.id;
    });

    test('should delete password entry successfully', async () => {
      const result = await deletePasswordEntry(testPasswordId, testUserId);
      expect(result).toBe(true);

      // Verify password is deleted
      const deletedPassword = await getPasswordById(testPasswordId, testUserId);
      expect(deletedPassword).toBeNull();
    });

    test('should not delete password for unauthorized user', async () => {
      const otherUser = await createUser({
        email: `other-${Date.now()}@company.com`,
        password: 'OtherPassword123!',
        firstName: 'Other',
        lastName: 'User',
        role: 'user'
      });

      await expect(
        deletePasswordEntry(testPasswordId, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Password Search', () => {
    beforeEach(async () => {
      // Create multiple test passwords
      const passwords = [
        {
          title: 'Gmail Account',
          username: 'user@gmail.com',
          password: 'GmailPass123!',
          category: 'Email'
        },
        {
          title: 'Facebook Login',
          username: 'socialuser',
          password: 'FacebookPass123!',
          category: 'Social'
        },
        {
          title: 'Work Database',
          username: 'dbuser',
          password: 'DbPass123!',
          category: 'Work'
        }
      ];

      for (const passwordData of passwords) {
        await createPasswordEntry(passwordData, testUserId);
      }
    });

    test('should search passwords by title', async () => {
      const results = await searchPasswords('Gmail', testUserId);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const gmailEntry = results.find(p => p.title === 'Gmail Account');
      expect(gmailEntry).toBeDefined();
    });

    test('should search passwords by username', async () => {
      const results = await searchPasswords('socialuser', testUserId);

      expect(results.length).toBeGreaterThan(0);
      const facebookEntry = results.find(p => p.title === 'Facebook Login');
      expect(facebookEntry).toBeDefined();
    });

    test('should search passwords by category', async () => {
      const results = await searchPasswords('Work', testUserId);

      expect(results.length).toBeGreaterThan(0);
      const workEntry = results.find(p => p.category === 'Work');
      expect(workEntry).toBeDefined();
    });

    test('should return empty results for non-matching search', async () => {
      const results = await searchPasswords('NonExistentTerm', testUserId);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
});
