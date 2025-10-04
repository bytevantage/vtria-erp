/**
 * Auth Header Service
 * Handles the creation of authentication headers for API requests
 */

type User = {
  accessToken: string;
  // Add other user properties as needed
};

/**
 * Returns the auth header with JWT token
 * @returns {Object} Authorization header or empty object if no user is logged in
 */
export default function authHeader(): { [key: string]: string } {
  // Get user from local storage
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    return {};
  }

  try {
    const user: User = JSON.parse(userStr);
    
    if (user && user.accessToken) {
      return { 'Authorization': 'Bearer ' + user.accessToken };
    }
    
    return {};
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return {};
  }
}

/**
 * Returns the content type header for JSON
 * @returns {Object} Content-Type header
 */
export function jsonContentHeader(): { [key: string]: string } {
  return { 'Content-Type': 'application/json' };
}

/**
 * Returns headers for file uploads
 * @returns {Object} Headers for file upload
 */
export function fileUploadHeaders(): { [key: string]: string } {
  return {
    ...authHeader(),
    // Don't set Content-Type here - it will be set by the browser with the correct boundary
    'Accept': 'application/json'
  };
}
