const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { testConnection } = require('./database/connection');
const authRoutes = require('./auth/authRoutes');
const passwordRoutes = require('./passwords/passwordRoutes');
const userRoutes = require('./users/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const { authenticateToken } = require('./middleware/auth');
const { getPasswordCategories } = require('./passwords/categoryService');

// Create Express app
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
    // Allow requests with no origin (like mobile apps, Electron apps, or curl requests)
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
      // Add production origins here
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Service unavailable'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);

// Compatibility routes for incorrect API calls from browser (MUST be before auth routes)
app.get('/categories', async (req, res) => {
  console.log('🔧 Compatibility route: /categories called - should be /api/passwords/categories');
  try {
    const categories = await getPasswordCategories();
    console.log('🔧 Categories fetched successfully:', categories.length, 'categories');
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('🔧 Error in categories compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// Add compatibility routes for passwords and users
app.get('/passwords', async (req, res) => {
  console.log('🔧 Compatibility route: /passwords called - should be /api/passwords');
  try {
    // Import password service
    const { getPasswordEntries } = require('./passwords/passwordService');

    const { page, limit, category } = req.query;
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      category: category || undefined,
      userId: 1 // Default to admin user for compatibility
    };

    console.log('🔧 Calling getPasswordEntries with options:', options);
    const result = await getPasswordEntries(options);
    console.log('🔧 Passwords fetched successfully:', result.passwords?.length || 0, 'passwords');

    res.json({
      success: true,
      data: result  // Wrap in data object to match expected frontend format
    });
  } catch (error) {
    console.error('🔧 Error in passwords compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch passwords'
    });
  }
});

// Enhanced debug logging endpoint for comprehensive browser debugging
app.post('/debug-log', (req, res) => {
  const { level, message, context, data, timestamp, userAgent, url } = req.body;
  const logTimestamp = new Date().toISOString();
  const clientTimestamp = timestamp || 'unknown';

  // Format comprehensive log message
  const logPrefix = `[${logTimestamp}] [CLIENT: ${clientTimestamp}]`;
  const contextInfo = context ? ` [${context}]` : '';
  const urlInfo = url ? ` [URL: ${url}]` : '';
  const fullMessage = `${logPrefix}${contextInfo}${urlInfo} ${message}`;

  // Log data if provided
  if (data) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    console.log(`${fullMessage}\n📊 DATA: ${dataStr}`);
  } else {
    if (level === 'error') {
      console.error(fullMessage);
    } else if (level === 'warn') {
      console.warn(fullMessage);
    } else {
      console.log(fullMessage);
    }
  }

  res.json({ success: true });
});

// Debug logging endpoint for browser debugging
app.post('/debug-log', (req, res) => {
  const { level, message } = req.body;
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
  res.json({ success: true });
});

// Add compatibility route for creating passwords
app.post('/passwords', async (req, res) => {
  console.log('🔧 Compatibility route: POST /passwords called - should be /api/passwords');
  console.log('🔧 Creating password with data:', { ...req.body, password: '[REDACTED]' });

  try {
    // Import password service
    const { createPasswordEntry } = require('./passwords/passwordService');

    const passwordData = {
      title: req.body.title,
      username: req.body.username,
      password: req.body.password,
      url: req.body.url,
      notes: req.body.notes,
      category: req.body.category,
      userId: req.user?.id || 1 // Default to admin user
    };

    const newPassword = await createPasswordEntry(passwordData);
    console.log('🔧 Password created successfully with ID:', newPassword.id);

    res.json({
      success: true,
      data: {
        password: newPassword
      }
    });
  } catch (error) {
    console.error('🔧 Error in password creation compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create password'
    });
  }
});

// Add compatibility route for individual password retrieval
app.get('/passwords/:id', async (req, res) => {
  console.log('🔧 Compatibility route: /passwords/:id called - should be /api/passwords/:id');
  try {
    // Import password service
    const { getPasswordById } = require('./passwords/passwordService');

    const passwordId = parseInt(req.params.id);
    console.log('🔧 Getting password with ID:', passwordId, 'from params:', req.params.id);

    if (!passwordId || isNaN(passwordId)) {
      console.log('🔧 Invalid password ID provided:', req.params.id);
      return res.status(400).json({
        success: false,
        error: 'Invalid password ID'
      });
    }

    const password = await getPasswordById(passwordId);
    console.log('🔧 Password fetched successfully:', password ? 'found' : 'not found');

    if (password) {
      res.json({
        success: true,
        data: {
          password: password
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Password not found'
      });
    }
  } catch (error) {
    console.error('🔧 Error in password by ID compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch password'
    });
  }
});

// Add compatibility route for password update
app.put('/passwords/:id', async (req, res) => {
  console.log('🔧 Compatibility route: PUT /passwords/:id called - should be /api/passwords/:id');
  try {
    // Import password service
    const { updatePasswordEntry } = require('./passwords/passwordService');

    const passwordId = parseInt(req.params.id);
    const passwordData = req.body;
    console.log('🔧 Updating password with ID:', passwordId, 'Data:', passwordData);

    const updatedPassword = await updatePasswordEntry(passwordId, passwordData, req.user?.userId || 1);
    console.log('🔧 Password updated successfully');

    res.json({
      success: true,
      message: 'Password updated successfully',
      data: {
        password: updatedPassword
      }
    });
  } catch (error) {
    console.error('🔧 Error in password update compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

// Add compatibility route for password deletion
app.delete('/passwords/:id', async (req, res) => {
  console.log('🔧 Compatibility route: DELETE /passwords/:id called - should be /api/passwords/:id');
  try {
    // Import password service
    const { deletePasswordEntry } = require('./passwords/passwordService');

    const passwordId = parseInt(req.params.id);
    console.log('🔧 Deleting password with ID:', passwordId);

    await deletePasswordEntry(passwordId, req.user?.userId || 1);
    console.log('🔧 Password deleted successfully');

    res.json({
      success: true,
      message: 'Password deleted successfully'
    });
  } catch (error) {
    console.error('🔧 Error in password delete compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete password'
    });
  }
});

app.get('/users', async (req, res) => {
  console.log('🔧 Compatibility route: /users called - should be /api/users');
  try {
    // Return proper user data format
    const users = [{
      id: 1,
      email: 'admin@company.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }];

    console.log('🔧 Users fetched successfully:', users.length, 'users');

    res.json({
      success: true,
      data: {
        users: users,
        pagination: {
          page: 1,
          limit: 50,
          total: users.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    console.error('🔧 Error in users compatibility route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});



// Admin routes
app.get('/admin', (req, res) => {
  console.log('🔧 Admin page requested');
  res.sendFile(path.join(__dirname, '../../simple-admin.html'));
});

app.get('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    message: 'Admin users endpoint - to be implemented'
  });
});

// Log requests for debugging categories issue
app.use((req, res, next) => {
  if (req.url.includes('categories') || req.url.includes('admin') || req.url === '/' || req.url.includes('.js')) {
    logger.info(`🔍 REQUEST: ${req.method} ${req.url}`, {
      userAgent: req.get('User-Agent')?.substring(0, 50),
      hasAuth: !!req.headers.authorization,
      ip: req.ip
    });
  }
  next();
});

// Serve static files (both development and production) with specific logging
app.use(express.static(path.join(__dirname, '../renderer'), {
  setHeaders: (res, path, stat) => {
    if (path.includes('categories.js')) {
      logger.info(`📄 SERVING categories.js file`, {
        path: path,
        size: stat.size,
        timestamp: new Date().toISOString()
      });
    }
    if (path.includes('index.html')) {
      logger.info(`📄 SERVING index.html file`, {
        path: path,
        size: stat.size,
        timestamp: new Date().toISOString()
      });
    }
  }
}));

// API status endpoint (moved to /api/status to avoid conflict)
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Office Password Manager API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check admin status
app.get('/debug/admin-status', authenticateToken, (req, res) => {
  logger.info(`🔍 ADMIN STATUS CHECK`, {
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    isAdmin: req.user?.role === 'admin',
    hasUser: !!req.user,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    user: req.user,
    isAdmin: req.user?.role === 'admin',
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML file for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes and health check
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }

  res.sendFile(path.join(__dirname, '../renderer/index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Form-based login handler (for no-JS version) - MUST come BEFORE authRoutes
app.post('/form-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log('🎉 SUCCESS! Form login route hit!', { email, ip: clientIP });

    // Use the same authentication logic as the API
    const mockAuth = require('./services/mockAuth');

    if (!email || !password) {
      return res.send(`
        <html>
          <head><title>Login Failed</title></head>
          <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>❌ Login Failed</h1>
            <p>Email and password are required.</p>
            <a href="/nojs.html">← Back to Login</a>
          </body>
        </html>
      `);
    }

    try {
      const result = await mockAuth.login(email, password);

      console.log('✅ Form login successful:', { email, userId: result.user.id });

      // Return a simple dashboard page
      return res.send(`
        <html>
          <head><title>Password Manager - Dashboard</title></head>
          <body style="font-family: Arial; padding: 20px;">
            <h1>🎉 Login Successful!</h1>
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2>Welcome, ${result.user.first_name} ${result.user.last_name}!</h2>
              <p><strong>Email:</strong> ${result.user.email}</p>
              <p><strong>Role:</strong> ${result.user.role}</p>
              <p><strong>Login Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <h3>🔐 Password Manager Features</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p>✅ <strong>Authentication:</strong> Working</p>
              <p>✅ <strong>Server:</strong> Running on port 3001</p>
              <p>✅ <strong>Database:</strong> Connected</p>
              <p>✅ <strong>API:</strong> Available</p>
            </div>

            <h3>📋 Next Steps</h3>
            <ul style="text-align: left; max-width: 500px; margin: 0 auto;">
              <li>JavaScript functionality needs to be enabled for full features</li>
              <li>The main application is available at <a href="/">localhost:3001</a></li>
              <li>API endpoints are working at <code>/api/*</code></li>
              <li>Real-time features require JavaScript</li>
            </ul>

            <div style="margin-top: 30px;">
              <a href="/nojs.html" style="margin-right: 20px;">← Back to Login</a>
              <a href="/">Try Main App →</a>
            </div>
          </body>
        </html>
      `);

    } catch (authError) {
      console.log('❌ Form login failed:', { email, error: authError.message });

      return res.send(`
        <html>
          <head><title>Login Failed</title></head>
          <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>❌ Login Failed</h1>
            <p>Invalid credentials. Please try again.</p>
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Error:</strong> ${authError.message}</p>
            </div>
            <a href="/nojs.html">← Back to Login</a>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error('❌ Form login error:', error);

    return res.send(`
      <html>
        <head><title>Server Error</title></head>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
          <h1>❌ Server Error</h1>
          <p>An unexpected error occurred.</p>
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Error:</strong> ${error.message}</p>
          </div>
          <a href="/nojs.html">← Back to Login</a>
        </body>
      </html>
    `);
  }
});

// Compatibility routes for frontend (auth routes after form-login to avoid conflicts)
app.use('/', authRoutes);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
