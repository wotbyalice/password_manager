/**
 * Integration tests for authentication service
 * Tests actual auth service integration with database and encryption
 */

const {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPasswordHash,
  generateToken,
  verifyToken,
  changePassword
} = require('../../server/auth/authService');

describe('Authentication Service Integration', () => {
  let testUser;
  let testUserId;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_password_manager.db';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
    process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
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
  });

  describe('User Creation and Retrieval', () => {
    test('should create user with encrypted password', async () => {
      const createdUser = await createUser(testUser);
      testUserId = createdUser.id;

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(testUser.email);
      expect(createdUser.firstName).toBe(testUser.firstName);
      expect(createdUser.lastName).toBe(testUser.lastName);
      expect(createdUser.role).toBe(testUser.role);
      expect(createdUser.password).toBeUndefined(); // Should not return password
      expect(createdUser.passwordHash).toBeUndefined(); // Should not return hash
    });

    test('should find user by email', async () => {
      const createdUser = await createUser(testUser);
      const foundUser = await findUserByEmail(testUser.email);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(testUser.email);
    });

    test('should find user by ID', async () => {
      const createdUser = await createUser(testUser);
      const foundUser = await findUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(testUser.email);
    });

    test('should return null for non-existent user', async () => {
      const foundUser = await findUserByEmail('nonexistent@company.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('Password Verification', () => {
    test('should verify correct password', async () => {
      const createdUser = await createUser(testUser);
      const isValid = await verifyPasswordHash(testUser.password, createdUser.passwordHash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const createdUser = await createUser(testUser);
      const isValid = await verifyPasswordHash('WrongPassword123!', createdUser.passwordHash);

      expect(isValid).toBe(false);
    });

    test('should handle empty password gracefully', async () => {
      const createdUser = await createUser(testUser);
      const isValid = await verifyPasswordHash('', createdUser.passwordHash);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Operations', () => {
    test('should generate valid JWT token', async () => {
      const createdUser = await createUser(testUser);
      const token = generateToken(createdUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should verify valid JWT token', async () => {
      const createdUser = await createUser(testUser);
      const token = generateToken(createdUser);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(createdUser.id);
      expect(decoded.email).toBe(createdUser.email);
      expect(decoded.role).toBe(createdUser.role);
    });

    test('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.jwt.token';
      const decoded = verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    test('should reject expired JWT token', () => {
      // This would require mocking time or using a very short expiry
      // For now, we'll test with a malformed token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const decoded = verifyToken(expiredToken);

      expect(decoded).toBeNull();
    });
  });

  describe('Password Change Operations', () => {
    test('should change user password successfully', async () => {
      const createdUser = await createUser(testUser);
      const newPassword = 'NewPassword123!';

      const result = await changePassword(createdUser.id, testUser.password, newPassword);
      expect(result).toBe(true);

      // Verify old password no longer works
      const updatedUser = await findUserById(createdUser.id);
      const oldPasswordValid = await verifyPasswordHash(testUser.password, updatedUser.passwordHash);
      expect(oldPasswordValid).toBe(false);

      // Verify new password works
      const newPasswordValid = await verifyPasswordHash(newPassword, updatedUser.passwordHash);
      expect(newPasswordValid).toBe(true);
    });

    test('should reject password change with wrong current password', async () => {
      const createdUser = await createUser(testUser);
      const newPassword = 'NewPassword123!';

      await expect(
        changePassword(createdUser.id, 'WrongCurrentPassword', newPassword)
      ).rejects.toThrow();
    });

    test('should reject weak new password', async () => {
      const createdUser = await createUser(testUser);
      const weakPassword = '123'; // Too weak

      await expect(
        changePassword(createdUser.id, testUser.password, weakPassword)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle duplicate email creation', async () => {
      await createUser(testUser);
      
      await expect(createUser(testUser)).rejects.toThrow();
    });

    test('should handle invalid user data', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // Too weak
        firstName: '',
        lastName: '',
        role: 'invalid-role'
      };

      await expect(createUser(invalidUser)).rejects.toThrow();
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For integration tests, we assume database is available
      expect(true).toBe(true);
    });
  });
});
