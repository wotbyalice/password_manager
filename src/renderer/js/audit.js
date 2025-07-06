/**
 * Audit Log Controller (Admin Only)
 * Handles audit log viewing and filtering
 */

class AuditManager {
    constructor() {
        this.auditLogs = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalPages = 1;
        this.filters = {
            dateFrom: '',
            dateTo: '',
            action: '',
            userId: ''
        };
        
        this.init();
    }

    /**
     * Initialize audit manager
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Date filters
        const dateFromFilter = document.getElementById('audit-date-from');
        const dateToFilter = document.getElementById('audit-date-to');
        
        if (dateFromFilter) {
            dateFromFilter.addEventListener('change', (e) => {
                this.filters.dateFrom = e.target.value;
                this.currentPage = 1;
                this.loadAuditLogs();
            });
        }

        if (dateToFilter) {
            dateToFilter.addEventListener('change', (e) => {
                this.filters.dateTo = e.target.value;
                this.currentPage = 1;
                this.loadAuditLogs();
            });
        }

        // Action filter
        const actionFilter = document.getElementById('audit-action-filter');
        if (actionFilter) {
            actionFilter.addEventListener('change', (e) => {
                this.filters.action = e.target.value;
                this.currentPage = 1;
                this.loadAuditLogs();
            });
        }

        // Export button
        document.getElementById('export-audit-btn')?.addEventListener('click', () => {
            this.exportAuditLogs();
        });

        // Refresh button
        document.getElementById('refresh-audit-btn')?.addEventListener('click', () => {
            this.loadAuditLogs();
        });
    }

    /**
     * Load audit logs from API
     */
    async loadAuditLogs() {
        try {
            this.showLoadingState();

            const params = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            };

            const result = await electronAPI.getAuditLogs(params);
            
            if (result.success) {
                this.auditLogs = result.data.logs || [];
                this.totalPages = result.data.pagination?.pages || 1;
                this.renderAuditLogs();
                this.renderPagination();
                this.updateAuditStats();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error loading audit logs:', error);
            this.showError('Failed to load audit logs');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Render audit logs table
     */
    renderAuditLogs() {
        const tbody = document.getElementById('audit-table-body');
        if (!tbody) return;

        if (this.auditLogs.length === 0) {
            tbody.innerHTML = this.renderEmptyState();
            return;
        }

        tbody.innerHTML = this.auditLogs.map(log => this.renderAuditRow(log)).join('');
    }

    /**
     * Render individual audit log row
     */
    renderAuditRow(log) {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const userInfo = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
        const ipAddress = log.metadata?.ip || 'N/A';
        
        return `
            <tr data-log-id="${log.id}">
                <td>
                    <div class="audit-timestamp">${timestamp}</div>
                </td>
                <td>
                    <div class="user-info-compact">
                        <div class="user-name">${Utils.escapeHtml(userInfo)}</div>
                        <div class="user-email">${Utils.escapeHtml(log.user?.email || 'system@internal')}</div>
                    </div>
                </td>
                <td>
                    <span class="audit-action ${log.action}">${this.formatAction(log.action)}</span>
                </td>
                <td>
                    <div class="resource-info">
                        <div class="resource-type">${this.formatResourceType(log.resource)}</div>
                        ${log.resourceId ? `<div class="resource-id">ID: ${log.resourceId}</div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="ip-address">${ipAddress}</div>
                    ${log.metadata?.userAgent ? `<div class="user-agent" title="${Utils.escapeHtml(log.metadata.userAgent)}">${this.truncateUserAgent(log.metadata.userAgent)}</div>` : ''}
                </td>
                <td>
                    <div class="audit-details">
                        ${this.formatAuditDetails(log)}
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const hasFilters = Object.values(this.filters).some(filter => filter !== '');
        const message = hasFilters 
            ? 'No audit logs found matching the current filters'
            : 'No audit logs available';

        return `
            <tr>
                <td colspan="6" class="empty-state-cell">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                        </svg>
                        <h3>${message}</h3>
                        <p>Audit logs track all user actions and system events for security and compliance.</p>
                        ${hasFilters ? '<button class="btn btn-secondary" onclick="window.app.auditManager.clearFilters()">Clear Filters</button>' : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Format action name for display
     */
    formatAction(action) {
        const actionMap = {
            'login': 'Login',
            'logout': 'Logout',
            'password_created': 'Password Created',
            'password_updated': 'Password Updated',
            'password_deleted': 'Password Deleted',
            'password_viewed': 'Password Viewed',
            'user_created': 'User Created',
            'user_updated': 'User Updated',
            'user_deleted': 'User Deleted',
            'category_created': 'Category Created',
            'category_updated': 'Category Updated',
            'category_deleted': 'Category Deleted',
            'export_passwords': 'Passwords Exported',
            'import_passwords': 'Passwords Imported'
        };

        return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format resource type for display
     */
    formatResourceType(resource) {
        const resourceMap = {
            'password_entry': 'Password',
            'user': 'User',
            'category': 'Category',
            'system': 'System',
            'auth': 'Authentication'
        };

        return resourceMap[resource] || resource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format audit details
     */
    formatAuditDetails(log) {
        let details = [];

        if (log.success === false) {
            details.push(`<span class="error-indicator">Failed</span>`);
        }

        if (log.metadata?.error) {
            details.push(`Error: ${Utils.escapeHtml(log.metadata.error)}`);
        }

        if (log.metadata?.changes) {
            details.push(`Changes: ${Object.keys(log.metadata.changes).join(', ')}`);
        }

        if (log.metadata?.searchQuery) {
            details.push(`Search: "${Utils.escapeHtml(log.metadata.searchQuery)}"`);
        }

        if (log.metadata?.category) {
            details.push(`Category: ${Utils.escapeHtml(log.metadata.category)}`);
        }

        return details.length > 0 ? details.join('<br>') : 'No additional details';
    }

    /**
     * Truncate user agent string
     */
    truncateUserAgent(userAgent) {
        if (userAgent.length <= 50) return userAgent;
        return userAgent.substring(0, 47) + '...';
    }

    /**
     * Update audit statistics
     */
    updateAuditStats() {
        // Calculate stats from current logs
        const totalLogs = this.auditLogs.length;
        const failedActions = this.auditLogs.filter(log => log.success === false).length;
        const uniqueUsers = new Set(this.auditLogs.map(log => log.userId)).size;
        const recentLogs = this.auditLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return logDate > oneDayAgo;
        }).length;

        // Update stats display if elements exist
        const statsContainer = document.getElementById('audit-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${totalLogs}</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${recentLogs}</div>
                    <div class="stat-label">Last 24 Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${uniqueUsers}</div>
                    <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${failedActions}</div>
                    <div class="stat-label">Failed Actions</div>
                </div>
            `;
        }
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const container = document.getElementById('audit-pagination');
        if (!container || this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
                <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
        `;

        container.innerHTML = paginationHTML;

        // Add click handlers
        container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.loadAuditLogs();
                }
            });
        });
    }

    /**
     * Export audit logs
     */
    async exportAuditLogs() {
        try {
            const result = await electronAPI.getAuditLogs({ 
                ...this.filters, 
                limit: 10000 // Export more records
            });
            
            if (result.success) {
                const exportData = {
                    auditLogs: result.data.logs,
                    filters: this.filters,
                    exportedAt: new Date().toISOString(),
                    exportedBy: window.app?.currentUser?.email || 'Unknown',
                    version: '1.0'
                };

                const filename = `audit-logs-export-${new Date().toISOString().split('T')[0]}.json`;
                const exportResult = await electronAPI.exportAuditLogs(exportData, filename);
                
                if (exportResult.success) {
                    this.showSuccess(`Audit logs exported to ${exportResult.filePath}`);
                }
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export audit logs');
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            dateFrom: '',
            dateTo: '',
            action: '',
            userId: ''
        };

        // Reset form elements
        document.getElementById('audit-date-from').value = '';
        document.getElementById('audit-date-to').value = '';
        document.getElementById('audit-action-filter').value = '';

        this.currentPage = 1;
        this.loadAuditLogs();
    }

    /**
     * Set date range filter
     */
    setDateRange(days) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

        this.filters.dateFrom = startDate.toISOString().split('T')[0];
        this.filters.dateTo = endDate.toISOString().split('T')[0];

        document.getElementById('audit-date-from').value = this.filters.dateFrom;
        document.getElementById('audit-date-to').value = this.filters.dateTo;

        this.currentPage = 1;
        this.loadAuditLogs();
    }

    // Utility methods
    showLoadingState() {
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading-spinner-sm"></div> Loading audit logs...</td></tr>';
    }

    hideLoadingState() {
        // Loading state will be replaced by renderAuditLogs()
    }

    showSuccess(message) {
        window.app?.showNotification(message, 'success');
    }

    showError(message) {
        window.app?.showNotification(message, 'error');
    }
}

// Make AuditManager available globally
window.AuditManager = AuditManager;
