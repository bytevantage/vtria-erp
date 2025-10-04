/**
 * Main Dashboard Component for VTRIA ERP
 * Integrates all dashboard components with role-based visibility
 * Features responsive design and futuristic UI elements
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  useMediaQuery,
  Fade,
  Zoom,
  Divider,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Queue as QueueIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardOverview from './DashboardOverview';
import AssignedItems from './AssignedItems';
import QueueManagement from './QueueManagement';
import WorkflowChart from './WorkflowChart';

const Dashboard = () => {
  const { user, hasRole, canManageQueues, canViewAllItems } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Define available tabs based on user role
  const getAvailableTabs = () => {
    const tabs = [
      {
        label: 'Overview',
        icon: <DashboardIcon />,
        component: <DashboardOverview />,
        roles: ['user', 'engineer', 'sales_admin', 'manager', 'director']
      },
      {
        label: 'My Items',
        icon: <AssignmentIcon />,
        component: <AssignedItems />,
        roles: ['user', 'engineer', 'sales_admin', 'manager', 'director']
      },
      {
        label: 'Queue Management',
        icon: <QueueIcon />,
        component: <QueueManagement />,
        roles: ['manager', 'director'],
        permission: canManageQueues
      },
      {
        label: 'Analytics',
        icon: <TimelineIcon />,
        component: <WorkflowChart />,
        roles: ['sales_admin', 'manager', 'director']
      }
    ];

    return tabs.filter(tab => {
      // Check role-based access
      const hasRequiredRole = tab.roles.some(role => hasRole(role));
      
      // Check additional permissions if specified
      const hasPermission = tab.permission ? tab.permission() : true;
      
      return hasRequiredRole && hasPermission;
    });
  };

  const availableTabs = getAvailableTabs();

  // Ensure active tab is valid
  React.useEffect(() => {
    if (activeTab >= availableTabs.length) {
      setActiveTab(0);
    }
  }, [availableTabs.length, activeTab]);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Please log in to access the dashboard.
        </Alert>
      </Container>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          You don't have permission to access any dashboard features.
        </Alert>
      </Container>
    );
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3, md: 4 }
      }}
    >
      {/* Header with Animated Entrance */}
      <Fade in={true} timeout={800}>
        <Box 
          mb={4} 
          sx={{
            position: 'relative',
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 4,
            background: theme.palette.futuristic.gradient1,
            boxShadow: theme.palette.futuristic.glow,
            color: '#fff',
            overflow: 'hidden'
          }}
        >
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
              backgroundSize: '24px 24px'
            }}
          />
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            fontWeight="bold" 
            sx={{ 
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
          >
            VTRIA ERP Dashboard
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              opacity: 0.9,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
            }}
          >
            Welcome back, {user.name}! Here's your personalized dashboard overview.
          </Typography>
        </Box>
      </Fade>

      {/* Navigation Tabs */}
      <Zoom in={true} style={{ transitionDelay: '300ms' }}>
        <Paper 
          sx={{ 
            mb: 3, 
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: { xs: 56, sm: 64 },
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 500,
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  background: 'rgba(37, 99, 235, 0.08)',
                  fontWeight: 600
                }
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: 1.5,
                background: theme.palette.futuristic.gradient1
              }
            }}
          >
            {availableTabs.map((tab, index) => (
              <Tab
                key={index}
                label={isMobile ? undefined : tab.label}
                icon={tab.icon}
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label={isMobile ? tab.label : undefined}
                sx={{ 
                  px: { xs: 2, sm: 3 },
                  minWidth: { xs: 72, sm: 120 }
                }}
              />
            ))}
          </Tabs>
        </Paper>
      </Zoom>

      {/* Tab Content with Animation */}
      <Fade in={true} timeout={500}>
        <Box 
          sx={{ 
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -20,
              left: 20,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0) 70%)',
              zIndex: -1
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -40,
              right: 40,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, rgba(147, 51, 234, 0) 70%)',
              zIndex: -1
            }
          }}
        >
          {availableTabs[activeTab]?.component}
        </Box>
      </Fade>

      {/* Role-based Information with Fade-in Animation */}
      <Fade in={true} timeout={800} style={{ transitionDelay: '500ms' }}>
        <Box mt={4}>
          <Divider sx={{ my: 4, opacity: 0.6 }} />
          
          {hasRole('director') && (
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                background: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '30%',
                  height: '100%',
                  opacity: 0.05,
                  background: 'linear-gradient(135deg, transparent 0%, #2563eb 100%)'
                }}
              />
              <Typography variant="h6" color="primary" gutterBottom fontWeight="600">
                Director Access
              </Typography>
              <Typography variant="body2" color="text.primary">
                You have full access to all dashboard features including queue management, analytics, 
                and system-wide data across all locations.
              </Typography>
            </Paper>
          )}

          {hasRole('manager') && !hasRole('director') && (
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                background: 'rgba(147, 51, 234, 0.05)',
                border: '1px solid rgba(147, 51, 234, 0.2)',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '30%',
                  height: '100%',
                  opacity: 0.05,
                  background: 'linear-gradient(135deg, transparent 0%, #9333ea 100%)'
                }}
              />
              <Typography variant="h6" color="secondary" gutterBottom fontWeight="600">
                Manager Access
              </Typography>
              <Typography variant="body2" color="text.primary">
                You can manage queues, view analytics, and access location-specific data for your assigned location.
              </Typography>
            </Paper>
          )}

          {hasRole('sales_admin') && !hasRole('manager') && (
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '30%',
                  height: '100%',
                  opacity: 0.05,
                  background: 'linear-gradient(135deg, transparent 0%, #f59e0b 100%)'
                }}
              />
              <Typography variant="h6" sx={{ color: '#d97706' }} gutterBottom fontWeight="600">
                Sales Admin Access
              </Typography>
              <Typography variant="body2" color="text.primary">
                You have access to analytics and can view cases and tickets for your location.
              </Typography>
            </Paper>
          )}
        </Box>
      </Fade>
    </Container>
  );
};

export default Dashboard;
