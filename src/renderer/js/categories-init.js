/**
 * Categories Initialization
 * Initializes and integrates all categories components
 */

// Global categories components
let categoriesManager = null;
let categoriesUI = null;

/**
 * Initialize categories functionality
 * @param {Object} socket - Socket.io client instance
 */
async function initializeCategories(socket) {
  console.log('🔧 CATEGORIES: Initializing categories system...');
  
  try {
    // 1. Initialize Categories Manager
    categoriesManager = new CategoriesManager(socket);
    console.log('✅ CATEGORIES: Manager initialized');
    
    // 2. Initialize Categories UI
    categoriesUI = new CategoriesUI(categoriesManager);
    console.log('✅ CATEGORIES: UI initialized');
    
    // 3. Load categories from server
    await categoriesManager.loadCategories();
    console.log('✅ CATEGORIES: Categories loaded from server');
    
    // 4. Render initial categories
    categoriesUI.renderCategories();
    console.log('✅ CATEGORIES: Initial render complete');
    
    // 5. Make components globally available
    window.categoriesManager = categoriesManager;
    window.categoriesUI = categoriesUI;
    window.categoryManager = categoriesUI; // Alias for backward compatibility
    
    console.log('🎉 CATEGORIES: System initialization complete!');
    
    return {
      manager: categoriesManager,
      ui: categoriesUI
    };
    
  } catch (error) {
    console.error('❌ CATEGORIES: Initialization failed:', error);
    throw error;
  }
}

/**
 * Show categories view
 */
function showCategoriesView() {
  // Hide all other views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });
  
  // Show categories view
  const categoriesView = document.getElementById('categories-view');
  if (categoriesView) {
    categoriesView.classList.remove('hidden');
    
    // Refresh categories display
    if (categoriesUI) {
      categoriesUI.renderCategories();
    }
  }
}

/**
 * Handle navigation to categories
 */
function handleCategoriesNavigation() {
  console.log('🔧 CATEGORIES: Navigating to categories view');
  showCategoriesView();
  
  // Update navigation state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const categoriesNavItem = document.querySelector('.nav-item[data-view="categories"]');
  if (categoriesNavItem) {
    categoriesNavItem.classList.add('active');
  }
}

/**
 * Setup categories navigation
 */
function setupCategoriesNavigation() {
  // Find categories navigation item
  const categoriesNavItem = document.querySelector('.nav-item[data-view="categories"]');
  
  if (categoriesNavItem) {
    categoriesNavItem.addEventListener('click', (e) => {
      e.preventDefault();
      handleCategoriesNavigation();
    });
    console.log('✅ CATEGORIES: Navigation setup complete');
  } else {
    console.warn('⚠️  CATEGORIES: Navigation item not found');
  }
}

/**
 * Get category by ID (utility function)
 * @param {number} categoryId - Category ID
 * @returns {Object|null} Category or null
 */
function getCategoryById(categoryId) {
  if (!categoriesManager) {
    console.warn('⚠️  CATEGORIES: Manager not initialized');
    return null;
  }
  
  return categoriesManager.getCategoryById(categoryId);
}

/**
 * Get all categories (utility function)
 * @returns {Array} Array of categories
 */
function getAllCategories() {
  if (!categoriesManager) {
    console.warn('⚠️  CATEGORIES: Manager not initialized');
    return [];
  }
  
  return categoriesManager.categories || [];
}

/**
 * Refresh categories display
 */
async function refreshCategories() {
  if (!categoriesManager || !categoriesUI) {
    console.warn('⚠️  CATEGORIES: Components not initialized');
    return;
  }
  
  try {
    await categoriesManager.loadCategories();
    categoriesUI.renderCategories();
    console.log('✅ CATEGORIES: Refresh complete');
  } catch (error) {
    console.error('❌ CATEGORIES: Refresh failed:', error);
  }
}

/**
 * Check if user can manage categories (admin only)
 * @returns {boolean} True if user can manage categories
 */
function canManageCategories() {
  // Check if user is admin (this should be integrated with your auth system)
  const userRole = localStorage.getItem('userRole');
  return userRole === 'admin';
}

/**
 * Show/hide admin-only elements based on user role
 */
function updateCategoriesPermissions() {
  const isAdmin = canManageCategories();
  
  // Show/hide admin-only elements
  document.querySelectorAll('.admin-only').forEach(element => {
    if (isAdmin) {
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  });
  
  console.log(`🔧 CATEGORIES: Permissions updated (admin: ${isAdmin})`);
}

/**
 * Handle categories system errors
 * @param {Error} error - Error object
 * @param {string} context - Error context
 */
function handleCategoriesError(error, context = 'Unknown') {
  console.error(`❌ CATEGORIES ERROR [${context}]:`, error);
  
  // Show user-friendly error message
  const errorMessage = error.message || 'An unexpected error occurred';
  
  // You can integrate this with your notification system
  if (typeof showNotification === 'function') {
    showNotification(`Categories Error: ${errorMessage}`, 'error');
  } else {
    alert(`Categories Error: ${errorMessage}`);
  }
}

/**
 * Cleanup categories system
 */
function cleanupCategories() {
  console.log('🔧 CATEGORIES: Cleaning up...');
  
  if (categoriesManager) {
    categoriesManager.destroy();
    categoriesManager = null;
  }
  
  if (categoriesUI) {
    categoriesUI = null;
  }
  
  // Remove global references
  if (typeof window !== 'undefined') {
    delete window.categoriesManager;
    delete window.categoriesUI;
    delete window.categoryManager;
  }
  
  console.log('✅ CATEGORIES: Cleanup complete');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeCategories,
    showCategoriesView,
    handleCategoriesNavigation,
    setupCategoriesNavigation,
    getCategoryById,
    getAllCategories,
    refreshCategories,
    canManageCategories,
    updateCategoriesPermissions,
    handleCategoriesError,
    cleanupCategories
  };
}

// Make functions globally available for browser
if (typeof window !== 'undefined') {
  window.initializeCategories = initializeCategories;
  window.showCategoriesView = showCategoriesView;
  window.handleCategoriesNavigation = handleCategoriesNavigation;
  window.setupCategoriesNavigation = setupCategoriesNavigation;
  window.getCategoryById = getCategoryById;
  window.getAllCategories = getAllCategories;
  window.refreshCategories = refreshCategories;
  window.canManageCategories = canManageCategories;
  window.updateCategoriesPermissions = updateCategoriesPermissions;
  window.handleCategoriesError = handleCategoriesError;
  window.cleanupCategories = cleanupCategories;
}
