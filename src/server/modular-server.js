/**
 * Modular Server Entry Point
 * Uses the complete modular architecture with DI, Events, Interfaces, and Decorators
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createServer } = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import modular architecture
const DIContainer = require('./core/DIContainer');
const { registerServices } = require('./core/ServiceFactories');
const RouteFactory = require('./routes/RouteFactory');
const DecoratorFactory = require('./decorators/DecoratorFactory');
const RealtimeService = require('./services/RealtimeService');

const PORT = process.env.PORT || 3000;

async function startModularServer() {
  try {
    console.log('🚀 Starting WOT Password Manager with Modular Architecture...');

    // Phase 1: Initialize Dependency Injection Container
    console.log('📦 Phase 1: Initializing DI Container...');
    const container = new DIContainer();
    registerServices(container);

    // Resolve core services
    const logger = container.resolve('logger');
    const config = container.resolve('config');
    const database = container.resolve('database');
    const eventBus = container.resolve('eventBus');

    logger.info('DI Container initialized with all services');

    // Phase 2: Test Database Connection
    console.log('🗄️  Phase 2: Testing Database Connection...');
    if (process.env.SKIP_DB_CONNECTION !== 'true') {
      try {
        await database.testConnection();
        logger.info('Database connection successful');
      } catch (error) {
        logger.error('Database connection failed:', error);
        console.error('❌ Database connection failed. Please check your configuration.');
        process.exit(1);
      }
    } else {
      logger.info('Skipping database connection for testing');
    }

    // Phase 3: Initialize Service Decorators
    console.log('🎨 Phase 3: Setting up Service Decorators...');
    const decoratorFactory = new DecoratorFactory(container);
    
    // Apply decorators to services
    decoratorFactory.applyDefaultDecorators('passwordService', 'read-heavy');
    decoratorFactory.applyDefaultDecorators('authService', 'critical');
    decoratorFactory.applyDefaultDecorators('categoryService', 'basic');

    logger.info('Service decorators applied successfully');

    // Phase 4: Create Express Application
    console.log('🌐 Phase 4: Creating Express Application...');
    const app = express();

    // Trust proxy for accurate IP addresses
    app.set('trust proxy', 1);

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'file://'
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for development
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };

    app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later'
      }
    });
    app.use(limiter);

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Phase 5: Set up Modular Routes
    console.log('🛣️  Phase 5: Setting up Modular Routes...');
    const routeFactory = new RouteFactory(container);

    // Create routes with full dependency injection
    const passwordRoutes = routeFactory.createPasswordRoutes();
    
    // Mount routes
    app.use('/api/passwords', passwordRoutes);

    // Legacy auth routes (to be modularized later)
    const authRoutes = require('./auth/authRoutes');
    const userRoutes = require('./users/userRoutes');
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);

    // Health check endpoint
    app.get('/api/health', async (req, res) => {
      try {
        const passwordService = container.resolve('passwordService');
        const authService = container.resolve('authService');
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            password: await passwordService.getHealthStatus(),
            auth: await authService.getHealthStatus(),
            database: await database.testConnection() ? 'healthy' : 'unhealthy'
          },
          decorators: decoratorFactory.getAllDecoratorStats(),
          container: container.getStats()
        };

        res.json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Serve static files
    app.use(express.static(path.join(__dirname, '../client')));

    // Serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '../client/index.html'));
      } else {
        res.status(404).json({ success: false, error: 'API endpoint not found' });
      }
    });

    // Phase 6: Initialize Real-time System
    console.log('⚡ Phase 6: Initializing Real-time System...');
    const httpServer = createServer(app);
    
    // Initialize Socket.IO
    const io = socketIo(httpServer, {
      cors: corsOptions,
      transports: ['websocket', 'polling']
    });

    // Initialize real-time service with event integration
    const realtimeService = container.resolve('realtimeService');
    realtimeService.initialize(io);

    logger.info('Real-time system initialized with event integration');

    // Phase 7: Start Server
    console.log('🚀 Phase 7: Starting Server...');
    const server = httpServer.listen(PORT, () => {
      console.log('\n🎉 ===== WOT PASSWORD MANAGER STARTED =====');
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
      console.log('🏗️  Architecture: Fully Modular');
      console.log('📦 DI Container: Active');
      console.log('🎨 Service Decorators: Applied');
      console.log('⚡ Event-Driven: Enabled');
      console.log('🔌 Real-time: WebSocket Ready');
      console.log('==========================================\n');

      logger.info('Modular server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        architecture: 'modular',
        features: [
          'Dependency Injection',
          'Event-Driven Architecture', 
          'Service Interfaces',
          'Service Decorators',
          'Real-time Updates',
          'Performance Monitoring',
          'Intelligent Caching'
        ]
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      
      try {
        await realtimeService.dispose();
        await container.dispose();
        server.close(() => {
          console.log('✅ Server shut down successfully');
          process.exit(0);
        });
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      
      try {
        await realtimeService.dispose();
        await container.dispose();
        server.close(() => {
          console.log('✅ Server shut down successfully');
          process.exit(0);
        });
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start modular server:', error);
    process.exit(1);
  }
}

// Start the modular server
if (require.main === module) {
  startModularServer();
}

module.exports = { startModularServer };
