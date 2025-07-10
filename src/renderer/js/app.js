/**
 * Main Application Controller
 * Handles app initialization, routing, and global state management
 */

class PasswordManagerApp {
    constructor() {
        this.currentUser = null;
        this.currentView = 'passwords';
        this.isAuthenticated = false;
        this.isOnline = true;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 App initialization started');
            window.logger?.info('Application initialization started', 'APP_INIT');

            // Show loading screen
            this.showScreen('loading');
            window.logger?.info('Loading screen displayed', 'APP_INIT');

            // Check for saved authentication
            const savedToken = await electronAPI.getStoredData('authToken');
            const savedUser = await electronAPI.getStoredData('currentUser');

            console.log('🔑 Saved token:', savedToken ? 'Found' : 'Not found');
            console.log('👤 Saved user:', savedUser ? 'Found' : 'Not found');

            if (savedToken && savedUser) {
                console.log('🔍 Verifying saved token...');
                // Verify token is still valid
                const result = await electronAPI.verifyToken(savedToken);
                console.log('🔍 Token verification result:', result);
                if (result.success) {
                    this.currentUser = result.user;
                    this.isAuthenticated = true;
                    await this.initMainApp();
                    return;
                }
            }

            // Show login screen if not authenticated
            console.log('🔐 Showing login screen');
            this.showScreen('login');
            this.initLoginHandlers();

        } catch (error) {
            console.error('❌ App initialization error:', error);
            this.showNotification('Application failed to initialize', 'error');
            this.showScreen('login');
            this.initLoginHandlers();
        }
    }

    /**
     * Initialize main application after successful authentication
     */
    async initMainApp() {
        try {
            // Connect to real-time updates
            await electronAPI.connectSocket(await electronAPI.getStoredData('authToken'));
            
            // Set up UI based on user role
            this.setupUserInterface();
            
            // Initialize view controllers
            this.initViewControllers();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Show main application
            this.showScreen('main');
            
            // Set up real-time event handlers
            this.setupRealtimeHandlers();
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Main app initialization error:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    /**
     * Set up user interface based on user role
     */
    setupUserInterface() {
        const userNameEl = document.getElementById('user-name');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (this.currentUser) {
            userNameEl.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            userAvatarEl.textContent = this.currentUser.firstName.charAt(0).toUpperCase();
            
            // Show admin-only elements if user is admin
            if (this.currentUser.role === 'admin') {
                document.body.classList.add('admin');
                console.log('🔐 Admin class added to body for user:', this.currentUser.email);

                // Send admin class application log to server
                if (window.logger) {
                    window.logger.info('Admin class applied to body', {
                        userId: this.currentUser.id,
                        email: this.currentUser.email,
                        role: this.currentUser.role,
                        bodyClasses: document.body.className,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                console.log('🔐 User is not admin, no admin class added:', this.currentUser.role);
            }
        }
    }

    /**
     * Initialize view controllers
     */
    initViewControllers() {
        // Initialize password management
        if (window.PasswordManager) {
            this.passwordManager = new PasswordManager();
        }

        // Initialize category management
        if (window.initializeCategories) {
            this.initializeCategories();
        }

        // Initialize user management (admin only)
        if (this.currentUser?.role === 'admin' && window.UserManager) {
            this.userManager = new UserManager();
        }

        // Initialize audit management (admin only)
        if (this.currentUser?.role === 'admin' && window.AuditManager) {
            this.auditManager = new AuditManager();
        }
    }

    /**
     * Initialize categories system
     */
    async initializeCategories() {
        try {
            console.log('App: Initializing categories system...');

            const result = await window.initializeCategories(this.socket);
            this.categoriesManager = result.manager;
            this.categoriesUI = result.ui;

            // Setup navigation
            window.setupCategoriesNavigation();

            // Update permissions
            window.updateCategoriesPermissions();

            console.log('✅ App: Categories system initialized successfully');

        } catch (error) {
            console.error('❌ App: Failed to initialize categories system:', error);
            window.handleCategoriesError(error, 'Initialization');
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) {
                    window.logger?.logUserAction('Navigation Click', e.target, { view, from: this.currentView });
                    this.navigateToView(view);
                }
            });
        });

        // User menu
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenuDropdown = document.getElementById('user-menu-dropdown');
        
        userMenuBtn?.addEventListener('click', () => {
            userMenuDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn?.contains(e.target)) {
                userMenuDropdown?.classList.add('hidden');
            }
        });

        // Logout
        document.getElementById('logout-menu')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Search
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        searchBtn?.addEventListener('click', () => {
            this.handleSearch(searchInput.value);
        });

        // Add password button
        document.getElementById('add-password-btn')?.addEventListener('click', () => {
            if (this.passwordManager) {
                this.passwordManager.showAddPasswordModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window events from main process
        electronAPI.onNavigateTo((event, route) => {
            this.navigateToView(route.replace('/', ''));
        });

        electronAPI.onNewPassword(() => {
            if (this.passwordManager) {
                this.passwordManager.showAddPasswordModal();
            }
        });

        electronAPI.onRefreshData(() => {
            this.refreshCurrentView();
        });

        electronAPI.onFocusSearch(() => {
            searchInput?.focus();
        });

        electronAPI.onGeneratePassword(() => {
            if (this.passwordManager) {
                this.passwordManager.generatePassword();
            }
        });
    }

    /**
     * Set up real-time event handlers
     */
    setupRealtimeHandlers() {
        // Password events
        electronAPI.onPasswordCreated((event, data) => {
            if (this.passwordManager) {
                this.passwordManager.handlePasswordCreated(data);
            }
            this.showNotification(`New password "${data.password.title}" was added`, 'info');
        });

        electronAPI.onPasswordUpdated((event, data) => {
            if (this.passwordManager) {
                this.passwordManager.handlePasswordUpdated(data);
            }
            this.showNotification(`Password "${data.password.title}" was updated`, 'info');
        });

        electronAPI.onPasswordDeleted((event, data) => {
            if (this.passwordManager) {
                this.passwordManager.handlePasswordDeleted(data);
            }
            this.showNotification('A password was deleted', 'warning');
        });

        // User presence events
        electronAPI.onUserOnline((event, data) => {
            this.showNotification(`${data.firstName} ${data.lastName} came online`, 'info');
        });

        electronAPI.onUserOffline((event, data) => {
            // Only show if we have user info
            if (data.firstName) {
                this.showNotification(`${data.firstName} ${data.lastName} went offline`, 'info');
            }
        });

        // Edit conflict events
        electronAPI.onEditConflict((event, data) => {
            this.showNotification(
                `Edit conflict detected for password. ${data.currentEditor.firstName} is currently editing.`,
                'warning'
            );
        });
    }

    /**
     * Initialize login screen handlers
     */
    initLoginHandlers() {
        const loginForm = document.getElementById('login-form');
        const loginBtn = document.querySelector('.btn-login');
        const btnText = loginBtn?.querySelector('.btn-text');
        const btnSpinner = loginBtn?.querySelector('.btn-spinner');
        const errorEl = document.getElementById('login-error');

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const credentials = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            // Show loading state
            loginBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            errorEl.classList.add('hidden');

            try {
                // Use Electron IPC for login
                const result = await electronAPI.login(credentials);

                if (result.success) {
                    this.currentUser = result.user;
                    this.isAuthenticated = true;

                    // Save remember me preference
                    if (formData.get('rememberMe')) {
                        await electronAPI.setStoredData('rememberLogin', true);
                    }

                    await this.initMainApp();
                } else {
                    errorEl.textContent = result.error || 'Login failed';
                    errorEl.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Login error:', error);
                errorEl.textContent = 'Network error. Please check if the server is running.';
                errorEl.classList.remove('hidden');
            } finally {
                // Reset button state
                loginBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnSpinner.classList.add('hidden');
            }
        });
    }

    /**
     * Load initial data for the application
     */
    async loadInitialData() {
        try {
            // Load categories for filters
            if (this.categoriesManager) {
                await this.categoriesManager.loadCategories();
            }
            
            // Load initial passwords
            if (this.passwordManager) {
                await this.passwordManager.loadPasswords();
            }
            
            // Load users if admin
            if (this.currentUser?.role === 'admin' && this.userManager) {
                await this.userManager.loadUsers();
            }

            // Load audit logs if admin
            if (this.currentUser?.role === 'admin' && this.auditManager) {
                await this.auditManager.loadAuditLogs();
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Failed to load some data', 'warning');
        }
    }

    /**
     * Navigate to a specific view
     */
    navigateToView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Remove active state from nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        const targetNavItem = document.querySelector(`[data-view="${viewName}"]`);
        
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }
        
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
        
        // Load view-specific data
        this.loadViewData(viewName);
    }

    /**
     * Load data for specific view
     */
    async loadViewData(viewName) {
        try {
            switch (viewName) {
                case 'passwords':
                    if (this.passwordManager) {
                        await this.passwordManager.loadPasswords();
                    }
                    break;
                case 'categories':
                    if (this.categoriesManager) {
                        await this.categoriesManager.loadCategories();
                        if (this.categoriesUI) {
                            this.categoriesUI.renderCategories();
                        }
                    }
                    break;
                case 'users':
                    if (this.userManager) {
                        await this.userManager.loadUsers();
                    }
                    break;
                case 'audit':
                    if (this.auditManager) {
                        await this.auditManager.loadAuditLogs();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${viewName} data:`, error);
            this.showNotification(`Failed to load ${viewName} data`, 'error');
        }
    }

    /**
     * Handle search functionality
     */
    async handleSearch(query) {
        if (this.currentView === 'passwords' && this.passwordManager) {
            await this.passwordManager.searchPasswords(query);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N - New password
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (this.passwordManager) {
                this.passwordManager.showAddPasswordModal();
            }
        }
        
        // Ctrl/Cmd + F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
        
        // Escape - Close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }
    }

    /**
     * Refresh current view data
     */
    async refreshCurrentView() {
        await this.loadViewData(this.currentView);
        this.showNotification('Data refreshed', 'success');
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await electronAPI.logout();
            this.currentUser = null;
            this.isAuthenticated = false;
            document.body.classList.remove('admin');
            this.showScreen('login');
            this.initLoginHandlers();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Show specific screen
     */
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(`${screenName}-screen`) || 
                           document.getElementById(`${screenName}-app`);
        
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.getElementById('modal-overlay')?.classList.add('hidden');
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing app...');
    try {
        window.app = new PasswordManagerApp();
        console.log('✅ App initialized successfully');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        // Show a basic error message
        document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: Arial;">App initialization failed: ' + error.message + '</div>';
    }
});

// Handle app errors
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    electronAPI.logError(e.error, 'renderer-global-error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    electronAPI.logError(e.reason, 'renderer-unhandled-rejection');
});
