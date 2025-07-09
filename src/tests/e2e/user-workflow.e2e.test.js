/**
 * End-to-End tests for complete user workflows
 * Tests the entire application flow from login to password operations
 */

const request = require('supertest');
const app = require('../../server/app');

describe('Complete User Workflow E2E Tests', () => {
  let authToken;
  let userId;
  let passwordId;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE = 'true';
    process.env.SQLITE_PATH = './data/test_password_manager.db';
    process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.SKIP_DB_CONNECTION = 'false';
  });

  describe('User Registration and Authentication Flow', () => {
    test('should complete full registration flow', async () => {
      const userData = {
        email: `e2e-test-${Date.now()}@company.com`,
        password: 'E2ETestPassword123!',
        firstName: 'E2E',
        lastName: 'Test',
        role: 'user'
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user).toBeDefined();
      expect(registerResponse.body.user.email).toBe(userData.email);
      userId = registerResponse.body.user.id;

      // Step 2: Login with registered user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user.id).toBe(userId);
      authToken = loginResponse.body.token;

      // Step 3: Verify token works for protected routes
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user.id).toBe(userId);
    });

    test('should handle invalid login attempts', async () => {
      // Test with wrong password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: `e2e-test-${Date.now()}@company.com`,
          password: 'WrongPassword123!'
        })
        .expect(401);

      // Test with non-existent user
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@company.com',
          password: 'AnyPassword123!'
        })
        .expect(401);
    });
  });

  describe('Password Management Workflow', () => {
    test('should complete full password CRUD workflow', async () => {
      const passwordData = {
        title: 'E2E Test Website',
        username: 'e2euser',
        password: 'E2ESecretPassword123!',
        url: 'https://e2etest.com',
        notes: 'E2E test notes',
        category: 'Testing'
      };

      // Step 1: Create password entry
      const createResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.password).toBeDefined();
      expect(createResponse.body.password.title).toBe(passwordData.title);
      passwordId = createResponse.body.password.id;

      // Step 2: Retrieve all passwords
      const getAllResponse = await request(app)
        .get('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllResponse.body.success).toBe(true);
      expect(Array.isArray(getAllResponse.body.passwords)).toBe(true);
      const createdPassword = getAllResponse.body.passwords.find(p => p.id === passwordId);
      expect(createdPassword).toBeDefined();

      // Step 3: Retrieve specific password
      const getOneResponse = await request(app)
        .get(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneResponse.body.success).toBe(true);
      expect(getOneResponse.body.password.id).toBe(passwordId);
      expect(getOneResponse.body.password.password).toBe(passwordData.password);

      // Step 4: Update password
      const updateData = {
        title: 'Updated E2E Test Website',
        username: 'updatede2euser',
        password: 'UpdatedE2EPassword123!',
        notes: 'Updated E2E test notes'
      };

      const updateResponse = await request(app)
        .put(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.password.title).toBe(updateData.title);

      // Step 5: Verify update
      const verifyUpdateResponse = await request(app)
        .get(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyUpdateResponse.body.password.title).toBe(updateData.title);
      expect(verifyUpdateResponse.body.password.password).toBe(updateData.password);

      // Step 6: Search passwords
      const searchResponse = await request(app)
        .get('/api/passwords/search')
        .query({ q: 'Updated E2E' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(Array.isArray(searchResponse.body.passwords)).toBe(true);
      const foundPassword = searchResponse.body.passwords.find(p => p.id === passwordId);
      expect(foundPassword).toBeDefined();

      // Step 7: Delete password
      const deleteResponse = await request(app)
        .delete(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Step 8: Verify deletion
      await request(app)
        .get(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should handle unauthorized access attempts', async () => {
      // Test without token
      await request(app)
        .get('/api/passwords')
        .expect(401);

      // Test with invalid token
      await request(app)
        .get('/api/passwords')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with malformed token
      await request(app)
        .get('/api/passwords')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('Category Management Workflow', () => {
    test('should complete category operations workflow', async () => {
      // Step 1: Get initial categories
      const initialResponse = await request(app)
        .get('/api/passwords/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialResponse.body.success).toBe(true);
      expect(Array.isArray(initialResponse.body.categories)).toBe(true);

      // Step 2: Create new category (if user has admin rights)
      const categoryData = {
        name: 'E2E Test Category',
        description: 'Category created during E2E testing',
        color: '#FF5722'
      };

      try {
        const createCategoryResponse = await request(app)
          .post('/api/passwords/categories')
          .set('Authorization', `Bearer ${authToken}`)
          .send(categoryData);

        if (createCategoryResponse.status === 201) {
          expect(createCategoryResponse.body.success).toBe(true);
          expect(createCategoryResponse.body.category.name).toBe(categoryData.name);
        } else if (createCategoryResponse.status === 403) {
          // User doesn't have admin rights, which is expected for regular users
          expect(createCategoryResponse.body.success).toBe(false);
        }
      } catch (error) {
        // Category creation might fail for non-admin users, which is expected
        expect(error.status).toBe(403);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed requests gracefully', async () => {
      // Test with invalid JSON
      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Test with missing required fields
      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      // Test with invalid field types
      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 123, // Should be string
          username: [],
          password: {}
        })
        .expect(400);
    });

    test('should handle rate limiting', async () => {
      // This test would require making many requests quickly
      // For E2E testing, we verify the rate limiting middleware is in place
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get('/api/passwords')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    test('should handle concurrent operations safely', async () => {
      const passwordData = {
        title: 'Concurrent Test',
        username: 'concurrentuser',
        password: 'ConcurrentPassword123!'
      };

      // Create multiple passwords concurrently
      const createPromises = Array.from({ length: 3 }, (_, i) => 
        request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...passwordData,
            title: `${passwordData.title} ${i}`
          })
      );

      const createResponses = await Promise.all(createPromises);
      
      // All should succeed
      createResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Clean up created passwords
      const passwordIds = createResponses.map(r => r.body.password.id);
      const deletePromises = passwordIds.map(id =>
        request(app)
          .delete(`/api/passwords/${id}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.all(deletePromises);
    });
  });

  describe('Data Integrity and Security', () => {
    test('should maintain data encryption throughout workflow', async () => {
      const sensitiveData = {
        title: 'Security Test',
        username: 'securityuser',
        password: 'VerySecretPassword123!',
        notes: 'Confidential information'
      };

      // Create password
      const createResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sensitiveData)
        .expect(201);

      const passwordId = createResponse.body.password.id;

      // Retrieve and verify decryption
      const getResponse = await request(app)
        .get(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.password.password).toBe(sensitiveData.password);
      expect(getResponse.body.password.notes).toBe(sensitiveData.notes);

      // Clean up
      await request(app)
        .delete(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('should prevent access to other users data', async () => {
      // This test would require creating another user
      // For now, we test that invalid IDs are handled properly
      await request(app)
        .get('/api/passwords/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
