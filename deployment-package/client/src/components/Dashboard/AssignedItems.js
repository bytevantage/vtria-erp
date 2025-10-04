/**
 * Assigned Items Component for VTRIA ERP Dashboard
 * Displays user's assigned cases and tickets with aging color codes and filtering
 * Features responsive design and futuristic UI elements
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Link,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Fade,
  Zoom,
  Skeleton,
  Divider,
  Badge,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Launch as LaunchIcon,
  Assignment as CaseIcon,
  Support as TicketIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, handleApiError, handleApiResponse } from '../../services/apiService';

const AssignedItems = () => {
  const { user, canViewAllItems } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // all, cases, tickets
    status: 'all',
    priority: 'all'
  });

  useEffect(() => {
    fetchAssignedItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, filters]);

  const fetchAssignedItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        assigned_to: canViewAllItems() ? undefined : user?.id,
        location_id: canViewAllItems() ? undefined : user?.location_id
      };

      // Fetch assigned cases
      const casesResponse = await apiService.cases.getAll({
        ...params,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
      const casesData = handleApiResponse(casesResponse);

      // Fetch assigned tickets
      const ticketsResponse = await apiService.tickets.getAll({
        ...params,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
      const ticketsData = handleApiResponse(ticketsResponse);

      // Combine and format data
      const combinedItems = [
        ...casesData.data.map(item => ({
          ...item,
          type: 'case',
          number: item.case_number,
          opened_date: item.created_at,
          aging_status: item.aging_status || 'green'
        })),
        ...ticketsData.data.map(item => ({
          ...item,
          type: 'ticket',
          number: item.ticket_number,
          opened_date: item.created_at,
          aging_status: item.sla_breach ? 'red' : 'green'
        }))
      ];

      // Sort by creation date (newest first)
      combinedItems.sort((a, b) => new Date(b.opened_date) - new Date(a.opened_date));

      setItems(combinedItems);
    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.number?.toLowerCase().includes(searchTerm) ||
        item.title?.toLowerCase().includes(searchTerm) ||
        item.customer_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(item => item.priority === filters.priority);
    }

    setFilteredItems(filtered);
  };

  const getAgingColor = (agingStatus, createdAt) => {
    if (agingStatus === 'red') return '#ef4444';
    if (agingStatus === 'yellow') return '#f59e0b';
    
    // Calculate age in days
    const daysSinceCreated = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated > 7) return '#f59e0b'; // Yellow for > 7 days
    if (daysSinceCreated > 3) return '#facc15'; // Light yellow for > 3 days
    return '#10b981'; // Green for new
  };

  const getStatusColor = (status, type) => {
    const statusColors = {
      case: {
        'enquiry': '#3b82f6',
        'estimation': '#f59e0b',
        'quotation': '#9333ea',
        'purchase_enquiry': '#64748b',
        'po_pi': '#8b5cf6',
        'grn': '#4f46e5',
        'manufacturing': '#ec4899',
        'invoicing': '#14b8a6',
        'closure': '#10b981',
        'rejected': '#ef4444'
      },
      ticket: {
        'support_ticket': '#3b82f6',
        'diagnosis': '#f59e0b',
        'resolution': '#9333ea',
        'closure': '#10b981',
        'rejected': '#ef4444',
        'on_hold': '#64748b'
      }
    };
    
    return statusColors[type]?.[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': '#ef4444',
      'high': '#f59e0b',
      'medium': '#3b82f6',
      'low': '#10b981'
    };
    return colors[priority] || '#6b7280';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleItemClick = (item) => {
    const baseUrl = item.type === 'case' ? '/cases' : '/tickets';
    window.open(`${baseUrl}/${item.id}`, '_blank');
  };

  // Loading state with skeleton placeholders for better UX
  if (loading) {
    return (
      <Fade in={true}>
        <Card sx={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.18)'
        }}>
          <CardContent>
            {/* Header Skeleton */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Skeleton variant="text" width={200} height={40} />
              <Skeleton variant="circular" width={40} height={40} />
            </Box>
            
            {/* Filter Skeletons */}
            <Grid container spacing={2} mb={3}>
              {[1, 2, 3, 4].map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item}>
                  <Skeleton variant="rounded" height={40} width="100%" />
                </Grid>
              ))}
            </Grid>
            
            {/* Table Skeleton */}
            <TableContainer component={Paper} sx={{ 
              maxHeight: 600,
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(10px)',
              borderRadius: 1
            }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                      <TableCell key={item}>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((row) => (
                    <TableRow key={row}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
                        <TableCell key={cell}>
                          <Skeleton variant="text" width={cell === 3 ? '100%' : '80%'} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Summary Skeleton */}
            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
              <Skeleton variant="text" width={150} />
              <Box display="flex" alignItems="center" gap={2}>
                {[1, 2, 3].map((item) => (
                  <Box key={item} display="flex" alignItems="center" gap={1}>
                    <Skeleton variant="circular" width={12} height={12} />
                    <Skeleton variant="text" width={40} />
                  </Box>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    );
  }

  // Error state with futuristic styling
  if (error) {
    return (
      <Zoom in={true}>
        <Card sx={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <CardContent>
            <Box mb={2}>
              <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                {canViewAllItems() ? 'All Items' : 'My Assigned Items'}
              </Typography>
              <Divider sx={{ 
                mb: 2, 
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.7) 0%, rgba(239, 68, 68, 0.1) 100%)' 
              }} />
            </Box>
            <Alert 
              severity="error"
              variant="outlined"
              sx={{
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#ef4444'
                }
              }}
              action={
                <Tooltip title="Retry">
                  <IconButton 
                    color="error" 
                    size="small" 
                    onClick={fetchAssignedItems}
                    sx={{
                      transition: 'transform 0.3s ease',
                      '&:hover': {
                        transform: 'rotate(180deg)'
                      }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              }
            >
              {error}
            </Alert>
          </CardContent>
        </Card>
      </Zoom>
    );
  }

  return (
    <Fade in={true} timeout={500}>
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 12px 40px rgba(37, 99, 235, 0.15)',
          borderColor: 'rgba(37, 99, 235, 0.3)'
        }
      }}>
        <CardContent>
          {/* Header with gradient text */}
          <Zoom in={true} timeout={700}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                fontWeight="bold" 
                sx={{
                  background: 'linear-gradient(90deg, #2563eb 0%, #9333ea 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 10px rgba(37, 99, 235, 0.2)'
                }}
              >
                {canViewAllItems() ? 'All Items' : 'My Assigned Items'}
              </Typography>
              <Tooltip title="Refresh Data">
                <IconButton 
                  onClick={fetchAssignedItems} 
                  color="primary"
                  sx={{
                    background: 'rgba(37, 99, 235, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(37, 99, 235, 0.2)',
                      transform: 'rotate(180deg)'
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Zoom>
          
          <Divider sx={{ 
            mb: 3, 
            background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.7) 0%, rgba(147, 51, 234, 0.3) 100%)' 
          }} />

        {/* Filters with responsive layout and futuristic styling */}
        <Fade in={true} timeout={800}>
          <Grid container spacing={isMobile ? 1 : 2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(37, 99, 235, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2563eb',
                      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)'
                    }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={isMobile ? 6 : 3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="Type"
                  sx={{
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(37, 99, 235, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2563eb',
                      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)'
                    }
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="case">
                    <Box display="flex" alignItems="center">
                      <CaseIcon sx={{ mr: 1, color: '#3b82f6', fontSize: 18 }} />
                      Cases
                    </Box>
                  </MenuItem>
                  <MenuItem value="ticket">
                    <Box display="flex" alignItems="center">
                      <TicketIcon sx={{ mr: 1, color: '#f59e0b', fontSize: 18 }} />
                      Tickets
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={isMobile ? 6 : 3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                  sx={{
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(37, 99, 235, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2563eb',
                      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)'
                    }
                  }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="enquiry">Enquiry</MenuItem>
                  <MenuItem value="estimation">Estimation</MenuItem>
                  <MenuItem value="quotation">Quotation</MenuItem>
                  <MenuItem value="support_ticket">Support Ticket</MenuItem>
                  <MenuItem value="diagnosis">Diagnosis</MenuItem>
                  <MenuItem value="resolution">Resolution</MenuItem>
                  <MenuItem value="closure">Closure</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={isMobile ? 6 : 3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  label="Priority"
                  sx={{
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(37, 99, 235, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2563eb',
                      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)'
                    }
                  }}
                >
                  <MenuItem value="all">All Priority</MenuItem>
                  <MenuItem value="critical">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', mr: 1 }} />
                      Critical
                    </Box>
                  </MenuItem>
                  <MenuItem value="high">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', mr: 1 }} />
                      High
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6', mr: 1 }} />
                      Medium
                    </Box>
                  </MenuItem>
                  <MenuItem value="low">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', mr: 1 }} />
                      Low
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Fade>

        {/* Items Table with futuristic styling */}
        <Zoom in={true} timeout={900}>
          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: 600,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px'
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.4)'
                }
              }
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit'
                  }}>Type</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    display: isMobile ? 'none' : 'table-cell'
                  }}>Number</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit'
                  }}>Title</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    display: isMobile || isTablet ? 'none' : 'table-cell'
                  }}>Customer</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    display: isMobile ? 'none' : 'table-cell'
                  }}>Opened Date</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit'
                  }}>Status</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    display: isMobile ? 'none' : 'table-cell'
                  }}>Priority</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit'
                  }}>Age</TableCell>
                  <TableCell sx={{
                    fontWeight: 'bold', 
                    background: 'rgba(37, 99, 235, 0.05)',
                    backdropFilter: 'blur(10px)',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit'
                  }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Box py={4} display="flex" flexDirection="column" alignItems="center" gap={2}>
                        <Box 
                          sx={{ 
                            width: 60, 
                            height: 60, 
                            borderRadius: '50%', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(37, 99, 235, 0.1)',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          <SearchIcon sx={{ fontSize: 30, color: 'rgba(37, 99, 235, 0.5)' }} />
                        </Box>
                        <Typography variant="body1" color="text.secondary" fontWeight="medium">
                          No items found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 300 }}>
                          Try adjusting your filters or search criteria
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item, index) => (
                    <Fade in={true} timeout={500 + (index * 50)} key={`${item.type}-${item.id}`}>
                      <TableRow 
                        hover
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(240, 245, 255, 0.5)',
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            background: 'rgba(37, 99, 235, 0.05)',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)'
                          }
                        }}
                        onClick={() => handleItemClick(item)}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {item.type === 'case' ? (
                              <Avatar 
                                sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  mr: 1, 
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <CaseIcon sx={{ fontSize: 14 }} />
                              </Avatar>
                            ) : (
                              <Avatar 
                                sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  mr: 1, 
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  color: '#f59e0b',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <TicketIcon sx={{ fontSize: 14 }} />
                              </Avatar>
                            )}
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                textTransform: 'capitalize',
                                fontWeight: 'medium',
                                fontSize: isMobile ? '0.75rem' : 'inherit'
                              }}
                            >
                              {item.type}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            sx={{ 
                              textDecoration: 'none',
                              fontWeight: 'medium',
                              color: item.type === 'case' ? '#3b82f6' : '#f59e0b',
                              fontSize: isMobile ? '0.75rem' : 'inherit',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {item.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            noWrap 
                            sx={{ 
                              maxWidth: isMobile ? 100 : 200,
                              fontWeight: 'medium',
                              fontSize: isMobile ? '0.75rem' : 'inherit'
                            }}
                          >
                            {item.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: isMobile || isTablet ? 'none' : 'table-cell' }}>
                          <Typography 
                            variant="body2"
                            sx={{ fontSize: isMobile ? '0.75rem' : 'inherit' }}
                          >
                            {item.customer_name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                          <Typography 
                            variant="body2"
                            sx={{ fontSize: isMobile ? '0.75rem' : 'inherit' }}
                          >
                            {formatDate(item.opened_date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.status?.replace('_', ' ').toUpperCase()}
                            size="small"
                            sx={{
                              borderRadius: '4px',
                              backgroundColor: `${getStatusColor(item.status, item.type)}15`,
                              color: getStatusColor(item.status, item.type),
                              fontWeight: 'bold',
                              fontSize: isMobile ? '0.65rem' : '0.75rem',
                              height: isMobile ? 20 : 24,
                              border: `1px solid ${getStatusColor(item.status, item.type)}30`,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: `${getStatusColor(item.status, item.type)}25`,
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                          <Chip
                            label={item.priority?.toUpperCase()}
                            size="small"
                            sx={{
                              borderRadius: '4px',
                              backgroundColor: `${getPriorityColor(item.priority)}15`,
                              color: getPriorityColor(item.priority),
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              border: `1px solid ${getPriorityColor(item.priority)}30`,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: `${getPriorityColor(item.priority)}25`,
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip 
                            title={
                              item.aging_status === 'red' ? 'Overdue' : 
                              item.aging_status === 'yellow' ? 'Aging' : 'New'
                            }
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: getAgingColor(item.aging_status, item.opened_date),
                                display: 'inline-block',
                                boxShadow: `0 0 8px ${getAgingColor(item.aging_status, item.opened_date)}80`
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Open Item">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(item);
                              }}
                              sx={{
                                background: 'rgba(37, 99, 235, 0.05)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  background: 'rgba(37, 99, 235, 0.15)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    </Fade>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Zoom>

        {/* Summary with futuristic styling */}
        <Fade in={true} timeout={1000}>
          <Box 
            mt={2} 
            display="flex" 
            flexDirection={isMobile ? 'column' : 'row'}
            justifyContent="space-between" 
            alignItems={isMobile ? 'flex-start' : 'center'}
            gap={isMobile ? 2 : 0}
          >
            <Typography 
              variant="body2" 
              sx={{
                color: 'text.secondary',
                background: 'rgba(37, 99, 235, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: 10,
                px: 2,
                py: 0.5
              }}
            >
              Showing {filteredItems.length} of {items.length} items
            </Typography>
            <Box 
              display="flex" 
              alignItems="center" 
              gap={2}
              sx={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                borderRadius: 10,
                px: 2,
                py: 0.5,
                border: '1px solid rgba(255, 255, 255, 0.18)'
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
                  }} 
                />
                <Typography variant="caption" fontWeight="medium">New</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    backgroundColor: '#f59e0b',
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)'
                  }} 
                />
                <Typography variant="caption" fontWeight="medium">Aging</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                  }} 
                />
                <Typography variant="caption" fontWeight="medium">Overdue</Typography>
              </Box>
            </Box>
          </Box>
        </Fade>
      </CardContent>
    </Card>
    </Fade>
  );
};

export default AssignedItems;
