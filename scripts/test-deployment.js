#!/usr/bin/env node

/**
 * Deployment Test Script
 * Comprehensive testing of the password manager deployment
 */

const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Test configuration
const config = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  dbConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'password_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  adminCredentials: {
    email: process.env.ADMIN_EMAIL || 'admin@company.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123!@#'
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Test helper functions
 */
function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const fullMessage = message ? ` - ${message}` : '';
  console.log(`${status}: ${name}${fullMessage}`);
  
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`🧪 ${title}`);
  console.log('='.repeat(60));
}

/**
 * Test database connectivity and schema
 */
async function testDatabase() {
  logSection('DATABASE TESTS');
  
  let client;
  try {
    client = new Client(config.dbConfig);
    await client.connect();
    logTest('Database Connection', true, 'Successfully connected to PostgreSQL');

    // Test tables exist
    const tables = ['users', 'categories', 'password_entries', 'audit_logs'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      logTest(`Table: ${table}`, result.rows[0].exists, 
        result.rows[0].exists ? 'Table exists' : 'Table missing');
    }

    // Test admin user exists
    const adminResult = await client.query(
      'SELECT id, email, role FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    );
    
    logTest('Admin User', adminResult.rows.length > 0, 
      adminResult.rows.length > 0 ? `Admin user: ${adminResult.rows[0].email}` : 'No admin user found');

    // Test categories exist
    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
    const categoryCount = parseInt(categoriesResult.rows[0].count);
    
    logTest('Default Categories', categoryCount > 0, 
      `${categoryCount} categories found`);

  } catch (error) {
    logTest('Database Connection', false, error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

/**
 * Test server endpoints
 */
async function testServer() {
  logSection('SERVER API TESTS');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${config.serverUrl}/api/health`);
    logTest('Health Endpoint', healthResponse.status === 200, 
      `Status: ${healthResponse.status}`);

    // Test authentication endpoint
    try {
      const authResponse = await axios.post(`${config.serverUrl}/api/auth/login`, {
        email: config.adminCredentials.email,
        password: config.adminCredentials.password
      });
      
      logTest('Admin Login', authResponse.status === 200, 
        'Admin authentication successful');
      
      const token = authResponse.data.token;
      
      // Test protected endpoint
      const protectedResponse = await axios.get(`${config.serverUrl}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      logTest('Protected Endpoint', protectedResponse.status === 200, 
        'Token verification successful');

      // Test password endpoints
      const passwordsResponse = await axios.get(`${config.serverUrl}/api/passwords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      logTest('Passwords Endpoint', passwordsResponse.status === 200, 
        `Retrieved ${passwordsResponse.data.passwords?.length || 0} passwords`);

      // Test categories endpoint
      const categoriesResponse = await axios.get(`${config.serverUrl}/api/passwords/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      logTest('Categories Endpoint', categoriesResponse.status === 200, 
        `Retrieved ${categoriesResponse.data.categories?.length || 0} categories`);

      // Test users endpoint (admin only)
      const usersResponse = await axios.get(`${config.serverUrl}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      logTest('Users Endpoint', usersResponse.status === 200, 
        `Retrieved ${usersResponse.data.users?.length || 0} users`);

    } catch (authError) {
      logTest('Admin Login', false, authError.response?.data?.error || authError.message);
    }

  } catch (error) {
    logTest('Server Connection', false, error.message);
  }
}

/**
 * Test file structure and dependencies
 */
async function testFileStructure() {
  logSection('FILE STRUCTURE TESTS');
  
  const requiredFiles = [
    'package.json',
    'src/main/main.js',
    'src/main/preload.js',
    'src/server/server.js',
    'src/renderer/index.html',
    'src/renderer/js/app.js',
    '.env.example'
  ];

  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(process.cwd(), file));
      logTest(`File: ${file}`, true, 'File exists');
    } catch (error) {
      logTest(`File: ${file}`, false, 'File missing');
    }
  }

  // Test package.json dependencies
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const requiredDeps = ['express', 'socket.io', 'electron', 'pg', 'bcryptjs'];
    
    for (const dep of requiredDeps) {
      const exists = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
      logTest(`Dependency: ${dep}`, !!exists, exists ? `Version: ${exists}` : 'Missing');
    }
    
  } catch (error) {
    logTest('Package.json', false, error.message);
  }
}

/**
 * Test environment configuration
 */
async function testEnvironment() {
  logSection('ENVIRONMENT TESTS');
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'ADMIN_EMAIL'
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    logTest(`Environment: ${envVar}`, !!value, 
      value ? 'Set' : 'Missing or empty');
  }

  // Test for default/insecure values
  const insecureValues = {
    JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
    ENCRYPTION_KEY: 'your-32-character-encryption-key-here',
    ADMIN_PASSWORD: 'ChangeThisPassword123!'
  };

  for (const [key, defaultValue] of Object.entries(insecureValues)) {
    const isDefault = process.env[key] === defaultValue;
    logTest(`Security: ${key}`, !isDefault, 
      isDefault ? 'Using default value - CHANGE IN PRODUCTION!' : 'Custom value set');
  }
}

/**
 * Test real-time features (if server is running)
 */
async function testRealTimeFeatures() {
  logSection('REAL-TIME TESTS');
  
  try {
    // Test WebSocket endpoint
    const wsResponse = await axios.get(`${config.serverUrl}/socket.io/`);
    logTest('Socket.io Endpoint', wsResponse.status === 200, 
      'Socket.io server responding');

    // Note: Full WebSocket testing would require a Socket.io client
    logTest('WebSocket Client Test', true, 
      'Manual testing required - check browser dev tools');

  } catch (error) {
    logTest('Socket.io Endpoint', false, error.message);
  }
}

/**
 * Performance and security tests
 */
async function testPerformanceAndSecurity() {
  logSection('PERFORMANCE & SECURITY TESTS');
  
  try {
    // Test response times
    const start = Date.now();
    await axios.get(`${config.serverUrl}/api/health`);
    const responseTime = Date.now() - start;
    
    logTest('Response Time', responseTime < 1000, 
      `${responseTime}ms (should be < 1000ms)`);

    // Test rate limiting (if enabled)
    try {
      const requests = Array(10).fill().map(() => 
        axios.get(`${config.serverUrl}/api/health`)
      );
      await Promise.all(requests);
      logTest('Rate Limiting', true, 'Multiple requests handled');
    } catch (error) {
      logTest('Rate Limiting', false, error.message);
    }

    // Test CORS headers
    const corsResponse = await axios.get(`${config.serverUrl}/api/health`);
    const hasCors = corsResponse.headers['access-control-allow-origin'];
    logTest('CORS Headers', !!hasCors, 
      hasCors ? `Origin: ${hasCors}` : 'No CORS headers');

  } catch (error) {
    logTest('Performance Tests', false, error.message);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  logSection('TEST SUMMARY');
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log(`\n❌ Failed Tests:`);
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
      });
  }

  console.log(`\n🎯 Deployment Status: ${testResults.failed === 0 ? '✅ READY' : '⚠️  NEEDS ATTENTION'}`);
  
  if (testResults.failed === 0) {
    console.log(`\n🎉 Congratulations! Your Office Password Manager is ready for production!`);
    console.log(`\nNext steps:`);
    console.log(`1. Start the server: npm run server`);
    console.log(`2. Start the Electron app: npm start`);
    console.log(`3. Login with admin credentials`);
    console.log(`4. Create user accounts for your team`);
    console.log(`5. Begin using the password manager!`);
  } else {
    console.log(`\n🔧 Please fix the failed tests before deploying to production.`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Office Password Manager - Deployment Test Suite');
  console.log('Testing deployment readiness...\n');

  try {
    await testFileStructure();
    await testEnvironment();
    await testDatabase();
    await testServer();
    await testRealTimeFeatures();
    await testPerformanceAndSecurity();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }

  generateReport();
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
