/**
 * User Management Controller (Admin Only)
 * Handles user CRUD operations and admin interface
 */

class UserManager {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.searchQuery = '';
        this.editingUserId = null;
        
        this.init();
    }

    /**
     * Initialize user manager
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add user button
        document.getElementById('add-user-btn')?.addEventListener('click', () => {
            this.showAddUserModal();
        });

        // Search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchUsers(e.target.value);
            }, 300));
        }

        // User modal events
        this.setupUserModal();
    }

    /**
     * Set up user modal events
     */
    setupUserModal() {
        const modal = document.getElementById('user-modal');
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('user-form');
        const closeBtn = document.getElementById('user-modal-close');
        const cancelBtn = document.getElementById('user-cancel');

        // Close modal events
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.closeUserModal();
            });
        });

        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeUserModal();
            }
        });

        // Form submission
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });
    }

    /**
     * Load users from API
     */
    async loadUsers() {
        try {
            this.showLoadingState();

            const result = await electronAPI.getUsers();
            
            if (result.success) {
                this.users = result.data.users || [];
                this.renderUsers();
                this.updateUserStats();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Search users
     */
    async searchUsers(query) {
        this.searchQuery = query.toLowerCase();
        this.renderUsers();
    }

    /**
     * Render users table
     */
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        let filteredUsers = this.users;
        
        // Apply search filter
        if (this.searchQuery) {
            filteredUsers = this.users.filter(user => 
                user.firstName.toLowerCase().includes(this.searchQuery) ||
                user.lastName.toLowerCase().includes(this.searchQuery) ||
                user.email.toLowerCase().includes(this.searchQuery)
            );
        }

        if (filteredUsers.length === 0) {
            tbody.innerHTML = this.renderEmptyState();
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => this.renderUserRow(user)).join('');
        
        // Add event listeners
        this.attachUserEventListeners();
    }

    /**
     * Render individual user row
     */
    renderUserRow(user) {
        const isOnline = this.isUserOnline(user.id);
        const lastLogin = user.lastLogin ? Utils.formatDate(user.lastLogin, { showRelative: true }) : 'Never';
        
        return `
            <tr data-user-id="${user.id}">
                <td>
                    <div class="user-info">
                        <div class="user-avatar-sm" style="background-color: ${Utils.generateColor(user.email)}">
                            ${Utils.getInitials(`${user.firstName} ${user.lastName}`)}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${Utils.escapeHtml(user.firstName)} ${Utils.escapeHtml(user.lastName)}</div>
                            <div class="user-email">${Utils.escapeHtml(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${user.role}">${user.role}</span>
                </td>
                <td>${lastLogin}</td>
                <td>
                    <div class="status-indicator-container">
                        <span class="status-badge ${isOnline ? 'online' : 'offline'}">
                            ${isOnline ? 'Online' : 'Offline'}
                        </span>
                        ${isOnline ? '<span class="pulse-dot"></span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="icon-btn" data-edit-user="${user.id}" title="Edit user">
                            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="icon-btn ${user.isActive ? 'deactivate' : 'activate'}" 
                                data-toggle-status="${user.id}" 
                                title="${user.isActive ? 'Deactivate' : 'Activate'} user">
                            <svg viewBox="0 0 24 24">
                                ${user.isActive 
                                    ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>'
                                    : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>'
                                }
                            </svg>
                        </button>
                        <button class="icon-btn delete" data-delete="${user.id}" title="Delete user">
                            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const message = this.searchQuery 
            ? `No users found for "${this.searchQuery}"`
            : 'No users found';

        return `
            <tr>
                <td colspan="6" class="empty-state-cell">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24">
                            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.01 3.01 0 0 0 16.5 6.5h-1c-1.66 0-3 1.34-3 3v7h2v8h6z"/>
                        </svg>
                        <h3>${message}</h3>
                        <p>Add users to manage access to the password manager.</p>
                        <button class="btn btn-primary" onclick="window.app.userManager.showAddUserModal()">
                            <svg class="btn-icon" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            Add User
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Attach event listeners to user rows
     */
    attachUserEventListeners() {
        // Edit buttons
        document.querySelectorAll('[data-edit-user]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = parseInt(btn.dataset.editUser);
                this.editUser(userId);
            });
        });

        // Toggle status buttons
        document.querySelectorAll('[data-toggle-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = parseInt(btn.dataset.toggleStatus);
                this.toggleUserStatus(userId);
            });
        });

        // Delete buttons
        document.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = parseInt(btn.dataset.delete);
                this.deleteUser(userId);
            });
        });
    }

    /**
     * Show add user modal
     */
    showAddUserModal() {
        this.editingUserId = null;
        this.resetUserForm();
        document.getElementById('user-modal-title').textContent = 'Add User';
        document.getElementById('user-save').textContent = 'Create User';
        this.showModal('user-modal');
    }

    /**
     * Edit user
     */
    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        this.editingUserId = userId;
        this.populateUserForm(user);
        document.getElementById('user-modal-title').textContent = 'Edit User';
        document.getElementById('user-save').textContent = 'Update User';
        this.showModal('user-modal');
    }

    /**
     * Toggle user active status
     */
    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const action = user.isActive ? 'deactivate' : 'activate';
        const confirmed = await this.showConfirmDialog(
            `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
            `Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`,
            action.charAt(0).toUpperCase() + action.slice(1),
            user.isActive ? 'warning' : 'success'
        );

        if (confirmed) {
            try {
                const result = await electronAPI.updateUser(userId, { isActive: !user.isActive });
                
                if (result.success) {
                    this.showSuccess(`User ${action}d successfully`);
                    await this.loadUsers();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error(`Error ${action}ing user:`, error);
                this.showError(`Failed to ${action} user`);
            }
        }
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const confirmed = await this.showConfirmDialog(
            'Delete User',
            `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
            'Delete',
            'danger'
        );

        if (confirmed) {
            try {
                const result = await electronAPI.deleteUser(userId);
                
                if (result.success) {
                    this.showSuccess('User deleted successfully');
                    await this.loadUsers();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showError('Failed to delete user');
            }
        }
    }

    /**
     * Save user (create or update)
     */
    async saveUser() {
        try {
            const formData = new FormData(document.getElementById('user-form'));
            const userData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                role: formData.get('role'),
                isActive: formData.get('isActive') === 'on'
            };

            // Add password for new users
            if (!this.editingUserId) {
                userData.password = formData.get('password');
                userData.confirmPassword = formData.get('confirmPassword');
            }

            // Validate required fields
            if (!userData.firstName || !userData.lastName || !userData.email) {
                this.showError('Please fill in all required fields');
                return;
            }

            if (!Utils.isValidEmail(userData.email)) {
                this.showError('Please enter a valid email address');
                return;
            }

            if (!this.editingUserId) {
                if (!userData.password || userData.password.length < 8) {
                    this.showError('Password must be at least 8 characters long');
                    return;
                }

                if (userData.password !== userData.confirmPassword) {
                    this.showError('Passwords do not match');
                    return;
                }
            }

            this.showSaveLoading(true);

            let result;
            if (this.editingUserId) {
                result = await electronAPI.updateUser(this.editingUserId, userData);
            } else {
                result = await electronAPI.createUser(userData);
            }

            if (result.success) {
                this.showSuccess(this.editingUserId ? 'User updated successfully' : 'User created successfully');
                this.closeUserModal();
                await this.loadUsers();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Failed to save user');
        } finally {
            this.showSaveLoading(false);
        }
    }

    /**
     * Update user statistics
     */
    updateUserStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.isActive).length;
        const onlineUsers = this.users.filter(u => this.isUserOnline(u.id)).length;
        const adminUsers = this.users.filter(u => u.role === 'admin').length;

        // Update stats display if elements exist
        const statsContainer = document.getElementById('user-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${totalUsers}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${activeUsers}</div>
                    <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${onlineUsers}</div>
                    <div class="stat-label">Online Now</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${adminUsers}</div>
                    <div class="stat-label">Administrators</div>
                </div>
            `;
        }
    }

    /**
     * Check if user is currently online
     */
    isUserOnline(userId) {
        // This would be populated by real-time events
        // For now, return false as placeholder
        return Math.random() > 0.7; // Simulate some users being online
    }

    // Utility methods
    showModal(modalId) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeUserModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('user-modal').classList.add('hidden');
        this.editingUserId = null;
    }

    resetUserForm() {
        const form = document.getElementById('user-form');
        if (form) {
            form.reset();
        }
    }

    populateUserForm(user) {
        document.getElementById('user-firstName').value = user.firstName || '';
        document.getElementById('user-lastName').value = user.lastName || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-role').value = user.role || 'user';
        document.getElementById('user-isActive').checked = user.isActive !== false;
        
        // Hide password fields for editing
        const passwordFields = document.getElementById('password-fields');
        if (passwordFields) {
            passwordFields.style.display = 'none';
        }
    }

    showLoadingState() {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading-spinner-sm"></div> Loading users...</td></tr>';
    }

    hideLoadingState() {
        // Loading state will be replaced by renderUsers()
    }

    showSaveLoading(show) {
        const saveBtn = document.getElementById('user-save');
        if (show) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="loading-spinner-sm"></div> Saving...';
        } else {
            saveBtn.disabled = false;
            saveBtn.textContent = this.editingUserId ? 'Update User' : 'Create User';
        }
    }

    showSuccess(message) {
        window.app?.showNotification(message, 'success');
    }

    showError(message) {
        window.app?.showNotification(message, 'error');
    }

    async showConfirmDialog(title, message, confirmText = 'Confirm', type = 'primary') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>${Utils.escapeHtml(title)}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${Utils.escapeHtml(message)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                        <button class="btn btn-${type}" id="confirm-ok">${Utils.escapeHtml(confirmText)}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const handleClose = (confirmed) => {
                overlay.remove();
                resolve(confirmed);
            };

            overlay.querySelector('#confirm-ok').addEventListener('click', () => handleClose(true));
            overlay.querySelector('#confirm-cancel').addEventListener('click', () => handleClose(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleClose(false);
            });
        });
    }
}

// Make UserManager available globally
window.UserManager = UserManager;
