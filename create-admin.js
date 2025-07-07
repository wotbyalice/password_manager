const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function createAdmin() {
  console.log('Creating admin user...');
  
  const dbPath = './data/password_manager.json';
  const dataDir = path.dirname(dbPath);
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Load or create data structure
  let data = {
    users: [],
    passwords: [],
    audit_logs: []
  };
  
  if (fs.existsSync(dbPath)) {
    try {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(fileContent);
    } catch (error) {
      console.warn('Could not load existing data, starting fresh');
    }
  }
  
  // Check if admin already exists
  const existingAdmin = data.users.find(user => user.email === 'admin@company.com');
  
  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = {
    id: 1,
    email: 'admin@company.com',
    password_hash: hashedPassword,
    role: 'admin',
    first_name: 'System',
    last_name: 'Administrator',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  data.users.push(adminUser);
  
  // Create sample passwords
  const samplePasswords = [
    {
      id: 1,
      title: 'Company Email',
      username: 'admin@company.com',
      password: 'CompanyEmail123!',
      url: 'https://mail.company.com',
      notes: 'Main company email account',
      category: 'Email',
      user_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Office WiFi',
      username: 'admin',
      password: 'OfficeWiFi2024!',
      url: '',
      notes: 'Office wireless network password',
      category: 'Network',
      user_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Server Admin',
      username: 'administrator',
      password: 'ServerAdmin2024!',
      url: 'https://server.company.com',
      notes: 'Main server administration account',
      category: 'Server',
      user_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  data.passwords = samplePasswords;
  
  // Save data
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  
  console.log('✅ Admin user and sample passwords created successfully!');
  console.log('📧 Email: admin@company.com');
  console.log('🔑 Password: admin123');
}

createAdmin().catch(console.error);
