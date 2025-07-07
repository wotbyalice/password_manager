const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { findUserById } = require('../auth/authService');
const { handleConnection, handleDisconnection } = require('./socketHandlers');
const logger = require('../utils/logger');

/**
 * Initialize Socket.io server with authentication and event handlers
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Electron)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'file://', // Allow Electron file:// protocol
          'app://' // Allow Electron app:// protocol
        ];

        if (process.env.NODE_ENV === 'production') {
          allowedOrigins.push(process.env.FRONTEND_URL);
        }

        // Allow Electron origins
        if (origin && (origin.startsWith('file://') || origin.startsWith('app://') || allowedOrigins.indexOf(origin) !== -1)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for development
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('No token provided'));
      }

      // Verify JWT token
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret);

      // Get user details
      const user = await findUserById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      socket.user = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };

      logger.info('Socket authenticated', {
        userId: user.id,
        email: user.email,
        socketId: socket.id
      });

      next();

    } catch (error) {
      logger.error('Socket authentication failed', {
        error: error.message,
        socketId: socket.id
      });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    handleConnection(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      handleDisconnection(io, socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        error: error.message,
        userId: socket.user?.userId,
        socketId: socket.id
      });
    });
  });

  // Global error handling
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.io connection error', {
      error: err.message,
      code: err.code,
      context: err.context
    });
  });

  logger.info('Socket.io server initialized successfully');
  return io;
}

/**
 * Get connected users count
 * @param {Object} io - Socket.io server instance
 * @returns {number} Number of connected users
 */
function getConnectedUsersCount(io) {
  return io.sockets.sockets.size;
}

/**
 * Get list of connected users
 * @param {Object} io - Socket.io server instance
 * @returns {Array} Array of connected user objects
 */
function getConnectedUsers(io) {
  const users = [];
  
  io.sockets.sockets.forEach((socket) => {
    if (socket.user) {
      users.push({
        userId: socket.user.userId,
        email: socket.user.email,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role,
        connectedAt: socket.connectedAt,
        socketId: socket.id
      });
    }
  });

  return users;
}

/**
 * Broadcast message to all connected users
 * @param {Object} io - Socket.io server instance
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToAll(io, event, data) {
  io.emit(event, {
    ...data,
    timestamp: new Date()
  });

  logger.info('Broadcast sent to all users', {
    event,
    connectedUsers: getConnectedUsersCount(io)
  });
}

/**
 * Broadcast message to specific users
 * @param {Object} io - Socket.io server instance
 * @param {Array} userIds - Array of user IDs to send to
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToUsers(io, userIds, event, data) {
  let sentCount = 0;

  io.sockets.sockets.forEach((socket) => {
    if (socket.user && userIds.includes(socket.user.userId)) {
      socket.emit(event, {
        ...data,
        timestamp: new Date()
      });
      sentCount++;
    }
  });

  logger.info('Broadcast sent to specific users', {
    event,
    targetUsers: userIds.length,
    sentTo: sentCount
  });
}

/**
 * Broadcast message to users with specific role
 * @param {Object} io - Socket.io server instance
 * @param {string} role - User role (admin, user)
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToRole(io, role, event, data) {
  let sentCount = 0;

  io.sockets.sockets.forEach((socket) => {
    if (socket.user && socket.user.role === role) {
      socket.emit(event, {
        ...data,
        timestamp: new Date()
      });
      sentCount++;
    }
  });

  logger.info('Broadcast sent to role', {
    event,
    role,
    sentTo: sentCount
  });
}

/**
 * Send message to specific user
 * @param {Object} io - Socket.io server instance
 * @param {number} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 * @returns {boolean} True if message was sent
 */
function sendToUser(io, userId, event, data) {
  let sent = false;

  io.sockets.sockets.forEach((socket) => {
    if (socket.user && socket.user.userId === userId) {
      socket.emit(event, {
        ...data,
        timestamp: new Date()
      });
      sent = true;
    }
  });

  if (sent) {
    logger.info('Message sent to user', {
      event,
      userId
    });
  } else {
    logger.warn('User not connected for message', {
      event,
      userId
    });
  }

  return sent;
}

/**
 * Check if user is connected
 * @param {Object} io - Socket.io server instance
 * @param {number} userId - User ID to check
 * @returns {boolean} True if user is connected
 */
function isUserConnected(io, userId) {
  let connected = false;

  io.sockets.sockets.forEach((socket) => {
    if (socket.user && socket.user.userId === userId) {
      connected = true;
    }
  });

  return connected;
}

/**
 * Gracefully shutdown Socket.io server
 * @param {Object} io - Socket.io server instance
 */
function shutdownSocketServer(io) {
  logger.info('Shutting down Socket.io server...');
  
  // Notify all clients about shutdown
  broadcastToAll(io, 'server_shutdown', {
    message: 'Server is shutting down for maintenance',
    reconnect: true
  });

  // Close all connections
  io.close(() => {
    logger.info('Socket.io server shutdown complete');
  });
}

module.exports = {
  initializeSocketServer,
  getConnectedUsersCount,
  getConnectedUsers,
  broadcastToAll,
  broadcastToUsers,
  broadcastToRole,
  sendToUser,
  isUserConnected,
  shutdownSocketServer
};
