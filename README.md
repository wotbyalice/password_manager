# Office Password Manager

A secure, centralized password manager designed for office environments with admin controls and real-time synchronization.

## Features

- **Multi-user Support**: Secure password sharing across 30+ employees
- **Admin Controls**: Only administrators can edit/delete passwords
- **Real-time Sync**: Instant updates across all connected clients
- **Auto-Updates**: Remote application updates without manual intervention
- **Desktop App**: Native Windows application built with Electron
- **Encryption**: AES-256 encryption for all stored passwords
- **Audit Trail**: Complete logging of all password operations

## Architecture

- **Frontend**: Electron.js (Cross-platform desktop app)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Socket.io for instant synchronization
- **Authentication**: JWT tokens with role-based permissions
- **Updates**: electron-updater with GitHub releases

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd office-password-manager

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run tests
npm test

# Start development server
npm run dev
```

### Development Workflow

This project follows Test-Driven Development (TDD) and uses Git branching:

1. **Create feature branch**: `git checkout -b feature/your-feature-name`
2. **Write tests first**: Create failing tests for new functionality
3. **Implement feature**: Write minimum code to pass tests
4. **Refactor**: Improve code quality while keeping tests green
5. **Commit changes**: `git commit -m "feat: add your feature"`
6. **Create pull request**: Merge to develop branch

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Create distribution packages
npm run dist

# Create installer (Windows)
npm run pack
```

## Project Structure

```
src/
├── main/           # Electron main process
├── renderer/       # UI components and client-side logic
├── server/         # Backend API server
├── shared/         # Shared utilities and constants
└── tests/          # Test files

config/             # Configuration files
docs/              # Documentation
assets/            # Static assets (icons, images)
```

## Security

- All passwords are encrypted using AES-256 before storage
- JWT tokens for authentication with role-based access
- HTTPS-only communication
- Regular security audits and updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Implement the feature
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details
