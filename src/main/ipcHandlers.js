const { ipcMain, clipboard, dialog, shell, app, Notification } = require('electron');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const store = require('./store');
const socketClient = require('../shared/socketClient');

// API configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
let authToken = null;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      authToken = null;
      store.delete('authToken');
      // Notify renderer about auth failure
      if (global.mainWindow) {
        global.mainWindow.webContents.send('auth:token-expired');
      }
    }
    throw error;
  }
);

/**
 * Setup all IPC handlers
 */
function setupIpcHandlers() {
  // Authentication handlers
  ipcMain.handle('auth:login', async (event, credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      authToken = token;
      store.set('authToken', token);
      store.set('currentUser', user);
      
      // Connect to Socket.io
      await socketClient.connect(token);
      
      return { success: true, user, token };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  });

  ipcMain.handle('auth:logout', async (event) => {
    try {
      if (authToken) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authToken = null;
      store.delete('authToken');
      store.delete('currentUser');
      socketClient.disconnect();
      return { success: true };
    }
  });

  ipcMain.handle('auth:verify-token', async (event, token) => {
    try {
      authToken = token;
      const response = await api.get('/auth/verify');
      return { success: true, user: response.data.user };
    } catch (error) {
      authToken = null;
      return { success: false, error: 'Token verification failed' };
    }
  });

  ipcMain.handle('auth:change-password', async (event, data) => {
    try {
      const response = await api.post('/auth/change-password', data);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password change failed' 
      };
    }
  });

  // Password management handlers
  ipcMain.handle('passwords:get-all', async (event, options = {}) => {
    try {
      const params = new URLSearchParams(options);
      const response = await api.get(`/passwords?${params}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch passwords' 
      };
    }
  });

  ipcMain.handle('passwords:get-by-id', async (event, id) => {
    try {
      const response = await api.get(`/passwords/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch password' 
      };
    }
  });

  ipcMain.handle('passwords:create', async (event, data) => {
    try {
      const response = await api.post('/passwords', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create password' 
      };
    }
  });

  ipcMain.handle('passwords:update', async (event, id, data) => {
    try {
      const response = await api.put(`/passwords/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update password' 
      };
    }
  });

  ipcMain.handle('passwords:delete', async (event, id) => {
    try {
      const response = await api.delete(`/passwords/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to delete password' 
      };
    }
  });

  ipcMain.handle('passwords:search', async (event, query) => {
    try {
      const response = await api.get(`/passwords/search?q=${encodeURIComponent(query)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Search failed' 
      };
    }
  });

  // Categories handlers
  ipcMain.handle('categories:get-all', async (event) => {
    try {
      const response = await api.get('/passwords/categories');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch categories'
      };
    }
  });

  ipcMain.handle('categories:get-stats', async (event) => {
    try {
      const response = await api.get('/passwords/categories/stats');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch category statistics'
      };
    }
  });

  ipcMain.handle('categories:create', async (event, data) => {
    try {
      const response = await api.post('/passwords/categories', data);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create category'
      };
    }
  });

  // User management handlers (admin only)
  ipcMain.handle('users:get-all', async (event) => {
    try {
      const response = await api.get('/users');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch users'
      };
    }
  });

  ipcMain.handle('users:create', async (event, data) => {
    try {
      const response = await api.post('/users', data);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create user'
      };
    }
  });

  ipcMain.handle('users:update', async (event, id, data) => {
    try {
      const response = await api.put(`/users/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update user'
      };
    }
  });

  ipcMain.handle('users:delete', async (event, id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete user'
      };
    }
  });

  // Audit log handlers (admin only)
  ipcMain.handle('audit:get-logs', async (event, params = {}) => {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await api.get(`/audit/logs?${queryParams}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch audit logs'
      };
    }
  });

  ipcMain.handle('audit:export', async (event, data, filename) => {
    try {
      const result = await dialog.showSaveDialog(global.mainWindow, {
        defaultPath: filename || 'audit-logs-export.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
        return { success: true, filePath: result.filePath };
      }

      return { success: false, error: 'Export cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Socket.io handlers
  ipcMain.handle('socket:connect', async (event, token) => {
    try {
      await socketClient.connect(token);
      setupSocketEventForwarding();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('socket:disconnect', async (event) => {
    socketClient.disconnect();
    return { success: true };
  });

  ipcMain.handle('socket:status', async (event) => {
    return socketClient.getStatus();
  });

  ipcMain.handle('socket:start-editing', async (event, passwordId) => {
    socketClient.startEditing(passwordId);
    return { success: true };
  });

  ipcMain.handle('socket:stop-editing', async (event, passwordId) => {
    socketClient.stopEditing(passwordId);
    return { success: true };
  });

  ipcMain.handle('socket:typing', async (event, passwordId, field, isTyping) => {
    if (isTyping) {
      socketClient.startTyping(passwordId, field);
    } else {
      socketClient.stopTyping(passwordId, field);
    }
    return { success: true };
  });

  // Storage handlers
  ipcMain.handle('storage:get', async (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('storage:set', async (event, key, value) => {
    store.set(key, value);
    return { success: true };
  });

  ipcMain.handle('storage:remove', async (event, key) => {
    store.delete(key);
    return { success: true };
  });

  ipcMain.handle('storage:clear', async (event) => {
    store.clear();
    return { success: true };
  });

  // Clipboard handlers
  ipcMain.handle('clipboard:copy', async (event, text) => {
    clipboard.writeText(text);
    
    // Clear clipboard after 30 seconds for security
    setTimeout(() => {
      if (clipboard.readText() === text) {
        clipboard.clear();
      }
    }, 30000);
    
    return { success: true };
  });

  ipcMain.handle('clipboard:clear', async (event) => {
    clipboard.clear();
    return { success: true };
  });

  // File operation handlers
  ipcMain.handle('file:export', async (event, data, filename) => {
    try {
      const result = await dialog.showSaveDialog(global.mainWindow, {
        defaultPath: filename || 'passwords-export.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
        return { success: true, filePath: result.filePath };
      }

      return { success: false, error: 'Export cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:import', async (event) => {
    try {
      const result = await dialog.showOpenDialog(global.mainWindow, {
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const fileContent = await fs.readFile(result.filePaths[0], 'utf8');
        const data = JSON.parse(fileContent);
        return { success: true, data };
      }

      return { success: false, error: 'Import cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Notification handlers
  ipcMain.handle('notification:show', async (event, title, body, options = {}) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: path.join(__dirname, '../../assets/icon.png'),
        ...options
      });
      notification.show();
      return { success: true };
    }
    return { success: false, error: 'Notifications not supported' };
  });

  // App info handlers
  ipcMain.handle('app:version', async (event) => {
    return app.getVersion();
  });

  ipcMain.handle('app:platform', async (event) => {
    return process.platform;
  });

  ipcMain.handle('app:is-dev', async (event) => {
    return process.env.NODE_ENV === 'development';
  });

  // Auto-restore auth token on startup
  const savedToken = store.get('authToken');
  if (savedToken) {
    authToken = savedToken;
  }
}

/**
 * Setup Socket.io event forwarding to renderer
 */
function setupSocketEventForwarding() {
  socketClient.on('passwordCreated', (data) => {
    if (global.mainWindow) {
      global.mainWindow.webContents.send('realtime:password-created', data);
    }
  });

  socketClient.on('passwordUpdated', (data) => {
    if (global.mainWindow) {
      global.mainWindow.webContents.send('realtime:password-updated', data);
    }
  });

  socketClient.on('passwordDeleted', (data) => {
    if (global.mainWindow) {
      global.mainWindow.webContents.send('realtime:password-deleted', data);
    }
  });

  socketClient.on('userOnline', (data) => {
    if (global.mainWindow) {
      global.mainWindow.webContents.send('realtime:user-online', data);
    }
  });

  socketClient.on('userOffline', (data) => {
    if (global.mainWindow) {
      global.mainWindow.webContents.send('realtime:user-offline', data);
    }
  });

  socketClient.on('editConflict', (data) => {
    if (global.mainWindow) {
      global.mainWindow.webContents.send('realtime:edit-conflict', data);
    }
  });
}

module.exports = { setupIpcHandlers };
