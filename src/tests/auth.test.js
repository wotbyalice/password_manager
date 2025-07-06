const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../server/app');
const { createUser, findUserByEmail, validatePassword } = require('../server/auth/authService');

// Mock database functions
jest.mock('../server/database/connection');
jest.mock('../server/auth/authService');

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        email: 'test@company.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      createUser.mockResolvedValue({
        id: 1,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
      expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      }));
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(createUser).not.toHaveBeenCalled();
    });

    test('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@company.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('password');
      expect(createUser).not.toHaveBeenCalled();
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'existing@company.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      createUser.mockRejectedValue(new Error('Email already exists'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('User Login', () => {
    test('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@company.com',
        password: 'SecurePass123!'
      };

      const mockUser = {
        id: 1,
        email: loginData.email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        passwordHash: await bcrypt.hash(loginData.password, 12)
      };

      findUserByEmail.mockResolvedValue(mockUser);
      validatePassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      
      // Verify JWT token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret');
      expect(decoded).toHaveProperty('userId', mockUser.id);
      expect(decoded).toHaveProperty('role', mockUser.role);
    });

    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@company.com',
        password: 'SecurePass123!'
      };

      findUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@company.com',
        password: 'WrongPassword'
      };

      const mockUser = {
        id: 1,
        email: loginData.email,
        passwordHash: await bcrypt.hash('CorrectPassword', 12)
      };

      findUserByEmail.mockResolvedValue(mockUser);
      validatePassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('JWT Token Validation', () => {
    test('should validate valid JWT token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@company.com',
        role: 'user'
      };

      const token = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
    });

    test('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid token');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('No token provided');
    });
  });

  describe('Role-based Access Control', () => {
    test('should allow admin access to admin routes', async () => {
      const adminToken = jwt.sign(
        { userId: 1, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should deny user access to admin routes', async () => {
      const userToken = jwt.sign(
        { userId: 2, role: 'user' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});
