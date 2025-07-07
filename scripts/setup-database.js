#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates the database schema and initial admin user
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'password_manager',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

// Admin user configuration
const adminConfig = {
  firstName: process.env.ADMIN_FIRST_NAME || 'System',
  lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
  email: process.env.ADMIN_EMAIL || 'admin@company.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!@#'
};

/**
 * Create database schema
 */
async function createSchema(client) {
  console.log('Creating database schema...');

  // Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create categories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#6366f1',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create password_entries table
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_entries (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      password_encrypted TEXT NOT NULL,
      url TEXT,
      notes TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create audit_logs table
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100),
      resource_id INTEGER,
      success BOOLEAN DEFAULT true,
      ip_address INET,
      user_agent TEXT,
      metadata JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for better performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_password_entries_created_by ON password_entries(created_by);
    CREATE INDEX IF NOT EXISTS idx_password_entries_category ON password_entries(category_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  `);

  // Create updated_at trigger function
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers for updated_at
  await client.query(`
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_password_entries_updated_at ON password_entries;
    CREATE TRIGGER update_password_entries_updated_at
      BEFORE UPDATE ON password_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  console.log('✅ Database schema created successfully');
}

/**
 * Create default categories
 */
async function createDefaultCategories(client, adminId) {
  console.log('Creating default categories...');

  const categories = [
    { name: 'Email', description: 'Email accounts and services', color: '#ef4444' },
    { name: 'Social Media', description: 'Social networking platforms', color: '#8b5cf6' },
    { name: 'Banking', description: 'Financial and banking services', color: '#059669' },
    { name: 'Work', description: 'Work-related accounts and tools', color: '#0ea5e9' },
    { name: 'WiFi', description: 'WiFi networks and passwords', color: '#f59e0b' },
    { name: 'Servers', description: 'Server and infrastructure access', color: '#6366f1' },
    { name: 'Software', description: 'Software licenses and accounts', color: '#ec4899' }
  ];

  for (const category of categories) {
    await client.query(`
      INSERT INTO categories (name, description, color, created_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO NOTHING
    `, [category.name, category.description, category.color, adminId]);
  }

  console.log('✅ Default categories created successfully');
}

/**
 * Create admin user
 */
async function createAdminUser(client) {
  console.log('Creating admin user...');

  // Check if admin user already exists
  const existingAdmin = await client.query(
    'SELECT id FROM users WHERE email = $1',
    [adminConfig.email]
  );

  if (existingAdmin.rows.length > 0) {
    console.log('⚠️  Admin user already exists, skipping creation');
    return existingAdmin.rows[0].id;
  }

  // Hash the admin password
  const passwordHash = await bcrypt.hash(adminConfig.password, 12);

  // Create admin user
  const result = await client.query(`
    INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, 'admin', true)
    RETURNING id
  `, [adminConfig.firstName, adminConfig.lastName, adminConfig.email, passwordHash]);

  const adminId = result.rows[0].id;

  // Log admin creation
  await client.query(`
    INSERT INTO audit_logs (user_id, action, resource, success, metadata)
    VALUES ($1, 'user_created', 'user', true, $2)
  `, [adminId, JSON.stringify({ role: 'admin', created_by: 'system' })]);

  console.log('✅ Admin user created successfully');
  console.log(`📧 Email: ${adminConfig.email}`);
  console.log(`🔑 Password: ${adminConfig.password}`);
  console.log('⚠️  Please change the admin password after first login!');

  return adminId;
}

/**
 * Create sample data for testing
 */
async function createSampleData(client, adminId) {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Skipping sample data creation in production');
    return;
  }

  console.log('Creating sample data for testing...');

  // Get WiFi category
  const wifiCategory = await client.query(
    'SELECT id FROM categories WHERE name = $1',
    ['WiFi']
  );

  if (wifiCategory.rows.length > 0) {
    const categoryId = wifiCategory.rows[0].id;

    // Create sample WiFi password
    const samplePassword = 'OfficeWiFi2024!';
    const encryptedPassword = crypto.createHash('sha256')
      .update(samplePassword + process.env.ENCRYPTION_KEY || 'default-key')
      .digest('hex');

    await client.query(`
      INSERT INTO password_entries (title, username, password_encrypted, url, notes, category_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `, [
      'Office WiFi',
      'office-network',
      encryptedPassword,
      null,
      'Main office WiFi network password',
      categoryId,
      adminId
    ]);

    console.log('✅ Sample data created successfully');
  }
}

/**
 * Main setup function
 */
async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log(`📍 Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create schema
    await createSchema(client);

    // Create admin user
    const adminId = await createAdminUser(client);

    // Create default categories
    await createDefaultCategories(client, adminId);

    // Create sample data (only in development)
    await createSampleData(client, adminId);

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the server: npm run server');
    console.log('2. Start the Electron app: npm start');
    console.log('3. Login with the admin credentials shown above');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check your database credentials in .env file');
    console.error('3. Ensure the database exists or create it manually');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
