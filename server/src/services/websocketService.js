/**
 * WebSocket Service for VTRIA ERP
 * Handles real-time notifications and events using Socket.IO
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socketId -> userId
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupAuthentication();
    this.setupConnectionHandlers();

    logger.info('WebSocket service initialized');
  }
  
  /**
   * Alias for initialize() for compatibility
   * @param {Object} server - HTTP server instance
   */
  init(server) {
    return this.initialize(server);
  }

  /**
   * Setup authentication middleware for Socket.IO
   */
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: Token not provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database to ensure they exist and are active
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        if (!user.is_active) {
          return next(new Error('Authentication error: User account is inactive'));
        }

        // Attach user data to socket
        socket.user = {
          id: user.id,
          email: user.email,
          role: decoded.role,
          location_id: user.location_id
        };

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.user.id;
      
      // Add socket to user's socket collection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);
      this.socketUsers.set(socket.id, userId);
      
      logger.info(`User ${userId} connected with socket ${socket.id}`);
      
      // Join user to their own room for targeted messages
      socket.join(`user:${userId}`);
      
      // Join location room for location-specific broadcasts
      if (socket.user.location_id) {
        socket.join(`location:${socket.user.location_id}`);
      }
      
      // Join role-based room
      if (socket.user.role) {
        socket.join(`role:${socket.user.role}`);
      }

      // Handle client events
      socket.on('notification:read', (notificationId) => {
        // This event can be used to mark notifications as read
        // The actual marking is done via API, this is just for acknowledgment
        logger.debug(`User ${userId} read notification ${notificationId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (this.userSockets.has(userId)) {
          this.userSockets.get(userId).delete(socket.id);
          
          // Clean up if no more sockets for this user
          if (this.userSockets.get(userId).size === 0) {
            this.userSockets.delete(userId);
          }
        }
        
        this.socketUsers.delete(socket.id);
        logger.info(`User ${userId} disconnected from socket ${socket.id}`);
      });
    });
  }

  /**
   * Send notification to a specific user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   */
  sendToUser(userId, notification) {
    try {
      this.io.to(`user:${userId}`).emit('notification', notification);
      logger.debug(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Error sending notification to user ${userId}:`, error);
    }
  }

  /**
   * Send notification to users with a specific role
   * @param {string} role - Role name
   * @param {Object} notification - Notification data
   */
  sendToRole(role, notification) {
    try {
      this.io.to(`role:${role}`).emit('notification', notification);
      logger.debug(`Notification sent to role ${role}`);
    } catch (error) {
      logger.error(`Error sending notification to role ${role}:`, error);
    }
  }

  /**
   * Send notification to users in a specific location
   * @param {string} locationId - Location ID
   * @param {Object} notification - Notification data
   */
  sendToLocation(locationId, notification) {
    try {
      this.io.to(`location:${locationId}`).emit('notification', notification);
      logger.debug(`Notification sent to location ${locationId}`);
    } catch (error) {
      logger.error(`Error sending notification to location ${locationId}:`, error);
    }
  }

  /**
   * Broadcast notification to all connected users
   * @param {Object} notification - Notification data
   */
  broadcast(notification) {
    try {
      this.io.emit('notification', notification);
      logger.debug('Notification broadcasted to all users');
    } catch (error) {
      logger.error('Error broadcasting notification:', error);
    }
  }

  /**
   * Send system event to a specific user
   * @param {string} userId - User ID
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  sendEvent(userId, eventType, data) {
    try {
      this.io.to(`user:${userId}`).emit(eventType, data);
      logger.debug(`Event ${eventType} sent to user ${userId}`);
    } catch (error) {
      logger.error(`Error sending event ${eventType} to user ${userId}:`, error);
    }
  }

  /**
   * Get online status of users
   * @param {Array} userIds - Array of user IDs
   * @returns {Object} - Map of user IDs to online status
   */
  getUsersOnlineStatus(userIds) {
    const onlineStatus = {};
    
    for (const userId of userIds) {
      onlineStatus[userId] = this.userSockets.has(userId);
    }
    
    return onlineStatus;
  }

  /**
   * Get count of online users
   * @returns {number} - Count of online users
   */
  getOnlineUsersCount() {
    return this.userSockets.size;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;
