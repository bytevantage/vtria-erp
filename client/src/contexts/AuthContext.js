/**
 * Authentication Context for VTRIA ERP
 * Manages user authentication state and JWT tokens
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  UPDATE_USER: 'UPDATE_USER'
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('vtria_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);

        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Get user profile
          fetchUserProfile(token);
        } else {
          // Token expired, remove it
          localStorage.removeItem('vtria_token');
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('vtria_token');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Add axios interceptor to handle 401 responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired, logout user
          console.log('401 error detected, logging out user');
          localStorage.removeItem('vtria_token');
          delete axios.defaults.headers.common['Authorization'];
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          toast.error('Session expired. Please log in again.');

          // Force redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/vtria-erp/login';
          }, 1000);
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get('/api/auth/me');
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.data.data.user,
          token
        }
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);

      // Clear invalid token and redirect to login
      localStorage.removeItem('vtria_token');
      delete axios.defaults.headers.common['Authorization'];
      dispatch({ type: AUTH_ACTIONS.LOGOUT });

      if (error.response && error.response.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to authenticate. Please log in again.');
      }
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      // Make API call to validate license
      const response = await axios.post('/api/auth/login', {
        email,
        password
      }, {
        headers: {
          'X-License-Key': process.env.REACT_APP_LICENSE_KEY || localStorage.getItem('vtria_license_key')
        }
      });

      const { token, user } = response.data.data;

      // Store token in localStorage
      localStorage.setItem('vtria_token', token);

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Update state
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token }
      });

      toast.success(`Welcome back, ${user.first_name}!`);
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      const message = error.response?.data?.error?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('vtria_token');
    delete axios.defaults.headers.common['Authorization'];
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  // Check if user has specific role
  const hasRole = (roleName) => {
    if (!state.user) return false;
    return state.user.role === roleName;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roleNames) => {
    if (!state.user) return false;
    return roleNames.includes(state.user.role);
  };

  // Get user's role level for permission hierarchy
  const getRoleLevel = () => {
    if (!state.user) return 0;
    const roleLevels = {
      'user': 1,
      'engineer': 2,
      'sales_admin': 3,
      'manager': 4,
      'director': 5
    };
    return roleLevels[state.user.role] || 0;
  };

  // Check if user can access all locations
  const canAccessAllLocations = () => {
    return hasAnyRole(['director', 'manager']);
  };

  // Check if user can manage queues
  const canManageQueues = () => {
    return hasAnyRole(['director', 'manager', 'sales_admin']);
  };

  // Check if user can view all cases/tickets
  const canViewAllItems = () => {
    return hasAnyRole(['director', 'manager']);
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
    getRoleLevel,
    canAccessAllLocations,
    canManageQueues,
    canViewAllItems
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
