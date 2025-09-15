import axios from 'axios';

// License server configuration
const LICENSE_SERVER_URL = process.env.REACT_APP_LICENSE_SERVER_URL || 'https://api.bytevantage.in';
const API_BASE_URL = 'http://localhost:3001';

// Create axios instance for license server
const licenseAPI = axios.create({
  baseURL: LICENSE_SERVER_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for main API server
const mainAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

class LicenseService {
  constructor() {
    this.licenseKey = localStorage.getItem('vtria_license_key');
    this.licenseData = JSON.parse(localStorage.getItem('vtria_license_data') || 'null');
    this.setupInterceptors();
  }

  // Setup axios interceptors for automatic license validation
  setupInterceptors() {
    // Request interceptor to add license key to headers
    mainAPI.interceptors.request.use(
      (config) => {
        if (this.licenseKey) {
          config.headers['X-License-Key'] = this.licenseKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle license errors
    mainAPI.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && error.response?.data?.error?.includes('license')) {
          this.clearLicense();
          window.location.reload();
        }
        return Promise.reject(error);
      }
    );
  }

  // Validate license key with ByteVantage server
  async validateLicense(licenseKey, clientId = 'VTRIA-ERP-CLIENT') {
    try {
      console.log('Validating license key:', licenseKey);
      
      const response = await licenseAPI.post('/api/admin/validate-license', {
        license_key: licenseKey,
        client_id: clientId,
        client_info: {
          application: 'VTRIA ERP System',
          version: '1.0.0',
          platform: navigator.platform,
          userAgent: navigator.userAgent,
        }
      });

      if (response.data.success) {
        this.licenseKey = licenseKey;
        this.licenseData = response.data.license;
        
        // Store in localStorage
        localStorage.setItem('vtria_license_key', licenseKey);
        localStorage.setItem('vtria_license_data', JSON.stringify(response.data.license));
        
        console.log('License validated successfully:', response.data.license);
        return {
          success: true,
          license: response.data.license,
          message: 'License validated successfully'
        };
      } else {
        throw new Error(response.data.message || 'License validation failed');
      }
    } catch (error) {
      console.error('License validation error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to validate license'
      };
    }
  }

  // Check if license is currently valid
  isLicenseValid() {
    if (!this.licenseKey || !this.licenseData) {
      return false;
    }

    // Check if license has expired
    if (this.licenseData.expires_at) {
      const expiryDate = new Date(this.licenseData.expires_at);
      if (expiryDate < new Date()) {
        console.warn('License has expired:', this.licenseData.expires_at);
        return false;
      }
    }

    // Check license status
    if (this.licenseData.status !== 'active') {
      console.warn('License is not active:', this.licenseData.status);
      return false;
    }

    return true;
  }

  // Get current license information
  getLicenseInfo() {
    return this.licenseData;
  }

  // Get license key
  getLicenseKey() {
    return this.licenseKey;
  }

  // Clear license data (logout)
  clearLicense() {
    this.licenseKey = null;
    this.licenseData = null;
    localStorage.removeItem('vtria_license_key');
    localStorage.removeItem('vtria_license_data');
  }

  // Test connection to license server
  async testConnection() {
    try {
      const response = await licenseAPI.get('/health');
      return {
        success: true,
        message: 'Connected to ByteVantage License Server',
        serverInfo: response.data
      };
    } catch (error) {
      console.error('License server connection error:', error);
      return {
        success: false,
        error: 'Cannot connect to ByteVantage License Server'
      };
    }
  }

  // Refresh license data
  async refreshLicense() {
    if (!this.licenseKey) {
      throw new Error('No license key available');
    }
    
    return await this.validateLicense(this.licenseKey);
  }
}

// Export singleton instance
const licenseService = new LicenseService();
export default licenseService;

// Export axios instances for use in other components
export { mainAPI, licenseAPI };