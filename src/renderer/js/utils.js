/**
 * Utility Functions for Password Manager
 * Common helper functions used throughout the application
 */

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to human readable string
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Default options
    const defaultOptions = {
        showRelative: true,
        showTime: false,
        format: 'short'
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Show relative time for recent dates
    if (opts.showRelative && diffDays < 7) {
        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            if (diffHours === 0) {
                if (diffMinutes === 0) return 'Just now';
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            }
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else {
            return `${diffDays} days ago`;
        }
    }
    
    // Format options
    const formatOptions = {
        year: 'numeric',
        month: opts.format === 'long' ? 'long' : 'short',
        day: 'numeric'
    };
    
    if (opts.showTime) {
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString(undefined, formatOptions);
}

/**
 * Format file size to human readable string
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate random color for categories
 * @param {string} seed - Seed string for consistent colors
 * @returns {string} Hex color code
 */
function generateColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Check if password meets strength requirements
 * @param {string} password - Password to check
 * @returns {Object} Strength analysis
 */
function checkPasswordStrength(password) {
    const analysis = {
        score: 0,
        level: 'weak',
        feedback: [],
        requirements: {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        }
    };
    
    // Calculate score
    if (analysis.requirements.length) analysis.score += 20;
    if (analysis.requirements.uppercase) analysis.score += 20;
    if (analysis.requirements.lowercase) analysis.score += 20;
    if (analysis.requirements.numbers) analysis.score += 20;
    if (analysis.requirements.symbols) analysis.score += 20;
    
    // Bonus points for length
    if (password.length >= 12) analysis.score += 10;
    if (password.length >= 16) analysis.score += 10;
    
    // Determine level
    if (analysis.score >= 80) analysis.level = 'strong';
    else if (analysis.score >= 60) analysis.level = 'medium';
    else if (analysis.score >= 40) analysis.level = 'fair';
    else analysis.level = 'weak';
    
    // Generate feedback
    if (!analysis.requirements.length) {
        analysis.feedback.push('Use at least 8 characters');
    }
    if (!analysis.requirements.uppercase) {
        analysis.feedback.push('Add uppercase letters');
    }
    if (!analysis.requirements.lowercase) {
        analysis.feedback.push('Add lowercase letters');
    }
    if (!analysis.requirements.numbers) {
        analysis.feedback.push('Add numbers');
    }
    if (!analysis.requirements.symbols) {
        analysis.feedback.push('Add special characters');
    }
    if (password.length < 12) {
        analysis.feedback.push('Consider using 12+ characters');
    }
    
    return analysis;
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            textArea.remove();
            return success;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid URL
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate secure password
 * @param {Object} options - Generation options
 * @returns {string} Generated password
 */
function generatePassword(options = {}) {
    const defaults = {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: true,
        excludeAmbiguous: true
    };
    
    const opts = { ...defaults, ...options };
    
    let charset = '';
    
    if (opts.includeUppercase) {
        charset += opts.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    if (opts.includeLowercase) {
        charset += opts.excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }
    
    if (opts.includeNumbers) {
        charset += opts.excludeSimilar ? '23456789' : '0123456789';
    }
    
    if (opts.includeSymbols) {
        const symbols = opts.excludeAmbiguous ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
        charset += symbols;
    }
    
    if (!charset) {
        throw new Error('At least one character type must be included');
    }
    
    let password = '';
    const array = new Uint8Array(opts.length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < opts.length; i++) {
        password += charset[array[i] % charset.length];
    }
    
    return password;
}

/**
 * Create loading spinner element
 * @param {string} size - Size class (sm, md, lg)
 * @returns {HTMLElement} Spinner element
 */
function createSpinner(size = 'md') {
    const spinner = document.createElement('div');
    spinner.className = `loading-spinner loading-spinner-${size}`;
    return spinner;
}

/**
 * Show toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${escapeHtml(message)}</span>
        <button class="notification-close">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove
    const timeout = setTimeout(() => {
        notification.remove();
    }, duration);
    
    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(timeout);
        notification.remove();
    });
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });
}

/**
 * Create notification container if it doesn't exist
 * @returns {HTMLElement} Notification container
 */
function createNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Animate element with CSS classes
 * @param {HTMLElement} element - Element to animate
 * @param {string} animation - Animation class name
 * @param {number} duration - Animation duration in milliseconds
 * @returns {Promise} Promise that resolves when animation completes
 */
function animateElement(element, animation, duration = 300) {
    return new Promise((resolve) => {
        element.classList.add(animation);
        
        const handleAnimationEnd = () => {
            element.classList.remove(animation);
            element.removeEventListener('animationend', handleAnimationEnd);
            resolve();
        };
        
        element.addEventListener('animationend', handleAnimationEnd);
        
        // Fallback timeout
        setTimeout(() => {
            if (element.classList.contains(animation)) {
                handleAnimationEnd();
            }
        }, duration);
    });
}

/**
 * Get contrast color (black or white) for a given background color
 * @param {string} hexColor - Hex color code
 * @returns {string} Contrast color (black or white)
 */
function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

// Export utility functions
window.Utils = {
    debounce,
    throttle,
    formatDate,
    formatFileSize,
    escapeHtml,
    generateColor,
    checkPasswordStrength,
    copyToClipboard,
    isValidEmail,
    isValidUrl,
    generatePassword,
    createSpinner,
    showToast,
    animateElement,
    getContrastColor,
    formatNumber,
    getInitials
};
