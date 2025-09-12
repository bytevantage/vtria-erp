/**
 * Queue Management Component for VTRIA ERP Dashboard
 * Displays queue overview and management for managers/directors
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Queue as QueueIcon,
  Assignment as AssignIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, handleApiError, handleApiResponse } from '../../services/apiService';

const QueueManagement = () => {
  const { user, canManageQueues } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [queues, setQueues] = useState([]);
  const [queueItems, setQueueItems] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    type: 'all'
  });
  const [assignDialog, setAssignDialog] = useState({
    open: false,
    item: null,
    assignee: ''
  });

  useEffect(() => {
    if (canManageQueues()) {
      fetchQueues();
    }
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      fetchQueueItems();
    }
  }, [selectedQueue, filters]);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.caseQueues.getAll({
        location_id: user?.location_id
      });
      const data = handleApiResponse(response);
      
      setQueues(data.data || []);
      if (data.data?.length > 0 && !selectedQueue) {
        setSelectedQueue(data.data[0].id);
      }
    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueItems = async () => {
    try {
      setLoading(true);
      
      const params = {
        queue_id: selectedQueue,
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        limit: 100
      };

      // Fetch cases in queue
      const casesResponse = await apiService.cases.getAll(params);
      const casesData = handleApiResponse(casesResponse);

      // Fetch tickets in queue (if applicable)
      const ticketsResponse = await apiService.tickets.getAll(params);
      const ticketsData = handleApiResponse(ticketsResponse);

      // Combine and format items
      const combinedItems = [
        ...casesData.data.map(item => ({
          ...item,
          type: 'case',
          number: item.case_number,
          opened_date: item.created_at
        })),
        ...ticketsData.data.map(item => ({
          ...item,
          type: 'ticket',
          number: item.ticket_number,
          opened_date: item.created_at
        }))
      ];

      // Apply type filter
      let filteredItems = combinedItems;
      if (filters.type !== 'all') {
        filteredItems = combinedItems.filter(item => item.type === filters.type);
      }

      // Sort by priority and creation date
      filteredItems.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return new Date(a.opened_date) - new Date(b.opened_date); // Older first
      });

      setQueueItems(filteredItems);
    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignItem = async () => {
    try {
      const { item, assignee } = assignDialog;
      
      if (item.type === 'case') {
        await apiService.cases.assign(item.id, { assigned_to: assignee });
      } else {
        await apiService.tickets.assign(item.id, { assigned_to: assignee });
      }

      setAssignDialog({ open: false, item: null, assignee: '' });
      fetchQueueItems();
    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    }
  };

  const getStatusColor = (status, type) => {
    const statusColors = {
      case: {
        'enquiry': '#2196f3',
        'estimation': '#ff9800',
        'quotation': '#9c27b0',
        'purchase_enquiry': '#607d8b',
        'po_pi': '#795548',
        'grn': '#3f51b5',
        'manufacturing': '#e91e63',
        'invoicing': '#009688',
        'closure': '#4caf50',
        'rejected': '#f44336'
      },
      ticket: {
        'support_ticket': '#2196f3',
        'diagnosis': '#ff9800',
        'resolution': '#9c27b0',
        'closure': '#4caf50',
        'rejected': '#f44336',
        'on_hold': '#607d8b'
      }
    };
    
    return statusColors[type]?.[status] || '#757575';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': '#f44336',
      'high': '#ff9800',
      'medium': '#2196f3',
      'low': '#4caf50'
    };
    return colors[priority] || '#757575';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQueueStats = () => {
    const stats = {
      total: queueItems.length,
      unassigned: queueItems.filter(item => !item.assigned_to).length,
      critical: queueItems.filter(item => item.priority === 'critical').length,
      overdue: queueItems.filter(item => {
        const daysSinceCreated = Math.floor((new Date() - new Date(item.opened_date)) / (1000 * 60 * 60 * 24));
        return daysSinceCreated > 7;
      }).length
    };
    return stats;
  };

  if (!canManageQueues()) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            You don't have permission to access queue management.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading && queues.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error"
            action={
              <IconButton color="inherit" size="small" onClick={fetchQueues}>
                <RefreshIcon />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const stats = getQueueStats();

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Queue Management
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchQueues} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Queue Selection and Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Queue</InputLabel>
              <Select
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
                label="Select Queue"
              >
                {queues.map((queue) => (
                  <MenuItem key={queue.id} value={queue.id}>
                    {queue.name} ({queue.description})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Items
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {stats.unassigned}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Unassigned
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {stats.critical}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Critical
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {stats.overdue}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Filters */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                label="Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="case">Cases</MenuItem>
                <MenuItem value="ticket">Tickets</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="enquiry">Enquiry</MenuItem>
                <MenuItem value="estimation">Estimation</MenuItem>
                <MenuItem value="quotation">Quotation</MenuItem>
                <MenuItem value="support_ticket">Support Ticket</MenuItem>
                <MenuItem value="diagnosis">Diagnosis</MenuItem>
                <MenuItem value="resolution">Resolution</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                label="Priority"
              >
                <MenuItem value="all">All Priority</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Queue Items Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Number</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : queueItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No items in this queue
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                queueItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`} hover>
                    <TableCell>
                      <Chip
                        label={item.type.toUpperCase()}
                        size="small"
                        color={item.type === 'case' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {item.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.customer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.priority?.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getPriorityColor(item.priority)}20`,
                          color: getPriorityColor(item.priority),
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status?.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getStatusColor(item.status, item.type)}20`,
                          color: getStatusColor(item.status, item.type),
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.assigned_to_name || 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(item.opened_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Assign Item">
                          <IconButton
                            size="small"
                            onClick={() => setAssignDialog({
                              open: true,
                              item: item,
                              assignee: item.assigned_to || ''
                            })}
                          >
                            <AssignIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Item">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const baseUrl = item.type === 'case' ? '/cases' : '/tickets';
                              window.open(`${baseUrl}/${item.id}`, '_blank');
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Assignment Dialog */}
        <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, item: null, assignee: '' })}>
          <DialogTitle>
            Assign {assignDialog.item?.type} - {assignDialog.item?.number}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              label="Assignee User ID"
              value={assignDialog.assignee}
              onChange={(e) => setAssignDialog(prev => ({ ...prev, assignee: e.target.value }))}
              placeholder="Enter user ID to assign"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialog({ open: false, item: null, assignee: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAssignItem} variant="contained">
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default QueueManagement;
