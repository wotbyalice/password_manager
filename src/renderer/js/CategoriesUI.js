/**
 * CategoriesUI - User Interface for Categories Management
 * Handles category display, modals, and user interactions
 */

class CategoriesUI {
  constructor(categoriesManager) {
    this.categoriesManager = categoriesManager;
    this.currentEditingCategory = null;
    
    this.setupEventListeners();
    this.setupColorPresets();
    this.setupRealTimeUpdates();
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Add category button
    const addButton = document.getElementById('add-category-btn');
    if (addButton) {
      addButton.addEventListener('click', () => this.showAddCategoryModal());
    }

    // Modal close buttons
    const closeButton = document.getElementById('category-modal-close');
    const cancelButton = document.getElementById('category-cancel');
    
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideModal());
    }
    
    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.hideModal());
    }

    // Form submission
    const form = document.getElementById('category-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Modal backdrop click
    const modal = document.getElementById('category-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }
  }

  /**
   * Set up color preset buttons
   */
  setupColorPresets() {
    const presets = document.querySelectorAll('.color-preset');
    const colorInput = document.getElementById('category-color');
    
    presets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.getAttribute('data-color');
        if (colorInput) {
          colorInput.value = color;
        }
      });
    });
  }

  /**
   * Set up real-time update listeners
   */
  setupRealTimeUpdates() {
    if (typeof window !== 'undefined') {
      window.addEventListener('categoryCreated', () => this.renderCategories());
      window.addEventListener('categoryUpdated', () => this.renderCategories());
      window.addEventListener('categoryDeleted', () => this.renderCategories());
    }
  }

  /**
   * Render all categories in the grid
   */
  renderCategories() {
    const grid = document.getElementById('categories-grid');
    const emptyState = document.getElementById('temp-add-category');
    
    if (!grid) return;

    // Clear existing category cards (keep empty state)
    const existingCards = grid.querySelectorAll('.category-card');
    existingCards.forEach(card => card.remove());

    const categories = this.categoriesManager.categories || [];

    if (categories.length === 0) {
      // Show empty state
      if (emptyState) {
        emptyState.style.display = 'block';
      }
    } else {
      // Hide empty state
      if (emptyState) {
        emptyState.style.display = 'none';
      }

      // Create category cards
      categories.forEach(category => {
        const card = this.createCategoryCard(category);
        grid.appendChild(card);
      });
    }
  }

  /**
   * Create a category card element
   * @param {Object} category - Category data
   * @returns {HTMLElement} Category card element
   */
  createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.style.borderLeftColor = category.color;
    card.setAttribute('data-category-id', category.id);

    card.innerHTML = `
      <div class="category-header">
        <div class="category-color" style="background-color: ${category.color}"></div>
        <div class="category-info">
          <h3 class="category-name">${this.escapeHtml(category.name)}</h3>
          <p class="category-description">${this.escapeHtml(category.description || '')}</p>
        </div>
        <div class="category-actions admin-only">
          <button class="btn btn-sm btn-secondary" onclick="window.categoriesUI?.showEditCategoryModal(${JSON.stringify(category).replace(/"/g, '&quot;')})">
            <i class="icon-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.categoriesUI?.handleDeleteCategory(${category.id})">
            <i class="icon-trash"></i>
          </button>
        </div>
      </div>
      <div class="category-stats">
        <span class="password-count">0 passwords</span>
      </div>
    `;

    return card;
  }

  /**
   * Show modal for adding a new category
   */
  showAddCategoryModal() {
    this.currentEditingCategory = null;
    this.resetForm();
    
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const saveButton = document.getElementById('category-save');
    
    if (title) title.textContent = 'Add Category';
    if (saveButton) saveButton.textContent = 'Create Category';
    if (modal) modal.classList.remove('hidden');
  }

  /**
   * Show modal for editing an existing category
   * @param {Object} category - Category to edit
   */
  showEditCategoryModal(category) {
    this.currentEditingCategory = category;
    this.populateForm(category);
    
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const saveButton = document.getElementById('category-save');
    
    if (title) title.textContent = 'Edit Category';
    if (saveButton) saveButton.textContent = 'Update Category';
    if (modal) modal.classList.remove('hidden');
  }

  /**
   * Hide the category modal
   */
  hideModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.currentEditingCategory = null;
  }

  /**
   * Reset the form to default values
   */
  resetForm() {
    const nameInput = document.getElementById('category-name');
    const descInput = document.getElementById('category-description');
    const colorInput = document.getElementById('category-color');
    
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (colorInput) colorInput.value = '#007bff';
  }

  /**
   * Populate form with category data
   * @param {Object} category - Category data
   */
  populateForm(category) {
    const nameInput = document.getElementById('category-name');
    const descInput = document.getElementById('category-description');
    const colorInput = document.getElementById('category-color');
    
    if (nameInput) nameInput.value = category.name || '';
    if (descInput) descInput.value = category.description || '';
    if (colorInput) colorInput.value = category.color || '#007bff';
  }

  /**
   * Handle form submission for create/update
   */
  async handleFormSubmit() {
    try {
      const nameInput = document.getElementById('category-name');
      const descInput = document.getElementById('category-description');
      const colorInput = document.getElementById('category-color');
      
      const name = nameInput?.value?.trim();
      const description = descInput?.value?.trim();
      const color = colorInput?.value;

      // Basic validation
      if (!name) {
        alert('Category name is required');
        return;
      }

      const categoryData = {
        name,
        description: description || null,
        color
      };

      if (this.currentEditingCategory) {
        // Update existing category
        await this.categoriesManager.updateCategory(this.currentEditingCategory.id, categoryData);
      } else {
        // Create new category
        await this.categoriesManager.createCategory(categoryData);
      }

      this.hideModal();
      this.renderCategories();

    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.message || 'Failed to save category');
    }
  }

  /**
   * Handle category deletion
   * @param {number} categoryId - ID of category to delete
   */
  async handleDeleteCategory(categoryId) {
    try {
      const confirmed = confirm('Are you sure you want to delete this category? This action cannot be undone.');
      
      if (!confirmed) {
        return;
      }

      await this.categoriesManager.deleteCategory(categoryId);
      this.renderCategories();

    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.message || 'Failed to delete category');
    }
  }

  /**
   * Load and display categories
   */
  async loadAndRenderCategories() {
    try {
      await this.categoriesManager.loadCategories();
      this.renderCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
      // Show error state or fallback
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show loading state
   */
  showLoading() {
    const grid = document.getElementById('categories-grid');
    if (grid) {
      grid.innerHTML = '<div class="loading">Loading categories...</div>';
    }
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message) {
    const grid = document.getElementById('categories-grid');
    if (grid) {
      grid.innerHTML = `<div class="error">Error: ${this.escapeHtml(message)}</div>`;
    }
  }
}

// Export for both Node.js (testing) and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoriesUI;
} else if (typeof window !== 'undefined') {
  window.CategoriesUI = CategoriesUI;
}
