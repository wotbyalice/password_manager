const { io } = require('socket.io-client');

/**
 * Socket.io client wrapper for real-time communication
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
    this.token = null;
    this.serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
  }

  /**
   * Connect to the Socket.io server
   * @param {string} token - JWT authentication token
   * @returns {Promise<boolean>} Connection success status
   */
  async connect(token) {
    return new Promise((resolve, reject) => {
      this.token = token;

      this.socket = io(this.serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      });

      // Connection successful
      this.socket.on('connect', () => {
        console.log('Socket.io connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupEventHandlers();
        resolve(true);
      });

      // Connection failed
      this.socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error.message);
        this.isConnected = false;
        reject(error);
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason);
        this.isConnected = false;
        this.handleDisconnection(reason);
      });

      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket.io reconnection attempt ${attemptNumber}`);
        this.reconnectAttempts = attemptNumber;
      });

      // Reconnection successful
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`Socket.io reconnected after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      // Reconnection failed
      this.socket.on('reconnect_failed', () => {
        console.error('Socket.io reconnection failed');
        this.isConnected = false;
      });
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Set up default event handlers
   */
  setupEventHandlers() {
    // Password synchronization events
    this.socket.on('password_created', (data) => {
      this.emit('passwordCreated', data);
    });

    this.socket.on('password_updated', (data) => {
      this.emit('passwordUpdated', data);
    });

    this.socket.on('password_deleted', (data) => {
      this.emit('passwordDeleted', data);
    });

    // User presence events
    this.socket.on('user_online', (data) => {
      this.emit('userOnline', data);
    });

    this.socket.on('user_offline', (data) => {
      this.emit('userOffline', data);
    });

    this.socket.on('online_users', (data) => {
      this.emit('onlineUsers', data);
    });

    // Collaborative editing events
    this.socket.on('user_editing', (data) => {
      this.emit('userEditing', data);
    });

    this.socket.on('user_stopped_editing', (data) => {
      this.emit('userStoppedEditing', data);
    });

    this.socket.on('edit_conflict', (data) => {
      this.emit('editConflict', data);
    });

    this.socket.on('conflict_resolved', (data) => {
      this.emit('conflictResolved', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('userTyping', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('userStoppedTyping', data);
    });

    // System notifications
    this.socket.on('system_notification', (data) => {
      this.emit('systemNotification', data);
    });

    this.socket.on('server_shutdown', (data) => {
      this.emit('serverShutdown', data);
    });
  }

  /**
   * Handle disconnection events
   * @param {string} reason - Disconnection reason
   */
  handleDisconnection(reason) {
    this.emit('disconnected', { reason });

    // Attempt manual reconnection for certain reasons
    if (reason === 'io server disconnect' || reason === 'transport close') {
      setTimeout(() => {
        if (!this.isConnected && this.token) {
          this.connect(this.token).catch(console.error);
        }
      }, this.reconnectDelay);
    }
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function to remove
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send event to server
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot send ${event}: Socket not connected`);
    }
  }

  /**
   * Start editing a password
   * @param {number} passwordId - Password ID
   */
  startEditing(passwordId) {
    this.send('start_editing', { passwordId });
  }

  /**
   * Stop editing a password
   * @param {number} passwordId - Password ID
   */
  stopEditing(passwordId) {
    this.send('stop_editing', { passwordId });
  }

  /**
   * Send editing heartbeat
   * @param {number} passwordId - Password ID
   */
  sendEditingHeartbeat(passwordId) {
    this.send('editing_heartbeat', { passwordId });
  }

  /**
   * Start typing indicator
   * @param {number} passwordId - Password ID
   * @param {string} field - Field name being edited
   */
  startTyping(passwordId, field) {
    this.send('typing_start', { passwordId, field });
  }

  /**
   * Stop typing indicator
   * @param {number} passwordId - Password ID
   * @param {string} field - Field name
   */
  stopTyping(passwordId, field) {
    this.send('typing_stop', { passwordId, field });
  }

  /**
   * Send field update for collaborative editing
   * @param {number} passwordId - Password ID
   * @param {string} field - Field name
   * @param {string} value - Field value
   * @param {number} cursorPosition - Cursor position
   */
  sendFieldUpdate(passwordId, field, value, cursorPosition) {
    this.send('field_update', { passwordId, field, value, cursorPosition });
  }

  /**
   * Request list of online users
   */
  getOnlineUsers() {
    this.send('get_online_users');
  }

  /**
   * Send client error to server
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  reportError(error, context) {
    this.send('client_error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
      serverUrl: this.serverUrl
    };
  }
}

// Export singleton instance
const socketClient = new SocketClient();
module.exports = socketClient;
