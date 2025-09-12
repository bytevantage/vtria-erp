/**
 * Dashboard Overview Component for VTRIA ERP
 * Displays comprehensive overview of cases, tickets, and key metrics
 * Features responsive design and futuristic UI elements
 */

import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Skeleton,
  Paper
} from '@mui/material';
import {
  Assignment as CaseIcon,
  Support as TicketIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, handleApiError, handleApiResponse } from '../../services/apiService';

const DashboardOverview = () => {
  const { user, canViewAllItems } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState({
    cases: {
      total: 0,
      new: 0,
      in_progress: 0,
      overdue: 0,
      closed_today: 0
    },
    tickets: {
      total: 0,
      new: 0,
      in_progress: 0,
      overdue: 0,
      resolved_today: 0
    },
    performance: {
      case_resolution_rate: 0,
      ticket_resolution_rate: 0,
      avg_case_time: 0,
      avg_ticket_time: 0
    }
  });

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = canViewAllItems() ? {} : { location_id: user?.location_id };

      // Fetch cases overview
      const casesResponse = await apiService.cases.getStats(params);
      const casesData = handleApiResponse(casesResponse);

      // Fetch tickets overview
      const ticketsResponse = await apiService.tickets.getStats(params);
      const ticketsData = handleApiResponse(ticketsResponse);

      // Process and combine data
      setOverview({
        cases: {
          total: casesData.data.by_status?.total || 0,
          new: casesData.data.by_status?.enquiry || 0,
          in_progress: (casesData.data.by_status?.estimation || 0) + 
                      (casesData.data.by_status?.quotation || 0) + 
                      (casesData.data.by_status?.manufacturing || 0),
          overdue: casesData.data.overdue_count || 0,
          closed_today: casesData.data.closed_today || 0
        },
        tickets: {
          total: ticketsData.data.by_status?.total || 0,
          new: ticketsData.data.by_status?.support_ticket || 0,
          in_progress: (ticketsData.data.by_status?.diagnosis || 0) + 
                      (ticketsData.data.by_status?.resolution || 0),
          overdue: ticketsData.data.overdue_count || 0,
          resolved_today: ticketsData.data.resolved_today || 0
        },
        performance: {
          case_resolution_rate: casesData.data.resolution_rate || 0,
          ticket_resolution_rate: ticketsData.data.resolution_rate || 0,
          avg_case_time: casesData.data.avg_resolution_time || 0,
          avg_ticket_time: ticketsData.data.avg_resolution_time || 0
        }
      });

    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <Zoom in={true} style={{ transitionDelay: '100ms' }}>
      <Card 
        sx={{ 
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 25px ${color}25`
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '5px',
            background: `linear-gradient(90deg, ${color}80, ${color}40)`,
            zIndex: 1
          }
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 2 }}>
          <Box 
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
              zIndex: 0
            }}
          />
          <Box display="flex" alignItems="center" justifyContent="space-between" position="relative">
            <Box>
              <Typography 
                variant={isMobile ? "h5" : "h4"} 
                fontWeight="bold" 
                color={color}
                sx={{ 
                  textShadow: `0 0 15px ${color}30`,
                  fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' } 
                }}
              >
                {value}
              </Typography>
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                color="text.primary" 
                gutterBottom
                sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box 
              sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                borderRadius: '50%', 
                backgroundColor: `${color}20`,
                color: color,
                boxShadow: `0 0 15px ${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {icon}
            </Box>
          </Box>
          {trend && (
            <Box mt={1} display="flex" alignItems="center">
              <TrendingUpIcon fontSize="small" sx={{ color: '#10b981', mr: 0.5 }} />
              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 500 }}>
                {trend}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Zoom>
  );

  const MetricCard = ({ title, value, unit, color, description }) => (
    <Fade in={true} style={{ transitionDelay: '200ms' }}>
      <Card 
        sx={{ 
          height: '100%', 
          borderLeft: `4px solid ${color}`,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: `0 8px 20px rgba(0, 0, 0, 0.1)`
          }
        }}
      >
        <Box 
          sx={{
            position: 'absolute',
            bottom: -15,
            right: -15,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
            zIndex: 0
          }}
        />
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            color="text.primary"
            sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}
          >
            {title}
          </Typography>
          <Box display="flex" alignItems="baseline" mb={1}>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              fontWeight="bold" 
              color={color}
              sx={{ 
                textShadow: `0 0 10px ${color}20`,
                fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' } 
              }}
            >
              {value}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              ml={1}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
            >
              {unit}
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
          >
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Fade>
  );

  if (loading) {
    return (
      <Box>
        {/* Skeleton for header */}
        <Box mb={3}>
          <Skeleton variant="text" width="40%" height={40} />
        </Box>
        
        {/* Skeleton for Cases Overview */}
        <Box mb={4}>
          <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5].map((item) => (
              <Grid item xs={12} sm={6} md={2.4} key={item}>
                <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Skeleton for Tickets Overview */}
        <Box mb={4}>
          <Skeleton variant="text" width="35%" height={32} sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5].map((item) => (
              <Grid item xs={12} sm={6} md={2.4} key={item}>
                <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Skeleton for Performance Metrics */}
        <Box>
          <Skeleton variant="text" width="25%" height={32} sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <IconButton color="inherit" size="small" onClick={fetchOverviewData}>
            <RefreshIcon />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Fade in={true} timeout={500}>
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={3}
          sx={{
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            pb: 2
          }}
        >
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            color="primary"
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              background: theme.palette.futuristic.gradient1,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(37, 99, 235, 0.2)'
            }}
          >
            Dashboard Overview
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={fetchOverviewData} 
              color="primary"
              sx={{ 
                background: 'rgba(37, 99, 235, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(37, 99, 235, 0.2)',
                  transform: 'rotate(30deg)'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Fade>

      {/* Cases Overview */}
      <Fade in={true} timeout={600} style={{ transitionDelay: '100ms' }}>
        <Box>
          <Box 
            display="flex" 
            alignItems="center" 
            mb={2}
          >
            <CaseIcon 
              color="primary" 
              sx={{ mr: 1, fontSize: { xs: '1.5rem', md: '1.75rem' } }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'text.primary', 
                fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' },
                fontWeight: 600
              }}
            >
              Cases Overview
            </Typography>
          </Box>
          <Grid container spacing={isMobile ? 2 : 3} mb={4}>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Total Cases"
                value={overview.cases.total}
                icon={<CaseIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#3b82f6"
                subtitle="All active cases"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="New Cases"
                value={overview.cases.new}
                icon={<ScheduleIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#f59e0b"
                subtitle="Awaiting processing"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="In Progress"
                value={overview.cases.in_progress}
                icon={<TrendingUpIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#9333ea"
                subtitle="Being processed"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Overdue"
                value={overview.cases.overdue}
                icon={<WarningIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#ef4444"
                subtitle="Require attention"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Closed Today"
                value={overview.cases.closed_today}
                icon={<CheckCircleIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#10b981"
                subtitle="Completed today"
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Tickets Overview */}
      <Fade in={true} timeout={600} style={{ transitionDelay: '200ms' }}>
        <Box>
          <Box 
            display="flex" 
            alignItems="center" 
            mb={2}
          >
            <TicketIcon 
              sx={{ mr: 1, color: '#9333ea', fontSize: { xs: '1.5rem', md: '1.75rem' } }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'text.primary', 
                fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' },
                fontWeight: 600
              }}
            >
              Support Tickets Overview
            </Typography>
          </Box>
          <Grid container spacing={isMobile ? 2 : 3} mb={4}>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Total Tickets"
                value={overview.tickets.total}
                icon={<TicketIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#3b82f6"
                subtitle="All active tickets"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="New Tickets"
                value={overview.tickets.new}
                icon={<ScheduleIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#f59e0b"
                subtitle="Awaiting diagnosis"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="In Progress"
                value={overview.tickets.in_progress}
                icon={<TrendingUpIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#9333ea"
                subtitle="Being resolved"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Overdue"
                value={overview.tickets.overdue}
                icon={<WarningIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#ef4444"
                subtitle="SLA breached"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Resolved Today"
                value={overview.tickets.resolved_today}
                icon={<CheckCircleIcon fontSize={isMobile ? "medium" : "large"} />}
                color="#10b981"
                subtitle="Completed today"
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Performance Metrics */}
      <Fade in={true} timeout={600} style={{ transitionDelay: '300ms' }}>
        <Box>
          <Box 
            display="flex" 
            alignItems="center" 
            mb={2}
          >
            <TimelineIcon 
              sx={{ mr: 1, color: '#10b981', fontSize: { xs: '1.5rem', md: '1.75rem' } }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'text.primary', 
                fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' },
                fontWeight: 600
              }}
            >
              Performance Metrics
            </Typography>
          </Box>
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Case Resolution Rate"
                value={overview.performance.case_resolution_rate}
                unit="%"
                color="#10b981"
                description="Percentage of cases resolved on time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Ticket Resolution Rate"
                value={overview.performance.ticket_resolution_rate}
                unit="%"
                color="#3b82f6"
                description="Percentage of tickets resolved on time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Avg Case Time"
                value={Math.round(overview.performance.avg_case_time)}
                unit="hours"
                color="#f59e0b"
                description="Average time to resolve cases"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Avg Ticket Time"
                value={Math.round(overview.performance.avg_ticket_time)}
                unit="hours"
                color="#9333ea"
                description="Average time to resolve tickets"
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Box>
  );
};

export default DashboardOverview;
