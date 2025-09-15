import React from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { Box, Typography, Alert } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

const PermissionGate = ({ 
  module, 
  action, 
  children, 
  fallback = null,
  showMessage = true 
}) => {
  const { hasPermission, loading, user } = usePermissions();

  if (loading) {
    return null; // or a loading spinner
  }

  if (!hasPermission(module, action)) {
    if (fallback) {
      return fallback;
    }
    
    if (showMessage) {
      return (
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          p={3}
          textAlign="center"
        >
          <Alert 
            severity="warning" 
            icon={<LockIcon />}
            sx={{ maxWidth: 400 }}
          >
            <Typography variant="body2">
              Access denied. You don't have permission to {action} {module}.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Current role: {user?.role}
            </Typography>
          </Alert>
        </Box>
      );
    }
    
    return null;
  }

  return children;
};

export default PermissionGate;
