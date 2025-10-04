/**
 * System Status Component
 * Displays the current status of different modules in the system
 */

import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import { 
  CheckCircle, 
  Warning, 
  Info,
  People as PeopleIcon,
  AccountBalance,
  ShoppingCart,
  Assignment
} from '@mui/icons-material';

const SystemStatus = () => {
  // System status data
  const modules = [
    {
      name: 'Employee Management',
      status: 'operational',
      description: 'Fully operational and production-ready. All HR features including profiles, attendance, and leave management are active.'
    },
    {
      name: 'Financial Management',
      status: 'operational',
      description: 'All features are fully operational.'
    },
    {
      name: 'Inventory Management',
      status: 'operational',
      description: 'All features are fully operational.'
    },
    {
      name: 'Case Management',
      status: 'operational',
      description: 'All features are fully operational.'
    },
    {
      name: 'Document Management',
      status: 'operational',
      description: 'All features are fully operational.'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CheckCircle color="success" />;
      case 'degraded':
        return <Warning color="warning" />;
      case 'outage':
        return <Warning color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'outage':
        return 'Service Outage';
      default:
        return 'Under Maintenance';
    }
  };

  const getModuleIcon = (moduleName) => {
    switch (moduleName) {
      case 'Employee Management':
        return <PeopleIcon />;
      case 'Financial Management':
        return <AccountBalance />;
      case 'Inventory Management':
        return <Inventory />;
      case 'Case Management':
      case 'Document Management':
        return <Assignment />;
      default:
        return <ShoppingCart />;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
          System Status
        </Typography>
        <Chip 
          label="All Systems Operational" 
          color="success" 
          size="small" 
          sx={{ ml: 2 }}
          icon={<CheckCircle />}
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary" mb={3}>
        Last updated: {new Date().toLocaleString()}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      <List disablePadding>
        {modules.map((module, index) => (
          <React.Fragment key={module.name}>
            <Tooltip title={module.description} arrow>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getModuleIcon(module.name)}
                </ListItemIcon>
                <ListItemText 
                  primary={module.name}
                  secondary={module.description}
                  primaryTypographyProps={{ variant: 'subtitle2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Chip 
                  label={getStatusText(module.status)}
                  size="small"
                  color={
                    module.status === 'operational' ? 'success' : 
                    module.status === 'degraded' ? 'warning' : 'error'
                  }
                  icon={getStatusIcon(module.status)}
                  variant="outlined"
                />
              </ListItem>
            </Tooltip>
            {index < modules.length - 1 && <Divider component="li" sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default SystemStatus;
