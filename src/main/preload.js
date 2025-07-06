const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  verifyToken: (token) => ipcRenderer.invoke('auth:verify-token', token),
  changePassword: (data) => ipcRenderer.invoke('auth:change-password', data),

  // Password management
  getPasswords: (options) => ipcRenderer.invoke('passwords:get-all', options),
  getPassword: (id) => ipcRenderer.invoke('passwords:get-by-id', id),
  createPassword: (data) => ipcRenderer.invoke('passwords:create', data),
  updatePassword: (id, data) => ipcRenderer.invoke('passwords:update', id, data),
  deletePassword: (id) => ipcRenderer.invoke('passwords:delete', id),
  searchPasswords: (query) => ipcRenderer.invoke('passwords:search', query),

  // Categories
  getCategories: () => ipcRenderer.invoke('categories:get-all'),
  createCategory: (data) => ipcRenderer.invoke('categories:create', data),
  updateCategory: (id, data) => ipcRenderer.invoke('categories:update', id, data),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),

  // User management (admin only)
  getUsers: () => ipcRenderer.invoke('users:get-all'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Audit logs (admin only)
  getAuditLogs: (params) => ipcRenderer.invoke('audit:get-logs', params),
  exportAuditLogs: (data, filename) => ipcRenderer.invoke('audit:export', data, filename),

  // Real-time events
  onPasswordCreated: (callback) => {
    ipcRenderer.on('realtime:password-created', callback);
    return () => ipcRenderer.removeListener('realtime:password-created', callback);
  },
  onPasswordUpdated: (callback) => {
    ipcRenderer.on('realtime:password-updated', callback);
    return () => ipcRenderer.removeListener('realtime:password-updated', callback);
  },
  onPasswordDeleted: (callback) => {
    ipcRenderer.on('realtime:password-deleted', callback);
    return () => ipcRenderer.removeListener('realtime:password-deleted', callback);
  },
  onUserOnline: (callback) => {
    ipcRenderer.on('realtime:user-online', callback);
    return () => ipcRenderer.removeListener('realtime:user-online', callback);
  },
  onUserOffline: (callback) => {
    ipcRenderer.on('realtime:user-offline', callback);
    return () => ipcRenderer.removeListener('realtime:user-offline', callback);
  },
  onEditConflict: (callback) => {
    ipcRenderer.on('realtime:edit-conflict', callback);
    return () => ipcRenderer.removeListener('realtime:edit-conflict', callback);
  },

  // Socket.io connection management
  connectSocket: (token) => ipcRenderer.invoke('socket:connect', token),
  disconnectSocket: () => ipcRenderer.invoke('socket:disconnect'),
  getSocketStatus: () => ipcRenderer.invoke('socket:status'),
  startEditing: (passwordId) => ipcRenderer.invoke('socket:start-editing', passwordId),
  stopEditing: (passwordId) => ipcRenderer.invoke('socket:stop-editing', passwordId),
  sendTyping: (passwordId, field, isTyping) => ipcRenderer.invoke('socket:typing', passwordId, field, isTyping),

  // Local storage and caching
  getStoredData: (key) => ipcRenderer.invoke('storage:get', key),
  setStoredData: (key, value) => ipcRenderer.invoke('storage:set', key, value),
  removeStoredData: (key) => ipcRenderer.invoke('storage:remove', key),
  clearStoredData: () => ipcRenderer.invoke('storage:clear'),

  // Clipboard operations
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:copy', text),
  clearClipboard: () => ipcRenderer.invoke('clipboard:clear'),

  // File operations
  exportPasswords: (data, filename) => ipcRenderer.invoke('file:export', data, filename),
  importPasswords: () => ipcRenderer.invoke('file:import'),
  selectFile: (options) => ipcRenderer.invoke('file:select', options),

  // System integration
  showNotification: (title, body, options) => ipcRenderer.invoke('notification:show', title, body, options),
  setTrayTooltip: (tooltip) => ipcRenderer.invoke('tray:set-tooltip', tooltip),
  showInTray: (show) => ipcRenderer.invoke('tray:show', show),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', callback);
    return () => ipcRenderer.removeListener('update-progress', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },

  // Navigation and UI
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', callback);
    return () => ipcRenderer.removeListener('navigate-to', callback);
  },
  onNewPassword: (callback) => {
    ipcRenderer.on('new-password', callback);
    return () => ipcRenderer.removeListener('new-password', callback);
  },
  onRefreshData: (callback) => {
    ipcRenderer.on('refresh-data', callback);
    return () => ipcRenderer.removeListener('refresh-data', callback);
  },
  onFocusSearch: (callback) => {
    ipcRenderer.on('focus-search', callback);
    return () => ipcRenderer.removeListener('focus-search', callback);
  },
  onGeneratePassword: (callback) => {
    ipcRenderer.on('generate-password', callback);
    return () => ipcRenderer.removeListener('generate-password', callback);
  },

  // Security and validation
  validatePassword: (password) => ipcRenderer.invoke('security:validate-password', password),
  generateSecurePassword: (options) => ipcRenderer.invoke('security:generate-password', options),
  checkPasswordStrength: (password) => ipcRenderer.invoke('security:check-strength', password),
  encryptData: (data) => ipcRenderer.invoke('security:encrypt', data),
  decryptData: (encryptedData) => ipcRenderer.invoke('security:decrypt', encryptedData),

  // Logging and debugging
  logError: (error, context) => ipcRenderer.invoke('log:error', error, context),
  logInfo: (message, data) => ipcRenderer.invoke('log:info', message, data),
  logDebug: (message, data) => ipcRenderer.invoke('log:debug', message, data),

  // App information
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getAppPath: () => ipcRenderer.invoke('app:path'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  isDevMode: () => ipcRenderer.invoke('app:is-dev'),

  // Window management
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  restoreWindow: () => ipcRenderer.invoke('window:restore'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Network status
  isOnline: () => ipcRenderer.invoke('network:is-online'),
  onNetworkChange: (callback) => {
    ipcRenderer.on('network:status-changed', callback);
    return () => ipcRenderer.removeListener('network:status-changed', callback);
  },

  // Performance monitoring
  getMemoryUsage: () => ipcRenderer.invoke('performance:memory'),
  getCPUUsage: () => ipcRenderer.invoke('performance:cpu'),

  // Backup and sync
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
  syncData: () => ipcRenderer.invoke('sync:data'),
  getLastSyncTime: () => ipcRenderer.invoke('sync:last-time'),

  // Settings management
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),

  // Keyboard shortcuts
  registerShortcut: (shortcut, callback) => ipcRenderer.invoke('shortcuts:register', shortcut, callback),
  unregisterShortcut: (shortcut) => ipcRenderer.invoke('shortcuts:unregister', shortcut),

  // Theme management
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme:changed', callback);
    return () => ipcRenderer.removeListener('theme:changed', callback);
  }
});

// Expose a limited set of Node.js APIs
contextBridge.exposeInMainWorld('nodeAPI', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions
});

// Security: Remove any global Node.js objects that might have been exposed
delete window.require;
delete window.exports;
delete window.module;
