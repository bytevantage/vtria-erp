/**
 * API Service for VTRIA ERP Dashboard
 * Handles all API calls to backend services with authentication and error handling
 */

import axios from 'axios';

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vtria_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add license key to headers
    const licenseKey = process.env.REACT_APP_LICENSE_KEY || localStorage.getItem('vtria_license_key');
    if (licenseKey) {
      config.headers['X-License-Key'] = licenseKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Let AuthContext handle 401 responses globally
    // if (error.response?.status === 401) {
    //   // Token expired or invalid
    //   localStorage.removeItem('vtria_token');
    //   window.location.href = '/login';
    // }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Authentication APIs
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/me'),
    refreshToken: () => apiClient.post('/auth/refresh')
  },

  // Cases APIs
  cases: {
    getAll: (params = {}) => apiClient.get('/cases', { params }),
    getById: (id) => apiClient.get(`/cases/${id}`),
    create: (data) => apiClient.post('/cases', data),
    update: (id, data) => apiClient.put(`/cases/${id}`, data),
    updateStatus: (id, data) => apiClient.put(`/cases/${id}/status`, data),
    assign: (id, data) => apiClient.put(`/cases/${id}/assign`, data),
    pick: (id, data) => apiClient.put(`/cases/${id}/pick`, data),
    reject: (id, data) => apiClient.put(`/cases/${id}/reject`, data),
    close: (id, data) => apiClient.put(`/cases/${id}/close`, data),
    addNote: (id, data) => apiClient.post(`/cases/${id}/notes`, data),
    getNotes: (id, params = {}) => apiClient.get(`/cases/${id}/notes`, { params }),
    getHistory: (id) => apiClient.get(`/cases/${id}/history`),
    getWorkflowData: (id) => apiClient.get(`/cases/${id}/workflow`),
    getStats: (params = {}) => apiClient.get('/cases/stats', { params }),
    getOverdue: (params = {}) => apiClient.get('/cases/overdue', { params })
  },

  // Case Queues APIs
  caseQueues: {
    getAll: (params = {}) => apiClient.get('/case-queues', { params }),
    getById: (id) => apiClient.get(`/case-queues/${id}`),
    create: (data) => apiClient.post('/case-queues', data),
    update: (id, data) => apiClient.put(`/case-queues/${id}`, data),
    delete: (id) => apiClient.delete(`/case-queues/${id}`),
    getCases: (id, params = {}) => apiClient.get(`/case-queues/${id}/cases`, { params })
  },

  // Tickets APIs
  tickets: {
    getAll: (params = {}) => apiClient.get('/tickets', { params }),
    getById: (id) => apiClient.get(`/tickets/${id}`),
    create: (data) => apiClient.post('/tickets', data),
    update: (id, data) => apiClient.put(`/tickets/${id}`, data),
    updateStatus: (id, data) => apiClient.put(`/tickets/${id}/status`, data),
    assign: (id, data) => apiClient.put(`/tickets/${id}/assign`, data),
    addNote: (id, data) => apiClient.post(`/tickets/${id}/notes`, data),
    getNotes: (id, params = {}) => apiClient.get(`/tickets/${id}/notes`, { params }),
    getHistory: (id) => apiClient.get(`/tickets/${id}/history`),
    addParts: (id, data) => apiClient.post(`/tickets/${id}/parts`, data),
    getParts: (id) => apiClient.get(`/tickets/${id}/parts`),
    getWarrantyInfo: (serialNumber) => apiClient.get(`/tickets/warranty/${serialNumber}`),
    getWarrantyExpiring: (params = {}) => apiClient.get('/tickets/warranty-expiring', { params }),
    getStats: (params = {}) => apiClient.get('/tickets/stats', { params })
  },

  // Dashboard APIs
  dashboard: {
    getOverview: (params = {}) => apiClient.get('/dashboard/overview', { params }),
    getCaseWorkflow: (params = {}) => apiClient.get('/dashboard/case-workflow', { params }),
    getTicketWorkflow: (params = {}) => apiClient.get('/dashboard/ticket-workflow', { params }),
    getCaseTimeline: (params = {}) => apiClient.get('/dashboard/case-timeline', { params }),
    getTicketTimeline: (params = {}) => apiClient.get('/dashboard/ticket-timeline', { params }),
    getPerformanceMetrics: (params = {}) => apiClient.get('/dashboard/performance', { params })
  },

  // Users APIs
  users: {
    getAll: (params = {}) => apiClient.get('/users', { params }),
    getById: (id) => apiClient.get(`/users/${id}`),
    create: (data) => apiClient.post('/users', data),
    update: (id, data) => apiClient.put(`/users/${id}`, data),
    delete: (id) => apiClient.delete(`/users/${id}`)
  },

  // Locations APIs
  locations: {
    getAll: () => apiClient.get('/locations'),
    getById: (id) => apiClient.get(`/locations/${id}`)
  },

  // Case Management APIs
  caseManagement: {
    getWorkflowProgress: (caseId) => apiClient.get(`/case-management/${caseId}/workflow-progress`),
    getCaseQueue: (params = {}) => apiClient.get('/case-management/assignments/queue', { params }),
    assignCase: (caseId, data) => apiClient.put(`/case-management/assignments/${caseId}/assign`, data),
    unassignCase: (caseId) => apiClient.put(`/case-management/assignments/${caseId}/unassign`),
    getCaseAssignmentHistory: (caseId) => apiClient.get(`/case-management/assignments/${caseId}/history`),
    getAvailableAssignees: (caseId) => apiClient.get(`/case-management/assignments/${caseId}/available-users`)
  },
};

// Utility functions for API responses
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.response.data?.error?.message || 'An error occurred';
    return { success: false, message, status: error.response.status };
  } else if (error.request) {
    // Network error
    return { success: false, message: 'Network error. Please check your connection.', status: 0 };
  } else {
    // Other error
    return { success: false, message: error.message || 'An unexpected error occurred', status: 0 };
  }
};

export const handleApiResponse = (response) => {
  return {
    success: true,
    data: response.data.data || response.data,
    message: response.data.message,
    pagination: response.data.pagination
  };
};

export default apiService;
