/**
 * Validation utilities for user input
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 * Requirements: At least 8 characters, uppercase, lowercase, number, special character
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Minimum 8 characters
  if (password.length < 8) {
    return false;
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // At least one number
  if (!/\d/.test(password)) {
    return false;
  }

  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Validate user name (first name, last name)
 * @param {string} name - Name to validate
 * @returns {boolean} True if name is valid
 */
function validateName(name) {
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
function validateRole(role) {
  const validRoles = ['user', 'admin'];
  return validRoles.includes(role);
}

/**
 * Validate password entry data
 * @param {Object} passwordData - Password entry data
 * @returns {Object} Validation result with errors
 */
function validatePasswordEntry(passwordData) {
  const errors = [];
  const { title, username, password, url, notes, category } = passwordData;

  // Title is required
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.trim().length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  // Username is required
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    errors.push('Username is required');
  } else if (username.trim().length > 100) {
    errors.push('Username must be less than 100 characters');
  }

  // Password is required
  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    errors.push('Password is required');
  } else if (password.length > 500) {
    errors.push('Password must be less than 500 characters');
  }

  // URL validation (optional)
  if (url && typeof url === 'string' && url.trim().length > 0) {
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(url.trim())) {
      errors.push('URL must be a valid HTTP or HTTPS URL');
    } else if (url.trim().length > 500) {
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
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validated pagination parameters
 */
function validatePagination(page, limit) {
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
function validateSearchQuery(query) {
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

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateRole,
  validatePasswordEntry,
  sanitizeString,
  validatePagination,
  validateSearchQuery
};
