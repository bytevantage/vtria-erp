import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Build as BuildIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

const Manufacturing = () => {
  const [tabValue, setTabValue] = useState(0);
  const [workOrders, setWorkOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    sales_order_id: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    estimated_hours: '',
    planned_start_date: '',
    planned_end_date: '',
    technical_specifications: '',
    quality_requirements: '',
    safety_notes: '',
  });

  useEffect(() => {
    fetchWorkOrders();
    fetchDashboardData();
    fetchConfirmedSalesOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/manufacturing/work-orders');
      setWorkOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      setError('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/manufacturing/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchConfirmedSalesOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/sales-order');
      const confirmedOrders = response.data.data?.filter(order => 
        order.status === 'confirmed' || order.status === 'in_production'
      ) || [];
      setSalesOrders(confirmedOrders);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    }
  };

  const handleCreateWorkOrder = async () => {
    try {
      setError('');
      
      if (!formData.sales_order_id || !formData.title) {
        setError('Sales Order and Title are required');
        return;
      }

      await axios.post('http://localhost:3001/api/manufacturing/work-orders', {
        ...formData,
        estimated_hours: parseFloat(formData.estimated_hours) || null,
      });
      
      await fetchWorkOrders();
      await fetchDashboardData();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating work order:', error);
      setError(error.response?.data?.message || 'Failed to create work order');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`http://localhost:3001/api/manufacturing/work-orders/${id}/status`, {
        status: status,
        progress_percentage: status === 'completed' ? 100 : null
      });
      await fetchWorkOrders();
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      sales_order_id: '',
      title: '',
      description: '',
      assigned_to: '',
      priority: 'medium',
      estimated_hours: '',
      planned_start_date: '',
      planned_end_date: '',
      technical_specifications: '',
      quality_requirements: '',
      safety_notes: '',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'assigned': return 'warning';
      case 'paused': return 'error';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Manufacturing & Production</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ backgroundColor: '#1976d2' }}
        >
          New Work Order
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Dashboard Cards */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">
                      {dashboardData.statusSummary?.reduce((sum, item) => sum + item.count, 0) || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Work Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <BuildIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">
                      {dashboardData.statusSummary?.find(s => s.status === 'in_progress')?.count || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      In Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <WarningIcon color="error" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">
                      {dashboardData.overdueOrders?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Overdue Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">
                      {dashboardData.statusSummary?.find(s => s.status === 'completed')?.count || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Completed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Work Orders" />
          <Tab label="Production Dashboard" />
        </Tabs>
      </Box>

      {/* Work Orders Tab */}
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Work Order No.</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Sales Order</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No work orders found. Create your first work order from a confirmed sales order!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  workOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.work_order_id}</TableCell>
                      <TableCell>{order.title}</TableCell>
                      <TableCell>{order.sales_order_id}</TableCell>
                      <TableCell>{order.client_name}</TableCell>
                      <TableCell>{order.assigned_to_name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.priority}
                          color={getPriorityColor(order.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          color={getStatusColor(order.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: 80 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={order.progress_percentage || 0} 
                          />
                          <Typography variant="caption">
                            {order.progress_percentage || 0}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {order.status === 'pending' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleStatusUpdate(order.id, 'assigned')}
                            title="Assign"
                          >
                            <PersonIcon />
                          </IconButton>
                        )}
                        {order.status === 'assigned' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleStatusUpdate(order.id, 'in_progress')}
                            title="Start"
                          >
                            <StartIcon />
                          </IconButton>
                        )}
                        {order.status === 'in_progress' && (
                          <>
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(order.id, 'paused')}
                              title="Pause"
                            >
                              <PauseIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(order.id, 'completed')}
                              title="Complete"
                            >
                              <CheckIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Production Dashboard Tab */}
      <TabPanel value={tabValue} index={1}>
        {dashboardData && (
          <Grid container spacing={3}>
            {/* Technician Workload */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Technician Workload
                  </Typography>
                  {dashboardData.technicianWorkload?.map((tech, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">{tech.full_name}</Typography>
                        <Typography variant="body2">{tech.active_work_orders} orders</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((tech.total_hours || 0) / 40 * 100, 100)} 
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Overdue Orders */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Overdue Work Orders
                  </Typography>
                  {dashboardData.overdueOrders?.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No overdue orders
                    </Typography>
                  ) : (
                    dashboardData.overdueOrders?.map((order, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                        <Typography variant="body2">
                          {order.work_order_id} - {order.title}
                        </Typography>
                        <Typography variant="caption" color="error">
                          Due: {new Date(order.planned_end_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Create Work Order Dialog */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          padding: '28px 36px',
          borderBottom: 'none'
        }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box 
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '12px', 
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              🏭
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Create New Work Order
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Initialize manufacturing workflow for production
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
          {error && (
            <Box sx={{ p: 4, pb: 0 }}>
              <Alert 
                severity="error" 
                sx={{ 
                  borderRadius: '16px',
                  border: '1px solid #ffcdd2',
                  backgroundColor: '#fff8f8'
                }}
              >
                {error}
              </Alert>
            </Box>
          )}
          <Box sx={{ p: 4 }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                mb: 4, 
                color: '#2c3e50', 
                fontWeight: 600,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              📋 Work Order Details
            </Typography>
            <Box 
              sx={{ 
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e8eaed'
              }}
            >
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Sales Order *
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.sales_order_id}
                        onChange={(e) => setFormData({ ...formData, sales_order_id: e.target.value })}
                        displayEmpty
                        sx={{ 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { 
                              borderColor: '#e0e7ff',
                              borderWidth: '2px'
                            },
                            '&:hover fieldset': { 
                              borderColor: '#1976d2',
                              borderWidth: '2px'
                            },
                            '&.Mui-focused fieldset': { 
                              borderColor: '#1976d2',
                              borderWidth: '2px'
                            }
                          }
                        }}
                      >
                        <MenuItem value="" disabled>
                          <em style={{ color: '#999', fontSize: '15px' }}>Select a sales order</em>
                        </MenuItem>
                        {salesOrders.map((order) => (
                          <MenuItem key={order.id} value={order.id}>
                            <Box>
                              <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                {order.sales_order_id} - {order.client_name}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Work Order Title *
                    </Typography>
                    <TextField
                      fullWidth
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter work order title"
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': { 
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Description
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide detailed description of the work to be performed, including specifications and requirements..."
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': { 
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Priority
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        sx={{ 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { 
                              borderColor: '#e0e7ff',
                              borderWidth: '2px'
                            },
                            '&:hover fieldset': { 
                              borderColor: '#1976d2',
                              borderWidth: '2px'
                            },
                            '&.Mui-focused fieldset': { 
                              borderColor: '#1976d2',
                              borderWidth: '2px'
                            }
                          }
                        }}
                      >
                        <MenuItem value="low">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#4caf50" />
                            <Typography fontWeight={500}>Low</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="medium">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#ff9800" />
                            <Typography fontWeight={500}>Medium</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="high">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#f44336" />
                            <Typography fontWeight={500}>High</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="urgent">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#e91e63" />
                            <Typography fontWeight={500}>Urgent</Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Estimated Hours
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                      placeholder="Enter estimated hours"
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': { 
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Planned Start Date
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.planned_start_date}
                      onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': { 
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Planned End Date
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.planned_end_date}
                      onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': { 
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#555', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Technical Specifications
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.technical_specifications}
                      onChange={(e) => setFormData({ ...formData, technical_specifications: e.target.value })}
                      placeholder="Enter technical specifications, materials, tools required, and special instructions..."
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': { 
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': { 
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          padding: '24px 36px', 
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed',
          gap: 3
        }}>
          <Button 
            onClick={() => setOpen(false)}
            variant="outlined"
            sx={{ 
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.8,
              borderColor: '#e0e7ff',
              color: '#666',
              fontSize: '1rem',
              borderWidth: '2px',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderWidth: '2px'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateWorkOrder} 
            variant="contained"
            sx={{ 
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 700,
              px: 5,
              py: 1.8,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
              '&:hover': { 
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            🏭 Create Work Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Manufacturing;
