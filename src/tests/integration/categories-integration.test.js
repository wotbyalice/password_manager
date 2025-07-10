/**
 * Categories Integration Tests
 * End-to-end testing of complete categories workflow
 */

const request = require('supertest');
const express = require('express');
const { JSDOM } = require('jsdom');

// Import components
const CategoryService = require('../../server/services/CategoryService');
const categoryRoutes = require('../../server/routes/categoryRoutes');
const CategoriesManager = require('../../renderer/js/CategoriesManager');
const CategoriesUI = require('../../renderer/js/CategoriesUI');

// Mock dependencies
jest.mock('../../server/services/CategoryService');
jest.mock('../../server/utils/logger');

describe('Categories Integration Tests', () => {
  let app;
  let mockCategoryService;
  let categoriesManager;
  let categoriesUI;
  let dom;

  beforeAll(() => {
    // Create DOM environment with proper URL
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="categories-view" class="view hidden">
          <div class="categories-grid" id="categories-grid">
            <div class="empty-state" id="temp-add-category" style="display: none;">
              <h3>No Categories Yet</h3>
            </div>
          </div>
        </div>
        <div id="category-modal" class="modal hidden">
          <h3 id="category-modal-title">Add Category</h3>
          <form id="category-form">
            <input type="text" id="category-name" name="name">
            <textarea id="category-description" name="description"></textarea>
            <input type="color" id="category-color" name="color" value="#007bff">
            <button type="submit" id="category-save">Create Category</button>
          </form>
        </div>
      </body>
      </html>
    `, { url: 'http://localhost:3001' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.CustomEvent = dom.window.CustomEvent;
    global.localStorage = {
      getItem: jest.fn(() => 'mock-token'),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    global.fetch = jest.fn();
    global.alert = jest.fn();
    global.confirm = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { userId: 1, role: 'admin' };
      next();
    });
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

    // Create frontend components
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn()
    };
    
    categoriesManager = new CategoriesManager(mockSocket);
    categoriesUI = new CategoriesUI(categoriesManager);

    // Reset DOM
    document.getElementById('categories-grid').innerHTML = `
      <div class="empty-state" id="temp-add-category" style="display: none;">
        <h3>No Categories Yet</h3>
      </div>
    `;
  });

  describe('Complete Categories Workflow', () => {
    test('should handle full create category workflow', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Email',
          description: 'Email accounts and services',
          color: '#ef4444',
          createdBy: 1,
          createdAt: '2025-07-10T20:00:00.000Z'
        }
      ];

      // Mock API responses
      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);
      mockCategoryService.createPasswordCategory.mockResolvedValue(mockCategories[0]);

      // Mock fetch for frontend
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, categories: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, category: mockCategories[0] })
        });

      // 1. Load initial categories (empty)
      await categoriesManager.loadCategories();
      categoriesUI.renderCategories();

      // Verify empty state is shown
      const emptyState = document.getElementById('temp-add-category');
      expect(emptyState.style.display).not.toBe('none');

      // 2. Show add category modal
      categoriesUI.showAddCategoryModal();
      
      // Verify modal is shown
      const modal = document.getElementById('category-modal');
      expect(modal.classList.contains('hidden')).toBe(false);

      // 3. Fill form and submit
      document.getElementById('category-name').value = 'Email';
      document.getElementById('category-description').value = 'Email accounts and services';
      document.getElementById('category-color').value = '#ef4444';

      await categoriesUI.handleFormSubmit();

      // Verify API was called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Email',
            description: 'Email accounts and services',
            color: '#ef4444'
          })
        })
      );

      // 4. Test API endpoint directly
      const response = await request(app)
        .post('/api/categories')
        .send({
          name: 'Email',
          description: 'Email accounts and services',
          color: '#ef4444'
        })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        category: mockCategories[0]
      });

      expect(mockCategoryService.createPasswordCategory).toHaveBeenCalledWith({
        name: 'Email',
        description: 'Email accounts and services',
        color: '#ef4444'
      }, 1);
    });

    test('should handle full edit category workflow', async () => {
      const originalCategory = {
        id: 1,
        name: 'Email',
        description: 'Email accounts',
        color: '#ef4444'
      };

      const updatedCategory = {
        id: 1,
        name: 'Email Services',
        description: 'Email accounts and services',
        color: '#ff0000'
      };

      // Mock API responses
      mockCategoryService.updatePasswordCategory.mockResolvedValue(updatedCategory);

      // Mock fetch for frontend
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, category: updatedCategory })
      });

      // 1. Show edit modal with existing data
      categoriesUI.showEditCategoryModal(originalCategory);

      // Verify form is populated
      expect(document.getElementById('category-name').value).toBe('Email');
      expect(document.getElementById('category-description').value).toBe('Email accounts');
      expect(document.getElementById('category-color').value).toBe('#ef4444');

      // 2. Update form values
      document.getElementById('category-name').value = 'Email Services';
      document.getElementById('category-description').value = 'Email accounts and services';
      document.getElementById('category-color').value = '#ff0000';

      // 3. Submit form
      await categoriesUI.handleFormSubmit();

      // Verify API was called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Email Services',
            description: 'Email accounts and services',
            color: '#ff0000'
          })
        })
      );

      // 4. Test API endpoint directly
      const response = await request(app)
        .put('/api/categories/1')
        .send({
          name: 'Email Services',
          description: 'Email accounts and services',
          color: '#ff0000'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        category: updatedCategory
      });
    });

    test('should handle full delete category workflow', async () => {
      // Mock API responses
      mockCategoryService.deletePasswordCategory.mockResolvedValue(true);

      // Mock fetch for frontend
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Category deleted successfully' })
      });

      // Mock user confirmation
      global.confirm.mockReturnValue(true);

      // 1. Delete category via UI
      await categoriesUI.handleDeleteCategory(1);

      // Verify confirmation was shown
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this category? This action cannot be undone.'
      );

      // Verify API was called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      // 2. Test API endpoint directly
      const response = await request(app)
        .delete('/api/categories/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Category deleted successfully'
      });

      expect(mockCategoryService.deletePasswordCategory).toHaveBeenCalledWith(1, 1);
    });

    test('should handle real-time updates workflow', async () => {
      const newCategory = {
        id: 2,
        name: 'Banking',
        description: 'Financial services',
        color: '#059669'
      };

      // Setup initial state
      categoriesManager.categories = [];
      categoriesUI.renderCategories();

      // Verify empty state
      const emptyState = document.getElementById('temp-add-category');
      expect(emptyState.style.display).not.toBe('none');

      // Simulate real-time category creation
      categoriesManager.handleCategoryCreated(newCategory);

      // Verify category was added to manager
      expect(categoriesManager.categories).toContain(newCategory);

      // Simulate UI update
      categoriesUI.renderCategories();

      // Verify empty state is hidden and category is rendered
      expect(emptyState.style.display).toBe('none');
      const categoryCards = document.querySelectorAll('.category-card');
      expect(categoryCards).toHaveLength(1);
    });

    test('should handle error scenarios', async () => {
      // Test API error handling
      mockCategoryService.createPasswordCategory.mockRejectedValue(new Error('Category name already exists'));

      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Duplicate' })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Category name already exists'
      });

      // Test frontend error handling
      fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ success: false, error: 'Category name already exists' })
      });

      await expect(categoriesManager.createCategory({ name: 'Duplicate' }))
        .rejects.toThrow('Failed to create category: Category name already exists');
    });

    test('should handle validation errors', async () => {
      // Test API validation
      const response = await request(app)
        .post('/api/categories')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Category name is required'
      });

      // Test frontend validation
      document.getElementById('category-name').value = '';
      await categoriesUI.handleFormSubmit();

      expect(global.alert).toHaveBeenCalledWith('Category name is required');
    });
  });

  describe('Categories Statistics Integration', () => {
    test('should handle category statistics workflow', async () => {
      const mockStats = {
        categories: [
          { id: 1, name: 'Email', passwordCount: 5 },
          { id: 2, name: 'Banking', passwordCount: 3 }
        ],
        totalCategories: 2,
        totalPasswords: 8
      };

      // Mock API response
      mockCategoryService.getCategoryStats.mockResolvedValue(mockStats.categories);

      // Test API endpoint
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

      // Test frontend integration
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockStats })
      });

      const stats = await categoriesManager.getCategoryStats();
      expect(stats).toEqual(mockStats);
    });
  });
});
