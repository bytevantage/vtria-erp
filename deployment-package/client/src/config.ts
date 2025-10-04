/**
 * Application Configuration
 * Contains all the environment-specific configuration values
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_HR_MODULE: true,
  ENABLE_INVENTORY_MODULE: true,
  ENABLE_FINANCE_MODULE: true,
  ENABLE_REPORTING_MODULE: true,
};

// Application Settings
export const APP_CONFIG = {
  APP_NAME: 'VTRIA ERP',
  APP_VERSION: '1.0.0',
  DEFAULT_PAGE_SIZE: 10,
  DATE_FORMAT: 'dd/MM/yyyy',
  DATE_TIME_FORMAT: 'dd/MM/yyyy HH:mm',
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
  },
  HR: {
    EMPLOYEES: '/api/v1/hr/employees',
    DEPARTMENTS: '/api/v1/hr/departments',
    DOCUMENTS: '/api/v1/hr/documents',
    SKILLS: '/api/v1/hr/skills',
    LEAVE_BALANCE: '/api/v1/hr/leave-balance',
    EMERGENCY_CONTACTS: '/api/v1/hr/emergency-contacts',
  },
  INVENTORY: {
    ITEMS: '/api/inventory/items',
    CATEGORIES: '/api/inventory/categories',
    LOCATIONS: '/api/inventory/locations',
  },
};

// Export all config as default
export default {
  API_BASE_URL,
  FEATURE_FLAGS,
  APP_CONFIG,
  API_ENDPOINTS,
};
