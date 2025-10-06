/**
 * Authentication utilities for production-ready API calls
 * Handles token management and redirects for unauthorized access
 */

// Get authentication headers for API calls
export const getAuthHeaders = () => {
  const token = localStorage.getItem('vtria_token');

  if (!token) {
    // In production, redirect to login if no token
    if (process.env.NODE_ENV === 'production') {
      window.location.href = '/login';
      return null;
    }
    throw new Error('Authentication token not found. Please login.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('vtria_token');
  if (!token) return false;

  try {
    // Basic token validation (decode JWT to check expiry)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
};

// Handle authentication errors
export const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('vtria_token');
    window.location.href = '/vtria-erp/login';
  }
  throw error;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('vtria_token');
  window.location.href = '/login';
};