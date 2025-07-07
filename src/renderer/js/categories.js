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

// Create global instance
window.categoriesManager = new CategoriesManager();
