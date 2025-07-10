/**
 * CategoriesManager Unit Tests
 * Test-Driven Development for Frontend Categories Management
 */

// Mock fetch globally
global.fetch = jest.fn();

const CategoriesManager = require('../../renderer/js/CategoriesManager');

describe('CategoriesManager', () => {
  let categoriesManager;
  let mockSocket;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock socket.io
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn()
    };

    // Mock global objects
    global.window = {
      location: { origin: 'http://localhost:3001' },
      dispatchEvent: jest.fn()
    };

    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(() => 'mock-token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };

    // Create manager instance
    categoriesManager = new CategoriesManager(mockSocket);
  });

  afterEach(() => {
    // Clean up
    delete global.window;
    delete global.localStorage;
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(categoriesManager.categories).toEqual([]);
      expect(categoriesManager.socket).toBe(mockSocket);
      expect(categoriesManager.apiBaseUrl).toBe('http://localhost:3001/api');
    });

    test('should set up socket event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('category_created', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('category_updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('category_deleted', expect.any(Function));
    });
  });

  describe('loadCategories', () => {
    test('should fetch and store categories', async () => {
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

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          categories: mockCategories
        })
      });

      const result = await categoriesManager.loadCategories();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      expect(categoriesManager.categories).toEqual(mockCategories);
      expect(result).toEqual(mockCategories);
    });

    test('should handle API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Server error'
        })
      });

      await expect(categoriesManager.loadCategories())
        .rejects.toThrow('Failed to load categories: Server error');
    });

    test('should handle network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(categoriesManager.loadCategories())
        .rejects.toThrow('Failed to load categories: Network error');
    });
  });

  describe('getCategoryById', () => {
    beforeEach(() => {
      categoriesManager.categories = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444' },
        { id: 2, name: 'Banking', description: 'Financial services', color: '#059669' }
      ];
    });

    test('should return category by ID', () => {
      const category = categoriesManager.getCategoryById(1);
      expect(category).toEqual({
        id: 1,
        name: 'Email',
        description: 'Email accounts',
        color: '#ef4444'
      });
    });

    test('should return null for non-existent ID', () => {
      const category = categoriesManager.getCategoryById(999);
      expect(category).toBeNull();
    });

    test('should handle invalid input', () => {
      expect(categoriesManager.getCategoryById(null)).toBeNull();
      expect(categoriesManager.getCategoryById(undefined)).toBeNull();
      expect(categoriesManager.getCategoryById('invalid')).toBeNull();
    });
  });

  describe('createCategory', () => {
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

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          category: mockCreatedCategory
        })
      });

      const result = await categoriesManager.createCategory(categoryData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(categoryData)
        }
      );
      expect(result).toEqual(mockCreatedCategory);
    });

    test('should validate required fields', async () => {
      await expect(categoriesManager.createCategory({}))
        .rejects.toThrow('Category name is required');
      
      await expect(categoriesManager.createCategory({ name: '' }))
        .rejects.toThrow('Category name is required');
    });

    test('should validate color format', async () => {
      await expect(categoriesManager.createCategory({
        name: 'Test',
        color: 'invalid-color'
      })).rejects.toThrow('Color must be a valid hex color code');
    });

    test('should handle API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          success: false,
          error: 'Category name already exists'
        })
      });

      await expect(categoriesManager.createCategory({ name: 'Test' }))
        .rejects.toThrow('Failed to create category: Category name already exists');
    });
  });

  describe('updateCategory', () => {
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

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          category: mockUpdatedCategory
        })
      });

      const result = await categoriesManager.updateCategory(1, updateData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories/1',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );
      expect(result).toEqual(mockUpdatedCategory);
    });

    test('should validate category ID', async () => {
      await expect(categoriesManager.updateCategory(null, { name: 'Test' }))
        .rejects.toThrow('Category ID is required');
      
      await expect(categoriesManager.updateCategory('invalid', { name: 'Test' }))
        .rejects.toThrow('Category ID must be a number');
    });

    test('should handle not found errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          success: false,
          error: 'Category not found'
        })
      });

      await expect(categoriesManager.updateCategory(999, { name: 'Test' }))
        .rejects.toThrow('Failed to update category: Category not found');
    });
  });

  describe('deleteCategory', () => {
    test('should delete category', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Category deleted successfully'
        })
      });

      const result = await categoriesManager.deleteCategory(1);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories/1',
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toBe(true);
    });

    test('should validate category ID', async () => {
      await expect(categoriesManager.deleteCategory(null))
        .rejects.toThrow('Category ID is required');
    });

    test('should handle categories with passwords', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Cannot delete category that contains passwords'
        })
      });

      await expect(categoriesManager.deleteCategory(1))
        .rejects.toThrow('Failed to delete category: Cannot delete category that contains passwords');
    });
  });

  describe('getCategoryStats', () => {
    test('should fetch category statistics', async () => {
      const mockStats = {
        categories: [
          { id: 1, name: 'Email', passwordCount: 5 },
          { id: 2, name: 'Banking', passwordCount: 3 }
        ],
        totalCategories: 2,
        totalPasswords: 8
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockStats
        })
      });

      const result = await categoriesManager.getCategoryStats();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/categories/stats',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('Socket Event Handlers', () => {
    test('should handle category_created event', () => {
      const newCategory = { id: 3, name: 'New Category', description: 'Test' };
      
      // Get the event handler
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'category_created')[1];
      
      // Trigger the event
      handler(newCategory);
      
      expect(categoriesManager.categories).toContain(newCategory);
    });

    test('should handle category_updated event', () => {
      categoriesManager.categories = [
        { id: 1, name: 'Email', description: 'Old description' }
      ];
      
      const updatedCategory = { id: 1, name: 'Email', description: 'New description' };
      
      // Get the event handler
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'category_updated')[1];
      
      // Trigger the event
      handler(updatedCategory);
      
      expect(categoriesManager.categories[0]).toEqual(updatedCategory);
    });

    test('should handle category_deleted event', () => {
      categoriesManager.categories = [
        { id: 1, name: 'Email' },
        { id: 2, name: 'Banking' }
      ];
      
      // Get the event handler
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'category_deleted')[1];
      
      // Trigger the event
      handler({ id: 1 });
      
      expect(categoriesManager.categories).toHaveLength(1);
      expect(categoriesManager.categories[0].id).toBe(2);
    });
  });

  describe('isValidHexColor', () => {
    test('should validate hex colors correctly', () => {
      expect(categoriesManager.isValidHexColor('#ff0000')).toBe(true);
      expect(categoriesManager.isValidHexColor('#FF0000')).toBe(true);
      expect(categoriesManager.isValidHexColor('#f00')).toBe(true);
      expect(categoriesManager.isValidHexColor('#F00')).toBe(true);
      
      expect(categoriesManager.isValidHexColor('ff0000')).toBe(false);
      expect(categoriesManager.isValidHexColor('#gg0000')).toBe(false);
      expect(categoriesManager.isValidHexColor('#ff00')).toBe(false);
      expect(categoriesManager.isValidHexColor('invalid')).toBe(false);
      expect(categoriesManager.isValidHexColor('')).toBe(false);
      expect(categoriesManager.isValidHexColor(null)).toBe(false);
    });
  });
});
