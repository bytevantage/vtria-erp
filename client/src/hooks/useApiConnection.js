import { useState, useEffect, useCallback } from 'react';
import apiConnectionManager from '../utils/apiConnectionManager';

/**
 * React hook for API connection management
 * Provides connection status, retry functionality, and automatic reconnection
 */
export const useApiConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    url: null,
    error: null,
    loading: true,
    lastCheck: null,
  });

  const [isRetrying, setIsRetrying] = useState(false);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));
      const status = await apiConnectionManager.getApiStatus();
      setConnectionStatus({
        connected: status.connected,
        url: status.url || null,
        error: status.error || null,
        loading: false,
        lastCheck: status.lastCheck,
      });
    } catch (error) {
      setConnectionStatus({
        connected: false,
        url: null,
        error: error.message,
        loading: false,
        lastCheck: new Date().toISOString(),
      });
    }
  }, []);

  // Retry connection
  const retryConnection = useCallback(async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      await apiConnectionManager.forceReconnect();
      await checkConnection();
    } catch (error) {
      console.error('Retry connection failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, checkConnection]);

  // Make API request with built-in retry logic
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    return await apiConnectionManager.fetch(endpoint, options);
  }, []);

  // Enhanced fetch that returns parsed JSON
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const response = await apiRequest(endpoint, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }, [apiRequest]);

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Periodic connection health check
  useEffect(() => {
    const interval = setInterval(checkConnection, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    // Connection status
    ...connectionStatus,
    
    // Actions
    checkConnection,
    retryConnection,
    isRetrying,
    
    // API methods
    apiRequest,
    apiCall,
    
    // Utility methods
    isOnline: connectionStatus.connected && !connectionStatus.loading,
    hasError: !!connectionStatus.error,
  };
};