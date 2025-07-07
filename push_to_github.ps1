# PowerShell script to push to GitHub
Write-Host "Starting GitHub push process..."

# Add all files
Write-Host "Adding files to git..."
git add .

# Commit with detailed message
Write-Host "Committing changes..."
$commitMessage = @"
Version 0.4 - Major UI and Encryption Fixes

🚀 New Features:
- Fixed empty state 'Add Password' button functionality
- Implemented proper encryption/decryption with AES-256-CBC
- Enhanced error handling for encryption operations
- Added comprehensive debugging and logging system

🔧 Bug Fixes:
- Resolved garbled characters in password display (encryption key issue)
- Fixed empty state button not responding to clicks
- Improved event delegation for dynamically added elements
- Enhanced decryption error handling with fallback mechanisms

🎨 UI/UX Improvements:
- Better error messages for failed operations
- Improved modal functionality and user feedback
- Enhanced debugging output for development
- More robust password creation and display

🔒 Security Enhancements:
- Proper 32-character encryption key implementation
- Improved password encryption/decryption pipeline
- Better error handling for security operations
- Enhanced data validation and sanitization

📊 Technical Improvements:
- Comprehensive server-side logging
- Better debugging tools and error tracking
- Improved code organization and error handling
- Enhanced development workflow and debugging capabilities

This version significantly improves the reliability and security of the password manager with proper encryption handling and a much more stable user interface.
"@

git commit -m $commitMessage

# Set main branch and push
Write-Host "Setting main branch and pushing..."
git branch -M main
git push -u origin main

# Create and push tag
Write-Host "Creating version tag..."
git tag -a v0.4 -m "Version 0.4 - Major UI and Encryption Fixes"
git push origin v0.4

Write-Host "Successfully pushed version 0.4 to GitHub!"
