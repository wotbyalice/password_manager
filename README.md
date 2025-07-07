# 🔐 Office Password Manager

**Enterprise-grade password manager for office environments with real-time collaboration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/electron-%5E27.0.0-blue)](https://electronjs.org/)

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

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **PostgreSQL** 12+ (or Supabase account)
- **Windows** 10/11 (primary target)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/office-password-manager.git
cd office-password-manager

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# Then run database setup
npm run setup:db
```

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
