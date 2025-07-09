/**
 * Validation Service with Dependency Injection
 * Provides comprehensive data validation and sanitization
 */

class ValidationService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Validate email format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email is valid
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {boolean} True if password meets requirements
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Password requirements:
    // - At least 8 characters long
    // - Contains at least one uppercase letter
    // - Contains at least one lowercase letter
    // - Contains at least one number
    // - Contains at least one special character
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }

  /**
   * Validate user name (first name, last name)
   * @param {string} name - Name to validate
   * @returns {boolean} True if name is valid
   */
  validateName(name) {
    if (!name || typeof name !== 'string') {
      return false;
    }

    const trimmedName = name.trim();
    
    // Must be between 1 and 50 characters
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return false;
    }

    // Only letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    return nameRegex.test(trimmedName);
  }

  /**
   * Validate user role
   * @param {string} role - Role to validate
   * @returns {boolean} True if role is valid
   */
  validateRole(role) {
    const validRoles = ['user', 'admin'];
    return validRoles.includes(role);
  }

  /**
   * Validate password entry data
   * @param {Object} passwordData - Password entry data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validatePasswordEntry(passwordData) {
    const errors = [];
    const { title, username, password, url, notes, category } = passwordData;

    // Title validation (required)
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required');
    } else if (title.trim().length > 100) {
      errors.push('Title must be less than 100 characters');
    }

    // Username validation (required)
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      errors.push('Username is required');
    } else if (username.trim().length > 100) {
      errors.push('Username must be less than 100 characters');
    }

    // Password validation (required)
    if (!password || typeof password !== 'string' || password.length === 0) {
      errors.push('Password is required');
    } else if (password.length > 500) {
      errors.push('Password must be less than 500 characters');
    }

    // URL validation (optional)
    if (url && typeof url === 'string' && url.trim().length > 0) {
      const trimmedUrl = url.trim();
      
      // Allow various URL formats
      const urlPatterns = [
        /^https?:\/\/.+/i, // Full URLs with protocol
        /^www\..+/i,       // URLs starting with www
        /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})/i // Domain names
      ];

      const isValidUrl = urlPatterns.some(pattern => pattern.test(trimmedUrl));

      if (!isValidUrl) {
        errors.push('Please enter a valid URL (e.g., example.com, www.example.com, or https://example.com)');
      } else if (trimmedUrl.length > 500) {
        errors.push('URL must be less than 500 characters');
      }
    }

    // Notes validation (optional)
    if (notes && typeof notes === 'string' && notes.length > 1000) {
      errors.push('Notes must be less than 1000 characters');
    }

    // Category validation (optional)
    if (category && typeof category === 'string') {
      if (category.trim().length > 50) {
        errors.push('Category must be less than 50 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string input
   * @param {string} input - Input string to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized string
   */
  sanitizeString(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // Remove HTML tags if specified
    if (options.removeHtml !== false) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove dangerous characters
    if (options.removeDangerous !== false) {
      sanitized = sanitized.replace(/[<>]/g, '');
    }

    // Limit length if specified
    if (options.maxLength && typeof options.maxLength === 'number') {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Validate pagination parameters
   * @param {Object} pagination - Pagination object
   * @returns {Object} Validated pagination with defaults
   */
  validatePagination(pagination = {}) {
    const { page, limit } = pagination;
    
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    return {
      page: validatedPage,
      limit: validatedLimit,
      offset: (validatedPage - 1) * validatedLimit
    };
  }

  /**
   * Validate search query
   * @param {string} query - Search query
   * @returns {string} Validated search query
   */
  validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }

    const sanitized = query.trim();
    
    // Limit search query length
    if (sanitized.length > 100) {
      return sanitized.substring(0, 100);
    }

    return sanitized;
  }

  /**
   * Validate category data
   * @param {Object} categoryData - Category data to validate
   * @returns {Object} Validation result
   */
  validateCategory(categoryData) {
    const errors = [];
    const { name, description, color } = categoryData;

    // Name validation (required)
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Category name is required');
    } else if (name.trim().length > 50) {
      errors.push('Category name must be less than 50 characters');
    }

    // Description validation (optional)
    if (description && typeof description === 'string' && description.length > 200) {
      errors.push('Category description must be less than 200 characters');
    }

    // Color validation (optional)
    if (color && typeof color === 'string') {
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(color)) {
        errors.push('Color must be a valid hex color code (e.g., #FF5722)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user data for creation/update
   * @param {Object} userData - User data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateUserData(userData, isUpdate = false) {
    const errors = [];
    const { email, password, firstName, lastName, role } = userData;

    // Email validation (required for creation, optional for update)
    if (!isUpdate || email !== undefined) {
      if (!this.validateEmail(email)) {
        errors.push('Invalid email format');
      }
    }

    // Password validation (required for creation, optional for update)
    if (!isUpdate || password !== undefined) {
      if (!this.validatePassword(password)) {
        errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }
    }

    // Name validation
    if (!isUpdate || firstName !== undefined) {
      if (!this.validateName(firstName)) {
        errors.push('First name must be 1-50 characters and contain only letters, spaces, hyphens, and apostrophes');
      }
    }

    if (!isUpdate || lastName !== undefined) {
      if (!this.validateName(lastName)) {
        errors.push('Last name must be 1-50 characters and contain only letters, spaces, hyphens, and apostrophes');
      }
    }

    // Role validation (optional)
    if (role !== undefined && !this.validateRole(role)) {
      errors.push('Role must be either "user" or "admin"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate ID parameter
   * @param {any} id - ID to validate
   * @returns {boolean} True if ID is valid
   */
  validateId(id) {
    const numId = parseInt(id);
    return !isNaN(numId) && numId > 0;
  }

  /**
   * Validate file upload
   * @param {Object} file - File object to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateFileUpload(file, options = {}) {
    const errors = [];
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['text/csv', 'application/json'],
      allowedExtensions = ['.csv', '.json']
    } = options;

    if (!file) {
      errors.push('File is required');
      return { isValid: false, errors };
    }

    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Type validation
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Extension validation
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension must be one of: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation service statistics
   */
  getStats() {
    return {
      service: 'ValidationService',
      initialized: true,
      supportedValidations: [
        'email',
        'password',
        'name',
        'role',
        'passwordEntry',
        'category',
        'userData',
        'pagination',
        'searchQuery',
        'id',
        'fileUpload'
      ]
    };
  }
}

module.exports = ValidationService;
