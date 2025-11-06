/**
 * License Validation Provider for VTRIA ERP
 * Handles license validation and enforcement across the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import axios from 'axios';
import { redirectWithBase } from '../../utils/pathUtils';

const LicenseContext = createContext();

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

export const LicenseProvider = ({ children }) => {
  const [licenseStatus, setLicenseStatus] = useState({
    valid: false,
    loading: true,
    error: null,
    expiryDate: null,
    daysRemaining: null
  });
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [showInvalidDialog, setShowInvalidDialog] = useState(false);

  useEffect(() => {
    // Set a dummy license key in localStorage immediately on component mount
    localStorage.setItem('vtria_license_key', 'DEVELOPMENT-LICENSE-KEY-2025');
    
    validateLicense();
    
    // Set up periodic license validation (every hour)
    const interval = setInterval(validateLicense, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const validateLicense = async () => {
    try {
      // DEVELOPMENT MODE: Skip actual license validation and use mock data
      console.log('DEVELOPMENT MODE: Using mock license data');
      
      // Set a dummy license key in localStorage to prevent "No license key found" error
      localStorage.setItem('vtria_license_key', 'DEVELOPMENT-LICENSE-KEY-2025');
      
      // Mock a valid license response
      const mockExpiryDate = new Date();
      mockExpiryDate.setFullYear(mockExpiryDate.getFullYear() + 1); // 1 year from now
      
      // Always set license as valid regardless of any checks
      setLicenseStatus({
        valid: true,
        loading: false,
        error: null,
        expiryDate: mockExpiryDate.toISOString(),
        daysRemaining: 365
      });
      
      // Ensure dialog is never shown
      setShowInvalidDialog(false);
      
      return;
      
      /* ORIGINAL CODE - UNCOMMENT FOR PRODUCTION
      const licenseKey = process.env.REACT_APP_LICENSE_KEY || localStorage.getItem('vtria_license_key');
      
      if (!licenseKey) {
        throw new Error('No license key found');
      }

      // Validate license with ByteVantage server
      const response = await axios.post('/api/auth/validate-license', {
        license_key: licenseKey
      });

      const { valid, expires_at, days_remaining } = response.data;

      setLicenseStatus({
        valid,
        loading: false,
        error: null,
        expiryDate: expires_at,
        daysRemaining: days_remaining
      });

      // Show warning if license expires soon
      if (valid && days_remaining <= 30) {
        setShowExpiryWarning(true);
      }

      // Show invalid dialog if license is invalid
      if (!valid) {
        setShowInvalidDialog(true);
      }
      */

    } catch (error) {
      // DEVELOPMENT MODE: Always override any errors
      console.log('DEVELOPMENT MODE: License error overridden:', error.message);
      
      // Set a dummy license key in localStorage if it doesn't exist
      if (!localStorage.getItem('vtria_license_key')) {
        localStorage.setItem('vtria_license_key', 'DEVELOPMENT-LICENSE-KEY-2025');
      }
      
      const mockExpiryDate = new Date();
      mockExpiryDate.setFullYear(mockExpiryDate.getFullYear() + 1); // 1 year from now
      
      // Force license to be valid regardless of any errors
      setLicenseStatus({
        valid: true, 
        loading: false,
        error: null,
        expiryDate: mockExpiryDate.toISOString(),
        daysRemaining: 365
      });
      
      // Ensure dialog is never shown
      setShowInvalidDialog(false);
    }
  };

  const handleInvalidLicenseClose = () => {
    setShowInvalidDialog(false);
    // Redirect to login or contact admin
    redirectWithBase('/login');
  };

  const value = {
    ...licenseStatus,
    validateLicense,
    isLicenseValid: () => licenseStatus.valid && !licenseStatus.loading,
    getLicenseInfo: () => ({
      valid: licenseStatus.valid,
      expiryDate: licenseStatus.expiryDate,
      daysRemaining: licenseStatus.daysRemaining,
      error: licenseStatus.error
    })
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
      
      {/* License Expiry Warning */}
      <Snackbar
        open={showExpiryWarning}
        autoHideDuration={10000}
        onClose={() => setShowExpiryWarning(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          onClose={() => setShowExpiryWarning(false)}
          sx={{ minWidth: '400px' }}
        >
          <Typography variant="body2" fontWeight="bold">
            License Expiring Soon!
          </Typography>
          <Typography variant="body2">
            Your VTRIA ERP license will expire in {licenseStatus.daysRemaining} days. 
            Please contact your administrator to renew.
          </Typography>
        </Alert>
      </Snackbar>

      {/* Invalid License Dialog */}
      <Dialog
        open={showInvalidDialog}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          License Validation Failed
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Your VTRIA ERP license is invalid or has expired. Please contact your system administrator.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Error: {licenseStatus.error}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleInvalidLicenseClose} variant="contained" color="primary">
            Return to Login
          </Button>
        </DialogActions>
      </Dialog>
    </LicenseContext.Provider>
  );
};

export default LicenseProvider;
