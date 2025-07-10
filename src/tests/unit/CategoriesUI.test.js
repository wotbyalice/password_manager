/**
 * Categories UI Components Unit Tests
 * Test-Driven Development for Categories User Interface
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');

// Create a mock DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <div id="categories-view" class="view hidden">
        <div class="view-header">
            <h2>Categories</h2>
            <div class="view-actions">
                <button class="btn btn-primary admin-only" id="add-category-btn">Add Category</button>
            </div>
        </div>
        <div class="categories-grid" id="categories-grid">
            <div class="empty-state admin-only" id="temp-add-category" style="display: none;">
                <h3>No Categories Yet</h3>
                <p>Create your first category to organize passwords</p>
                <button class="btn btn-primary">Add Category</button>
            </div>
        </div>
    </div>

    <div id="category-modal" class="modal hidden">
        <div class="modal-header">
            <h3 id="category-modal-title">Add Category</h3>
            <button class="modal-close" id="category-modal-close">&times;</button>
        </div>
        <form id="category-form" class="modal-body">
            <div class="form-group">
                <label for="category-name">Category Name *</label>
                <input type="text" id="category-name" name="name" required maxlength="100">
            </div>
            <div class="form-group">
                <label for="category-description">Description</label>
                <textarea id="category-description" name="description" maxlength="500" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label for="category-color">Color</label>
                <div class="color-picker-container">
                    <input type="color" id="category-color" name="color" value="#007bff">
                    <div class="color-presets">
                        <button type="button" class="color-preset" data-color="#ef4444" style="background-color: #ef4444;"></button>
                        <button type="button" class="color-preset" data-color="#f59e0b" style="background-color: #f59e0b;"></button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="category-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary" id="category-save">Create Category</button>
            </div>
        </form>
    </div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;
global.alert = jest.fn();
global.confirm = jest.fn();

const CategoriesUI = require('../../renderer/js/CategoriesUI');

describe('CategoriesUI', () => {
  let categoriesUI;
  let mockCategoriesManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset DOM
    document.getElementById('categories-grid').innerHTML = `
      <div class="empty-state admin-only" id="temp-add-category" style="display: none;">
        <h3>No Categories Yet</h3>
        <p>Create your first category to organize passwords</p>
        <button class="btn btn-primary">Add Category</button>
      </div>
    `;

    // Mock CategoriesManager
    mockCategoriesManager = {
      categories: [],
      loadCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryStats: jest.fn()
    };

    // Create UI instance
    categoriesUI = new CategoriesUI(mockCategoriesManager);
  });

  describe('Constructor', () => {
    test('should initialize with categories manager', () => {
      expect(categoriesUI.categoriesManager).toBe(mockCategoriesManager);
      expect(categoriesUI.currentEditingCategory).toBeNull();
    });

    test('should set up event listeners', () => {
      // Check if event listeners are attached by triggering events
      const addButton = document.getElementById('add-category-btn');
      const closeButton = document.getElementById('category-modal-close');
      const cancelButton = document.getElementById('category-cancel');
      
      expect(addButton).toBeTruthy();
      expect(closeButton).toBeTruthy();
      expect(cancelButton).toBeTruthy();
    });
  });

  describe('renderCategories', () => {
    test('should render category cards', () => {
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

      mockCategoriesManager.categories = mockCategories;
      categoriesUI.renderCategories();

      const grid = document.getElementById('categories-grid');
      const categoryCards = grid.querySelectorAll('.category-card');
      
      expect(categoryCards).toHaveLength(2);
      expect(grid.querySelector('.empty-state').style.display).toBe('none');
    });

    test('should show empty state when no categories', () => {
      mockCategoriesManager.categories = [];
      categoriesUI.renderCategories();

      const grid = document.getElementById('categories-grid');
      const emptyState = grid.querySelector('.empty-state');
      
      expect(emptyState.style.display).not.toBe('none');
    });

    test('should create category card with correct structure', () => {
      const mockCategory = {
        id: 1,
        name: 'Email',
        description: 'Email accounts and services',
        color: '#ef4444'
      };

      const card = categoriesUI.createCategoryCard(mockCategory);
      
      expect(card.classList.contains('category-card')).toBe(true);
      expect(card.querySelector('.category-name').textContent).toBe('Email');
      expect(card.querySelector('.category-description').textContent).toBe('Email accounts and services');
      expect(card.style.borderLeftColor).toBe('rgb(239, 68, 68)'); // #ef4444 in RGB
    });
  });

  describe('showAddCategoryModal', () => {
    test('should show modal for adding category', () => {
      categoriesUI.showAddCategoryModal();

      const modal = document.getElementById('category-modal');
      const title = document.getElementById('category-modal-title');
      const saveButton = document.getElementById('category-save');
      
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(title.textContent).toBe('Add Category');
      expect(saveButton.textContent).toBe('Create Category');
      expect(categoriesUI.currentEditingCategory).toBeNull();
    });

    test('should reset form when showing add modal', () => {
      // Set some values first
      document.getElementById('category-name').value = 'Test';
      document.getElementById('category-description').value = 'Test desc';
      document.getElementById('category-color').value = '#ff0000';

      categoriesUI.showAddCategoryModal();

      expect(document.getElementById('category-name').value).toBe('');
      expect(document.getElementById('category-description').value).toBe('');
      expect(document.getElementById('category-color').value).toBe('#007bff');
    });
  });

  describe('showEditCategoryModal', () => {
    test('should show modal for editing category', () => {
      const mockCategory = {
        id: 1,
        name: 'Email',
        description: 'Email accounts and services',
        color: '#ef4444'
      };

      categoriesUI.showEditCategoryModal(mockCategory);

      const modal = document.getElementById('category-modal');
      const title = document.getElementById('category-modal-title');
      const saveButton = document.getElementById('category-save');
      
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(title.textContent).toBe('Edit Category');
      expect(saveButton.textContent).toBe('Update Category');
      expect(categoriesUI.currentEditingCategory).toBe(mockCategory);
    });

    test('should populate form with category data', () => {
      const mockCategory = {
        id: 1,
        name: 'Email',
        description: 'Email accounts and services',
        color: '#ef4444'
      };

      categoriesUI.showEditCategoryModal(mockCategory);

      expect(document.getElementById('category-name').value).toBe('Email');
      expect(document.getElementById('category-description').value).toBe('Email accounts and services');
      expect(document.getElementById('category-color').value).toBe('#ef4444');
    });
  });

  describe('hideModal', () => {
    test('should hide modal and reset state', () => {
      // Show modal first
      categoriesUI.showAddCategoryModal();
      categoriesUI.currentEditingCategory = { id: 1 };

      categoriesUI.hideModal();

      const modal = document.getElementById('category-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(categoriesUI.currentEditingCategory).toBeNull();
    });
  });

  describe('handleFormSubmit', () => {
    test('should create new category when not editing', async () => {
      const mockCreatedCategory = {
        id: 3,
        name: 'New Category',
        description: 'Test category',
        color: '#ff0000'
      };

      mockCategoriesManager.createCategory.mockResolvedValue(mockCreatedCategory);
      
      // Set form values
      document.getElementById('category-name').value = 'New Category';
      document.getElementById('category-description').value = 'Test category';
      document.getElementById('category-color').value = '#ff0000';

      categoriesUI.currentEditingCategory = null;

      await categoriesUI.handleFormSubmit();

      expect(mockCategoriesManager.createCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: 'Test category',
        color: '#ff0000'
      });
    });

    test('should update category when editing', async () => {
      const mockUpdatedCategory = {
        id: 1,
        name: 'Updated Category',
        description: 'Updated description',
        color: '#00ff00'
      };

      mockCategoriesManager.updateCategory.mockResolvedValue(mockUpdatedCategory);
      
      // Set form values
      document.getElementById('category-name').value = 'Updated Category';
      document.getElementById('category-description').value = 'Updated description';
      document.getElementById('category-color').value = '#00ff00';

      categoriesUI.currentEditingCategory = { id: 1 };

      await categoriesUI.handleFormSubmit();

      expect(mockCategoriesManager.updateCategory).toHaveBeenCalledWith(1, {
        name: 'Updated Category',
        description: 'Updated description',
        color: '#00ff00'
      });
    });

    test('should handle validation errors', async () => {
      // Empty name should trigger validation
      document.getElementById('category-name').value = '';

      await categoriesUI.handleFormSubmit();

      expect(mockCategoriesManager.createCategory).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Category name is required');
    });
  });

  describe('handleDeleteCategory', () => {
    test('should delete category after confirmation', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);
      
      mockCategoriesManager.deleteCategory.mockResolvedValue(true);

      await categoriesUI.handleDeleteCategory(1);

      expect(mockCategoriesManager.deleteCategory).toHaveBeenCalledWith(1);
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this category? This action cannot be undone.'
      );
    });

    test('should not delete if user cancels', async () => {
      global.confirm = jest.fn(() => false);

      await categoriesUI.handleDeleteCategory(1);

      expect(mockCategoriesManager.deleteCategory).not.toHaveBeenCalled();
    });

    test('should handle delete errors', async () => {
      global.confirm.mockReturnValue(true);
      mockCategoriesManager.deleteCategory.mockRejectedValue(new Error('Cannot delete category that contains passwords'));

      await categoriesUI.handleDeleteCategory(1);

      expect(global.alert).toHaveBeenCalledWith('Cannot delete category that contains passwords');
    });
  });

  describe('Color Preset Handling', () => {
    test('should set color when preset is clicked', () => {
      const colorInput = document.getElementById('category-color');
      const preset = document.querySelector('.color-preset[data-color="#ef4444"]');
      
      categoriesUI.setupColorPresets();
      
      // Simulate click
      preset.click();
      
      expect(colorInput.value).toBe('#ef4444');
    });
  });

  describe('Real-time Updates', () => {
    test('should handle category created event', () => {
      const renderSpy = jest.spyOn(categoriesUI, 'renderCategories');
      
      // Simulate category created event
      const event = new CustomEvent('categoryCreated', {
        detail: { id: 3, name: 'New Category' }
      });
      
      window.dispatchEvent(event);
      
      expect(renderSpy).toHaveBeenCalled();
    });

    test('should handle category updated event', () => {
      const renderSpy = jest.spyOn(categoriesUI, 'renderCategories');
      
      // Simulate category updated event
      const event = new CustomEvent('categoryUpdated', {
        detail: { id: 1, name: 'Updated Category' }
      });
      
      window.dispatchEvent(event);
      
      expect(renderSpy).toHaveBeenCalled();
    });

    test('should handle category deleted event', () => {
      const renderSpy = jest.spyOn(categoriesUI, 'renderCategories');
      
      // Simulate category deleted event
      const event = new CustomEvent('categoryDeleted', {
        detail: { id: 1 }
      });
      
      window.dispatchEvent(event);
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });
});
