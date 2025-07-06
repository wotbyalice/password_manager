const { auditLog, systemLog } = require('../utils/logger');
const { getConnectedUsers, broadcastToAll, sendToUser } = require('./socketServer');

// Store active editing sessions to handle conflicts
const activeEdits = new Map();

/**
 * Handle new socket connection
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 */
function handleConnection(io, socket) {
  const user = socket.user;
  socket.connectedAt = new Date();

  // Log connection
  auditLog('user_connected', user.userId, {
    socketId: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });

  // Notify other users that this user came online
  socket.broadcast.emit('user_online', {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    timestamp: new Date()
  });

  // Send current online users to the new connection
  const onlineUsers = getConnectedUsers(io);
  socket.emit('online_users', {
    users: onlineUsers.filter(u => u.userId !== user.userId), // Exclude self
    count: onlineUsers.length
  });

  // Handle password editing events
  socket.on('start_editing', (data) => {
    handleStartEditing(io, socket, data);
  });

  socket.on('stop_editing', (data) => {
    handleStopEditing(io, socket, data);
  });

  socket.on('editing_heartbeat', (data) => {
    handleEditingHeartbeat(io, socket, data);
  });

  // Handle user presence requests
  socket.on('get_online_users', () => {
    const onlineUsers = getConnectedUsers(io);
    socket.emit('online_users', {
      users: onlineUsers,
      count: onlineUsers.length
    });
  });

  // Handle typing indicators for collaborative editing
  socket.on('typing_start', (data) => {
    handleTypingStart(io, socket, data);
  });

  socket.on('typing_stop', (data) => {
    handleTypingStop(io, socket, data);
  });

  // Handle real-time password field updates (for collaborative editing)
  socket.on('field_update', (data) => {
    handleFieldUpdate(io, socket, data);
  });

  // Handle client-side errors
  socket.on('client_error', (data) => {
    auditLog('client_error', user.userId, {
      error: data.error,
      context: data.context,
      socketId: socket.id
    });
  });

  systemLog('socket_connected', {
    userId: user.userId,
    email: user.email,
    socketId: socket.id,
    totalConnections: io.sockets.sockets.size
  });
}

/**
 * Handle socket disconnection
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {string} reason - Disconnection reason
 */
function handleDisconnection(io, socket, reason) {
  const user = socket.user;

  if (user) {
    // Clean up any active editing sessions
    cleanupUserEditingSessions(socket.user.userId);

    // Notify other users that this user went offline
    socket.broadcast.emit('user_offline', {
      userId: user.userId,
      timestamp: new Date()
    });

    // Log disconnection
    auditLog('user_disconnected', user.userId, {
      reason,
      socketId: socket.id,
      duration: Date.now() - socket.connectedAt.getTime()
    });

    systemLog('socket_disconnected', {
      userId: user.userId,
      email: user.email,
      reason,
      socketId: socket.id,
      totalConnections: io.sockets.sockets.size - 1
    });
  }
}

/**
 * Handle user starting to edit a password
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Edit data
 */
function handleStartEditing(io, socket, data) {
  const { passwordId } = data;
  const user = socket.user;

  // Check if someone else is already editing
  if (activeEdits.has(passwordId)) {
    const existingEdit = activeEdits.get(passwordId);
    
    // Notify about conflict
    socket.emit('edit_conflict', {
      passwordId,
      currentEditor: existingEdit.user,
      startedAt: existingEdit.startedAt
    });

    // Notify the current editor about the conflict
    sendToUser(io, existingEdit.user.userId, 'edit_conflict_warning', {
      passwordId,
      conflictingUser: user,
      timestamp: new Date()
    });

    return;
  }

  // Register the editing session
  activeEdits.set(passwordId, {
    user,
    socketId: socket.id,
    startedAt: new Date(),
    lastHeartbeat: new Date()
  });

  // Notify other users about the editing session
  socket.broadcast.emit('user_editing', {
    passwordId,
    user: {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName
    },
    timestamp: new Date()
  });

  auditLog('editing_started', user.userId, {
    passwordId,
    socketId: socket.id
  });
}

/**
 * Handle user stopping password editing
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Edit data
 */
function handleStopEditing(io, socket, data) {
  const { passwordId } = data;
  const user = socket.user;

  // Remove the editing session
  if (activeEdits.has(passwordId)) {
    const editSession = activeEdits.get(passwordId);
    
    if (editSession.user.userId === user.userId) {
      activeEdits.delete(passwordId);

      // Notify other users that editing stopped
      socket.broadcast.emit('user_stopped_editing', {
        passwordId,
        userId: user.userId,
        timestamp: new Date()
      });

      auditLog('editing_stopped', user.userId, {
        passwordId,
        duration: Date.now() - editSession.startedAt.getTime()
      });
    }
  }
}

/**
 * Handle editing heartbeat to keep session alive
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Heartbeat data
 */
function handleEditingHeartbeat(io, socket, data) {
  const { passwordId } = data;
  const user = socket.user;

  if (activeEdits.has(passwordId)) {
    const editSession = activeEdits.get(passwordId);
    
    if (editSession.user.userId === user.userId) {
      editSession.lastHeartbeat = new Date();
    }
  }
}

/**
 * Handle typing start event
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Typing data
 */
function handleTypingStart(io, socket, data) {
  const { passwordId, field } = data;
  const user = socket.user;

  socket.broadcast.emit('user_typing', {
    passwordId,
    field,
    user: {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName
    },
    timestamp: new Date()
  });
}

/**
 * Handle typing stop event
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Typing data
 */
function handleTypingStop(io, socket, data) {
  const { passwordId, field } = data;
  const user = socket.user;

  socket.broadcast.emit('user_stopped_typing', {
    passwordId,
    field,
    userId: user.userId,
    timestamp: new Date()
  });
}

/**
 * Handle real-time field updates
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Field update data
 */
function handleFieldUpdate(io, socket, data) {
  const { passwordId, field, value, cursorPosition } = data;
  const user = socket.user;

  // Only broadcast to other users (not back to sender)
  socket.broadcast.emit('field_updated', {
    passwordId,
    field,
    value,
    cursorPosition,
    updatedBy: user.userId,
    timestamp: new Date()
  });
}

/**
 * Broadcast password creation to all connected clients
 * @param {Object} io - Socket.io server instance
 * @param {Object} passwordData - Created password data
 * @param {number} createdBy - User ID who created the password
 */
function broadcastPasswordCreated(io, passwordData, createdBy) {
  broadcastToAll(io, 'password_created', {
    password: passwordData,
    createdBy,
    action: 'created'
  });

  systemLog('password_broadcast', {
    action: 'created',
    passwordId: passwordData.id,
    createdBy,
    connectedUsers: io.sockets.sockets.size
  });
}

/**
 * Broadcast password update to all connected clients
 * @param {Object} io - Socket.io server instance
 * @param {Object} passwordData - Updated password data
 * @param {number} updatedBy - User ID who updated the password
 */
function broadcastPasswordUpdate(io, passwordData, updatedBy) {
  broadcastToAll(io, 'password_updated', {
    password: passwordData,
    updatedBy,
    action: 'updated'
  });

  systemLog('password_broadcast', {
    action: 'updated',
    passwordId: passwordData.id,
    updatedBy,
    connectedUsers: io.sockets.sockets.size
  });
}

/**
 * Broadcast password deletion to all connected clients
 * @param {Object} io - Socket.io server instance
 * @param {number} passwordId - ID of deleted password
 * @param {number} deletedBy - User ID who deleted the password
 */
function broadcastPasswordDeleted(io, passwordId, deletedBy) {
  broadcastToAll(io, 'password_deleted', {
    passwordId,
    deletedBy,
    action: 'deleted'
  });

  systemLog('password_broadcast', {
    action: 'deleted',
    passwordId,
    deletedBy,
    connectedUsers: io.sockets.sockets.size
  });
}

/**
 * Handle conflict resolution for simultaneous edits
 * @param {Object} io - Socket.io server instance
 * @param {Object} conflictData - Conflict resolution data
 */
function handleConflictResolution(io, conflictData) {
  const { passwordId, userId1, userId2, changes1, changes2, timestamp1, timestamp2 } = conflictData;

  // Use last-write-wins strategy
  const winningChanges = timestamp2 > timestamp1 ? changes2 : changes1;
  const winningUser = timestamp2 > timestamp1 ? userId2 : userId1;
  const losingUser = timestamp2 > timestamp1 ? userId1 : userId2;

  // Notify all users about the conflict resolution
  broadcastToAll(io, 'conflict_resolved', {
    passwordId,
    winningChanges,
    winningUser,
    losingUser,
    resolution: 'last_write_wins',
    timestamp: new Date()
  });

  // Send specific notification to the losing user
  sendToUser(io, losingUser, 'edit_conflict_resolved', {
    passwordId,
    yourChanges: timestamp2 > timestamp1 ? changes1 : changes2,
    acceptedChanges: winningChanges,
    message: 'Your changes were overridden by a more recent edit'
  });

  systemLog('conflict_resolved', {
    passwordId,
    winningUser,
    losingUser,
    strategy: 'last_write_wins'
  });
}

/**
 * Handle user presence updates
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 * @param {Object} user - User data
 * @param {string} status - Presence status (online/offline)
 */
function handleUserPresence(io, socket, user, status) {
  if (status === 'online') {
    socket.broadcast.emit('user_online', {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      timestamp: new Date()
    });
  } else if (status === 'offline') {
    socket.broadcast.emit('user_offline', {
      userId: user.userId,
      timestamp: new Date()
    });
  }
}

/**
 * Clean up editing sessions for a user
 * @param {number} userId - User ID
 */
function cleanupUserEditingSessions(userId) {
  for (const [passwordId, editSession] of activeEdits.entries()) {
    if (editSession.user.userId === userId) {
      activeEdits.delete(passwordId);
    }
  }
}

/**
 * Clean up stale editing sessions (heartbeat timeout)
 */
function cleanupStaleEditingSessions() {
  const now = new Date();
  const timeout = 30000; // 30 seconds

  for (const [passwordId, editSession] of activeEdits.entries()) {
    if (now - editSession.lastHeartbeat > timeout) {
      activeEdits.delete(passwordId);
      systemLog('editing_session_timeout', {
        passwordId,
        userId: editSession.user.userId,
        duration: now - editSession.startedAt
      });
    }
  }
}

// Clean up stale sessions every 60 seconds
setInterval(cleanupStaleEditingSessions, 60000);

module.exports = {
  handleConnection,
  handleDisconnection,
  broadcastPasswordCreated,
  broadcastPasswordUpdate,
  broadcastPasswordDeleted,
  handleConflictResolution,
  handleUserPresence,
  cleanupUserEditingSessions
};
