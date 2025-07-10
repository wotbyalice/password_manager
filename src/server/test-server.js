/**
 * Simple Test Server
 * Basic server to test if the modular architecture works
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Simple Test Server...');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test server is working!',
    timestamp: new Date().toISOString()
  });
});

// Test modular DI
app.get('/api/test-modular', async (req, res) => {
  try {
    console.log('Testing modular architecture...');
    
    // Test DI Container
    const DIContainer = require('./core/DIContainer');
    const { registerServices } = require('./core/ServiceFactories');
    
    const container = new DIContainer();
    registerServices(container);
    
    const logger = container.resolve('logger');
    const config = container.resolve('config');
    
    logger.info('Modular test successful');
    
    res.json({
      success: true,
      message: 'Modular architecture is working!',
      services: {
        logger: !!logger,
        config: !!config
      },
      containerStats: container.getStats()
    });
    
  } catch (error) {
    console.error('Modular test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  } else {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n🎉 ===== TEST SERVER STARTED =====`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🏗️  Modular Test: http://localhost:${PORT}/api/test-modular`);
  console.log(`================================\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    console.log('✅ Test server shut down successfully');
    process.exit(0);
  });
});

module.exports = server;
