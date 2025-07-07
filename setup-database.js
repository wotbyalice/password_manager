#!/usr/bin/env node

/**
 * Database Setup Script for Office Password Manager
 * This script sets up the database schema and creates the initial admin user
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function setupDatabase() {
  log('\n🚀 Office Password Manager - Database Setup', colors.cyan + colors.bright);
  log('=' .repeat(50), colors.cyan);

  // Check for required environment variables
  const requiredVars = ['DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`❌ Missing required environment variables: ${missingVars.join(', ')}`, colors.red);
    log('\n📝 Please update your .env file with the database connection details:', colors.yellow);
    log('   DATABASE_URL=postgresql://username:password@host:port/database', colors.yellow);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    log('\n🔌 Testing database connection...', colors.blue);
    await pool.query('SELECT NOW()');
    log('✅ Database connection successful!', colors.green);

    // Read and execute schema
    log('\n📋 Setting up database schema...', colors.blue);
    const schemaPath = path.join(__dirname, 'src', 'server', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    log('✅ Database schema created successfully!', colors.green);

    // Create admin user with hashed password
    log('\n👤 Setting up admin user...', colors.blue);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'Administrator';

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role) 
      VALUES ($1, $2, $3, $4, 'admin')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW()
    `, [adminEmail, hashedPassword, adminFirstName, adminLastName]);

    log('✅ Admin user created successfully!', colors.green);

    // Display setup summary
    log('\n🎉 Database setup completed successfully!', colors.green + colors.bright);
    log('=' .repeat(50), colors.green);
    log('\n📊 Setup Summary:', colors.cyan);
    log(`   📧 Admin Email: ${adminEmail}`, colors.yellow);
    log(`   🔑 Admin Password: ${adminPassword}`, colors.yellow);
    log(`   🌐 Database: Connected and ready`, colors.green);
    log(`   📋 Schema: All tables created`, colors.green);
    log(`   👥 Users: Admin user ready`, colors.green);

    log('\n⚠️  IMPORTANT SECURITY NOTES:', colors.red + colors.bright);
    log('   1. Change the admin password immediately after first login', colors.red);
    log('   2. Update JWT_SECRET and ENCRYPTION_KEY in .env file', colors.red);
    log('   3. Set strong passwords for production use', colors.red);

    log('\n🚀 Next Steps:', colors.cyan);
    log('   1. Update SKIP_DB_CONNECTION=false in .env', colors.blue);
    log('   2. Start the server: npm run dev', colors.blue);
    log('   3. Login with admin credentials', colors.blue);
    log('   4. Create user accounts for your 30 employees', colors.blue);

  } catch (error) {
    log(`❌ Database setup failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
