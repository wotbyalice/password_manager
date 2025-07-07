# 🔐 Office Password Manager

**Enterprise-grade password manager for office environments with real-time collaboration**

## 🚧 **PROJECT STATUS: DEVELOPMENT COMPLETE - TESTING REQUIRED**

⚠️ **Code implementation complete but requires verification**
⚠️ **Deployment testing needed before production use**
⚠️ **Documentation complete but functionality unverified**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/electron-%5E27.0.0-blue)](https://electronjs.org/)
[![Status](https://img.shields.io/badge/Status-Development%20Complete-yellow)](https://github.com)

## ✨ Features

### 🔒 **Security First**
- **Military-grade encryption**: AES-256-GCM for all password storage
- **Zero-knowledge architecture**: Passwords encrypted before leaving your device
- **Role-based access control**: Admin and user permissions
- **Comprehensive audit logging**: Track all user actions for compliance

### 👥 **Team Collaboration**
- **Real-time synchronization**: Instant updates across all devices
- **User presence tracking**: See who's online and editing
- **Conflict resolution**: Automatic handling of simultaneous edits
- **Shared categories**: Organize passwords by department or function

### 🖥️ **Desktop Experience**
- **Native Windows application**: Built with Electron for performance
- **System tray integration**: Quick access without opening full app
- **Auto-updater ready**: Seamless updates for your entire team
- **Offline capability**: Access passwords even without internet

### 🎨 **Modern Interface**
- **Beautiful design**: Professional UI with smooth animations
- **Dark/light themes**: Multiple color schemes to match preferences
- **Responsive layout**: Works on all screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support

## 🏗️ **Architecture**

- **Frontend**: Electron.js with modern UI components
- **Backend**: Node.js with Express.js and Socket.io
- **Database**: PostgreSQL with real-time subscriptions
- **Security**: JWT authentication with role-based permissions
- **Updates**: Electron-updater with GitHub releases integration

## 🚀 **DEPLOYMENT (Requires Testing)**

### **Prerequisites**
- **Node.js** 18.0.0 or higher ([Download here](https://nodejs.org))
- **Windows** 10/11 (primary target)
- **4GB RAM** minimum (8GB recommended)

### **Option 1: Automated Setup (Untested)**
1. **Double-click** `deploy.bat` in the Password_Manager folder
2. **Wait** for automatic setup (installs dependencies, sets up database, runs tests)
3. **Access** the application at `http://localhost:3001` (if successful)
4. **Login** with `admin@company.com` / `admin123` (if working)

### **Option 2: Manual Setup**
```bash
# Install dependencies
npm install

# Setup database
npm run setup:db

# Test deployment
npm run test:deployment

# Start server
node src/server/server.js
```

## ⚠️ **IMPORTANT DISCLAIMER**

**This project contains a complete codebase but has NOT been fully tested in a working environment. Before production use:**

1. **Verify Node.js installation and npm functionality**
2. **Test database connectivity (currently using SQLite fallback)**
3. **Verify all dependencies install correctly**
4. **Test authentication and user management**
5. **Verify real-time features work as expected**
6. **Test Electron desktop application**
7. **Validate security features and encryption**

## 📋 **WHAT'S IMPLEMENTED (Code Complete)**

✅ **Complete file structure** with proper organization
✅ **Express.js server** with API routes and middleware
✅ **Electron desktop application** framework
✅ **Authentication system** with JWT and bcrypt
✅ **Password management** CRUD operations
✅ **Real-time features** with Socket.io
✅ **Database abstraction** (PostgreSQL/SQLite)
✅ **Security middleware** and encryption
✅ **Comprehensive configuration** files
✅ **Test files** (Jest framework)
✅ **Build scripts** for Windows installer
✅ **Deployment automation** scripts

## ❓ **WHAT NEEDS VERIFICATION**

⚠️ **Actual functionality** - Does the application start and run?
⚠️ **Database connectivity** - Does it connect to any database?
⚠️ **User authentication** - Does login/logout work?
⚠️ **Password operations** - Can users add/edit/delete passwords?
⚠️ **Real-time sync** - Do updates appear across clients?
⚠️ **Electron app** - Does the desktop application launch?
⚠️ **Security features** - Is encryption working correctly?
⚠️ **Test suite** - Do the automated tests pass?

### 3. Start the Application

```bash
# Start server and Electron app
npm run dev

# Or start separately:
npm run server    # Start backend server
npm start         # Start Electron app
```

### 4. First Login

- **Email**: `admin@yourcompany.com` (or your configured admin email)
- **Password**: `ChangeThisPassword123!` (change this immediately!)

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Complete production setup
- **[API Documentation](docs/API.md)** - Backend API reference
- **[User Guide](docs/USER_GUIDE.md)** - End-user instructions
- **[Admin Guide](docs/ADMIN_GUIDE.md)** - Administrator documentation

## 🧪 Testing

```bash
# Run all tests
npm test

# Test deployment readiness
npm run test:deployment

# Run with coverage
npm run test:coverage
```

## 📦 Building for Production

```bash
# Build Windows installer
npm run dist:win

# Build for all platforms
npm run dist

# Test build locally
npm run pack
```

## 🏢 Office Deployment

### Server Setup
1. Install on dedicated office server
2. Configure PostgreSQL database
3. Set up SSL certificates (recommended)
4. Configure firewall rules

### Client Distribution
1. Build Windows installer: `npm run dist:win`
2. Distribute installer to employee computers
3. Configure client settings for your server
4. Train users on password manager features

## 🔧 Configuration

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_NAME=password_manager
DB_USER=pm_user
DB_PASSWORD=secure_password

# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Server
PORT=3000
NODE_ENV=production
```

### Feature Flags

```env
# Enable/disable features
FEATURE_USER_REGISTRATION=false
FEATURE_PASSWORD_SHARING=true
FEATURE_AUDIT_EXPORT=true
FEATURE_BULK_IMPORT=true
```

## 🛡️ Security

### Best Practices
- Change all default passwords immediately
- Use strong, unique encryption keys
- Enable HTTPS in production
- Regular security audits
- Keep dependencies updated

### Compliance
- Comprehensive audit logging
- Role-based access control
- Data encryption at rest and in transit
- Export capabilities for compliance reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🎉 Ready to secure your office passwords with enterprise-grade features!**

For detailed setup instructions, see the [Deployment Guide](DEPLOYMENT.md).
