import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const APITest = () => {
  const [status, setStatus] = useState('Not tested');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      // Test basic API connection
      const response = await axios.get(`${API_BASE_URL}/`);
      setStatus('✅ API Connection Successful');
      setData(response.data);
    } catch (err) {
      setStatus('❌ API Connection Failed');
      setError(err.message);
      console.error('API Test Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testProducts = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products`);
      setStatus('✅ Products API Successful');
      setData({
        success: response.data.success,
        count: response.data.data?.length || 0,
        firstProduct: response.data.data?.[0]?.name || 'None'
      });
    } catch (err) {
      setStatus('❌ Products API Failed');
      setError(err.message);
      console.error('Products API Test Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        API Connection Test
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={testAPI}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Test Basic API
        </Button>
        
        <Button 
          variant="contained" 
          onClick={testProducts}
          disabled={loading}
          color="secondary"
        >
          Test Products API
        </Button>
      </Box>

      {loading && (
        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
          <CircularProgress size={20} />
          <Typography>Testing...</Typography>
        </Box>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Status: {status}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
      )}

      {data && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Response Data:</Typography>
          <pre style={{ margin: 0, fontSize: '12px' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary">
        API URL: {API_BASE_URL}
      </Typography>
    </Box>
  );
};

export default APITest;
