/**
 * Authentication utilities for Password Manager
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }

        try {
            // Use API client for token verification
            const result = await window.apiClient.verifyToken(token);

            if (result.success) {
                this.currentUser = result.user;
                this.isAuthenticated = true;
                return true;
            } else {
                // Token is invalid, remove it
                localStorage.removeItem('authToken');
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
            return false;
        }
    }

    /**
     * Login user
     */
    async login(credentials) {
        window.logger?.logUserAction('Login Attempt', null, { email: credentials.email });

        try {
            // Use API client for login
            const result = await window.apiClient.login(credentials);

            if (result.success) {
                window.logger?.info('Login successful', 'AUTH', { email: credentials.email });
                this.currentUser = result.user;
                this.isAuthenticated = true;
                return {
                    success: true,
                    user: result.user
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'Login failed'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            // Use API client for logout
            await window.apiClient.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    /**
     * Get auth token
     */
    getToken() {
        return localStorage.getItem('authToken');
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();
