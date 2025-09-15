import React, { createContext, useContext, useState, useEffect } from 'react';
import licenseService from '../services/licenseService';

const LicenseContext = createContext({});

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

export const LicenseProvider = ({ children }) => {
  // BYPASS LICENSE CHECK FOR DEVELOPMENT
  const [isLicenseValid, setIsLicenseValid] = useState(true); // Always true
  const [licenseInfo, setLicenseInfo] = useState({
    organization: 'VTRIA Engineering Solutions',
    type: 'Development License',
    valid_until: '2025-12-31',
    features: ['all']
  });
  const [loading, setLoading] = useState(false); // No loading for bypass
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);

  useEffect(() => {
    // BYPASS: No license check needed
    // checkLicense();
  }, []);

  const checkLicense = async () => {
    // BYPASS: License is always valid
    return { success: true };
  };

  const handleLicenseValidated = (license) => {
    // BYPASS: No action needed
    setIsLicenseValid(true);
    setLicenseInfo(license);
    setShowLicenseDialog(false);
  };

  const handleLicenseExpired = () => {
    // BYPASS: No action needed
  };

  const refreshLicense = () => {
    // BYPASS: No refresh needed
  };

  const clearLicense = () => {
    // BYPASS: No clearing needed
  };

  const contextValue = {
    isLicenseValid,
    licenseInfo,
    loading,
    showLicenseDialog,
    setShowLicenseDialog,
    handleLicenseValidated,
    handleLicenseExpired,
    refreshLicense,
    clearLicense,
    checkLicense,
  };

  return (
    <LicenseContext.Provider value={contextValue}>
      {children}
    </LicenseContext.Provider>
  );
};

export default LicenseContext;