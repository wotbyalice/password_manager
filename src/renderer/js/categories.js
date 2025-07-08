/**
 * Categories Manager
 * Handles password category operations
 */

class CategoriesManager {
    constructor() {
        this.categories = [];
        this.isLoading = false;
    }

    /**
     * Initialize categories manager
     */
    async init() {
        console.log('Categories Manager: Initializing...');
        await this.loadCategories();
    }

    /**
     * Load categories from API
     */
    async loadCategories() {
        try {
            this.isLoading = true;
            console.log('Categories Manager: Loading categories...');
            
            const result = await electronAPI.getCategories();
            
            if (result.success) {
                this.categories = result.categories || [];
                console.log('Categories Manager: Categories loaded successfully:', this.categories);
            } else {
                console.error('Categories Manager: Failed to load categories:', result.error);
                this.categories = [];
            }
        } catch (error) {
            console.error('Categories Manager: Error loading categories:', error);
            this.categories = [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get all categories
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Get category by ID
     */
    getCategoryById(id) {
        return this.categories.find(cat => cat.id === id);
    }

    /**
     * Create new category
     */
    async createCategory(categoryData) {
        try {
            console.log('Categories Manager: Creating category:', categoryData);
            
            const result = await electronAPI.createCategory(categoryData);
            
            if (result.success) {
                console.log('Categories Manager: Category created successfully');
                await this.loadCategories(); // Reload categories
                return result;
            } else {
                console.error('Categories Manager: Failed to create category:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Categories Manager: Error creating category:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update category
     */
    async updateCategory(id, categoryData) {
        try {
            console.log('Categories Manager: Updating category:', id, categoryData);
            
            const result = await electronAPI.updateCategory(id, categoryData);
            
            if (result.success) {
                console.log('Categories Manager: Category updated successfully');
                await this.loadCategories(); // Reload categories
                return result;
            } else {
                console.error('Categories Manager: Failed to update category:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Categories Manager: Error updating category:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete category
     */
    async deleteCategory(id) {
        try {
            console.log('Categories Manager: Deleting category:', id);
            
            const result = await electronAPI.deleteCategory(id);
            
            if (result.success) {
                console.log('Categories Manager: Category deleted successfully');
                await this.loadCategories(); // Reload categories
                return result;
            } else {
                console.error('Categories Manager: Failed to delete category:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Categories Manager: Error deleting category:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Populate category select elements
     */
    populateCategorySelect(selectElement, includeAll = false) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '';

        // Add "All Categories" option if requested
        if (includeAll) {
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'All Categories';
            selectElement.appendChild(allOption);
        }

        // Add category options
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });
    }

    /**
     * Get category color
     */
    getCategoryColor(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.color : '#6B7280';
    }

    /**
     * Get category name
     */
    getCategoryName(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.name : 'Unknown';
    }
}

/**
 * CategoryManager - UI Controller for Categories View
 * Handles rendering and user interactions for the categories page
 */
class CategoryManager {
    constructor() {
        this.categories = [];
        this.isLoading = false;
        this.editingCategoryId = null;

        this.init();
    }

    /**
     * Initialize category manager
     */
    async init() {
        console.log('CategoryManager: Initializing...');
        this.setupEventListeners();
        await this.loadCategories();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add category button
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => {
                this.showAddCategoryModal();
            });
        }

        // Category modal events will be set up when modal is created
        this.setupCategoryModal();
    }

    /**
     * Load categories from API and render
     */
    async loadCategories() {
        try {
            this.isLoading = true;
            this.renderLoadingState();

            console.log('CategoryManager: Loading categories with statistics...');

            // Get categories with password counts
            const result = await electronAPI.getCategoryStats();

            if (result.success) {
                this.categories = result.data.categories || [];
                console.log('CategoryManager: Categories loaded:', this.categories.length);
            } else {
                console.error('CategoryManager: Failed to load categories:', result.error);
                this.categories = [];
                this.renderErrorState(result.error);
                return;
            }

            this.renderCategories();

        } catch (error) {
            console.error('CategoryManager: Error loading categories:', error);
            this.renderErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render categories grid
     */
    renderCategories() {
        const grid = document.getElementById('categories-grid');
        if (!grid) {
            console.warn('CategoryManager: categories-grid element not found');
            return;
        }

        if (this.categories.length === 0) {
            grid.innerHTML = this.renderEmptyState();
            return;
        }

        grid.innerHTML = this.categories.map(category => this.renderCategoryCard(category)).join('');

        // Add event listeners to cards
        this.attachCardEventListeners();
    }

    /**
     * Render individual category card
     */
    renderCategoryCard(category) {
        const isEditing = this.editingCategoryId === category.id;
        const colorStyle = category.color ? `--category-color: ${category.color}` : '';

        return `
            <div class="category-card" data-id="${category.id}" style="${colorStyle}">
                <div class="category-header">
                    <h3 class="category-name">${this.escapeHtml(category.name)}</h3>
                    <span class="category-count">${category.passwordCount || 0}</span>
                </div>

                ${category.description ? `
                    <p class="category-description">${this.escapeHtml(category.description)}</p>
                ` : ''}

                <div class="category-actions admin-only">
                    <button class="btn btn-sm btn-secondary edit-category-btn" data-id="${category.id}">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-category-btn" data-id="${category.id}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoadingState() {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading categories...</p>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>No Categories Yet</h3>
                <p>Create your first category to organize passwords</p>
                <button class="btn btn-primary admin-only" onclick="window.categoryManager?.showAddCategoryModal()">
                    Add First Category
                </button>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderErrorState(errorMessage) {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">⚠️</div>
                <h3>Failed to Load Categories</h3>
                <p>${this.escapeHtml(errorMessage)}</p>
                <button class="btn btn-primary" onclick="window.categoryManager?.loadCategories()">
                    Try Again
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners to category cards
     */
    attachCardEventListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = parseInt(btn.dataset.id);
                this.showEditCategoryModal(categoryId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = parseInt(btn.dataset.id);
                this.confirmDeleteCategory(categoryId);
            });
        });
    }

    /**
     * Set up category modal events
     */
    setupCategoryModal() {
        const modal = document.getElementById('category-modal');
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('category-form');
        const closeBtn = document.getElementById('category-modal-close');
        const cancelBtn = document.getElementById('category-cancel');

        if (!modal || !overlay || !form) {
            console.warn('CategoryManager: Modal elements not found');
            return;
        }

        // Close modal events
        closeBtn?.addEventListener('click', () => this.hideCategoryModal());
        cancelBtn?.addEventListener('click', () => this.hideCategoryModal());

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideCategoryModal();
            }
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCategoryFormSubmit();
        });

        // Color preset selection
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                e.preventDefault();
                const color = preset.dataset.color;
                document.getElementById('category-color').value = color;
                this.updateColorPresetSelection(color);
            });
        });

        // Color input change
        const colorInput = document.getElementById('category-color');
        colorInput?.addEventListener('change', (e) => {
            this.updateColorPresetSelection(e.target.value);
        });
    }

    /**
     * Show add category modal
     */
    showAddCategoryModal() {
        this.editingCategoryId = null;
        this.resetCategoryForm();

        document.getElementById('category-modal-title').textContent = 'Add Category';
        document.getElementById('category-save').textContent = 'Create Category';

        this.showCategoryModal();
    }

    /**
     * Show edit category modal
     */
    showEditCategoryModal(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) {
            console.error('CategoryManager: Category not found for editing:', categoryId);
            return;
        }

        this.editingCategoryId = categoryId;
        this.populateCategoryForm(category);

        document.getElementById('category-modal-title').textContent = 'Edit Category';
        document.getElementById('category-save').textContent = 'Update Category';

        this.showCategoryModal();
    }

    /**
     * Show category modal
     */
    showCategoryModal() {
        const modal = document.getElementById('category-modal');
        const overlay = document.getElementById('modal-overlay');

        if (modal && overlay) {
            overlay.classList.remove('hidden');
            modal.classList.remove('hidden');

            // Focus on name input
            setTimeout(() => {
                document.getElementById('category-name')?.focus();
            }, 100);
        }
    }

    /**
     * Hide category modal
     */
    hideCategoryModal() {
        const modal = document.getElementById('category-modal');
        const overlay = document.getElementById('modal-overlay');

        if (modal && overlay) {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
            this.resetCategoryForm();
        }
    }

    /**
     * Reset category form
     */
    resetCategoryForm() {
        const form = document.getElementById('category-form');
        if (form) {
            form.reset();
            document.getElementById('category-color').value = '#007bff';
            this.updateColorPresetSelection('#007bff');
        }
    }

    /**
     * Populate category form with existing data
     */
    populateCategoryForm(category) {
        document.getElementById('category-name').value = category.name || '';
        document.getElementById('category-description').value = category.description || '';
        document.getElementById('category-color').value = category.color || '#007bff';
        this.updateColorPresetSelection(category.color || '#007bff');
    }

    /**
     * Update color preset selection visual state
     */
    updateColorPresetSelection(selectedColor) {
        document.querySelectorAll('.color-preset').forEach(preset => {
            if (preset.dataset.color === selectedColor) {
                preset.classList.add('selected');
            } else {
                preset.classList.remove('selected');
            }
        });
    }

    /**
     * Handle category form submission
     */
    async handleCategoryFormSubmit() {
        const form = document.getElementById('category-form');
        const formData = new FormData(form);

        const categoryData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            color: formData.get('color')
        };

        // Validate
        if (!categoryData.name) {
            this.showNotification('Category name is required', 'error');
            return;
        }

        try {
            let result;
            if (this.editingCategoryId) {
                // Update existing category
                result = await electronAPI.updateCategory(this.editingCategoryId, categoryData);
            } else {
                // Create new category
                result = await electronAPI.createCategory(categoryData);
            }

            if (result.success) {
                this.showNotification(
                    this.editingCategoryId ? 'Category updated successfully' : 'Category created successfully',
                    'success'
                );
                this.hideCategoryModal();
                await this.loadCategories(); // Reload categories
            } else {
                this.showNotification(result.error || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('CategoryManager: Form submission error:', error);
            this.showNotification('An error occurred', 'error');
        }
    }

    /**
     * Confirm delete category
     */
    async confirmDeleteCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) {
            console.error('CategoryManager: Category not found for deletion:', categoryId);
            return;
        }

        const passwordCount = category.passwordCount || 0;
        let message = `Are you sure you want to delete the category "${category.name}"?`;

        if (passwordCount > 0) {
            message += `\n\nThis category is used by ${passwordCount} password${passwordCount > 1 ? 's' : ''}. Those passwords will no longer have a category assigned.`;
        }

        if (confirm(message)) {
            try {
                const result = await electronAPI.deleteCategory(categoryId);

                if (result.success) {
                    this.showNotification('Category deleted successfully', 'success');
                    await this.loadCategories(); // Reload categories
                } else {
                    this.showNotification(result.error || 'Failed to delete category', 'error');
                }
            } catch (error) {
                console.error('CategoryManager: Delete error:', error);
                this.showNotification('An error occurred while deleting', 'error');
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use the global notification system if available
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            // Fallback to alert
            alert(message);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instances
window.categoriesManager = new CategoriesManager();
window.CategoryManager = CategoryManager;

// Also create a global instance for immediate use
window.categoryManager = null; // Will be created by app.js
