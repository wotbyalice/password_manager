/**
 * Real-time Service with Dependency Injection
 * Manages WebSocket connections and real-time communication
 */

const RealtimeEventHandler = require('../realtime/RealtimeEventHandler');

class RealtimeService {
  constructor(eventBus, logger, config) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.io = null;
    this.connectedClients = new Map();
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.eventHandler = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the real-time service with Socket.IO instance
   * @param {Object} io - Socket.IO server instance
   */
  initialize(io) {
    try {
      this.io = io;
      this.setupSocketHandlers();
      this.eventHandler = new RealtimeEventHandler(this.eventBus, this, this.logger);
      this.isInitialized = true;
      
      this.logger.info('Real-time service initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing real-time service:', error);
      throw error;
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.handleClientConnection(socket);
    });
  }

  /**
   * Handle new client connection
   * @param {Object} socket - Socket.IO socket instance
   */
  handleClientConnection(socket) {
    try {
      const clientId = socket.id;
      const clientInfo = {
        id: clientId,
        userId: null,
        connectedAt: new Date().toISOString(),
        userAgent: socket.handshake.headers['user-agent'],
        ipAddress: socket.handshake.address
      };

      this.connectedClients.set(clientId, clientInfo);
      
      this.logger.info('Client connected', {
        clientId,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      // Set up socket event handlers
      socket.on('authenticate', (data) => this.handleAuthentication(socket, data));
      socket.on('disconnect', (reason) => this.handleClientDisconnection(socket, reason));
      socket.on('ping', () => socket.emit('pong'));

      // Send connection confirmation
      socket.emit('connected', {
        clientId,
        timestamp: clientInfo.connectedAt
      });

    } catch (error) {
      this.logger.error('Error handling client connection:', error);
    }
  }

  /**
   * Handle client authentication
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Authentication data
   */
  handleAuthentication(socket, data) {
    try {
      const { token } = data;
      const clientId = socket.id;
      
      if (!token) {
        socket.emit('authentication_failed', { reason: 'Token required' });
        return;
      }

      // Verify token (this would typically use the auth service)
      // For now, we'll assume token verification is handled elsewhere
      const userId = this.extractUserIdFromToken(token);
      
      if (!userId) {
        socket.emit('authentication_failed', { reason: 'Invalid token' });
        return;
      }

      // Update client info
      const clientInfo = this.connectedClients.get(clientId);
      if (clientInfo) {
        clientInfo.userId = userId;
        clientInfo.authenticatedAt = new Date().toISOString();
      }

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(clientId);

      // Join user-specific room
      socket.join(`user_${userId}`);
      
      // Join role-specific room (if admin)
      if (this.isAdmin(userId)) {
        socket.join('admins');
      }

      socket.emit('authentication_success', {
        userId,
        timestamp: clientInfo.authenticatedAt
      });

      this.logger.info('Client authenticated', {
        clientId,
        userId
      });

    } catch (error) {
      this.logger.error('Error handling client authentication:', error);
      socket.emit('authentication_failed', { reason: 'Authentication error' });
    }
  }

  /**
   * Handle client disconnection
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} reason - Disconnection reason
   */
  handleClientDisconnection(socket, reason) {
    try {
      const clientId = socket.id;
      const clientInfo = this.connectedClients.get(clientId);
      
      if (clientInfo) {
        const duration = Date.now() - new Date(clientInfo.connectedAt).getTime();
        
        // Remove from user sockets tracking
        if (clientInfo.userId) {
          const userSocketSet = this.userSockets.get(clientInfo.userId);
          if (userSocketSet) {
            userSocketSet.delete(clientId);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(clientInfo.userId);
            }
          }
        }

        this.connectedClients.delete(clientId);
        
        this.logger.info('Client disconnected', {
          clientId,
          userId: clientInfo.userId,
          reason,
          duration
        });
      }

    } catch (error) {
      this.logger.error('Error handling client disconnection:', error);
    }
  }

  /**
   * Broadcast message to all authenticated users
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastToAll(event, data) {
    try {
      if (!this.io) {
        this.logger.warn('Cannot broadcast: Socket.IO not initialized');
        return;
      }

      this.io.emit(event, data);
      
      this.logger.debug('Broadcasted to all clients', {
        event,
        recipientCount: this.connectedClients.size
      });

    } catch (error) {
      this.logger.error('Error broadcasting to all clients:', error);
    }
  }

  /**
   * Broadcast message to all users except specified user
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {number} excludeUserId - User ID to exclude
   */
  broadcastToAllExcept(event, data, excludeUserId) {
    try {
      if (!this.io) {
        this.logger.warn('Cannot broadcast: Socket.IO not initialized');
        return;
      }

      // Get all sockets for the excluded user
      const excludedSockets = this.userSockets.get(excludeUserId) || new Set();
      
      // Broadcast to all clients except excluded ones
      this.connectedClients.forEach((clientInfo, clientId) => {
        if (!excludedSockets.has(clientId)) {
          const socket = this.io.sockets.sockets.get(clientId);
          if (socket) {
            socket.emit(event, data);
          }
        }
      });

      this.logger.debug('Broadcasted to all except user', {
        event,
        excludeUserId,
        recipientCount: this.connectedClients.size - excludedSockets.size
      });

    } catch (error) {
      this.logger.error('Error broadcasting to all except user:', error);
    }
  }

  /**
   * Send message to specific user
   * @param {number} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToUser(userId, event, data) {
    try {
      if (!this.io) {
        this.logger.warn('Cannot send to user: Socket.IO not initialized');
        return;
      }

      this.io.to(`user_${userId}`).emit(event, data);
      
      this.logger.debug('Sent message to user', {
        userId,
        event
      });

    } catch (error) {
      this.logger.error('Error sending message to user:', error);
    }
  }

  /**
   * Broadcast message to admin users only
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastToAdmins(event, data) {
    try {
      if (!this.io) {
        this.logger.warn('Cannot broadcast to admins: Socket.IO not initialized');
        return;
      }

      this.io.to('admins').emit(event, data);
      
      this.logger.debug('Broadcasted to admins', {
        event
      });

    } catch (error) {
      this.logger.error('Error broadcasting to admins:', error);
    }
  }

  /**
   * Disconnect all sockets for a specific user
   * @param {number} userId - User ID
   */
  disconnectUser(userId) {
    try {
      const userSocketSet = this.userSockets.get(userId);
      
      if (userSocketSet) {
        userSocketSet.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
        });
        
        this.userSockets.delete(userId);
        
        this.logger.info('Disconnected all sockets for user', {
          userId,
          socketCount: userSocketSet.size
        });
      }

    } catch (error) {
      this.logger.error('Error disconnecting user sockets:', error);
    }
  }

  /**
   * Get real-time service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const authenticatedClients = Array.from(this.connectedClients.values())
      .filter(client => client.userId !== null);

    return {
      initialized: this.isInitialized,
      totalConnections: this.connectedClients.size,
      authenticatedConnections: authenticatedClients.length,
      uniqueUsers: this.userSockets.size,
      eventHandlerStats: this.eventHandler ? this.eventHandler.getStats() : null
    };
  }

  /**
   * Extract user ID from JWT token (simplified)
   * @param {string} token - JWT token
   * @returns {number|null} User ID or null if invalid
   */
  extractUserIdFromToken(token) {
    try {
      // This is a simplified implementation
      // In practice, you'd use the auth service to verify the token
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.userId || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is admin (simplified)
   * @param {number} userId - User ID
   * @returns {boolean} True if user is admin
   */
  isAdmin(userId) {
    // This is a simplified implementation
    // In practice, you'd check the user's role from the database
    return false; // Placeholder
  }

  /**
   * Dispose of the real-time service
   */
  dispose() {
    try {
      if (this.eventHandler) {
        this.eventHandler.dispose();
      }

      this.connectedClients.clear();
      this.userSockets.clear();
      this.isInitialized = false;
      
      this.logger.info('Real-time service disposed');

    } catch (error) {
      this.logger.error('Error disposing real-time service:', error);
    }
  }
}

module.exports = RealtimeService;
