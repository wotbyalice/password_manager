/**
 * Encryption Service with Dependency Injection
 * Provides encryption and decryption capabilities for sensitive data
 */

const crypto = require('crypto');

class EncryptionService {
  constructor(securityConfig, logger) {
    this.config = securityConfig;
    this.logger = logger;
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Derive encryption key from config
    this.encryptionKey = this.deriveKey(securityConfig.encryptionKey, securityConfig.masterKeySalt);
  }

  /**
   * Derive encryption key from master key and salt
   * @param {string} masterKey - Master encryption key
   * @param {string} salt - Salt for key derivation
   * @returns {Buffer} Derived key
   */
  deriveKey(masterKey, salt) {
    try {
      return crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha256');
    } catch (error) {
      this.logger.error('Error deriving encryption key:', error);
      throw new Error('Failed to initialize encryption service');
    }
  }

  /**
   * Encrypt password data
   * @param {string} password - Plain text password
   * @returns {string} Encrypted password (base64 encoded)
   */
  encryptPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    try {
      return this.encrypt(password);
    } catch (error) {
      this.logger.error('Error encrypting password:', error);
      throw new Error('Failed to encrypt password');
    }
  }

  /**
   * Decrypt password data
   * @param {string} encryptedPassword - Encrypted password
   * @returns {string} Plain text password
   */
  decryptPassword(encryptedPassword) {
    if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      throw new Error('Encrypted password must be a non-empty string');
    }

    try {
      return this.decrypt(encryptedPassword);
    } catch (error) {
      this.logger.error('Error decrypting password:', error);
      throw new Error('Failed to decrypt password');
    }
  }

  /**
   * Encrypt general data (notes, URLs, etc.)
   * @param {string} data - Plain text data
   * @returns {string} Encrypted data (base64 encoded)
   */
  encryptData(data) {
    if (!data || typeof data !== 'string') {
      return data; // Return as-is for null/undefined/empty values
    }

    try {
      return this.encrypt(data);
    } catch (error) {
      this.logger.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt general data
   * @param {string} encryptedData - Encrypted data
   * @returns {string} Plain text data
   */
  decryptData(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return encryptedData; // Return as-is for null/undefined/empty values
    }

    try {
      return this.decrypt(encryptedData);
    } catch (error) {
      this.logger.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Core encryption function
   * @param {string} plaintext - Text to encrypt
   * @returns {string} Encrypted text (base64 encoded)
   */
  encrypt(plaintext) {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipherGCM(this.algorithm, this.encryptionKey, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get the authentication tag
      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);

      // Return base64 encoded result
      return combined.toString('base64');

    } catch (error) {
      this.logger.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Core decryption function
   * @param {string} encryptedData - Encrypted data (base64 encoded)
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, tag, and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);

      // Create decipher
      const decipher = crypto.createDecipherGCM(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      this.logger.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate secure random key
   * @param {number} length - Key length in bytes
   * @returns {string} Random key (hex encoded)
   */
  generateKey(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      this.logger.error('Error generating random key:', error);
      throw new Error('Failed to generate random key');
    }
  }

  /**
   * Generate secure random salt
   * @param {number} length - Salt length in bytes
   * @returns {string} Random salt (hex encoded)
   */
  generateSalt(length = 16) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      this.logger.error('Error generating random salt:', error);
      throw new Error('Failed to generate random salt');
    }
  }

  /**
   * Hash data using SHA-256
   * @param {string} data - Data to hash
   * @returns {string} Hash (hex encoded)
   */
  hash(data) {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.logger.error('Error hashing data:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Create HMAC signature
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @returns {string} HMAC signature (hex encoded)
   */
  createHMAC(data, secret) {
    try {
      return crypto.createHmac('sha256', secret).update(data).digest('hex');
    } catch (error) {
      this.logger.error('Error creating HMAC:', error);
      throw new Error('Failed to create HMAC');
    }
  }

  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - HMAC signature to verify
   * @param {string} secret - Secret key
   * @returns {boolean} True if signature is valid
   */
  verifyHMAC(data, signature, secret) {
    try {
      const expectedSignature = this.createHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Error verifying HMAC:', error);
      return false;
    }
  }

  /**
   * Encrypt data with timestamp for expiration
   * @param {string} data - Data to encrypt
   * @param {number} expirationMs - Expiration time in milliseconds
   * @returns {string} Encrypted data with timestamp
   */
  encryptWithExpiration(data, expirationMs) {
    try {
      const expirationTime = Date.now() + expirationMs;
      const dataWithExpiration = JSON.stringify({
        data,
        expires: expirationTime
      });
      
      return this.encrypt(dataWithExpiration);
    } catch (error) {
      this.logger.error('Error encrypting with expiration:', error);
      throw new Error('Failed to encrypt with expiration');
    }
  }

  /**
   * Decrypt data and check expiration
   * @param {string} encryptedData - Encrypted data with timestamp
   * @returns {string|null} Decrypted data or null if expired
   */
  decryptWithExpiration(encryptedData) {
    try {
      const decryptedJson = this.decrypt(encryptedData);
      const { data, expires } = JSON.parse(decryptedJson);
      
      if (Date.now() > expires) {
        this.logger.debug('Encrypted data has expired');
        return null;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error decrypting with expiration:', error);
      return null;
    }
  }

  /**
   * Get encryption service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      initialized: !!this.encryptionKey
    };
  }

  /**
   * Test encryption/decryption functionality
   * @returns {boolean} True if encryption is working correctly
   */
  testEncryption() {
    try {
      const testData = 'test-encryption-data-' + Date.now();
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      return testData === decrypted;
    } catch (error) {
      this.logger.error('Encryption test failed:', error);
      return false;
    }
  }
}

module.exports = EncryptionService;
