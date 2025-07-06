const crypto = require('crypto');
const logger = require('../utils/logger');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Generate a secure encryption key from the master key
 * @returns {Buffer} Encryption key
 */
function getEncryptionKey() {
  const masterKey = process.env.ENCRYPTION_KEY;
  const salt = process.env.MASTER_KEY_SALT || 'default-salt-change-in-production';
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  if (masterKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  // Use PBKDF2 to derive a key from the master key and salt
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a password string
 * @param {string} password - Plain text password to encrypt
 * @returns {string} Encrypted password with IV and tag (base64 encoded)
 */
function encryptPassword(password) {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('password-manager-aad'));

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data
    const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
    
    return combined.toString('base64');
    
  } catch (error) {
    logger.error('Password encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a password string
 * @param {string} encryptedPassword - Encrypted password (base64 encoded)
 * @returns {string} Decrypted plain text password
 */
function decryptPassword(encryptedPassword) {
  try {
    if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      throw new Error('Encrypted password must be a non-empty string');
    }
    
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedPassword, 'base64');
    
    // Extract IV, tag, and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('password-manager-aad'));
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    logger.error('Password decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}

/**
 * Encrypt sensitive data (notes, URLs, etc.)
 * @param {string} data - Plain text data to encrypt
 * @returns {string} Encrypted data (base64 encoded)
 */
function encryptData(data) {
  try {
    if (!data || typeof data !== 'string') {
      return data; // Return as-is if empty or not string
    }
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('password-manager-data-aad'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
    
    return combined.toString('base64');
    
  } catch (error) {
    logger.error('Data encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data (base64 encoded)
 * @returns {string} Decrypted plain text data
 */
function decryptData(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return encryptedData; // Return as-is if empty or not string
    }
    
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    const iv = combined.slice(0, IV_LENGTH);
    const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('password-manager-data-aad'));
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    logger.error('Data decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 16)
 * @param {Object} options - Password generation options
 * @returns {string} Generated password
 */
function generateSecurePassword(length = 16, options = {}) {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options;
  
  let charset = '';
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }
  
  if (!charset) {
    throw new Error('At least one character type must be included');
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Hash data for integrity checking
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash (hex encoded)
 */
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify data integrity
 * @param {string} data - Original data
 * @param {string} hash - Expected hash
 * @returns {boolean} True if data matches hash
 */
function verifyDataIntegrity(data, hash) {
  const computedHash = hashData(data);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random token (hex encoded)
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Test encryption/decryption functionality
 * @returns {boolean} True if encryption is working correctly
 */
function testEncryption() {
  try {
    const testPassword = 'TestPassword123!';
    const encrypted = encryptPassword(testPassword);
    const decrypted = decryptPassword(encrypted);
    
    return decrypted === testPassword;
  } catch (error) {
    logger.error('Encryption test failed:', error);
    return false;
  }
}

module.exports = {
  encryptPassword,
  decryptPassword,
  encryptData,
  decryptData,
  generateSecurePassword,
  hashData,
  verifyDataIntegrity,
  generateSecureToken,
  testEncryption
};
