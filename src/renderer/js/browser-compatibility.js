/**
 * Browser Compatibility Layer
 * Provides electronAPI interface for browser environment
 */

// Check if we're in browser environment (no electronAPI)
if (typeof window !== 'undefined' && !window.electronAPI) {
    console.log('🌐 Browser environment detected - creating electronAPI compatibility layer');
    console.log('🔍 Current window.electronAPI:', window.electronAPI);
    
    // Create API client instance
    const apiClient = new APIClient();
    
    // Browser storage helpers
    const browserStorage = {
        setItem: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            }
        },
        
        getItem: (key) => {
            try {
                const item = localStorage.getItem(key);
                return Promise.resolve(item ? JSON.parse(item) : null);
            } catch (error) {
                return Promise.resolve(null);
            }
        },
        
        removeItem: (key) => {
            try {
                localStorage.removeItem(key);
                return Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            }
        }
    };
    
    // Create electronAPI compatibility object
    window.electronAPI = {
        // Authentication methods
        async login(credentials) {
            try {
                console.log('🔐 Browser login attempt:', credentials.email);
                const result = await apiClient.login(credentials);
                
                if (result.success) {
                    // Store token and user data
                    await browserStorage.setItem('authToken', result.token);
                    await browserStorage.setItem('currentUser', result.user);
                    console.log('✅ Browser login successful');
                }
                
                return result;
            } catch (error) {
                console.error('❌ Browser login failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        async logout() {
            try {
                await browserStorage.removeItem('authToken');
                await browserStorage.removeItem('currentUser');
                await browserStorage.removeItem('rememberLogin');
                console.log('🚪 Browser logout successful');
                return { success: true };
            } catch (error) {
                console.error('❌ Browser logout failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        async verifyToken(token) {
            try {
                // Set token for verification
                await browserStorage.setItem('authToken', token);
                const result = await apiClient.verifyToken();
                console.log('🔍 Browser token verification:', result.success ? 'valid' : 'invalid');
                return result;
            } catch (error) {
                console.error('❌ Browser token verification failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Data storage methods
        async getStoredData(key) {
            return await browserStorage.getItem(key);
        },
        
        async setStoredData(key, value) {
            return await browserStorage.setItem(key, value);
        },
        
        async removeStoredData(key) {
            return await browserStorage.removeItem(key);
        },
        
        // Password management methods
        async getPasswords(options = {}) {
            try {
                console.log('📋 Browser getting passwords with options:', options);
                const result = await apiClient.getPasswords(options);
                console.log('✅ Browser passwords loaded:', result.data?.passwords?.length || 0);
                return result;
            } catch (error) {
                console.error('❌ Browser get passwords failed:', error);
                return { success: false, error: error.message };
            }
        },

        async getPassword(id) {
            try {
                console.log('📋 Browser getting password with id:', id);

                // Send log to server
                await fetch('/debug-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level: 'info',
                        message: `🔧 BROWSER: Getting password with ID: ${id}`
                    })
                }).catch(() => {}); // Ignore fetch errors

                const result = await apiClient.getPassword(id);

                // Send detailed result to server
                await fetch('/debug-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level: 'info',
                        message: `🔧 BROWSER: API result - success: ${result.success}, data: ${JSON.stringify(result.data || {}).substring(0, 200)}`
                    })
                }).catch(() => {});

                console.log('✅ Browser password loaded:', result.success ? 'success' : 'failed');
                return result;
            } catch (error) {
                console.error('❌ Browser get password failed:', error);

                // Send error to server
                await fetch('/debug-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level: 'error',
                        message: `🔧 BROWSER: Exception in getPassword: ${error.message}`
                    })
                }).catch(() => {});

                return { success: false, error: error.message };
            }
        },
        
        async createPassword(passwordData) {
            try {
                const result = await apiClient.createPassword(passwordData);
                console.log('✅ Browser password created');
                return result;
            } catch (error) {
                console.error('❌ Browser create password failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        async updatePassword(id, passwordData) {
            try {
                const result = await apiClient.updatePassword(id, passwordData);
                console.log('✅ Browser password updated');
                return result;
            } catch (error) {
                console.error('❌ Browser update password failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        async deletePassword(id) {
            try {
                const result = await apiClient.deletePassword(id);
                console.log('✅ Browser password deleted');
                return result;
            } catch (error) {
                console.error('❌ Browser delete password failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        // User management methods
        async getUsers() {
            try {
                console.log('👥 Browser getting users');
                const result = await apiClient.getUsers();
                console.log('✅ Browser users loaded:', result.data?.length || 0);
                return result;
            } catch (error) {
                console.error('❌ Browser get users failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Categories methods
        async getCategories() {
            try {
                console.log('📂 Browser getting categories');
                const result = await apiClient.getCategories();
                console.log('✅ Browser categories loaded:', result.data?.length || 0);
                return result;
            } catch (error) {
                console.error('❌ Browser get categories failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Socket/Real-time methods (stub implementations for browser)
        async connectSocket(token) {
            console.log('🔌 Browser socket connection (stub)');
            return { success: true };
        },

        // Real-time editing methods (stub implementations for browser)
        async startEditing(passwordId) {
            console.log('✏️ Browser start editing (stub):', passwordId);
            return { success: true };
        },

        async stopEditing(passwordId) {
            console.log('✏️ Browser stop editing (stub):', passwordId);
            return { success: true };
        },
        
        // Event handlers (stub implementations for browser)
        onNavigateTo: (callback) => { console.log('📍 Browser onNavigateTo (stub)'); },
        onNewPassword: (callback) => { console.log('🆕 Browser onNewPassword (stub)'); },
        onRefreshData: (callback) => { console.log('🔄 Browser onRefreshData (stub)'); },
        onFocusSearch: (callback) => { console.log('🔍 Browser onFocusSearch (stub)'); },
        onGeneratePassword: (callback) => { console.log('🎲 Browser onGeneratePassword (stub)'); },
        onPasswordCreated: (callback) => { console.log('📝 Browser onPasswordCreated (stub)'); },
        onPasswordUpdated: (callback) => { console.log('✏️ Browser onPasswordUpdated (stub)'); },
        onPasswordDeleted: (callback) => { console.log('🗑️ Browser onPasswordDeleted (stub)'); },
        onUserOnline: (callback) => { console.log('🟢 Browser onUserOnline (stub)'); },
        onUserOffline: (callback) => { console.log('🔴 Browser onUserOffline (stub)'); },
        onEditConflict: (callback) => { console.log('⚠️ Browser onEditConflict (stub)'); },
        
        // Utility methods
        logError: (error, context) => {
            console.error(`🐛 Browser error [${context}]:`, error);
        },
        
        // Audit methods
        async getAuditLogs(options = {}) {
            try {
                console.log('📊 Browser getting audit logs');
                const result = await apiClient.getAuditLogs(options);
                console.log('✅ Browser audit logs loaded');
                return result;
            } catch (error) {
                console.error('❌ Browser get audit logs failed:', error);
                return { success: false, error: error.message };
            }
        }
    };
    
    console.log('✅ Browser electronAPI compatibility layer created');
    console.log('🔍 Testing electronAPI methods:', Object.keys(window.electronAPI));

    // Test the getPassword method specifically
    window.testGetPassword = async function(id) {
        console.log('🧪 Testing getPassword with id:', id);
        try {
            const result = await window.electronAPI.getPassword(id);
            console.log('🧪 Test result:', result);
            return result;
        } catch (error) {
            console.error('🧪 Test error:', error);
            return { success: false, error: error.message };
        }
    };

} else if (window.electronAPI) {
    console.log('⚡ Electron environment detected - using native electronAPI');
} else {
    console.log('❓ Unknown environment - electronAPI may not be available');
}
