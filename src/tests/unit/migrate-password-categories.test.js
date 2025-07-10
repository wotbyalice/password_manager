/**
 * Password Categories Migration Tests
 * Test-Driven Development for password categories migration
 */

const {
  addCategoryIdColumn,
  migrateCategoryData,
  removeOldCategoryColumn,
  addIndexes,
  verifyMigration,
  runMigration
} = require('../../scripts/migrate-password-categories');

const { query } = require('../../server/database/connection');
const CategoryService = require('../../server/services/CategoryService');

// Mock dependencies
jest.mock('../../server/database/connection');
jest.mock('../../server/services/CategoryService');
jest.mock('../../server/utils/logger');

describe('Password Categories Migration', () => {
  let mockCategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock CategoryService
    mockCategoryService = {
      getPasswordCategories: jest.fn(),
      createPasswordCategory: jest.fn()
    };
    
    CategoryService.mockImplementation(() => mockCategoryService);
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addCategoryIdColumn', () => {
    test('should add category_id column when it does not exist', async () => {
      // Mock column check - column doesn't exist
      query.mockResolvedValueOnce({ rows: [] });
      
      // Mock successful column addition
      query.mockResolvedValueOnce({ rows: [] });

      const result = await addCategoryIdColumn();

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE password_entries')
      );
    });

    test('should skip adding column when it already exists', async () => {
      // Mock column check - column exists
      query.mockResolvedValueOnce({ 
        rows: [{ column_name: 'category_id' }] 
      });

      const result = await addCategoryIdColumn();

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledTimes(1); // Only the check query
    });

    test('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(addCategoryIdColumn()).rejects.toThrow('Database error');
    });
  });

  describe('migrateCategoryData', () => {
    test('should migrate existing categories successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Email', description: 'Email accounts' },
        { id: 2, name: 'Banking', description: 'Financial services' }
      ];

      const mockPasswords = [
        { id: 1, category: 'Email' },
        { id: 2, category: 'Banking' },
        { id: 3, category: 'email' } // Case insensitive match
      ];

      // Mock category service
      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);
      
      // Mock password entries query
      query.mockResolvedValueOnce({ rows: mockPasswords });
      
      // Mock update queries
      query.mockResolvedValue({ rows: [] });

      const result = await migrateCategoryData();

      expect(result.migratedCount).toBe(3);
      expect(result.unmatchedCount).toBe(0);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE password_entries'),
        expect.any(Array)
      );
    });

    test('should create new categories for unmatched names', async () => {
      const mockCategories = [
        { id: 1, name: 'Email', description: 'Email accounts' }
      ];

      const mockPasswords = [
        { id: 1, category: 'Email' },
        { id: 2, category: 'Social Media' } // Unmatched
      ];

      const newCategory = {
        id: 3,
        name: 'Social Media',
        description: 'Auto-migrated category: Social Media',
        color: '#6b7280'
      };

      // Mock category service
      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);
      mockCategoryService.createPasswordCategory.mockResolvedValue(newCategory);
      
      // Mock password entries query
      query.mockResolvedValueOnce({ rows: mockPasswords });
      
      // Mock update queries
      query.mockResolvedValue({ rows: [] });

      const result = await migrateCategoryData();

      expect(result.migratedCount).toBe(2);
      expect(result.unmatchedCount).toBe(0);
      expect(mockCategoryService.createPasswordCategory).toHaveBeenCalledWith({
        name: 'Social Media',
        description: 'Auto-migrated category: Social Media',
        color: '#6b7280'
      }, 1);
    });

    test('should handle category creation failures', async () => {
      const mockCategories = [];
      const mockPasswords = [
        { id: 1, category: 'Invalid Category' }
      ];

      // Mock category service
      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);
      mockCategoryService.createPasswordCategory.mockRejectedValue(new Error('Category creation failed'));
      
      // Mock password entries query
      query.mockResolvedValueOnce({ rows: mockPasswords });

      const result = await migrateCategoryData();

      expect(result.migratedCount).toBe(0);
      expect(result.unmatchedCount).toBe(1);
    });
  });

  describe('removeOldCategoryColumn', () => {
    test('should remove old category column when no unmigrated entries', async () => {
      // Mock check for remaining entries - none found
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      
      // Mock successful column removal
      query.mockResolvedValueOnce({ rows: [] });

      const result = await removeOldCategoryColumn();

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE password_entries DROP COLUMN category')
      );
    });

    test('should skip removal when unmigrated entries exist', async () => {
      // Mock check for remaining entries - some found
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const result = await removeOldCategoryColumn();

      expect(result).toBe(false);
      expect(query).toHaveBeenCalledTimes(1); // Only the check query
    });
  });

  describe('addIndexes', () => {
    test('should add performance indexes successfully', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await addIndexes();

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_password_entries_category_id')
      );
    });

    test('should handle index creation errors', async () => {
      query.mockRejectedValue(new Error('Index creation failed'));

      await expect(addIndexes()).rejects.toThrow('Index creation failed');
    });
  });

  describe('verifyMigration', () => {
    test('should return verification statistics', async () => {
      // Mock verification queries
      query
        .mockResolvedValueOnce({ rows: [{ count: '8' }] }) // with category_id
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // without category_id
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }); // total

      const result = await verifyMigration();

      expect(result).toEqual({
        total: 10,
        withCategory: 8,
        withoutCategory: 2,
        successRate: 80
      });
    });

    test('should handle zero passwords', async () => {
      // Mock verification queries - no passwords
      query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await verifyMigration();

      expect(result).toEqual({
        total: 0,
        withCategory: 0,
        withoutCategory: 0,
        successRate: 0
      });
    });
  });

  describe('runMigration', () => {
    test('should run complete migration successfully', async () => {
      // Mock all migration steps
      const mockCategories = [
        { id: 1, name: 'Email', description: 'Email accounts' }
      ];
      const mockPasswords = [
        { id: 1, category: 'Email' }
      ];

      // Setup mocks
      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);
      
      query
        // addCategoryIdColumn
        .mockResolvedValueOnce({ rows: [] }) // column check
        .mockResolvedValueOnce({ rows: [] }) // add column
        // migrateCategoryData
        .mockResolvedValueOnce({ rows: mockPasswords }) // get passwords
        .mockResolvedValueOnce({ rows: [] }) // update password
        // addIndexes
        .mockResolvedValueOnce({ rows: [] }) // create index
        // verifyMigration
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // with category_id
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // without category_id
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // total

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.migrationResult.migratedCount).toBe(1);
      expect(result.verificationResult.successRate).toBe(100);
    });

    test('should handle migration failures', async () => {
      // Mock failure in first step
      query.mockRejectedValue(new Error('Migration failed'));

      const result = await runMigration();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Migration failed');
    });

    test('should support removeOldColumn option', async () => {
      // Mock successful migration
      const mockCategories = [];
      mockCategoryService.getPasswordCategories.mockResolvedValue(mockCategories);
      
      query
        .mockResolvedValueOnce({ rows: [] }) // column check
        .mockResolvedValueOnce({ rows: [] }) // add column
        .mockResolvedValueOnce({ rows: [] }) // get passwords
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // check remaining
        .mockResolvedValueOnce({ rows: [] }) // remove column
        .mockResolvedValueOnce({ rows: [] }) // create index
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // verify with category_id
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // verify without category_id
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // verify total

      const result = await runMigration({ removeOldColumn: true });

      expect(result.success).toBe(true);
    });
  });
});
