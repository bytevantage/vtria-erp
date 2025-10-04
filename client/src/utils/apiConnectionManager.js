import { logger } from './logger.js';

/**
 * API Connection Manager
 * Handles dynamic API URL detection and connection retry logic
 */
class ApiConnectionManager {
  constructor() {
    // Always use proxy-compatible URLs since setupProxy.js handles routing
    this.baseUrls = ['']; // Use relative URLs (proxy will handle routing to API)
    this.currentBaseUrl = null;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.healthCheckInterval = null;
  }

  /**
   * Test if a URL is accessible
   * @param {string} url 
   * @returns {Promise<boolean>}
   */
  async testConnection(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Use proxy-compatible health endpoint
      const healthUrl = url === '' ? '/health' : `${url}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.debug(`Connection test failed for ${url}:`, error.message);
      return false;
    }
  }

  /**
   * Find the current active API URL
   * @returns {Promise<string>}
   */
  async findActiveApiUrl() {
    // First check if we have a stored URL that's still working
    if (this.currentBaseUrl) {
      if (await this.testConnection(this.currentBaseUrl)) {
        return this.currentBaseUrl;
      }
    }

    // Check environment variable first
    const envUrl = process.env.REACT_APP_API_URL;
    if (envUrl && await this.testConnection(envUrl)) {
      this.currentBaseUrl = envUrl;
      return envUrl;
    }

    // Test each URL in parallel for faster discovery
    const connectionPromises = this.baseUrls.map(async (url) => {
      const isConnected = await this.testConnection(url);
      return { url, isConnected };
    });

    const results = await Promise.all(connectionPromises);
    const activeUrl = results.find(result => result.isConnected);

    if (activeUrl) {
      this.currentBaseUrl = activeUrl.url;
      logger.log(`✓ API connection established: ${activeUrl.url}`);
      return activeUrl.url;
    }

    throw new Error('No API server found. Please ensure the server is running.');
  }

  /**
   * Enhanced fetch with automatic server discovery and retry logic
   * @param {string} endpoint 
   * @param {object} options 
   * @returns {Promise<Response>}
   */
  async fetch(endpoint, options = {}) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Find active API URL
        const baseUrl = await this.findActiveApiUrl();
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

        // Make the request
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        // If successful, return response
        if (response.ok || response.status < 500) {
          return response;
        }

        // Server error, try again
        lastError = new Error(`Server error: ${response.status}`);

      } catch (error) {
        console.warn(`API request attempt ${attempt} failed:`, error.message);
        lastError = error;

        // Reset current URL if connection failed
        this.currentBaseUrl = null;

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    // All attempts failed
    throw lastError || new Error('API request failed after all retry attempts');
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.currentBaseUrl) {
        const isHealthy = await this.testConnection(this.currentBaseUrl);
        if (!isHealthy) {
          logger.warn('⚠️ API connection lost, will rediscover on next request');
          this.currentBaseUrl = null;
        }
      }
    }, 120000); // Check every 2 minutes (reduced from 30s for better performance)
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get API status information
   * @returns {Promise<object>}
   */
  async getApiStatus() {
    try {
      const baseUrl = await this.findActiveApiUrl();
      const response = await this.fetch('/health');
      const data = await response.json();

      return {
        connected: true,
        url: baseUrl,
        status: data,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnect() {
    this.currentBaseUrl = null;
    return await this.findActiveApiUrl();
  }
}

// Create singleton instance
const apiConnectionManager = new ApiConnectionManager();

// Start health monitoring when module is loaded
apiConnectionManager.startHealthMonitoring();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    apiConnectionManager.stopHealthMonitoring();
  });
}

export default apiConnectionManager;