/**
 * Integration tests for Event-Driven Routes
 * Tests that routes emit events instead of directly calling real-time functions
 */

const request = require('supertest');
const express = require('express');
const { PasswordEvents } = require('../../server/events/PasswordEvents');
const { SystemEvents } = require('../../server/events/SystemEvents');

describe('Event-Driven Routes Integration', () => {
  let app;
  let container;
  let eventBus;
  let passwordRoutes;
  let authToken;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
    process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';

    // Clear module cache
    delete require.cache[require.resolve('../../server/core/DIContainer')];
    delete require.cache[require.resolve('../../server/core/ServiceFactories')];
    
    const DIContainer = require('../../server/core/DIContainer');
    const { registerServices } = require('../../server/core/ServiceFactories');
    const RouteFactory = require('../../server/routes/RouteFactory');
    
    container = new DIContainer();
    registerServices(container);
    
    eventBus = container.resolve('eventBus');
    
    // Create Express app with event-driven routes
    app = express();
    app.use(express.json());
    
    const routeFactory = new RouteFactory(container);
    passwordRoutes = routeFactory.createPasswordRoutes();
    app.use('/api/passwords', passwordRoutes);

    // Generate test auth token
    const authService = container.resolve('authService');
    authToken = authService.generateToken({
      id: 123,
      email: 'test@example.com',
      role: 'admin'
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    
    // Dispose container if it exists
    if (container) {
      try {
        container.dispose();
      } catch (error) {
        // Ignore disposal errors in tests
      }
    }
  });

  describe('Password Routes Event Emission', () => {
    test('should emit password created event when creating password', async () => {
      let emittedEvent = null;
      
      // Listen for password created event
      eventBus.on(PasswordEvents.CREATED, (data) => {
        emittedEvent = data;
      });

      const passwordData = {
        title: 'Test Password',
        username: 'testuser',
        password: 'testpass123',
        url: 'https://example.com',
        category: 'Work'
      };

      // Mock the password service to return a created password
      const passwordService = container.resolve('passwordService');
      passwordService.createPasswordEntry = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Test Password',
        username: 'testuser',
        category: 'Work',
        url: 'https://example.com',
        createdBy: 123,
        createdAt: new Date().toISOString()
      });

      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Verify event was emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.password.title).toBe('Test Password');
      expect(emittedEvent.userId).toBe(123);
      expect(emittedEvent.metadata.source).toBe('web');
      expect(emittedEvent.metadata.eventId).toBeDefined();
    });

    test('should emit password updated event when updating password', async () => {
      let emittedEvent = null;
      
      // Listen for password updated event
      eventBus.on(PasswordEvents.UPDATED, (data) => {
        emittedEvent = data;
      });

      const updateData = {
        title: 'Updated Password',
        username: 'updateduser'
      };

      // Mock the password service
      const passwordService = container.resolve('passwordService');
      passwordService.getPasswordById = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Original Password',
        username: 'originaluser',
        category: 'Work'
      });
      
      passwordService.updatePasswordEntry = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Updated Password',
        username: 'updateduser',
        category: 'Work',
        updatedBy: 123,
        updatedAt: new Date().toISOString()
      });

      const response = await request(app)
        .put('/api/passwords/123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify event was emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.password.title).toBe('Updated Password');
      expect(emittedEvent.previousData.title).toBe('Original Password');
      expect(emittedEvent.metadata.changedFields).toContain('title');
      expect(emittedEvent.metadata.changedFields).toContain('username');
    });

    test('should emit password deleted event when deleting password', async () => {
      let emittedEvent = null;
      
      // Listen for password deleted event
      eventBus.on(PasswordEvents.DELETED, (data) => {
        emittedEvent = data;
      });

      // Mock the password service
      const passwordService = container.resolve('passwordService');
      passwordService.getPasswordById = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Password to Delete',
        username: 'testuser',
        category: 'Work'
      });
      
      passwordService.deletePasswordEntry = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/passwords/123')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify event was emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.passwordId).toBe(123);
      expect(emittedEvent.passwordData.title).toBe('Password to Delete');
      expect(emittedEvent.userId).toBe(123);
    });

    test('should emit password viewed event when getting password by ID', async () => {
      let emittedEvent = null;
      
      // Listen for password viewed event
      eventBus.on(PasswordEvents.VIEWED, (data) => {
        emittedEvent = data;
      });

      // Mock the password service
      const passwordService = container.resolve('passwordService');
      passwordService.getPasswordById = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Test Password',
        username: 'testuser',
        category: 'Work'
      });

      const response = await request(app)
        .get('/api/passwords/123')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify event was emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.passwordId).toBe(123);
      expect(emittedEvent.passwordTitle).toBe('Test Password');
      expect(emittedEvent.metadata.viewType).toBe('detail');
    });

    test('should emit password searched event when searching passwords', async () => {
      let emittedEvent = null;
      
      // Listen for password searched event
      eventBus.on(PasswordEvents.SEARCHED, (data) => {
        emittedEvent = data;
      });

      // Mock the password service
      const passwordService = container.resolve('passwordService');
      passwordService.searchPasswords = jest.fn().mockResolvedValue({
        passwords: [
          { id: 1, title: 'Test 1' },
          { id: 2, title: 'Test 2' }
        ],
        total: 2
      });

      const response = await request(app)
        .get('/api/passwords/search?q=test')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify event was emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.query).toBe('test');
      expect(emittedEvent.resultsCount).toBe(2);
      expect(emittedEvent.metadata.searchType).toBe('all');
      expect(emittedEvent.metadata.duration).toBeGreaterThan(0);
    });
  });

  describe('Category Routes Event Emission', () => {
    test('should emit category created event when creating category', async () => {
      let emittedEvent = null;
      
      // Listen for category created event
      eventBus.on(SystemEvents.CATEGORY_CREATED, (data) => {
        emittedEvent = data;
      });

      const categoryData = {
        name: 'Test Category',
        description: 'Test description',
        color: '#FF5722'
      };

      // Mock the category service
      const categoryService = container.resolve('categoryService');
      categoryService.createPasswordCategory = jest.fn().mockResolvedValue({
        id: 456,
        name: 'Test Category',
        description: 'Test description',
        color: '#FF5722',
        createdBy: 123,
        createdAt: new Date().toISOString()
      });

      const response = await request(app)
        .post('/api/passwords/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Verify event was emitted
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.category.name).toBe('Test Category');
      expect(emittedEvent.category.id).toBe(456);
      expect(emittedEvent.userId).toBe(123);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for all routes', async () => {
      const response = await request(app)
        .get('/api/passwords')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    test('should require admin role for admin-only routes', async () => {
      // Create user token (non-admin)
      const authService = container.resolve('authService');
      const userToken = authService.generateToken({
        id: 456,
        email: 'user@example.com',
        role: 'user'
      });

      const response = await request(app)
        .delete('/api/passwords/123')
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    test('should accept valid admin token for admin routes', async () => {
      // Mock the password service for successful deletion
      const passwordService = container.resolve('passwordService');
      passwordService.getPasswordById = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Test Password'
      });
      passwordService.deletePasswordEntry = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/passwords/123')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      // Mock the password service to throw an error
      const passwordService = container.resolve('passwordService');
      passwordService.getPasswordEntries = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve passwords');
    });

    test('should handle validation errors with 400 status', async () => {
      // Mock the password service to throw a validation error
      const passwordService = container.resolve('passwordService');
      passwordService.createPasswordEntry = jest.fn().mockRejectedValue(new Error('Validation failed: Title is required'));

      const response = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed: Title is required');
    });
  });

  describe('Event Data Validation', () => {
    test('should emit events with valid data structure', async () => {
      let emittedEvent = null;
      
      eventBus.on(PasswordEvents.CREATED, (data) => {
        emittedEvent = data;
      });

      // Mock the password service
      const passwordService = container.resolve('passwordService');
      passwordService.createPasswordEntry = jest.fn().mockResolvedValue({
        id: 123,
        title: 'Test Password',
        username: 'testuser',
        category: 'Work',
        url: 'https://example.com',
        createdBy: 123,
        createdAt: new Date().toISOString()
      });

      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Password',
          username: 'testuser',
          password: 'testpass123'
        });

      // Verify event structure
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.password).toBeDefined();
      expect(emittedEvent.password.id).toBe(123);
      expect(emittedEvent.userId).toBe(123);
      expect(emittedEvent.metadata).toBeDefined();
      expect(emittedEvent.metadata.source).toBe('web');
      expect(emittedEvent.metadata.timestamp).toBeDefined();
      expect(emittedEvent.metadata.eventId).toBeDefined();
      expect(emittedEvent.metadata.userAgent).toBeNull(); // No user agent in test
      expect(emittedEvent.metadata.ipAddress).toBeDefined();
    });
  });
});
