/**
 * Real-time Event Handler
 * Handles event-driven real-time updates without direct coupling to routes
 */

const { PasswordEvents } = require('../events/PasswordEvents');
const { AuthEvents } = require('../events/AuthEvents');
const { SystemEvents } = require('../events/SystemEvents');

class RealtimeEventHandler {
  constructor(eventBus, socketService, logger) {
    this.eventBus = eventBus;
    this.socketService = socketService;
    this.logger = logger;
    this.isInitialized = false;
    
    this.setupEventListeners();
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    try {
      // Password Events
      this.eventBus.on(PasswordEvents.CREATED, this.handlePasswordCreated.bind(this));
      this.eventBus.on(PasswordEvents.UPDATED, this.handlePasswordUpdated.bind(this));
      this.eventBus.on(PasswordEvents.DELETED, this.handlePasswordDeleted.bind(this));
      this.eventBus.on(PasswordEvents.VIEWED, this.handlePasswordViewed.bind(this));
      this.eventBus.on(PasswordEvents.SEARCHED, this.handlePasswordSearched.bind(this));

      // Authentication Events
      this.eventBus.on(AuthEvents.USER_REGISTERED, this.handleUserRegistered.bind(this));
      this.eventBus.on(AuthEvents.USER_LOGIN, this.handleUserLogin.bind(this));
      this.eventBus.on(AuthEvents.USER_LOGOUT, this.handleUserLogout.bind(this));
      this.eventBus.on(AuthEvents.PASSWORD_CHANGED, this.handlePasswordChanged.bind(this));
      this.eventBus.on(AuthEvents.ROLE_CHANGED, this.handleRoleChanged.bind(this));

      // System Events
      this.eventBus.on(SystemEvents.CATEGORY_CREATED, this.handleCategoryCreated.bind(this));
      this.eventBus.on(SystemEvents.CATEGORY_UPDATED, this.handleCategoryUpdated.bind(this));
      this.eventBus.on(SystemEvents.CATEGORY_DELETED, this.handleCategoryDeleted.bind(this));

      this.isInitialized = true;
      this.logger.info('Real-time event handler initialized successfully');

    } catch (error) {
      this.logger.error('Error setting up real-time event listeners:', error);
      throw error;
    }
  }

  /**
   * Handle password created event
   * @param {Object} eventData - Password created event data
   */
  handlePasswordCreated(eventData) {
    try {
      const { password, userId, metadata } = eventData;
      
      // Broadcast to all authenticated users except the creator
      this.socketService.broadcastToAllExcept('password_created', {
        id: password.id,
        title: password.title,
        username: password.username,
        category: password.category,
        url: password.url,
        createdBy: password.createdBy,
        createdAt: password.createdAt
      }, userId);

      // Send confirmation to the creator
      this.socketService.sendToUser(userId, 'password_created_confirmation', {
        passwordId: password.id,
        title: password.title
      });

      this.logger.info('Password created event broadcasted', {
        passwordId: password.id,
        userId,
        source: metadata.source
      });

    } catch (error) {
      this.logger.error('Error handling password created event:', error);
    }
  }

  /**
   * Handle password updated event
   * @param {Object} eventData - Password updated event data
   */
  handlePasswordUpdated(eventData) {
    try {
      const { password, previousData, userId, metadata } = eventData;
      
      // Broadcast to all authenticated users except the updater
      this.socketService.broadcastToAllExcept('password_updated', {
        id: password.id,
        title: password.title,
        username: password.username,
        category: password.category,
        url: password.url,
        updatedBy: password.updatedBy,
        updatedAt: password.updatedAt,
        changedFields: metadata.changedFields
      }, userId);

      // Send confirmation to the updater
      this.socketService.sendToUser(userId, 'password_updated_confirmation', {
        passwordId: password.id,
        title: password.title,
        changedFields: metadata.changedFields
      });

      this.logger.info('Password updated event broadcasted', {
        passwordId: password.id,
        userId,
        changedFields: metadata.changedFields
      });

    } catch (error) {
      this.logger.error('Error handling password updated event:', error);
    }
  }

  /**
   * Handle password deleted event
   * @param {Object} eventData - Password deleted event data
   */
  handlePasswordDeleted(eventData) {
    try {
      const { passwordId, passwordData, userId, metadata } = eventData;
      
      // Broadcast to all authenticated users except the deleter
      this.socketService.broadcastToAllExcept('password_deleted', {
        passwordId,
        title: passwordData.title,
        username: passwordData.username,
        category: passwordData.category
      }, userId);

      // Send confirmation to the deleter
      this.socketService.sendToUser(userId, 'password_deleted_confirmation', {
        passwordId,
        title: passwordData.title
      });

      this.logger.info('Password deleted event broadcasted', {
        passwordId,
        userId,
        title: passwordData.title
      });

    } catch (error) {
      this.logger.error('Error handling password deleted event:', error);
    }
  }

  /**
   * Handle password viewed event
   * @param {Object} eventData - Password viewed event data
   */
  handlePasswordViewed(eventData) {
    try {
      const { passwordId, passwordTitle, userId, metadata } = eventData;
      
      // Only broadcast if it's a detailed view (not list view)
      if (metadata.viewType === 'detail') {
        this.socketService.broadcastToAdmins('password_viewed', {
          passwordId,
          passwordTitle,
          viewedBy: userId,
          timestamp: metadata.timestamp
        });
      }

      this.logger.debug('Password viewed event processed', {
        passwordId,
        userId,
        viewType: metadata.viewType
      });

    } catch (error) {
      this.logger.error('Error handling password viewed event:', error);
    }
  }

  /**
   * Handle password searched event
   * @param {Object} eventData - Password searched event data
   */
  handlePasswordSearched(eventData) {
    try {
      const { query, resultsCount, userId, metadata } = eventData;
      
      // Broadcast search activity to admins for monitoring
      this.socketService.broadcastToAdmins('password_searched', {
        query: query.length > 50 ? query.substring(0, 50) + '...' : query,
        resultsCount,
        searchedBy: userId,
        searchType: metadata.searchType,
        duration: metadata.duration,
        timestamp: metadata.timestamp
      });

      this.logger.debug('Password searched event processed', {
        query: query.substring(0, 20) + '...',
        resultsCount,
        userId
      });

    } catch (error) {
      this.logger.error('Error handling password searched event:', error);
    }
  }

  /**
   * Handle user registered event
   * @param {Object} eventData - User registered event data
   */
  handleUserRegistered(eventData) {
    try {
      const { user, metadata } = eventData;
      
      // Broadcast to admins only
      this.socketService.broadcastToAdmins('user_registered', {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        registrationMethod: metadata.registrationMethod,
        createdAt: user.createdAt
      });

      this.logger.info('User registered event broadcasted', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

    } catch (error) {
      this.logger.error('Error handling user registered event:', error);
    }
  }

  /**
   * Handle user login event
   * @param {Object} eventData - User login event data
   */
  handleUserLogin(eventData) {
    try {
      const { user, session, metadata } = eventData;
      
      // Send welcome message to the user
      this.socketService.sendToUser(user.id, 'login_success', {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        lastLogin: user.lastLogin
      });

      // Broadcast to admins for monitoring
      this.socketService.broadcastToAdmins('user_login_activity', {
        userId: user.id,
        email: user.email,
        loginMethod: metadata.loginMethod,
        timestamp: metadata.timestamp
      });

      this.logger.info('User login event processed', {
        userId: user.id,
        email: user.email
      });

    } catch (error) {
      this.logger.error('Error handling user login event:', error);
    }
  }

  /**
   * Handle user logout event
   * @param {Object} eventData - User logout event data
   */
  handleUserLogout(eventData) {
    try {
      const { userId, sessionId, metadata } = eventData;
      
      // Disconnect user's socket connections
      this.socketService.disconnectUser(userId);

      // Broadcast to admins for monitoring
      this.socketService.broadcastToAdmins('user_logout_activity', {
        userId,
        sessionId,
        logoutType: metadata.logoutType,
        sessionDuration: metadata.sessionDuration,
        timestamp: metadata.timestamp
      });

      this.logger.info('User logout event processed', {
        userId,
        logoutType: metadata.logoutType
      });

    } catch (error) {
      this.logger.error('Error handling user logout event:', error);
    }
  }

  /**
   * Handle password changed event
   * @param {Object} eventData - Password changed event data
   */
  handlePasswordChanged(eventData) {
    try {
      const { userId, changedBy, metadata } = eventData;
      
      // Notify the user if password was changed by admin
      if (changedBy !== userId) {
        this.socketService.sendToUser(userId, 'password_changed_by_admin', {
          changedBy,
          timestamp: metadata.timestamp
        });
      }

      // Broadcast to admins
      this.socketService.broadcastToAdmins('user_password_changed', {
        userId,
        changedBy,
        changeType: metadata.changeType,
        timestamp: metadata.timestamp
      });

      this.logger.info('Password changed event processed', {
        userId,
        changedBy,
        changeType: metadata.changeType
      });

    } catch (error) {
      this.logger.error('Error handling password changed event:', error);
    }
  }

  /**
   * Handle role changed event
   * @param {Object} eventData - Role changed event data
   */
  handleRoleChanged(eventData) {
    try {
      const { userId, previousRole, newRole, changedBy, metadata } = eventData;
      
      // Notify the user of role change
      this.socketService.sendToUser(userId, 'role_changed', {
        previousRole,
        newRole,
        changedBy,
        timestamp: metadata.timestamp
      });

      // Broadcast to all users (role changes affect permissions)
      this.socketService.broadcastToAll('user_role_changed', {
        userId,
        newRole,
        timestamp: metadata.timestamp
      });

      this.logger.info('Role changed event processed', {
        userId,
        previousRole,
        newRole,
        changedBy
      });

    } catch (error) {
      this.logger.error('Error handling role changed event:', error);
    }
  }

  /**
   * Handle category created event
   * @param {Object} eventData - Category created event data
   */
  handleCategoryCreated(eventData) {
    try {
      const { category, userId, metadata } = eventData;
      
      // Broadcast to all authenticated users
      this.socketService.broadcastToAll('category_created', {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        createdBy: category.createdBy,
        createdAt: category.createdAt
      });

      this.logger.info('Category created event broadcasted', {
        categoryId: category.id,
        name: category.name,
        userId
      });

    } catch (error) {
      this.logger.error('Error handling category created event:', error);
    }
  }

  /**
   * Handle category updated event
   * @param {Object} eventData - Category updated event data
   */
  handleCategoryUpdated(eventData) {
    try {
      const { category, previousData, userId, metadata } = eventData;
      
      // Broadcast to all authenticated users
      this.socketService.broadcastToAll('category_updated', {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        updatedBy: category.updatedBy,
        updatedAt: category.updatedAt,
        changedFields: metadata.changedFields
      });

      this.logger.info('Category updated event broadcasted', {
        categoryId: category.id,
        name: category.name,
        userId,
        changedFields: metadata.changedFields
      });

    } catch (error) {
      this.logger.error('Error handling category updated event:', error);
    }
  }

  /**
   * Handle category deleted event
   * @param {Object} eventData - Category deleted event data
   */
  handleCategoryDeleted(eventData) {
    try {
      const { categoryId, categoryData, userId, metadata } = eventData;
      
      // Broadcast to all authenticated users
      this.socketService.broadcastToAll('category_deleted', {
        categoryId,
        name: categoryData.name,
        passwordCount: categoryData.passwordCount
      });

      this.logger.info('Category deleted event broadcasted', {
        categoryId,
        name: categoryData.name,
        userId
      });

    } catch (error) {
      this.logger.error('Error handling category deleted event:', error);
    }
  }

  /**
   * Get event handler statistics
   * @returns {Object} Handler statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      eventListeners: this.eventBus.getEvents().length,
      handledEvents: [
        ...Object.values(PasswordEvents),
        ...Object.values(AuthEvents),
        ...Object.values(SystemEvents)
      ].filter(event => this.eventBus.listenerCount(event) > 0)
    };
  }

  /**
   * Dispose of the event handler
   */
  dispose() {
    try {
      // Remove all event listeners
      Object.values(PasswordEvents).forEach(event => {
        this.eventBus.removeAllListeners(event);
      });
      
      Object.values(AuthEvents).forEach(event => {
        this.eventBus.removeAllListeners(event);
      });
      
      Object.values(SystemEvents).forEach(event => {
        this.eventBus.removeAllListeners(event);
      });

      this.isInitialized = false;
      this.logger.info('Real-time event handler disposed');

    } catch (error) {
      this.logger.error('Error disposing real-time event handler:', error);
    }
  }
}

module.exports = RealtimeEventHandler;
