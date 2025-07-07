/**
 * Mock Authentication Service for Quick Testing
 * This provides a simple in-memory authentication system for immediate testing
 * Replace with real database authentication once database is set up
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock users database (in-memory)
const mockUsers = [
  {
    id: 1,
    email: 'admin@company.com',
    password_hash: '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
    first_name: 'System',
    last_name: 'Administrator',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: null
  },
  {
    id: 2,
    email: 'user@company.local',
    password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO/G', // AdminPass123!
    first_name: 'Test',
    last_name: 'User',
    role: 'user',
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: null
  }
];

// Mock passwords database (in-memory)
const mockPasswords = [
  {
    id: 1,
    title: 'Company Email',
    username: 'admin@company.com',
    password_encrypted: 'encrypted_password_1',
    url: 'https://mail.company.com',
    notes: 'Main company email account',
    category: 'Email',
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false
  },
  {
    id: 2,
    title: 'Office WiFi',
    username: 'OfficeNetwork',
    password_encrypted: 'encrypted_password_2',
    url: '',
    notes: 'Main office WiFi password',
    category: 'WiFi',
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false
  }
];

/**
 * Find user by email
 */
function findUserByEmail(email) {
  return mockUsers.find(user => user.email === email && user.is_active);
}

/**
 * Find user by ID
 */
function findUserById(id) {
  return mockUsers.find(user => user.id === id && user.is_active);
}

/**
 * Verify password
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

/**
 * Mock login function
 */
async function login(email, password) {
  const user = findUserByEmail(email);
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }
  
  // Update last login
  user.last_login = new Date().toISOString();
  
  const token = generateToken(user);
  
  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = user;
  
  return {
    user: userWithoutPassword,
    token
  };
}

/**
 * Get all passwords (mock)
 */
function getPasswords(options = {}) {
  let filteredPasswords = mockPasswords.filter(p => !p.is_deleted);
  
  // Apply search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase();
    filteredPasswords = filteredPasswords.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      p.username.toLowerCase().includes(searchTerm) ||
      p.url.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply category filter
  if (options.category && options.category !== 'all') {
    filteredPasswords = filteredPasswords.filter(p => p.category === options.category);
  }
  
  // Pagination
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const offset = (page - 1) * limit;
  
  const total = filteredPasswords.length;
  const passwords = filteredPasswords.slice(offset, offset + limit);
  
  return {
    passwords,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get all users (mock)
 */
function getUsers() {
  return mockUsers.map(user => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
  verifyPassword,
  generateToken,
  verifyToken,
  login,
  getPasswords,
  getUsers,
  mockUsers,
  mockPasswords
};
