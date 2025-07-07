/**
 * Comprehensive Logging System for Password Manager
 * Provides detailed logging for debugging, monitoring, and analytics
 */

class Logger {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.logQueue = [];
        this.isOnline = navigator.onLine;
        this.setupGlobalErrorHandling();
        this.setupPerformanceMonitoring();
        this.setupUserInteractionTracking();
        
        this.log('info', 'Logger initialized', 'SYSTEM', {
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async sendLog(level, message, context = 'GENERAL', data = null) {
        const logEntry = {
            level,
            message,
            context,
            data,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            performance: {
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
                } : null,
                timing: Date.now() - this.startTime
            }
        };

        // Always log to console
        const consoleMessage = `🔧 [${context}] ${message}`;
        if (level === 'error') {
            console.error(consoleMessage, data);
        } else if (level === 'warn') {
            console.warn(consoleMessage, data);
        } else {
            console.log(consoleMessage, data);
        }

        // Send to server if online
        if (this.isOnline) {
            try {
                await fetch('/debug-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logEntry)
                });
            } catch (error) {
                console.error('Failed to send log to server:', error);
                this.logQueue.push(logEntry);
            }
        } else {
            this.logQueue.push(logEntry);
        }
    }

    // Convenience methods
    log(level, message, context, data) {
        this.sendLog(level, message, context, data);
    }

    info(message, context = 'INFO', data = null) {
        this.sendLog('info', message, context, data);
    }

    warn(message, context = 'WARNING', data = null) {
        this.sendLog('warn', message, context, data);
    }

    error(message, context = 'ERROR', data = null) {
        this.sendLog('error', message, context, data);
    }

    // API call logging
    logAPICall(method, url, requestData = null) {
        this.info(`API Call: ${method} ${url}`, 'API_REQUEST', requestData);
    }

    logAPIResponse(method, url, status, responseData = null, duration = null) {
        this.info(`API Response: ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`, 'API_RESPONSE', responseData);
    }

    logAPIError(method, url, error, duration = null) {
        this.error(`API Error: ${method} ${url}${duration ? ` (${duration}ms)` : ''} - ${error.message}`, 'API_ERROR', {
            error: error.message,
            stack: error.stack
        });
    }

    // User interaction logging
    logUserAction(action, element = null, data = null) {
        this.info(`User Action: ${action}`, 'USER_INTERACTION', {
            element: element ? {
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                textContent: element.textContent?.substring(0, 50)
            } : null,
            data
        });
    }

    // Form logging
    logFormSubmission(formId, formData) {
        this.info(`Form Submitted: ${formId}`, 'FORM_SUBMISSION', {
            formId,
            fieldCount: Object.keys(formData).length,
            fields: Object.keys(formData)
        });
    }

    logFormValidation(formId, isValid, errors = null) {
        this.info(`Form Validation: ${formId} - ${isValid ? 'VALID' : 'INVALID'}`, 'FORM_VALIDATION', {
            formId,
            isValid,
            errors
        });
    }

    // Navigation logging
    logNavigation(from, to, method = 'unknown') {
        this.info(`Navigation: ${from} → ${to} (${method})`, 'NAVIGATION', {
            from,
            to,
            method
        });
    }

    // Performance logging
    logPerformance(operation, duration, data = null) {
        this.info(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
            operation,
            duration,
            data
        });
    }

    // Setup global error handling
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.error(`Global Error: ${event.message}`, 'GLOBAL_ERROR', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.error(`Unhandled Promise Rejection: ${event.reason}`, 'PROMISE_REJECTION', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });
    }

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                this.logPerformance('Page Load', perfData.loadEventEnd - perfData.fetchStart, {
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
                    firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
                    firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime
                });
            }, 0);
        });

        // Monitor resource loading
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 1000) { // Log slow resources
                    this.warn(`Slow Resource: ${entry.name} took ${Math.round(entry.duration)}ms`, 'PERFORMANCE', {
                        name: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize
                    });
                }
            }
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    // Setup user interaction tracking
    setupUserInteractionTracking() {
        // Track clicks
        document.addEventListener('click', (event) => {
            const element = event.target;
            if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.hasAttribute('data-action')) {
                this.logUserAction('Click', element, {
                    coordinates: { x: event.clientX, y: event.clientY }
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const formData = new FormData(form);
            const formDataObj = {};
            for (let [key, value] of formData.entries()) {
                // Don't log sensitive data
                if (key.toLowerCase().includes('password')) {
                    formDataObj[key] = '[REDACTED]';
                } else {
                    formDataObj[key] = value;
                }
            }
            this.logFormSubmission(form.id || 'unknown', formDataObj);
        });

        // Track navigation
        let currentUrl = window.location.href;
        const checkUrlChange = () => {
            if (window.location.href !== currentUrl) {
                this.logNavigation(currentUrl, window.location.href, 'SPA_NAVIGATION');
                currentUrl = window.location.href;
            }
        };
        setInterval(checkUrlChange, 1000);
    }

    // Flush queued logs when back online
    async flushQueuedLogs() {
        if (this.logQueue.length > 0 && this.isOnline) {
            const logsToFlush = [...this.logQueue];
            this.logQueue = [];
            
            for (const logEntry of logsToFlush) {
                try {
                    await fetch('/debug-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(logEntry)
                    });
                } catch (error) {
                    this.logQueue.push(logEntry); // Re-queue if failed
                    break;
                }
            }
        }
    }
}

// Create global logger instance
window.logger = new Logger();

// Monitor online/offline status
window.addEventListener('online', () => {
    window.logger.isOnline = true;
    window.logger.info('Connection restored', 'NETWORK');
    window.logger.flushQueuedLogs();
});

window.addEventListener('offline', () => {
    window.logger.isOnline = false;
    window.logger.warn('Connection lost - logging to queue', 'NETWORK');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
