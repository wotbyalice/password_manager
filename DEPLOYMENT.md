# 🚀 Office Password Manager - Deployment Guide

This guide will help you deploy the Office Password Manager in your office environment.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **PostgreSQL**: Version 12 or higher (or Supabase account)
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux

### Hardware Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 500MB for application, 1GB+ for database
- **Network**: Stable internet connection for real-time features

## 🗄️ Database Setup

### Option 1: Local PostgreSQL (Recommended for Office)

1. **Install PostgreSQL**
   ```bash
   # Windows: Download from https://www.postgresql.org/download/windows/
   # macOS: brew install postgresql
   # Ubuntu: sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create Database**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database and user
   CREATE DATABASE password_manager;
   CREATE USER pm_user WITH PASSWORD 'secure_password_here';
   GRANT ALL PRIVILEGES ON DATABASE password_manager TO pm_user;
   ```

3. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env file with your database credentials
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=password_manager
   DB_USER=pm_user
   DB_PASSWORD=secure_password_here
   ```

### Option 2: Supabase (Cloud Database)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and API keys

2. **Configure Environment**
   ```bash
   # Edit .env file
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```

## 🔧 Application Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/office-password-manager.git
cd office-password-manager

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor
```

**Important Environment Variables:**
```env
# Change these in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENCRYPTION_KEY=your-32-character-encryption-key-here
ADMIN_PASSWORD=ChangeThisPassword123!

# Database connection
DB_HOST=localhost
DB_NAME=password_manager
DB_USER=pm_user
DB_PASSWORD=your_secure_password

# Server configuration
PORT=3000
NODE_ENV=production
```

### 3. Database Initialization

```bash
# Run database setup script
npm run setup:db

# This will:
# - Create all necessary tables
# - Set up indexes and triggers
# - Create default categories
# - Create admin user
# - Add sample data (development only)
```

### 4. Security Configuration

**Generate Secure Keys:**
```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (32+ characters)
openssl rand -base64 32
```

**Update .env with generated keys:**
```env
JWT_SECRET=generated_jwt_secret_here
ENCRYPTION_KEY=generated_encryption_key_here
```

## 🚀 Running the Application

### Development Mode
```bash
# Start both server and Electron app
npm run dev

# Or start separately:
npm run server:dev  # Start server with hot reload
npm start          # Start Electron app
```

### Production Mode
```bash
# Start server
npm run server

# In another terminal, start Electron app
npm start
```

## 📦 Building for Distribution

### 1. Build Application
```bash
# Clean previous builds
npm run clean

# Run tests
npm test

# Build application
npm run build
```

### 2. Create Windows Installer
```bash
# Build Windows installer
npm run dist:win

# This creates:
# - dist/Office Password Manager Setup 1.0.0.exe (installer)
# - dist/Office Password Manager 1.0.0.exe (portable)
```

### 3. Distribution Files
After building, you'll find these files in the `dist/` folder:
- **Installer**: `Office Password Manager Setup 1.0.0.exe`
- **Portable**: `Office Password Manager 1.0.0.exe`
- **Unpacked**: `win-unpacked/` folder

## 🏢 Office Deployment Strategy

### Server Deployment

1. **Dedicated Server Setup**
   ```bash
   # On your office server
   git clone https://github.com/your-org/office-password-manager.git
   cd office-password-manager
   npm install --production
   
   # Configure for production
   cp .env.example .env
   # Edit .env with production settings
   
   # Setup database
   npm run setup:db
   
   # Start server (consider using PM2 for production)
   npm install -g pm2
   pm2 start src/server/server.js --name "password-manager"
   pm2 startup
   pm2 save
   ```

2. **Network Configuration**
   - Open port 3000 on server firewall
   - Configure internal DNS or use IP address
   - Update client .env files with server URL

### Client Deployment

1. **Mass Distribution**
   ```bash
   # Build installer
   npm run dist:win
   
   # Distribute installer to all employee computers
   # Or use network share for installation
   ```

2. **Configuration for Clients**
   - Update server URL in client configuration
   - Ensure network connectivity to server
   - Test real-time features

### Network Setup

1. **Firewall Rules**
   ```bash
   # Allow port 3000 for HTTP API
   # Allow port 3000 for WebSocket connections
   # Ensure internal network access
   ```

2. **DNS Configuration** (Optional)
   ```bash
   # Add internal DNS entry
   password-manager.company.local -> 192.168.1.100
   ```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong, unique JWT and encryption keys
- [ ] Enable HTTPS in production
- [ ] Configure proper firewall rules
- [ ] Regular database backups
- [ ] Monitor audit logs
- [ ] Update dependencies regularly
- [ ] Use environment-specific configurations

### Backup Strategy

1. **Database Backups**
   ```bash
   # Daily database backup
   pg_dump password_manager > backup_$(date +%Y%m%d).sql
   
   # Automated backup script
   npm run backup:create
   ```

2. **Application Backups**
   - Backup .env configuration
   - Backup custom modifications
   - Version control all changes

## 🧪 Testing Deployment

### 1. Server Testing
```bash
# Test server endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/auth/verify

# Run integration tests
npm run test:server
```

### 2. Client Testing
```bash
# Test Electron app
npm start

# Test real-time features
# - Open multiple instances
# - Test password synchronization
# - Verify user presence tracking
```

### 3. Network Testing
```bash
# Test from client machines
curl http://server-ip:3000/api/health

# Test WebSocket connection
# Use browser developer tools to verify WebSocket connection
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL service
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U pm_user -d password_manager
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill process or change port in .env
   PORT=3001
   ```

3. **Electron App Won't Start**
   ```bash
   # Check Node.js version
   node --version  # Should be 18+
   
   # Rebuild native modules
   npm rebuild
   ```

4. **Real-time Features Not Working**
   - Check WebSocket connection in browser dev tools
   - Verify firewall allows WebSocket connections
   - Check server logs for Socket.io errors

### Log Files
- **Server logs**: `logs/password-manager.log`
- **Electron logs**: Check console in dev tools
- **Database logs**: PostgreSQL log files

## 📞 Support

### Getting Help
1. Check the troubleshooting section above
2. Review log files for error messages
3. Test with minimal configuration
4. Check network connectivity

### Maintenance
- Regular security updates
- Database maintenance and optimization
- Monitor disk space and performance
- Review audit logs for security

---

**🎉 Congratulations!** Your Office Password Manager is now deployed and ready to secure your office passwords with enterprise-grade features and real-time collaboration!
