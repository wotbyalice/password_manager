const bcrypt = require('bcrypt');
const SQLiteAdapter = require('../src/server/database/sqlite-adapter');
require('dotenv').config();

async function setupSQLiteDatabase() {
  console.log('🚀 Setting up SQLite database...');
  
  try {
    const adapter = new SQLiteAdapter(process.env.SQLITE_PATH || './data/password_manager.json');
    
    // Test connection
    console.log('📍 Testing database connection...');
    const testResult = await adapter.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', testResult.rows[0]);
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@company.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin already exists
    const existingAdmin = await adapter.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      await adapter.query(
        'INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
        [adminEmail, hashedPassword, 'admin', 'System', 'Administrator']
      );
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    // Create some sample passwords for testing
    console.log('🔐 Creating sample passwords...');
    const samplePasswords = [
      {
        title: 'Company Email',
        username: 'admin@company.com',
        password: 'CompanyEmail123!',
        url: 'https://mail.company.com',
        notes: 'Main company email account',
        category: 'Email'
      },
      {
        title: 'Office WiFi',
        username: 'admin',
        password: 'OfficeWiFi2024!',
        url: '',
        notes: 'Main office WiFi credentials',
        category: 'Network'
      },
      {
        title: 'Server Admin',
        username: 'root',
        password: 'ServerAdmin2024!',
        url: 'https://server.company.com',
        notes: 'Main server administration account',
        category: 'Server'
      }
    ];
    
    // Get admin user ID
    const adminUser = await adapter.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    const adminUserId = adminUser.rows[0].id;
    
    for (const pwd of samplePasswords) {
      // Simple encryption (in real app, use proper encryption)
      const encryptedPassword = Buffer.from(pwd.password).toString('base64');
      
      await adapter.query(
        'INSERT INTO passwords (title, username, encrypted_password, url, notes, category, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pwd.title, pwd.username, encryptedPassword, pwd.url, pwd.notes, pwd.category, adminUserId]
      );
    }
    
    console.log('✅ Sample passwords created successfully');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Email: admin@company.com');
    console.log('   Password: admin123');
    console.log('\n🚀 You can now start the application with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the data directory exists');
    console.error('2. Check file permissions');
    console.error('3. Ensure no other process is using the database file');
    process.exit(1);
  }
}

setupSQLiteDatabase();
