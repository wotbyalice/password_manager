const app = require('./app');
const { testConnection } = require('./database/connection');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, closing server...');
      
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
