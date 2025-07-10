/**
 * CategoryService Unit Tests
 * Test-Driven Development for Categories functionality
 */

const CategoryService = require('../../server/services/CategoryService');
const SQLiteAdapter = require('../../server/database/sqlite-adapter');

// Mock dependencies
jest.mock('../../server/database/sqlite-adapter');
jest.mock('../../server/utils/logger');

describe('CategoryService', () => {
  let categoryService;
  let mockAdapter;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock adapter
    mockAdapter = {
      query: jest.fn(),
      loadData: jest.fn(),
      saveData: jest.fn()
    };
    
    SQLiteAdapter.mockImplementation(() => mockAdapter);
    
    // Create service instance
    categoryService = new CategoryService();
  });

  describe('Constructor', () => {
    test('should initialize with SQLite adapter', () => {
      expect(SQLiteAdapter).toHaveBeenCalled();
      expect(categoryService).toBeDefined();
    });
  });

  describe('getPasswordCategories', () => {
    test('should return all categories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Email',
          description: 'Email accounts and services',
          color: '#ef4444',
          created_by: 1,
          created_at: '2025-07-10T20:00:00.000Z'
        },
        {
          id: 2,
          name: 'Banking',
          description: 'Financial services',
          color: '#059669',
          created_by: 1,
          created_at: '2025-07-10T20:00:00.000Z'
        }
      ];

      mockAdapter.query.mockResolvedValue({
        rows: mockCategories,
        rowCount: 2
      });

      const result = await categoryService.getPasswordCategories();

      expect(mockAdapter.query).toHaveBeenCalledWith(
        'SELECT * FROM password_categories ORDER BY name ASC'
      );
      expect(result).toEqual(mockCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        createdBy: cat.created_by,
        createdAt: cat.created_at
      })));
    });

    test('should return empty array when no categories exist', async () => {
      mockAdapter.query.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await categoryService.getPasswordCategories();

      expect(result).toEqual([]);
    });

    test('should throw error when database query fails', async () => {
      mockAdapter.query.mockRejectedValue(new Error('Database error'));

      await expect(categoryService.getPasswordCategories())
        .rejects.toThrow('Failed to retrieve password categories: Database error');
    });
  });

  describe('getCategoryById', () => {
    test('should return category by ID', async () => {
      const mockCategory = {
        id: 1,
        name: 'Email',
        description: 'Email accounts and services',
        color: '#ef4444',
        created_by: 1,
        created_at: '2025-07-10T20:00:00.000Z'
      };

      mockAdapter.query.mockResolvedValue({
        rows: [mockCategory],
        rowCount: 1
      });

      const result = await categoryService.getCategoryById(1);

      expect(mockAdapter.query).toHaveBeenCalledWith(
        'SELECT * FROM password_categories WHERE id = ?',
        [1]
      );
      expect(result).toEqual({
        id: mockCategory.id,
        name: mockCategory.name,
        description: mockCategory.description,
        color: mockCategory.color,
        createdBy: mockCategory.created_by,
        createdAt: mockCategory.created_at
      });
    });

    test('should return null when category not found', async () => {
      mockAdapter.query.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await categoryService.getCategoryById(999);

      expect(result).toBeNull();
    });

    test('should throw error for invalid ID', async () => {
      await expect(categoryService.getCategoryById(null))
        .rejects.toThrow('Category ID is required');
      
      await expect(categoryService.getCategoryById('invalid'))
        .rejects.toThrow('Category ID must be a number');
    });
  });

  describe('createPasswordCategory', () => {
    test('should create new category successfully', async () => {
      const categoryData = {
        name: 'New Category',
        description: 'Test category',
        color: '#ff0000'
      };
      const userId = 1;

      const mockCreatedCategory = {
        id: 3,
        name: categoryData.name,
        description: categoryData.description,
        color: categoryData.color,
        created_by: userId,
        created_at: '2025-07-10T20:00:00.000Z'
      };

      // Mock check for existing category (none found)
      mockAdapter.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [mockCreatedCategory], rowCount: 1 });

      const result = await categoryService.createPasswordCategory(categoryData, userId);

      expect(mockAdapter.query).toHaveBeenCalledWith(
        'SELECT id FROM password_categories WHERE LOWER(name) = LOWER(?)',
        ['New Category']
      );
      expect(mockAdapter.query).toHaveBeenCalledWith(
        'INSERT INTO password_categories (name, description, color, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [categoryData.name, categoryData.description, categoryData.color, userId, expect.any(String)]
      );
      expect(result).toEqual({
        id: mockCreatedCategory.id,
        name: mockCreatedCategory.name,
        description: mockCreatedCategory.description,
        color: mockCreatedCategory.color,
        createdBy: mockCreatedCategory.created_by,
        createdAt: expect.any(String)
      });
    });

    test('should throw error when category name already exists', async () => {
      const categoryData = {
        name: 'Email',
        description: 'Test category',
        color: '#ff0000'
      };

      mockAdapter.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1
      });

      await expect(categoryService.createPasswordCategory(categoryData, 1))
        .rejects.toThrow('Category name already exists');
    });

    test('should validate required fields', async () => {
      await expect(categoryService.createPasswordCategory({}, 1))
        .rejects.toThrow('Category name is required');
      
      await expect(categoryService.createPasswordCategory({ name: '' }, 1))
        .rejects.toThrow('Category name is required');
      
      await expect(categoryService.createPasswordCategory({ name: 'Test' }, null))
        .rejects.toThrow('User ID is required');
    });

    test('should validate color format', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'Test',
        color: 'invalid-color'
      };

      await expect(categoryService.createPasswordCategory(categoryData, 1))
        .rejects.toThrow('Color must be a valid hex color code');
    });
  });

  describe('updatePasswordCategory', () => {
    test('should update category successfully', async () => {
      const categoryId = 1;
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description',
        color: '#00ff00'
      };
      const userId = 1;

      const mockUpdatedCategory = {
        id: categoryId,
        name: updateData.name,
        description: updateData.description,
        color: updateData.color,
        created_by: 1,
        created_at: '2025-07-10T20:00:00.000Z'
      };

      // Mock the sequence of calls in updatePasswordCategory
      mockAdapter.query
        .mockResolvedValueOnce({ rows: [{ id: categoryId, name: 'Old Category', description: 'Old desc', color: '#ff0000', created_by: 1, created_at: '2025-07-10T20:00:00.000Z' }], rowCount: 1 }) // Initial getCategoryById
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Name conflict check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update query
        .mockResolvedValueOnce({ rows: [mockUpdatedCategory], rowCount: 1 }); // Final getCategoryById

      const result = await categoryService.updatePasswordCategory(categoryId, updateData, userId);

      expect(result).toEqual({
        id: mockUpdatedCategory.id,
        name: mockUpdatedCategory.name,
        description: mockUpdatedCategory.description,
        color: mockUpdatedCategory.color,
        createdBy: mockUpdatedCategory.created_by,
        createdAt: mockUpdatedCategory.created_at
      });
    });

    test('should throw error when category not found', async () => {
      mockAdapter.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(categoryService.updatePasswordCategory(999, { name: 'Test' }, 1))
        .rejects.toThrow('Category not found');
    });
  });

  describe('deletePasswordCategory', () => {
    test('should delete category successfully', async () => {
      const categoryId = 1;
      const userId = 1;

      // Mock category exists and has no passwords
      mockAdapter.query
        .mockResolvedValueOnce({ rows: [{ id: categoryId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No passwords
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Delete successful

      const result = await categoryService.deletePasswordCategory(categoryId, userId);

      expect(result).toBe(true);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        'DELETE FROM password_categories WHERE id = ?',
        [categoryId]
      );
    });

    test('should throw error when category has passwords', async () => {
      const categoryId = 1;

      mockAdapter.query
        .mockResolvedValueOnce({ rows: [{ id: categoryId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // Has passwords

      await expect(categoryService.deletePasswordCategory(categoryId, 1))
        .rejects.toThrow('Cannot delete category that contains passwords');
    });
  });

  describe('getCategoryStats', () => {
    test('should return category statistics', async () => {
      const mockStats = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444', password_count: 5 },
        { id: 2, name: 'Banking', description: 'Financial services', color: '#059669', password_count: 3 }
      ];

      mockAdapter.query.mockResolvedValue({
        rows: mockStats,
        rowCount: 2
      });

      const result = await categoryService.getCategoryStats();

      expect(result).toEqual(mockStats.map(stat => ({
        id: stat.id,
        name: stat.name,
        description: stat.description,
        color: stat.color,
        passwordCount: parseInt(stat.password_count)
      })));
    });
  });
});
