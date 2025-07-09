/**
 * Password Management Controller
 * Handles password CRUD operations and UI interactions
 */

class PasswordManager {
    constructor() {
        this.passwords = [];
        this.categories = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.totalPages = 1;
        this.searchQuery = '';
        this.selectedCategory = '';
        this.editingPasswordId = null;
        
        this.init();
    }

    /**
     * Initialize password manager
     */
    init() {
        this.setupEventListeners();
        this.loadCategories();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        categoryFilter?.addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.currentPage = 1;
            this.loadPasswords();
        });

        // Export/Import buttons
        document.getElementById('export-btn')?.addEventListener('click', () => {
            this.exportPasswords();
        });

        document.getElementById('import-btn')?.addEventListener('click', () => {
            this.importPasswords();
        });

        // Password modal events
        this.setupPasswordModal();

        // Empty state add button (will be added dynamically)
        this.setupEmptyStateButton();
    }

    /**
     * Set up password modal events
     */
    setupPasswordModal() {
        const modal = document.getElementById('password-modal');
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('password-form');
        const closeBtn = document.getElementById('password-modal-close');
        const cancelBtn = document.getElementById('password-cancel');
        const toggleBtn = document.getElementById('toggle-password');
        const generateBtn = document.getElementById('generate-password');

        // Close modal events
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.closePasswordModal();
            });
        });

        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePasswordModal();
            }
        });

        // Prevent modal content clicks from bubbling to overlay
        modal?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Form submission
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePassword();
        });

        // Toggle password visibility
        toggleBtn?.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Generate password
        generateBtn?.addEventListener('click', () => {
            this.generatePassword();
        });
    }

    /**
     * Load passwords from API
     */
    async loadPasswords() {
        try {
            this.showLoadingState();

            const options = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                category: this.selectedCategory,
                search: this.searchQuery
            };

            const result = await electronAPI.getPasswords(options);
            
            if (result.success) {
                this.passwords = result.data.passwords || [];
                this.totalPages = result.data.pagination?.pages || 1;
                this.renderPasswords();
                this.renderPagination();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error loading passwords:', error);
            this.showError('Failed to load passwords');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Load categories for filter dropdown
     */
    async loadCategories() {
        try {
            const result = await electronAPI.getCategories();
            
            if (result.success) {
                this.categories = result.data.categories || [];
                this.renderCategoryFilter();
                this.renderPasswordCategoryOptions();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    /**
     * Search passwords
     */
    async searchPasswords(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        await this.loadPasswords();
    }

    /**
     * Render passwords grid
     */
    renderPasswords() {
        const grid = document.getElementById('passwords-grid');
        if (!grid) return;

        if (this.passwords.length === 0) {
            grid.innerHTML = this.renderEmptyState();
            return;
        }

        grid.innerHTML = this.passwords.map(password => this.renderPasswordCard(password)).join('');
        
        // Add event listeners to cards
        this.attachCardEventListeners();
    }

    /**
     * Render individual password card
     */
    renderPasswordCard(password) {
        const categoryClass = password.category ? `category-${password.category.toLowerCase().replace(/\s+/g, '-')}` : '';
        const isEditing = this.editingPasswordId === password.id;
        
        return `
            <div class="password-card ${categoryClass} ${isEditing ? 'editing' : ''}" data-id="${password.id}">
                <div class="card-header">
                    <h3 class="card-title">${this.escapeHtml(password.title)}</h3>
                    ${password.category ? `<span class="card-category">${this.escapeHtml(password.category)}</span>` : ''}
                </div>
                
                <div class="card-body">
                    <div class="card-field">
                        <span class="field-label">Username</span>
                        <span class="field-value">${this.escapeHtml(password.username)}</span>
                        <div class="field-actions">
                            <button class="icon-btn copy" data-copy="${this.escapeHtml(password.username)}" title="Copy username">
                                <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-field">
                        <span class="field-label">Password</span>
                        <span class="field-value password masked" data-password="${this.escapeHtml(password.password)}">••••••••••••</span>
                        <div class="field-actions">
                            <button class="icon-btn reveal" title="Show/hide password">
                                <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                            </button>
                            <button class="icon-btn copy" data-copy="${this.escapeHtml(password.password)}" title="Copy password">
                                <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                            </button>
                        </div>
                    </div>
                    
                    ${password.url ? `
                        <div class="card-field">
                            <span class="field-label">Website</span>
                            <span class="field-value">${this.escapeHtml(password.url)}</span>
                            <div class="field-actions">
                                <button class="icon-btn" onclick="electronAPI.openExternal('${this.escapeHtml(password.url)}')" title="Open website">
                                    <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                                </button>
                                <button class="icon-btn copy" data-copy="${this.escapeHtml(password.url)}" title="Copy URL">
                                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${password.notes ? `
                        <div class="card-field">
                            <span class="field-label">Notes</span>
                            <span class="field-value">${this.escapeHtml(password.notes)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-footer">
                    <div class="card-meta">
                        Created ${this.formatDate(password.createdAt)}
                        ${password.updatedAt !== password.createdAt ? `• Updated ${this.formatDate(password.updatedAt)}` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-edit" data-edit-password="${password.id}" title="Edit password">
                            <svg class="btn-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-delete admin-only" data-delete="${password.id}" title="Delete password">
                            <svg class="btn-icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const message = this.searchQuery 
            ? `No passwords found for "${this.searchQuery}"`
            : this.selectedCategory
            ? `No passwords found in "${this.selectedCategory}" category`
            : 'No passwords yet';

        return `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24">
                    <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
                <h3>${message}</h3>
                <p>Start by adding your first password to keep your accounts secure.</p>
                <button class="btn btn-primary" id="empty-state-add-btn">
                    <svg class="btn-icon" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    Add Password
                </button>
            </div>
        `;
    }

    /**
     * Set up empty state button event listener
     */
    setupEmptyStateButton() {
        // Use event delegation since the button is added dynamically
        document.addEventListener('click', (e) => {
            if (e.target.id === 'empty-state-add-btn') {
                console.log('🔧 Empty state button clicked');
                this.showAddPasswordModal();
            }
        });
    }

    /**
     * Attach event listeners to password cards
     */
    attachCardEventListeners() {
        // Copy buttons
        document.querySelectorAll('.icon-btn.copy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const text = btn.dataset.copy;
                await electronAPI.copyToClipboard(text);
                this.showCopyFeedback(btn);
            });
        });

        // Reveal password buttons
        document.querySelectorAll('.icon-btn.reveal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePasswordReveal(btn);
            });
        });

        // Edit buttons
        document.querySelectorAll('[data-edit-password]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const passwordId = parseInt(btn.dataset.editPassword);
                this.editPassword(passwordId);
            });
        });

        // Delete buttons
        document.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const passwordId = parseInt(btn.dataset.delete);
                this.deletePassword(passwordId);
            });
        });
    }

    /**
     * Show copy feedback animation
     */
    showCopyFeedback(button) {
        const originalContent = button.innerHTML;
        button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        button.classList.add('glow-success');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('glow-success');
        }, 1000);
    }

    /**
     * Toggle password reveal
     */
    togglePasswordReveal(button) {
        const passwordField = button.closest('.card-field').querySelector('.field-value.password');
        const isRevealed = !passwordField.classList.contains('masked');
        
        if (isRevealed) {
            passwordField.textContent = '••••••••••••';
            passwordField.classList.add('masked');
        } else {
            passwordField.textContent = passwordField.dataset.password;
            passwordField.classList.remove('masked');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (!passwordField.classList.contains('masked')) {
                    passwordField.textContent = '••••••••••••';
                    passwordField.classList.add('masked');
                }
            }, 10000);
        }
    }

    /**
     * Show add password modal
     */
    showAddPasswordModal() {
        this.editingPasswordId = null;
        this.resetPasswordForm();
        document.getElementById('password-modal-title').textContent = 'Add Password';
        document.getElementById('password-save').textContent = 'Save Password';
        this.showModal('password-modal');
    }

    /**
     * Edit password
     */
    async editPassword(passwordId) {
        const startTime = Date.now();
        window.logger?.logUserAction('Edit Password Started', null, { passwordId });

        try {
            console.log('🔧 EditPassword: Starting edit for password ID:', passwordId);
            window.logger?.info(`Starting edit for password ID: ${passwordId}`, 'EDIT_PASSWORD', { passwordId });

            const result = await electronAPI.getPassword(passwordId);
            console.log('🔧 EditPassword: API result:', result);
            window.logger?.info(`API result received`, 'EDIT_PASSWORD', {
                success: result.success,
                hasData: !!result.data,
                hasPassword: !!(result.data && result.data.password),
                passwordId
            });

            if (result.success) {
                console.log('🔧 EditPassword: Success, password data:', result.data);
                window.logger?.info(`Successfully retrieved password data`, 'EDIT_PASSWORD', {
                    passwordId,
                    hasTitle: !!(result.data.password?.title),
                    hasUsername: !!(result.data.password?.username),
                    hasPassword: !!(result.data.password?.password)
                });

                const password = result.data.password;
                this.editingPasswordId = passwordId;
                this.populatePasswordForm(password);
                document.getElementById('password-modal-title').textContent = 'Edit Password';
                document.getElementById('password-save').textContent = 'Update Password';
                this.showModal('password-modal');

                // Start editing session for real-time collaboration
                await electronAPI.startEditing(passwordId);
                console.log('🔧 EditPassword: Edit session started successfully');

                await fetch('/debug-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level: 'info',
                        message: `🔧 EDIT PASSWORD: Modal opened and editing session started successfully`
                    })
                }).catch(() => {});

            } else {
                console.error('🔧 EditPassword: API returned success=false:', result);

                await fetch('/debug-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level: 'error',
                        message: `🔧 EDIT PASSWORD: FAILED - API returned success=false: ${JSON.stringify(result)}`
                    })
                }).catch(() => {});

                this.showError('Failed to load password details');
            }
        } catch (error) {
            console.error('🔧 EditPassword: Exception caught:', error);

            await fetch('/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level: 'error',
                    message: `🔧 EDIT PASSWORD: EXCEPTION - ${error.message}`
                })
            }).catch(() => {});

            this.showError('Failed to load password details');
        }
    }

    /**
     * Delete password
     */
    async deletePassword(passwordId) {
        const password = this.passwords.find(p => p.id === passwordId);
        if (!password) return;

        const confirmed = await this.showConfirmDialog(
            'Delete Password',
            `Are you sure you want to delete "${password.title}"? This action cannot be undone.`,
            'Delete',
            'danger'
        );

        if (confirmed) {
            try {
                const result = await electronAPI.deletePassword(passwordId);
                
                if (result.success) {
                    this.showSuccess('Password deleted successfully');
                    await this.loadPasswords();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Error deleting password:', error);
                this.showError('Failed to delete password');
            }
        }
    }

    /**
     * Save password (create or update)
     */
    async savePassword() {
        try {
            const formData = new FormData(document.getElementById('password-form'));
            const passwordData = {
                title: formData.get('title'),
                username: formData.get('username'),
                password: formData.get('password'),
                url: formData.get('url'),
                notes: formData.get('notes'),
                category: formData.get('category')
            };

            // Validate required fields
            if (!passwordData.title || !passwordData.username || !passwordData.password) {
                this.showError('Please fill in all required fields');
                return;
            }

            this.showSaveLoading(true);

            let result;
            if (this.editingPasswordId) {
                result = await electronAPI.updatePassword(this.editingPasswordId, passwordData);
                await electronAPI.stopEditing(this.editingPasswordId);
            } else {
                result = await electronAPI.createPassword(passwordData);
            }

            if (result.success) {
                this.showSuccess(this.editingPasswordId ? 'Password updated successfully' : 'Password created successfully');
                this.closePasswordModal();
                await this.loadPasswords();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error saving password:', error);
            this.showError('Failed to save password');
        } finally {
            this.showSaveLoading(false);
        }
    }

    /**
     * Generate secure password
     */
    async generatePassword() {
        try {
            const options = {
                length: 16,
                includeUppercase: true,
                includeLowercase: true,
                includeNumbers: true,
                includeSymbols: true,
                excludeSimilar: true
            };

            const result = await electronAPI.generateSecurePassword(options);
            
            if (result.success) {
                document.getElementById('password-password').value = result.password;
                this.showSuccess('Secure password generated');
            }
        } catch (error) {
            console.error('Error generating password:', error);
            this.showError('Failed to generate password');
        }
    }

    /**
     * Toggle password visibility in form
     */
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password-password');
        const toggleBtn = document.getElementById('toggle-password');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';
        } else {
            passwordInput.type = 'password';
            toggleBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
        }
    }

    // Real-time event handlers
    handlePasswordCreated(data) {
        if (this.currentPage === 1) {
            this.loadPasswords();
        }
    }

    handlePasswordUpdated(data) {
        this.loadPasswords();
    }

    handlePasswordDeleted(data) {
        this.loadPasswords();
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    showModal(modalId) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(modalId).classList.remove('hidden');
    }

    closePasswordModal() {
        console.log('🔧 MODAL: closePasswordModal called', {
            editingPasswordId: this.editingPasswordId,
            stack: new Error().stack
        });

        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('password-modal').classList.add('hidden');

        if (this.editingPasswordId) {
            electronAPI.stopEditing(this.editingPasswordId);
            this.editingPasswordId = null;
        }
    }

    showLoadingState() {
        const grid = document.getElementById('passwords-grid');
        grid.innerHTML = '<div class="loading-overlay"><div class="loading-spinner-sm"></div></div>';
    }

    hideLoadingState() {
        // Loading state will be replaced by renderPasswords()
    }

    showSaveLoading(show) {
        const saveBtn = document.getElementById('password-save');
        if (show) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="loading-spinner-sm"></div> Saving...';
        } else {
            saveBtn.disabled = false;
            saveBtn.textContent = this.editingPasswordId ? 'Update Password' : 'Save Password';
        }
    }

    showSuccess(message) {
        window.app?.showNotification(message, 'success');
    }

    showError(message) {
        console.error('🔧 SHOW ERROR called with message:', message);

        // Send error notification to server logs
        fetch('/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'error',
                message: `🔧 ERROR NOTIFICATION: ${message}`
            })
        }).catch(() => {});

        // Get stack trace to see where this was called from
        const stack = new Error().stack;
        fetch('/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'info',
                message: `🔧 ERROR STACK TRACE: ${stack.split('\n').slice(0, 5).join(' | ')}`
            })
        }).catch(() => {});

        window.app?.showNotification(message, 'error');
    }

    /**
     * Render category filter dropdown
     */
    renderCategoryFilter() {
        const filter = document.getElementById('category-filter');
        if (!filter) return;

        filter.innerHTML = `
            <option value="">All Categories</option>
            ${this.categories.map(cat =>
                `<option value="${this.escapeHtml(cat.name)}" ${cat.name === this.selectedCategory ? 'selected' : ''}>
                    ${this.escapeHtml(cat.name)} (${cat.passwordCount || 0})
                </option>`
            ).join('')}
        `;
    }

    /**
     * Render category options in password form
     */
    renderPasswordCategoryOptions() {
        const select = document.getElementById('password-category');
        if (!select) return;

        select.innerHTML = `
            <option value="">Select Category</option>
            ${this.categories.map(cat =>
                `<option value="${this.escapeHtml(cat.name)}">${this.escapeHtml(cat.name)}</option>`
            ).join('')}
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container || this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.passwords.length);
        const totalItems = this.passwords.length;

        let paginationHTML = `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
        }

        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
                <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
        `;

        paginationHTML += `
            <div class="pagination-info">
                Showing ${startItem}-${endItem} of ${totalItems} passwords
            </div>
        `;

        container.innerHTML = paginationHTML;

        // Add click handlers
        container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.loadPasswords();
                }
            });
        });
    }

    /**
     * Reset password form
     */
    resetPasswordForm() {
        const form = document.getElementById('password-form');
        if (form) {
            form.reset();
        }
    }

    /**
     * Populate password form with data
     */
    populatePasswordForm(password) {
        document.getElementById('password-title').value = password.title || '';
        document.getElementById('password-username').value = password.username || '';
        document.getElementById('password-password').value = password.password || '';
        document.getElementById('password-url').value = password.url || '';
        document.getElementById('password-notes').value = password.notes || '';
        document.getElementById('password-category').value = password.category || '';
    }

    /**
     * Export passwords
     */
    async exportPasswords() {
        try {
            const result = await electronAPI.getPasswords({ limit: 1000 });

            if (result.success) {
                const exportData = {
                    passwords: result.data.passwords.map(p => ({
                        title: p.title,
                        username: p.username,
                        password: p.password,
                        url: p.url,
                        notes: p.notes,
                        category: p.category,
                        createdAt: p.createdAt
                    })),
                    exportedAt: new Date().toISOString(),
                    version: '1.0'
                };

                const filename = `passwords-export-${new Date().toISOString().split('T')[0]}.json`;
                const exportResult = await electronAPI.exportPasswords(exportData, filename);

                if (exportResult.success) {
                    this.showSuccess(`Passwords exported to ${exportResult.filePath}`);
                }
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export passwords');
        }
    }

    /**
     * Import passwords
     */
    async importPasswords() {
        try {
            const result = await electronAPI.importPasswords();

            if (result.success) {
                const data = result.data;

                if (!data.passwords || !Array.isArray(data.passwords)) {
                    throw new Error('Invalid import file format');
                }

                const confirmed = await this.showConfirmDialog(
                    'Import Passwords',
                    `Import ${data.passwords.length} passwords? This will add them to your existing passwords.`,
                    'Import',
                    'primary'
                );

                if (confirmed) {
                    let imported = 0;
                    let failed = 0;

                    for (const password of data.passwords) {
                        try {
                            const importResult = await electronAPI.createPassword(password);
                            if (importResult.success) {
                                imported++;
                            } else {
                                failed++;
                            }
                        } catch (error) {
                            failed++;
                        }
                    }

                    this.showSuccess(`Import complete: ${imported} passwords imported, ${failed} failed`);
                    await this.loadPasswords();
                }
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showError('Failed to import passwords');
        }
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmDialog(title, message, confirmText = 'Confirm', type = 'primary') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>${this.escapeHtml(title)}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                        <button class="btn btn-${type}" id="confirm-ok">${this.escapeHtml(confirmText)}</button>
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

// Make PasswordManager available globally
window.PasswordManager = PasswordManager;
