/**
 * API Client for Password Manager
 * Works in both Electron and browser environments
 */

class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        console.log('API Client initialized with baseURL:', this.baseURL);
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        console.log(`API Client: request called with endpoint: "${endpoint}"`);
        console.log(`API Client: baseURL: "${this.baseURL}"`);
        const url = `${this.baseURL}${endpoint}`;
        console.log(`API Client: Constructed URL: ${url}`);
        console.log(`API Client: Making request to ${url}`);
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('API Client: Adding auth token to request');
        } else {
            console.log('API Client: No auth token available for request');
        }

        try {
            console.log(`API Client: Fetching ${url} with config:`, config);
            const startTime = Date.now();

            // Log request using comprehensive logger
            window.logger?.logAPICall(options.method || 'GET', url, options.body ? JSON.parse(options.body) : null);

            const response = await fetch(url, config);
            const data = await response.json();
            const duration = Date.now() - startTime;

            // Log response using comprehensive logger
            window.logger?.logAPIResponse(options.method || 'GET', url, response.status, {
                success: data.success,
                hasData: !!data.data,
                dataSize: JSON.stringify(data).length
            }, duration);

            if (!response.ok) {
                console.error(`API Client: Request failed with status ${response.status}:`, data);
                window.logger?.logAPIError(options.method || 'GET', url, new Error(data.error || `HTTP ${response.status}`), duration);
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            console.log(`API Client: Request successful:`, data);
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            const duration = Date.now() - startTime;
            window.logger?.logAPIError(options.method || 'GET', url, error, duration);
            throw error;
        }
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        const token = localStorage.getItem('authToken');
        console.log('🔑 Getting auth token:', token ? `Token found (${token.substring(0, 20)}...)` : 'No token found');
        console.log('🔑 localStorage contents:', localStorage);
        return token;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        console.log('🔑 setAuthToken called with:', token ? `Token (${token.substring(0, 20)}...)` : 'null/undefined');
        if (token) {
            localStorage.setItem('authToken', token);
            console.log('🔑 Auth token saved to localStorage');
            console.log('🔑 Verification - token in localStorage:', localStorage.getItem('authToken') ? 'SUCCESS' : 'FAILED');
        } else {
            localStorage.removeItem('authToken');
            console.log('🔑 Auth token removed from localStorage');
        }
    }

    /**
     * Authentication methods
     */
    async login(credentials) {
        try {
            console.log('API Client: Making login request to /api/auth/login');
            const response = await this.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            console.log('API Client: Login response received:', response);

            if (response.token) {
                this.setAuthToken(response.token);
            }

            return {
                success: true,
                user: response.user,
                token: response.token
            };
        } catch (error) {
            console.error('API Client: Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async logout() {
        try {
            await this.request('/api/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.setAuthToken(null);
        }
    }

    async verifyToken(token) {
        try {
            const response = await this.request('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return {
                success: true,
                user: response.user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Password methods
     */
    async getPasswords(options = {}) {
        console.log('API Client: getPasswords called with options:', options);

        // Build query string from options
        const queryParams = new URLSearchParams();
        if (options.page) queryParams.append('page', options.page);
        if (options.limit) queryParams.append('limit', options.limit);
        if (options.category) queryParams.append('category', options.category);
        if (options.search) queryParams.append('search', options.search);

        const queryString = queryParams.toString();
        const endpoint = queryString ? `/passwords?${queryString}` : '/passwords';

        return this.request(endpoint);
    }

    async getPassword(id) {
        console.log('API Client: getPassword called with id:', id);

        // Send log to server
        try {
            await fetch('/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level: 'info',
                    message: `🔧 API CLIENT: getPassword called with ID: ${id}`
                })
            });
        } catch (e) {}

        const result = await this.request(`/passwords/${id}`);

        // Log the result
        try {
            await fetch('/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level: 'info',
                    message: `🔧 API CLIENT: getPassword result - success: ${result.success}, status: ${result.status || 'unknown'}`
                })
            });
        } catch (e) {}

        return result;
    }

    async createPassword(passwordData) {
        return this.request('/passwords', {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
    }

    async updatePassword(id, passwordData) {
        return this.request(`/passwords/${id}`, {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    }

    async deletePassword(id) {
        return this.request(`/passwords/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * User methods
     */
    async getUsers(options = {}) {
        console.log('API Client: getUsers called with options:', options);

        // Build query string from options
        const queryParams = new URLSearchParams();
        if (options.page) queryParams.append('page', options.page);
        if (options.limit) queryParams.append('limit', options.limit);
        if (options.search) queryParams.append('search', options.search);

        const queryString = queryParams.toString();
        const endpoint = queryString ? `/users?${queryString}` : '/users';

        return this.request(endpoint);
    }

    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Category methods
     */
    async getCategories() {
        console.log('API Client: getCategories called');
        return this.request('/categories');
    }

    async getCategoryStats() {
        console.log('API Client: getCategoryStats called');
        return this.request('/passwords/categories/stats');
    }

    async createCategory(categoryData) {
        console.log('API Client: createCategory called with:', categoryData);
        return this.request('/passwords/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
    }

    async updateCategory(id, categoryData) {
        console.log('API Client: updateCategory called with:', id, categoryData);
        return this.request(`/passwords/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData)
        });
    }

    async deleteCategory(id) {
        console.log('API Client: deleteCategory called with:', id);
        return this.request(`/passwords/categories/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Audit methods
     */
    async getAuditLogs(params = {}) {
        // For now, return mock data since audit endpoint doesn't exist yet
        return {
            success: true,
            data: {
                logs: [],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    pages: 1
                }
            }
        };
    }
}

// Create global API instance
window.apiClient = new APIClient();

// For backward compatibility with Electron API
if (!window.electronAPI) {
    window.electronAPI = {
        login: (credentials) => window.apiClient.login(credentials),
        logout: () => window.apiClient.logout(),
        verifyToken: (token) => window.apiClient.verifyToken(token),
        getPasswords: () => window.apiClient.getPasswords(),
        getPassword: (id) => window.apiClient.getPassword(id),
        createPassword: (data) => window.apiClient.createPassword(data),
        updatePassword: (id, data) => window.apiClient.updatePassword(id, data),
        deletePassword: (id) => window.apiClient.deletePassword(id),
        getUsers: () => window.apiClient.getUsers(),
        createUser: (data) => window.apiClient.createUser(data),
        updateUser: (id, data) => window.apiClient.updateUser(id, data),
        deleteUser: (id) => window.apiClient.deleteUser(id),
        getCategories: () => window.apiClient.getCategories(),
        getCategoryStats: () => window.apiClient.getCategoryStats(),
        createCategory: (data) => window.apiClient.createCategory(data),
        updateCategory: (id, data) => window.apiClient.updateCategory(id, data),
        deleteCategory: (id) => window.apiClient.deleteCategory(id),
        getAuditLogs: () => window.apiClient.getAuditLogs(),
        // Storage methods for browser compatibility
        getStoredData: (key) => Promise.resolve(localStorage.getItem(key)),
        setStoredData: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
        removeStoredData: (key) => Promise.resolve(localStorage.removeItem(key)),
        // Socket connection for browser compatibility
        connectSocket: (token) => {
            // In browser, we'll handle socket connection through the realtime module
            return Promise.resolve({ success: true });
        },
        // Real-time editing methods for browser compatibility
        startEditing: (passwordId) => {
            console.log('✏️ Browser start editing (stub):', passwordId);
            return Promise.resolve({ success: true });
        },
        stopEditing: (passwordId) => {
            console.log('✏️ Browser stop editing (stub):', passwordId);
            return Promise.resolve({ success: true });
        },
        // Password generation for browser compatibility
        generateSecurePassword: (options = {}) => {
            console.log('🔐 Browser generating password:', options);
            const password = generateSecurePasswordBrowser(options);
            return Promise.resolve({ success: true, password });
        },
        // Clipboard operations for browser compatibility
        copyToClipboard: async (text) => {
            try {
                await navigator.clipboard.writeText(text);
                return Promise.resolve({ success: true });
            } catch (error) {
                console.error('Clipboard copy failed:', error);
                return Promise.resolve({ success: false, error: error.message });
            }
        },
        // Event handler stubs for browser compatibility
        onNavigateTo: (callback) => { /* No-op in browser */ },
        onNewPassword: (callback) => { /* No-op in browser */ },
        onRefreshData: (callback) => { /* No-op in browser */ },
        onFocusSearch: (callback) => { /* No-op in browser */ },
        onGeneratePassword: (callback) => { /* No-op in browser */ },
        onPasswordCreated: (callback) => { /* No-op in browser */ },
        onPasswordUpdated: (callback) => { /* No-op in browser */ },
        onPasswordDeleted: (callback) => { /* No-op in browser */ },
        onUserOnline: (callback) => { /* No-op in browser */ },
        onUserOffline: (callback) => { /* No-op in browser */ },
        onEditConflict: (callback) => { /* No-op in browser */ },
        logError: (error, context) => {
            console.error(`[${context}]`, error);
        },
        // Test method to verify API client is working
        testAPI: async () => {
            console.log('Testing API client...');
            try {
                const result = await window.apiClient.getUsers();
                console.log('API test result:', result);
                return result;
            } catch (error) {
                console.error('API test error:', error);
                throw error;
            }
        }
    };
}

/**
 * Generate secure password for browser compatibility
 * @param {Object} options - Password generation options
 * @returns {string} Generated password
 */
function generateSecurePasswordBrowser(options = {}) {
    const {
        length = 16,
        includeUppercase = true,
        includeLowercase = true,
        includeNumbers = true,
        includeSymbols = true,
        excludeSimilar = true
    } = options;

    let charset = '';

    if (includeLowercase) {
        charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }

    if (includeUppercase) {
        charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }

    if (includeNumbers) {
        charset += excludeSimilar ? '23456789' : '0123456789';
    }

    if (includeSymbols) {
        charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }

    if (!charset) {
        charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
    }

    return password;
}
