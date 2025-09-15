import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { securityLogger, session } from '../utils/security';

/**
 * Security Context for VTRIA ERP
 * Provides centralized security state management
 */

// Initial security state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
  refreshToken: null,
  permissions: [],
  securityLevel: 'low',
  sessionValid: false,
  lastActivity: null,
  securityEvents: [],
  loginAttempts: 0,
  isLocked: false,
  lockExpiry: null
};

// Security action types
const SECURITY_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  UPDATE_ACTIVITY: 'UPDATE_ACTIVITY',
  LOCK_ACCOUNT: 'LOCK_ACCOUNT',
  UNLOCK_ACCOUNT: 'UNLOCK_ACCOUNT',
  ADD_SECURITY_EVENT: 'ADD_SECURITY_EVENT',
  CLEAR_SECURITY_EVENTS: 'CLEAR_SECURITY_EVENTS',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
};

// Security reducer
const securityReducer = (state, action) => {
  switch (action.type) {
    case SECURITY_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case SECURITY_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        permissions: action.payload.permissions || [],
        securityLevel: calculateSecurityLevel(action.payload.user),
        sessionValid: true,
        lastActivity: Date.now(),
        loginAttempts: 0,
        isLocked: false,
        lockExpiry: null
      };

    case SECURITY_ACTIONS.LOGIN_FAILED:
      const newAttempts = state.loginAttempts + 1;
      const shouldLock = newAttempts >= 5;
      
      return {
        ...state,
        isLoading: false,
        loginAttempts: newAttempts,
        isLocked: shouldLock,
        lockExpiry: shouldLock ? Date.now() + (15 * 60 * 1000) : null // 15 minutes
      };

    case SECURITY_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };

    case SECURITY_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        lastActivity: Date.now()
      };

    case SECURITY_ACTIONS.UPDATE_ACTIVITY:
      return {
        ...state,
        lastActivity: Date.now()
      };

    case SECURITY_ACTIONS.LOCK_ACCOUNT:
      return {
        ...state,
        isLocked: true,
        lockExpiry: Date.now() + (action.payload.duration || 15 * 60 * 1000)
      };

    case SECURITY_ACTIONS.UNLOCK_ACCOUNT:
      return {
        ...state,
        isLocked: false,
        lockExpiry: null,
        loginAttempts: 0
      };

    case SECURITY_ACTIONS.ADD_SECURITY_EVENT:
      return {
        ...state,
        securityEvents: [
          ...state.securityEvents.slice(-99), // Keep last 100 events
          {
            ...action.payload,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
          }
        ]
      };

    case SECURITY_ACTIONS.CLEAR_SECURITY_EVENTS:
      return {
        ...state,
        securityEvents: []
      };

    case SECURITY_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload
      };

    case SECURITY_ACTIONS.SESSION_EXPIRED:
      return {
        ...initialState,
        isLoading: false,
        securityEvents: [
          ...state.securityEvents,
          {
            type: 'session_expired',
            message: 'Session has expired',
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
          }
        ]
      };

    default:
      return state;
  }
};

// Helper function to calculate security level
const calculateSecurityLevel = (user) => {
  const roleWeights = {
    director: 'high',
    admin: 'high',
    'sales-admin': 'medium',
    designer: 'medium',
    accounts: 'high',
    technician: 'low'
  };
  
  return roleWeights[user?.role] || 'low';
};

// Create contexts
const SecurityContext = createContext();
const SecurityDispatchContext = createContext();

/**
 * Security Provider Component
 */
export const SecurityProvider = ({ children }) => {
  const [state, dispatch] = useReducer(securityReducer, initialState);

  // Initialize security context on mount
  useEffect(() => {
    initializeSecurity();
  }, []);

  // Check for account unlock
  useEffect(() => {
    if (state.isLocked && state.lockExpiry && Date.now() > state.lockExpiry) {
      dispatch({ type: SECURITY_ACTIONS.UNLOCK_ACCOUNT });
    }
  }, [state.isLocked, state.lockExpiry]);

  // Session timeout check
  useEffect(() => {
    let timeoutId;

    if (state.isAuthenticated && state.lastActivity) {
      const sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
      const timeRemaining = sessionTimeout - (Date.now() - state.lastActivity);

      if (timeRemaining > 0) {
        timeoutId = setTimeout(() => {
          dispatch({ type: SECURITY_ACTIONS.SESSION_EXPIRED });
          securityLogger.log('session_timeout', { userId: state.user?.id });
        }, timeRemaining);
      } else {
        dispatch({ type: SECURITY_ACTIONS.SESSION_EXPIRED });
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state.isAuthenticated, state.lastActivity, state.user]);

  /**
   * Initialize security context
   */
  const initializeSecurity = async () => {
    try {
      dispatch({ type: SECURITY_ACTIONS.SET_LOADING, payload: true });

      // Check for existing session
      const storedUser = session.getItem('user');
      const storedToken = session.getItem('token');
      const storedRefreshToken = session.getItem('refreshToken');

      if (storedUser && storedToken) {
        // Validate session with server
        const isValid = await validateSession(storedToken);

        if (isValid) {
          // Fetch user permissions
          const permissions = await fetchUserPermissions(storedToken);

          dispatch({
            type: SECURITY_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: storedUser,
              token: storedToken,
              refreshToken: storedRefreshToken,
              permissions
            }
          });

          securityLogger.log('session_restored', { userId: storedUser.id });
        } else {
          // Invalid session, try refresh token
          const refreshed = await attemptTokenRefresh(storedRefreshToken);
          
          if (!refreshed) {
            clearSecurityData();
            dispatch({ type: SECURITY_ACTIONS.LOGOUT });
          }
        }
      } else {
        dispatch({ type: SECURITY_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('Security initialization failed:', error);
      clearSecurityData();
      dispatch({ type: SECURITY_ACTIONS.LOGOUT });
    }
  };

  /**
   * Validate session with server
   */
  const validateSession = async (token) => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  };

  /**
   * Fetch user permissions from server
   */
  const fetchUserPermissions = async (token) => {
    try {
      const response = await fetch('/api/auth/permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { permissions } = await response.json();
        return permissions || [];
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }

    return [];
  };

  /**
   * Attempt to refresh authentication token
   */
  const attemptTokenRefresh = async (refreshToken) => {
    try {
      if (!refreshToken) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const { token, refreshToken: newRefreshToken, user, permissions } = await response.json();

        // Update session storage
        session.setItem('token', token);
        session.setItem('refreshToken', newRefreshToken);

        dispatch({
          type: SECURITY_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user,
            token,
            refreshToken: newRefreshToken,
            permissions
          }
        });

        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  };

  /**
   * Clear all security data
   */
  const clearSecurityData = () => {
    session.clear();
  };

  // Security actions object
  const securityActions = {
    /**
     * Login with credentials
     */
    login: async (credentials) => {
      try {
        dispatch({ type: SECURITY_ACTIONS.SET_LOADING, payload: true });

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(credentials)
        });

        if (response.ok) {
          const data = await response.json();

          // Store session data
          session.setItem('user', data.user);
          session.setItem('token', data.token);
          session.setItem('refreshToken', data.refreshToken);

          dispatch({
            type: SECURITY_ACTIONS.LOGIN_SUCCESS,
            payload: data
          });

          dispatch({
            type: SECURITY_ACTIONS.ADD_SECURITY_EVENT,
            payload: {
              type: 'login_success',
              message: 'User logged in successfully',
              userId: data.user.id
            }
          });

          return { success: true, user: data.user };
        } else {
          const error = await response.json();
          
          dispatch({ type: SECURITY_ACTIONS.LOGIN_FAILED });
          
          dispatch({
            type: SECURITY_ACTIONS.ADD_SECURITY_EVENT,
            payload: {
              type: 'login_failed',
              message: error.message || 'Login failed',
              details: { email: credentials.email }
            }
          });

          throw new Error(error.message || 'Login failed');
        }
      } catch (error) {
        dispatch({ type: SECURITY_ACTIONS.LOGIN_FAILED });
        throw error;
      }
    },

    /**
     * Logout user
     */
    logout: async () => {
      try {
        const token = state.token;

        // Notify server
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }

        dispatch({
          type: SECURITY_ACTIONS.ADD_SECURITY_EVENT,
          payload: {
            type: 'logout',
            message: 'User logged out',
            userId: state.user?.id
          }
        });

        clearSecurityData();
        dispatch({ type: SECURITY_ACTIONS.LOGOUT });
      } catch (error) {
        console.error('Logout failed:', error);
        // Force logout even if server call fails
        clearSecurityData();
        dispatch({ type: SECURITY_ACTIONS.LOGOUT });
      }
    },

    /**
     * Refresh authentication token
     */
    refreshToken: async () => {
      return await attemptTokenRefresh(state.refreshToken);
    },

    /**
     * Update user activity
     */
    updateActivity: () => {
      dispatch({ type: SECURITY_ACTIONS.UPDATE_ACTIVITY });
    },

    /**
     * Add security event
     */
    addSecurityEvent: (event) => {
      dispatch({
        type: SECURITY_ACTIONS.ADD_SECURITY_EVENT,
        payload: event
      });
    },

    /**
     * Clear security events
     */
    clearSecurityEvents: () => {
      dispatch({ type: SECURITY_ACTIONS.CLEAR_SECURITY_EVENTS });
    }
  };

  return (
    <SecurityContext.Provider value={state}>
      <SecurityDispatchContext.Provider value={securityActions}>
        {children}
      </SecurityDispatchContext.Provider>
    </SecurityContext.Provider>
  );
};

/**
 * Hook to access security state
 */
export const useSecurityState = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityState must be used within a SecurityProvider');
  }
  return context;
};

/**
 * Hook to access security actions
 */
export const useSecurityActions = () => {
  const context = useContext(SecurityDispatchContext);
  if (context === undefined) {
    throw new Error('useSecurityActions must be used within a SecurityProvider');
  }
  return context;
};

/**
 * Combined hook for security state and actions
 */
export const useSecurityContext = () => {
  return {
    ...useSecurityState(),
    ...useSecurityActions()
  };
};

export default SecurityContext;