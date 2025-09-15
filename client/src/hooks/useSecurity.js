import { useState, useEffect, useContext, useCallback } from 'react';
import { ROLES, permissions, securityLogger, session, validate } from '../utils/security';

/**
 * Custom hook for security-related functionality
 * Provides authentication, authorization, and security utilities
 */
export const useSecurity = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [securityContext, setSecurityContext] = useState({
    sessionValid: false,
    lastActivity: null,
    securityLevel: 'low'
  });

  /**
   * Initialize security context on mount
   */
  useEffect(() => {
    initializeSecurity();
  }, []);

  /**
   * Initialize security context
   */
  const initializeSecurity = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check for existing session
      const storedUser = session.getItem('user');
      const storedToken = session.getItem('token');
      
      if (storedUser && storedToken) {
        // Validate session with server
        const isValid = await validateSession(storedToken);
        
        if (isValid) {
          setUser(storedUser);
          setIsAuthenticated(true);
          setSecurityContext(prev => ({
            ...prev,
            sessionValid: true,
            lastActivity: Date.now(),
            securityLevel: calculateSecurityLevel(storedUser)
          }));
          
          securityLogger.log('session_restored', { userId: storedUser.id });
        } else {
          // Invalid session, clear storage
          clearSession();
          securityLogger.log('session_invalid', { userId: storedUser.id });
        }
      }
    } catch (error) {
      console.error('Security initialization failed:', error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

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
   * Calculate security level based on user role and context
   */
  const calculateSecurityLevel = (userData) => {
    const roleWeights = {
      [ROLES.DIRECTOR]: 'high',
      [ROLES.ADMIN]: 'high',
      [ROLES.SALES_ADMIN]: 'medium',
      [ROLES.DESIGNER]: 'medium',
      [ROLES.ACCOUNTS]: 'high',
      [ROLES.TECHNICIAN]: 'low'
    };
    
    return roleWeights[userData.role] || 'low';
  };

  /**
   * Login user with credentials
   */
  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      
      // Validate input
      if (!validate.email(credentials.email)) {
        throw new Error('Invalid email format');
      }
      
      // Attempt login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const error = await response.json();
        securityLogger.log('login_failed', { 
          email: credentials.email,
          reason: error.message 
        });
        throw new Error(error.message || 'Login failed');
      }
      
      const { user: userData, token, refreshToken } = await response.json();
      
      // Store session data
      session.setItem('user', userData);
      session.setItem('token', token);
      session.setItem('refreshToken', refreshToken);
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      setSecurityContext({
        sessionValid: true,
        lastActivity: Date.now(),
        securityLevel: calculateSecurityLevel(userData)
      });
      
      securityLogger.log('login_success', { userId: userData.id });
      
      return { success: true, user: userData };
    } catch (error) {
      securityLogger.log('login_error', { error: error.message });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user and clear session
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = session.getItem('token');
      
      // Notify server of logout
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Server logout failed:', error);
        }
      }
      
      securityLogger.log('logout', { userId: user?.id });
      
      // Clear local session
      clearSession();
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Force clear session even if server call fails
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Clear all session data
   */
  const clearSession = useCallback(() => {
    session.clear();
    setUser(null);
    setIsAuthenticated(false);
    setSecurityContext({
      sessionValid: false,
      lastActivity: null,
      securityLevel: 'low'
    });
  }, []);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((action, resource = {}) => {
    if (!user || !isAuthenticated) return false;
    
    return permissions.canPerformAction(action, user, resource);
  }, [user, isAuthenticated]);

  /**
   * Check if user has specific role or higher
   */
  const hasRole = useCallback((requiredRole) => {
    if (!user || !isAuthenticated) return false;
    
    return permissions.hasRole(user.role, requiredRole);
  }, [user, isAuthenticated]);

  /**
   * Check if user can access specific location
   */
  const canAccessLocation = useCallback((location) => {
    if (!user || !isAuthenticated) return false;
    
    return permissions.canAccessLocation(user.location, location, user.role);
  }, [user, isAuthenticated]);

  /**
   * Update user activity timestamp
   */
  const updateActivity = useCallback(() => {
    setSecurityContext(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
  }, []);

  /**
   * Check if session is about to expire
   */
  const isSessionExpiring = useCallback(() => {
    if (!securityContext.lastActivity) return false;
    
    const sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
    const warningTime = 15 * 60 * 1000; // 15 minutes before expiry
    const timeSinceActivity = Date.now() - securityContext.lastActivity;
    
    return timeSinceActivity > (sessionTimeout - warningTime);
  }, [securityContext.lastActivity]);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = session.getItem('refreshToken');
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const { token, refreshToken: newRefreshToken } = await response.json();
      
      // Update stored tokens
      session.setItem('token', token);
      session.setItem('refreshToken', newRefreshToken);
      
      updateActivity();
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      securityLogger.log('token_refresh_failed', { error: error.message });
      
      // Force logout on refresh failure
      logout();
      return false;
    }
  }, [logout, updateActivity]);

  /**
   * Validate user input for security
   */
  const validateInput = useCallback((input, type) => {
    switch (type) {
      case 'email':
        return validate.email(input);
      case 'password':
        return validate.password(input);
      case 'file':
        return validate.file(input);
      default:
        return { isValid: true };
    }
  }, []);

  /**
   * Log security event
   */
  const logSecurityEvent = useCallback((event, details = {}) => {
    securityLogger.log(event, {
      userId: user?.id,
      userRole: user?.role,
      ...details
    });
  }, [user]);

  /**
   * Get current security status
   */
  const getSecurityStatus = useCallback(() => {
    return {
      isAuthenticated,
      user,
      securityLevel: securityContext.securityLevel,
      sessionValid: securityContext.sessionValid,
      isSessionExpiring: isSessionExpiring(),
      lastActivity: securityContext.lastActivity
    };
  }, [isAuthenticated, user, securityContext, isSessionExpiring]);

  return {
    // Authentication state
    user,
    isAuthenticated,
    isLoading,
    
    // Authentication methods
    login,
    logout,
    refreshToken,
    
    // Permission checking
    hasPermission,
    hasRole,
    canAccessLocation,
    
    // Security utilities
    validateInput,
    logSecurityEvent,
    updateActivity,
    getSecurityStatus,
    
    // Security context
    securityContext,
    isSessionExpiring: isSessionExpiring()
  };
};

/**
 * Hook for component-level security
 */
export const useComponentSecurity = (requiredPermissions = []) => {
  const security = useSecurity();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuthorization();
  }, [security.isAuthenticated, security.user, requiredPermissions]);

  const checkAuthorization = () => {
    setChecking(true);
    
    if (!security.isAuthenticated) {
      setAuthorized(false);
      setChecking(false);
      return;
    }

    // Check all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => {
      if (typeof permission === 'string') {
        return security.hasPermission(permission);
      }
      
      if (permission.action) {
        return security.hasPermission(permission.action, permission.resource);
      }
      
      if (permission.role) {
        return security.hasRole(permission.role);
      }
      
      return false;
    });

    setAuthorized(hasAllPermissions);
    setChecking(false);
  };

  return {
    authorized,
    checking,
    security
  };
};

export default useSecurity;