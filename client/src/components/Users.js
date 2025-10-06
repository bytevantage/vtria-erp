import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Alert, Typography, Button } from '@mui/material';
import { People, ArrowForward } from '@mui/icons-material';

const Users = () => {
  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management has been integrated!
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          User accounts are now managed directly within Employee Management.
          When creating or editing employees, you can enable system access and set login credentials.
        </Typography>
        <Button
          variant="contained"
          startIcon={<People />}
          endIcon={<ArrowForward />}
          href="/employee-management"
          sx={{ mt: 2 }}
        >
          Go to Employee Management
        </Button>
      </Alert>

      <Typography variant="body2" color="text.secondary">
        This eliminates duplicate data entry - every employee can now have system access configured
        directly in their employee profile, including their role and login credentials.
      </Typography>
    </Box>
  );
};

export default Users;