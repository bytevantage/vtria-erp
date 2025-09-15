import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Chip,
  Grid,
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import licenseService from '../services/licenseService';

const LicenseValidation = ({ open, onLicenseValidated, onClose }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Test connection on component mount
  useEffect(() => {
    if (open) {
      testConnection();
    }
  }, [open]);

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await licenseService.testConnection();
      setConnectionStatus(result);
    } catch (err) {
      setConnectionStatus({
        success: false,
        error: 'Failed to test connection'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleValidate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await licenseService.validateLicense(licenseKey.trim());
      
      if (result.success) {
        setSuccess(`License validated successfully! Welcome to VTRIA ERP System.`);
        setTimeout(() => {
          onLicenseValidated(result.license);
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred during validation');
      console.error('License validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !loading) {
      handleValidate();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          <SecurityIcon color="primary" />
          <Typography variant="h5" component="div">
            VTRIA ERP License Validation
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Please enter your ByteVantage license key to access VTRIA ERP System
          </Typography>
        </Box>

        {/* Connection Status */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" color="text.primary">
              ByteVantage License Server
            </Typography>
            <Button 
              size="small" 
              onClick={testConnection} 
              disabled={testingConnection}
              startIcon={testingConnection ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>
          
          {connectionStatus && (
            <Box mt={1}>
              {connectionStatus.success ? (
                <Alert 
                  severity="success" 
                  icon={<CheckIcon />}
                  sx={{ '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      {connectionStatus.message}
                    </Typography>
                    <Chip label="Connected" color="success" size="small" />
                  </Box>
                  {connectionStatus.serverInfo && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Server: {connectionStatus.serverInfo.service} v{connectionStatus.serverInfo.version}
                    </Typography>
                  )}
                </Alert>
              ) : (
                <Alert severity="error" icon={<ErrorIcon />}>
                  <Typography variant="body2">
                    {connectionStatus.error}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Please check your internet connection and try again.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        <Divider sx={{ mb: 3 }} />

        {/* License Key Input */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="License Key"
            placeholder="Enter your ByteVantage license key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="outlined"
            autoFocus
            helperText="License key format: XXXX-XXXX-XXXX-XXXX"
            InputProps={{
              style: { fontFamily: 'monospace' }
            }}
          />
        </Box>

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Instructions */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Need a license key?</strong><br />
            Contact VTRIA Engineering Solutions support team or visit the ByteVantage portal to obtain your license key.
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onClose}
              disabled={loading}
            >
              Exit
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleValidate}
              disabled={loading || !licenseKey.trim() || (connectionStatus && !connectionStatus.success)}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SecurityIcon />}
            >
              {loading ? 'Validating...' : 'Validate License'}
            </Button>
          </Grid>
        </Grid>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseValidation;