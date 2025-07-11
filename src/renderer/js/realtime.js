/**
 * Real-time Manager
 * Handles Socket.io connections and real-time updates
 */

class RealtimeManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
    }

    /**
     * Initialize real-time connection
     * Note: Socket connection is already established during login process
     * This method only sets up event handlers for the existing connection
     */
    async init(token) {
        console.log('Realtime Manager: Initializing event handlers...');

        // In browser environment, we'll use a simpler approach
        if (typeof window !== 'undefined' && !window.electronAPI) {
            console.log('Realtime Manager: Browser environment detected, using polling fallback');
            this.initPollingFallback();
            return;
        }

        try {
            // Check if socket is already connected (it should be from login)
            const status = await electronAPI.getSocketStatus();

            if (status.connected) {
                console.log('Realtime Manager: Using existing socket connection');
                this.isConnected = true;
                this.setupEventHandlers();
            } else {
                console.log('Realtime Manager: No existing socket connection, falling back to polling');
                this.initPollingFallback();
            }
        } catch (error) {
            console.error('Realtime Manager: Error checking socket status:', error);
            this.initPollingFallback();
        }
    }

    /**
     * Setup event handlers for real-time updates
     */
    setupEventHandlers() {
        if (!window.electronAPI) return;

        // Listen for real-time events from Electron
        electronAPI.onPasswordCreated((data) => {
            console.log('Realtime: Password created:', data);
            this.emit('password:created', data);
        });

        electronAPI.onPasswordUpdated((data) => {
            console.log('Realtime: Password updated:', data);
            this.emit('password:updated', data);
        });

        electronAPI.onPasswordDeleted((data) => {
            console.log('Realtime: Password deleted:', data);
            this.emit('password:deleted', data);
        });

        electronAPI.onUserOnline((data) => {
            console.log('Realtime: User online:', data);
            this.emit('user:online', data);
        });

        electronAPI.onUserOffline((data) => {
            console.log('Realtime: User offline:', data);
            this.emit('user:offline', data);
        });

        electronAPI.onEditConflict((data) => {
            console.log('Realtime: Edit conflict:', data);
            this.emit('edit:conflict', data);
        });
    }

    /**
     * Initialize polling fallback for browser environment
     */
    initPollingFallback() {
        console.log('Realtime Manager: Using polling fallback');
        
        // Set up periodic data refresh
        this.pollInterval = setInterval(() => {
            this.refreshData();
        }, 30000); // Refresh every 30 seconds

        this.isConnected = true;
    }

    /**
     * Refresh data in polling mode
     */
    async refreshData() {
        try {
            // Emit refresh events to trigger data reload
            this.emit('data:refresh', { type: 'passwords' });
            this.emit('data:refresh', { type: 'users' });
        } catch (error) {
            console.error('Realtime Manager: Error refreshing data:', error);
        }
    }

    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remove event listener
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to all listeners
     */
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Realtime Manager: Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Disconnect from real-time service
     */
    disconnect() {
        console.log('Realtime Manager: Disconnecting...');
        
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.isConnected = false;
        this.eventHandlers.clear();
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            mode: this.pollInterval ? 'polling' : 'socket'
        };
    }

    /**
     * Send real-time notification
     */
    notify(type, message, data = {}) {
        console.log(`Realtime notification [${type}]:`, message, data);
        
        // Emit notification event
        this.emit('notification', {
            type,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
}

// Create global instance
window.realtimeManager = new RealtimeManager();
