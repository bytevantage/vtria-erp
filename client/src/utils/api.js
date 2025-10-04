import axios from 'axios';

// Use proxy for all API requests - proxy middleware forwards /api requests to backend
const API_BASE_URL = process.env.DOCKER_ENV === 'true'
    ? '' // Use proxy when in Docker (empty string means relative URLs)
    : ''; // Use proxy in local development too - setupProxy.js handles forwarding

const getAuthHeader = () => {
    // Temporarily bypass auth for debugging
    // const token = localStorage.getItem('vtria_token');
    // return token ? { 'Authorization': `Bearer ${token}` } : {};
    return {}; // No auth header needed when BYPASS_AUTH=true
};

export const apiRequest = async (method, endpoint, data = null, options = {}) => {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                ...getAuthHeader(),
                ...options.headers
            },
            ...options
        };

        // Only include data and Content-Type for methods that typically have a body
        if (data !== null && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.data = data;
            config.headers['Content-Type'] = 'application/json';
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error('API Request Error:', error);
        // Re-throw the error so it can be caught by the calling code
        throw error;
    }
};

export const api = {
    get: (endpoint, options) => apiRequest('GET', endpoint, null, options),
    post: (endpoint, data, options) => apiRequest('POST', endpoint, data, options),
    put: (endpoint, data, options) => apiRequest('PUT', endpoint, data, options),
    delete: (endpoint, options) => apiRequest('DELETE', endpoint, null, options)
};
