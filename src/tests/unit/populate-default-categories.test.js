/**
 * Default Categories Population Script Tests
 * Test-Driven Development for default categories setup
 */

const {
  populateDefaultCategories,
  verifyCategories,
  getCategoryStatistics,
  DEFAULT_CATEGORIES
} = require('../../scripts/populate-default-categories');

const CategoryService = require('../../server/services/CategoryService');

// Mock dependencies
jest.mock('../../server/services/CategoryService');
jest.mock('../../server/utils/logger');

describe('Default Categories Population', () => {
  let mockCategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock CategoryService
    mockCategoryService = {
      getPasswordCategories: jest.fn(),
      createPasswordCategory: jest.fn(),
      getCategoryStats: jest.fn()
    };
    
    CategoryService.mockImplementation(() => mockCategoryService);
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('DEFAULT_CATEGORIES configuration', () => {
    test('should have correct default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(7);
      
      const expectedCategories = [
        'Email', 'Social Media', 'Banking', 'Work', 'WiFi', 'Servers', 'Software'
      ];
      
      expectedCategories.forEach(name => {
        const category = DEFAULT_CATEGORIES.find(cat => cat.name === name);
        expect(category).toBeDefined();
        expect(category.description).toBeTruthy();
        expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('should have unique category names', () => {
      const names = DEFAULT_CATEGORIES.map(cat => cat.name.toLowerCase());
      const uniqueNames = [...new Set(names)];
      expect(names).toHaveLength(uniqueNames.length);
    });

    test('should have valid hex colors', () => {
      DEFAULT_CATEGORIES.forEach(category => {
        expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('populateDefaultCategories', () => {
    test('should create all categories when none exist', async () => {
      // Mock empty existing categories (first call)
      mockCategoryService.getPasswordCategories.mockResolvedValueOnce([]);

      // Mock successful creation
      DEFAULT_CATEGORIES.forEach((cat, index) => {
        mockCategoryService.createPasswordCategory.mockResolvedValueOnce({
          id: index + 1,
          ...cat,
          createdBy: 1,
          createdAt: '2025-07-10T20:00:00.000Z'
        });
      });

      // Mock final categories list (second call)
      const finalCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
        id: index + 1,
        ...cat,
        createdBy: 1,
        createdAt: '2025-07-10T20:00:00.000Z'
      }));
      mockCategoryService.getPasswordCategories.mockResolvedValueOnce(finalCategories);

      const result = await populateDefaultCategories();

      expect(result.created).toBe(7);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(7);
      expect(mockCategoryService.createPasswordCategory).toHaveBeenCalledTimes(7);
    });

    test('should skip existing categories', async () => {
      // Mock some existing categories
      const existingCategories = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444' },
        { id: 2, name: 'Banking', description: 'Financial services', color: '#059669' }
      ];
      
      mockCategoryService.getPasswordCategories.mockResolvedValueOnce(existingCategories);
      
      // Mock creation of remaining categories
      const remainingCategories = DEFAULT_CATEGORIES.filter(cat => 
        !existingCategories.find(existing => existing.name.toLowerCase() === cat.name.toLowerCase())
      );
      
      remainingCategories.forEach((cat, index) => {
        mockCategoryService.createPasswordCategory.mockResolvedValueOnce({
          id: index + 3,
          ...cat,
          createdBy: 1,
          createdAt: '2025-07-10T20:00:00.000Z'
        });
      });
      
      // Mock final categories list
      const finalCategories = [...existingCategories, ...remainingCategories.map((cat, index) => ({
        id: index + 3,
        ...cat,
        createdBy: 1,
        createdAt: '2025-07-10T20:00:00.000Z'
      }))];
      mockCategoryService.getPasswordCategories.mockResolvedValueOnce(finalCategories);

      const result = await populateDefaultCategories();

      expect(result.created).toBe(5); // 7 - 2 existing
      expect(result.skipped).toBe(2);
      expect(result.total).toBe(7);
      expect(mockCategoryService.createPasswordCategory).toHaveBeenCalledTimes(5);
    });

    test('should handle creation errors gracefully', async () => {
      // Mock empty existing categories (first call)
      mockCategoryService.getPasswordCategories.mockResolvedValueOnce([]);

      // Mock some successful and some failed creations
      mockCategoryService.createPasswordCategory
        .mockResolvedValueOnce({ id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444' })
        .mockRejectedValueOnce(new Error('Category name already exists'))
        .mockResolvedValueOnce({ id: 3, name: 'Banking', description: 'Financial services', color: '#059669' })
        .mockResolvedValueOnce({ id: 4, name: 'Work', description: 'Business tools', color: '#0ea5e9' })
        .mockResolvedValueOnce({ id: 5, name: 'WiFi', description: 'Network credentials', color: '#f59e0b' })
        .mockResolvedValueOnce({ id: 6, name: 'Servers', description: 'Server access', color: '#6366f1' })
        .mockResolvedValueOnce({ id: 7, name: 'Software', description: 'Software licenses', color: '#ec4899' });

      // Mock final categories list (second call)
      mockCategoryService.getPasswordCategories.mockResolvedValueOnce([
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444' },
        { id: 3, name: 'Banking', description: 'Financial services', color: '#059669' },
        { id: 4, name: 'Work', description: 'Business tools', color: '#0ea5e9' },
        { id: 5, name: 'WiFi', description: 'Network credentials', color: '#f59e0b' },
        { id: 6, name: 'Servers', description: 'Server access', color: '#6366f1' },
        { id: 7, name: 'Software', description: 'Software licenses', color: '#ec4899' }
      ]);

      const result = await populateDefaultCategories();

      expect(result.created).toBe(6); // 7 - 1 failed
      expect(result.total).toBe(6);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create'),
        'Category name already exists'
      );
    });

    test('should throw error if service fails', async () => {
      mockCategoryService.getPasswordCategories.mockRejectedValue(new Error('Database error'));

      await expect(populateDefaultCategories()).rejects.toThrow('Database error');
    });
  });

  describe('verifyCategories', () => {
    test('should return true when all categories are valid', async () => {
      const validCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
        id: index + 1,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        createdBy: 1,
        createdAt: '2025-07-10T20:00:00.000Z'
      }));

      mockCategoryService.getPasswordCategories.mockResolvedValue(validCategories);

      const result = await verifyCategories();

      expect(result).toBe(true);
    });

    test('should return false when categories are missing', async () => {
      const incompleteCategories = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444', createdBy: 1, createdAt: '2025-07-10T20:00:00.000Z' }
      ];

      mockCategoryService.getPasswordCategories.mockResolvedValue(incompleteCategories);

      const result = await verifyCategories();

      expect(result).toBe(false);
    });

    test('should return false when categories are invalid', async () => {
      const invalidCategories = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444', createdBy: 1, createdAt: '2025-07-10T20:00:00.000Z' },
        { id: 2, name: 'Banking', description: null, color: '#059669', createdBy: 1, createdAt: '2025-07-10T20:00:00.000Z' } // Invalid - no description
      ];

      mockCategoryService.getPasswordCategories.mockResolvedValue(invalidCategories);

      const result = await verifyCategories();

      expect(result).toBe(false);
    });

    test('should handle service errors', async () => {
      mockCategoryService.getPasswordCategories.mockRejectedValue(new Error('Database error'));

      const result = await verifyCategories();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '❌ CATEGORIES: Verification failed:',
        expect.any(Error)
      );
    });
  });

  describe('getCategoryStatistics', () => {
    test('should return category statistics', async () => {
      const mockStats = [
        { id: 1, name: 'Email', description: 'Email accounts', color: '#ef4444', passwordCount: 5 },
        { id: 2, name: 'Banking', description: 'Financial services', color: '#059669', passwordCount: 3 },
        { id: 3, name: 'Work', description: 'Business tools', color: '#0ea5e9', passwordCount: 0 }
      ];

      mockCategoryService.getCategoryStats.mockResolvedValue(mockStats);

      const result = await getCategoryStatistics();

      expect(result).toEqual(mockStats);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total categories: 3'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total passwords: 8'));
    });

    test('should handle empty statistics', async () => {
      mockCategoryService.getCategoryStats.mockResolvedValue([]);

      const result = await getCategoryStatistics();

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total categories: 0'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total passwords: 0'));
    });

    test('should handle service errors', async () => {
      mockCategoryService.getCategoryStats.mockRejectedValue(new Error('Database error'));

      const result = await getCategoryStatistics();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        '❌ CATEGORIES: Failed to get statistics:',
        expect.any(Error)
      );
    });
  });

  describe('Category validation', () => {
    test('should validate category structure', () => {
      DEFAULT_CATEGORIES.forEach(category => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('color');
        
        expect(typeof category.name).toBe('string');
        expect(typeof category.description).toBe('string');
        expect(typeof category.color).toBe('string');
        
        expect(category.name.length).toBeGreaterThan(0);
        expect(category.description.length).toBeGreaterThan(0);
        expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('should have meaningful descriptions', () => {
      DEFAULT_CATEGORIES.forEach(category => {
        expect(category.description.length).toBeGreaterThan(10);
        expect(category.description).not.toBe(category.name);
      });
    });

    test('should have distinct colors', () => {
      const colors = DEFAULT_CATEGORIES.map(cat => cat.color.toLowerCase());
      const uniqueColors = [...new Set(colors)];
      expect(colors).toHaveLength(uniqueColors.length);
    });
  });
});
