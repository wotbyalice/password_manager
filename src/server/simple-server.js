/**
 * Working Modular Server
 * Gradually integrating modular architecture
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// Set environment variables for testing
process.env.NODE_ENV = 'development';
process.env.SKIP_DB_CONNECTION = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.MASTER_KEY_SALT = 'test-salt-for-encryption';
process.env.USE_SQLITE = 'true';
process.env.SQLITE_PATH = './data/test.db';

console.log('🚀 Starting WOT Password Manager with Modular Architecture...');

const app = express();
const PORT = 3000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../renderer')));

// Test basic functionality
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint hit');
  res.json({
    success: true,
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  });
});

// Test modular DI
app.get('/api/test-modular', async (req, res) => {
  try {
    console.log('🧪 Testing modular architecture...');

    // Test DI Container
    const DIContainer = require('./core/DIContainer');
    const { registerServices } = require('./core/ServiceFactories');

    const container = new DIContainer();
    registerServices(container);

    const logger = container.resolve('logger');
    const config = container.resolve('config');
    const eventBus = container.resolve('eventBus');

    console.log('✅ Modular services resolved successfully');

    res.json({
      success: true,
      message: 'Modular architecture is working!',
      services: {
        logger: !!logger,
        config: !!config,
        eventBus: !!eventBus
      },
      containerStats: container.getStats()
    });

  } catch (error) {
    console.error('❌ Modular test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test service decorators
app.get('/api/test-decorators', async (req, res) => {
  try {
    console.log('🎨 Testing service decorators...');

    const DIContainer = require('./core/DIContainer');
    const { registerServices } = require('./core/ServiceFactories');
    const DecoratorFactory = require('./decorators/DecoratorFactory');

    const container = new DIContainer();
    registerServices(container);

    const decoratorFactory = new DecoratorFactory(container);
    const factoryStats = decoratorFactory.getFactoryStats();

    console.log('✅ Service decorators working');

    res.json({
      success: true,
      message: 'Service decorators are working!',
      decoratorTypes: factoryStats.decoratorTypes,
      factoryStats
    });

  } catch (error) {
    console.error('❌ Decorator test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check with full modular status
app.get('/api/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested...');

    const DIContainer = require('./core/DIContainer');
    const { registerServices } = require('./core/ServiceFactories');

    const container = new DIContainer();
    registerServices(container);

    const passwordService = container.resolve('passwordService');
    const authService = container.resolve('authService');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      architecture: 'modular',
      services: {
        password: await passwordService.getHealthStatus(),
        auth: await authService.getHealthStatus()
      },
      container: container.getStats()
    };

    console.log('✅ Health check completed');
    res.json(health);

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add authentication routes for login functionality
console.log('🔐 Setting up authentication routes...');
const authRoutes = require('./auth/authRoutes');
const userRoutes = require('./users/userRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
console.log('✅ Authentication routes configured');

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
});

console.log('📦 Setting up server...');

app.listen(PORT, () => {
  console.log('\n🎉 ===== WOT PASSWORD MANAGER STARTED =====');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🏗️  Modular Test: http://localhost:${PORT}/api/test-modular`);
  console.log(`🎨 Decorators Test: http://localhost:${PORT}/api/test-decorators`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log('🏗️  Architecture: Modular (Testing Mode)');
  console.log('==========================================\n');
});

console.log('✅ Server setup complete');
