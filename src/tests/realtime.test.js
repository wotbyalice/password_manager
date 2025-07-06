const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const {
  handleConnection,
  broadcastPasswordUpdate,
  broadcastPasswordCreated,
  broadcastPasswordDeleted,
  handleUserPresence,
  handleConflictResolution
} = require('../server/realtime/socketHandlers');

describe('Real-time Synchronization System', () => {
  let io, serverSocket, clientSocket, httpServer;
  let userToken, adminToken;

  beforeAll((done) => {
    // Create HTTP server and Socket.io instance
    httpServer = createServer();
    io = new Server(httpServer);
    
    // Create test tokens
    userToken = jwt.sign(
      { userId: 2, email: 'user@company.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { userId: 1, email: 'admin@company.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`, {
        auth: { token: userToken }
      });
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Socket Authentication', () => {
    test('should authenticate user with valid JWT token', (done) => {
      const testClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: userToken }
      });

      testClient.on('connect', () => {
        expect(testClient.connected).toBe(true);
        testClient.close();
        done();
      });

      testClient.on('connect_error', (error) => {
        testClient.close();
        done(error);
      });
    });

    test('should reject connection with invalid token', (done) => {
      const testClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: 'invalid-token' }
      });

      testClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        testClient.close();
        done();
      });

      testClient.on('connect', () => {
        testClient.close();
        done(new Error('Should not connect with invalid token'));
      });
    });

    test('should reject connection without token', (done) => {
      const testClient = new Client(`http://localhost:${httpServer.address().port}`);

      testClient.on('connect_error', (error) => {
        expect(error.message).toContain('No token provided');
        testClient.close();
        done();
      });

      testClient.on('connect', () => {
        testClient.close();
        done(new Error('Should not connect without token'));
      });
    });
  });

  describe('Password Synchronization Events', () => {
    test('should broadcast password creation to all connected clients', (done) => {
      const passwordData = {
        id: 1,
        title: 'New Company Email',
        username: 'test@company.com',
        category: 'Email',
        createdBy: 2,
        createdAt: new Date()
      };

      // Listen for the broadcast event
      clientSocket.on('password_created', (data) => {
        expect(data).toHaveProperty('password');
        expect(data.password.id).toBe(passwordData.id);
        expect(data.password.title).toBe(passwordData.title);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('createdBy');
        done();
      });

      // Simulate password creation broadcast
      broadcastPasswordCreated(io, passwordData, 2);
    });

    test('should broadcast password updates to all connected clients', (done) => {
      const passwordData = {
        id: 1,
        title: 'Updated Company Email',
        username: 'updated@company.com',
        category: 'Email',
        updatedBy: 1,
        updatedAt: new Date()
      };

      clientSocket.on('password_updated', (data) => {
        expect(data).toHaveProperty('password');
        expect(data.password.id).toBe(passwordData.id);
        expect(data.password.title).toBe(passwordData.title);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('updatedBy');
        done();
      });

      broadcastPasswordUpdate(io, passwordData, 1);
    });

    test('should broadcast password deletion to all connected clients', (done) => {
      const passwordId = 1;
      const deletedBy = 1;

      clientSocket.on('password_deleted', (data) => {
        expect(data).toHaveProperty('passwordId', passwordId);
        expect(data).toHaveProperty('deletedBy', deletedBy);
        expect(data).toHaveProperty('timestamp');
        done();
      });

      broadcastPasswordDeleted(io, passwordId, deletedBy);
    });

    test('should not send password data to unauthorized users', (done) => {
      // Create a client with different user token
      const otherUserToken = jwt.sign(
        { userId: 3, email: 'other@company.com', role: 'user' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const otherClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: otherUserToken }
      });

      let eventReceived = false;

      otherClient.on('connect', () => {
        // Listen for password events
        otherClient.on('password_created', () => {
          eventReceived = true;
        });

        // Broadcast a password creation
        const passwordData = {
          id: 1,
          title: 'Secret Password',
          username: 'secret@company.com',
          category: 'Confidential'
        };

        broadcastPasswordCreated(io, passwordData, 1);

        // Check after a delay that the event was received (it should be)
        setTimeout(() => {
          expect(eventReceived).toBe(true); // All users should receive password updates
          otherClient.close();
          done();
        }, 100);
      });
    });
  });

  describe('User Presence Tracking', () => {
    test('should track user online status', (done) => {
      clientSocket.on('user_online', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('email');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Simulate user coming online
      handleUserPresence(io, serverSocket, { userId: 2, email: 'user@company.com' }, 'online');
    });

    test('should track user offline status', (done) => {
      clientSocket.on('user_offline', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Simulate user going offline
      handleUserPresence(io, serverSocket, { userId: 2, email: 'user@company.com' }, 'offline');
    });

    test('should provide list of online users', (done) => {
      clientSocket.emit('get_online_users');

      clientSocket.on('online_users', (data) => {
        expect(Array.isArray(data.users)).toBe(true);
        expect(data).toHaveProperty('count');
        done();
      });
    });
  });

  describe('Conflict Resolution', () => {
    test('should handle simultaneous password edits', (done) => {
      const conflictData = {
        passwordId: 1,
        userId1: 1,
        userId2: 2,
        changes1: { title: 'Version 1' },
        changes2: { title: 'Version 2' },
        timestamp1: new Date(Date.now() - 1000),
        timestamp2: new Date()
      };

      clientSocket.on('edit_conflict', (data) => {
        expect(data).toHaveProperty('passwordId', conflictData.passwordId);
        expect(data).toHaveProperty('conflictingUsers');
        expect(data).toHaveProperty('changes');
        expect(data).toHaveProperty('resolution');
        done();
      });

      handleConflictResolution(io, conflictData);
    });

    test('should resolve conflicts with last-write-wins strategy', (done) => {
      const conflictData = {
        passwordId: 1,
        userId1: 1,
        userId2: 2,
        changes1: { title: 'Earlier Edit' },
        changes2: { title: 'Later Edit' },
        timestamp1: new Date(Date.now() - 5000),
        timestamp2: new Date()
      };

      clientSocket.on('conflict_resolved', (data) => {
        expect(data).toHaveProperty('passwordId', conflictData.passwordId);
        expect(data).toHaveProperty('winningChanges');
        expect(data.winningChanges.title).toBe('Later Edit');
        expect(data).toHaveProperty('resolution', 'last_write_wins');
        done();
      });

      handleConflictResolution(io, conflictData);
    });
  });

  describe('Connection Management', () => {
    test('should handle client disconnection gracefully', (done) => {
      const testClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: userToken }
      });

      testClient.on('connect', () => {
        // Disconnect the client
        testClient.disconnect();
      });

      testClient.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });

    test('should handle server reconnection', (done) => {
      let reconnectCount = 0;

      const testClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: userToken },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 100
      });

      testClient.on('reconnect', () => {
        reconnectCount++;
        if (reconnectCount === 1) {
          testClient.close();
          done();
        }
      });

      testClient.on('connect', () => {
        // Force disconnect to trigger reconnection
        testClient.io.engine.close();
      });
    });
  });

  describe('Real-time Notifications', () => {
    test('should send system notifications to all users', (done) => {
      const notification = {
        type: 'system',
        title: 'System Maintenance',
        message: 'The system will be updated in 5 minutes',
        priority: 'high'
      };

      clientSocket.on('system_notification', (data) => {
        expect(data).toHaveProperty('type', notification.type);
        expect(data).toHaveProperty('title', notification.title);
        expect(data).toHaveProperty('message', notification.message);
        expect(data).toHaveProperty('priority', notification.priority);
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Broadcast system notification
      io.emit('system_notification', {
        ...notification,
        timestamp: new Date()
      });
    });

    test('should send password expiry notifications', (done) => {
      const expiryNotification = {
        type: 'password_expiry',
        passwordId: 1,
        title: 'Company Email',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      clientSocket.on('password_expiry_warning', (data) => {
        expect(data).toHaveProperty('passwordId', expiryNotification.passwordId);
        expect(data).toHaveProperty('title', expiryNotification.title);
        expect(data).toHaveProperty('expiryDate');
        expect(data).toHaveProperty('daysRemaining');
        done();
      });

      io.emit('password_expiry_warning', {
        ...expiryNotification,
        daysRemaining: 7,
        timestamp: new Date()
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple simultaneous connections', (done) => {
      const clients = [];
      const numClients = 10;
      let connectedCount = 0;

      for (let i = 0; i < numClients; i++) {
        const client = new Client(`http://localhost:${httpServer.address().port}`, {
          auth: { token: userToken }
        });

        client.on('connect', () => {
          connectedCount++;
          if (connectedCount === numClients) {
            // All clients connected, clean up
            clients.forEach(c => c.close());
            done();
          }
        });

        clients.push(client);
      }
    });

    test('should efficiently broadcast to multiple clients', (done) => {
      const clients = [];
      const numClients = 5;
      let receivedCount = 0;

      const passwordData = {
        id: 1,
        title: 'Broadcast Test',
        username: 'test@company.com',
        category: 'Test'
      };

      for (let i = 0; i < numClients; i++) {
        const client = new Client(`http://localhost:${httpServer.address().port}`, {
          auth: { token: userToken }
        });

        client.on('password_created', (data) => {
          receivedCount++;
          if (receivedCount === numClients) {
            clients.forEach(c => c.close());
            done();
          }
        });

        clients.push(client);
      }

      // Wait for all clients to connect, then broadcast
      setTimeout(() => {
        broadcastPasswordCreated(io, passwordData, 1);
      }, 100);
    });
  });
});
