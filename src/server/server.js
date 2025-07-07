const { createServer } = require('http');
const app = require('./app');
const { testConnection } = require('./database/connection');
const { initializeSocketServer, shutdownSocketServer } = require('./realtime/socketServer');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test database connection (skip if testing)
    if (process.env.SKIP_DB_CONNECTION !== 'true') {
      logger.info('Testing database connection...');
      const dbConnected = await testConnection();

      if (!dbConnected) {
        logger.error('Failed to connect to database. Exiting...');
        process.exit(1);
      }
    } else {
      logger.info('Skipping database connection for testing...');
    }

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    const io = initializeSocketServer(httpServer);

    // Make io available to the app
    app.set('io', io);

    // Start server
    const server = httpServer.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        features: ['HTTP API', 'Socket.io Real-time', 'Authentication', 'Password Management']
      });
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, closing server...');

      // Shutdown Socket.io first
      shutdownSocketServer(io);

      server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
