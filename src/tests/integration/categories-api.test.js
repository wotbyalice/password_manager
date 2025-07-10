/**
 * Categories API Integration Tests
 * Test-Driven Development for Categories REST API endpoints
 */

const request = require('supertest');
const express = require('express');
const categoryRoutes = require('../../server/routes/categoryRoutes');
const CategoryService = require('../../server/services/CategoryService');

// Mock dependencies
jest.mock('../../server/services/CategoryService');
jest.mock('../../server/utils/logger');
jest.mock('../../server/middleware/auth');

describe('Categories API Endpoints', () => {
  let app;
  let mockCategoryService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { userId: 1, role: 'admin' };
      next();
    });
    
    // Use category routes
    app.use('/api/categories', categoryRoutes);
    
    // Mock CategoryService
    mockCategoryService = {
      getPasswordCategories: jest.fn(),
      getCategoryById: jest.fn(),
      createPasswordCategory: jest.fn(),
      updatePasswordCategory: jest.fn(),
      deletePasswordCategory: jest.fn(),
      getCategoryStats: jest.fn()
    };
    
    CategoryService.mockImplementation(() => mockCategoryService);
  });

  describe('GET /api/categories', () => {
    test('should return all categories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Email',
          description: 'Email accounts and services',
          color: '#ef4444',
          createdBy: 1,
          createdAt: '2025-07-10T20:00:00.000Z'
        },
        {
          id: 2,
          name: 'Banking',
          description: 'Financial services',
          color: '#059669',
          createdBy: 1,
          createdAt: '2025-07-10T20:00:00.000Z'
        }
      ];

      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        categories: mockCategories
      });
      expect(mockCategoryService.getPasswordCategories).toHaveBeenCalled();
    });

    test('should handle service errors', async () => {
      mockCategoryService.getPasswordCategories.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/categories')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve categories'
      });
    });
  });

  describe('GET /api/categories/:id', () => {
    test('should return category by ID', async () => {
      const mockCategory = {
        id: 1,
        name: 'Email',
        description: 'Email accounts and services',
        color: '#ef4444',
        createdBy: 1,
        createdAt: '2025-07-10T20:00:00.000Z'
      };

      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const response = await request(app)
        .get('/api/categories/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        category: mockCategory
      });
      expect(mockCategoryService.getCategoryById).toHaveBeenCalledWith(1);
    });

    test('should return 404 when category not found', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/categories/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Category not found'
      });
    });

    test('should validate category ID parameter', async () => {
      const response = await request(app)
        .get('/api/categories/invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid category ID'
      });
    });
  });

  describe('POST /api/categories', () => {
    test('should create new category', async () => {
      const categoryData = {
        name: 'New Category',
        description: 'Test category',
        color: '#ff0000'
      };

      const mockCreatedCategory = {
        id: 3,
        ...categoryData,
        createdBy: 1,
        createdAt: '2025-07-10T20:00:00.000Z'
      };

      mockCategoryService.createPasswordCategory.mockResolvedValue(mockCreatedCategory);

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        category: mockCreatedCategory
      });
      expect(mockCategoryService.createPasswordCategory).toHaveBeenCalledWith(categoryData, 1);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Category name is required'
      });
    });

    test('should validate color format', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({
          name: 'Test Category',
          color: 'invalid-color'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Color must be a valid hex color code'
      });
    });

    test('should handle duplicate category names', async () => {
      const categoryData = {
        name: 'Email',
        description: 'Test category',
        color: '#ff0000'
      };

      mockCategoryService.createPasswordCategory.mockRejectedValue(new Error('Category name already exists'));

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Category name already exists'
      });
    });

    test('should require admin role', async () => {
      // Override auth middleware for this test
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = { userId: 2, role: 'user' };
        next();
      });
      testApp.use('/api/categories', categoryRoutes);

      const response = await request(testApp)
        .post('/api/categories')
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required'
      });
    });
  });

  describe('PUT /api/categories/:id', () => {
    test('should update category', async () => {
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description',
        color: '#00ff00'
      };

      const mockUpdatedCategory = {
        id: 1,
        ...updateData,
        createdBy: 1,
        createdAt: '2025-07-10T20:00:00.000Z'
      };

      mockCategoryService.updatePasswordCategory.mockResolvedValue(mockUpdatedCategory);

      const response = await request(app)
        .put('/api/categories/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        category: mockUpdatedCategory
      });
      expect(mockCategoryService.updatePasswordCategory).toHaveBeenCalledWith(1, updateData, 1);
    });

    test('should return 404 when category not found', async () => {
      mockCategoryService.updatePasswordCategory.mockRejectedValue(new Error('Category not found'));

      const response = await request(app)
        .put('/api/categories/999')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Category not found'
      });
    });
  });

  describe('DELETE /api/categories/:id', () => {
    test('should delete category', async () => {
      mockCategoryService.deletePasswordCategory.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/categories/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Category deleted successfully'
      });
      expect(mockCategoryService.deletePasswordCategory).toHaveBeenCalledWith(1, 1);
    });

    test('should return 404 when category not found', async () => {
      mockCategoryService.deletePasswordCategory.mockRejectedValue(new Error('Category not found'));

      const response = await request(app)
        .delete('/api/categories/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Category not found'
      });
    });

    test('should handle categories with passwords', async () => {
      mockCategoryService.deletePasswordCategory.mockRejectedValue(new Error('Cannot delete category that contains passwords'));

      const response = await request(app)
        .delete('/api/categories/1')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot delete category that contains passwords'
      });
    });
  });

  describe('GET /api/categories/stats', () => {
    test('should return category statistics', async () => {
      const mockStats = {
        categories: [
          { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444', passwordCount: 5 },
          { id: 2, name: 'Banking', description: 'Financial services', color: '#059669', passwordCount: 3 }
        ],
        totalCategories: 2,
        totalPasswords: 8
      };

      mockCategoryService.getCategoryStats.mockResolvedValue(mockStats.categories);

      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          categories: mockStats.categories,
          totalCategories: 2,
          totalPasswords: 8
        }
      });
    });
  });
});
