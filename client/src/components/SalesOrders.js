import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
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
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Description as PreviewIcon,
  CheckCircle as ConfirmIcon,
  Assignment as ProductionIcon,
} from '@mui/icons-material';

const SalesOrders = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    quotation_id: '',
    customer_po_number: '',
    customer_po_date: '',
    expected_delivery_date: '',
    advance_amount: '',
    production_priority: 'medium',
    special_instructions: '',
    billing_address: '',
    shipping_address: '',
  });

  useEffect(() => {
    fetchSalesOrders();
    fetchApprovedQuotations();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('http://localhost:3001/api/sales-order');
      setSalesOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      setError('Failed to load sales orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedQuotations = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/quotation');
      // Filter for approved quotations that don't already have sales orders
      const approvedQuotations = response.data.data?.filter(q => q.status === 'approved') || [];
      setQuotations(approvedQuotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      quotation_id: '',
      customer_po_number: '',
      customer_po_date: '',
      expected_delivery_date: '',
      advance_amount: '',
      production_priority: 'medium',
      special_instructions: '',
      billing_address: '',
      shipping_address: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
    setEditingOrder(null);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.quotation_id) {
        setError('Please select a quotation');
        return;
      }

      if (editingOrder) {
        // Update existing sales order
        const response = await axios.put(`http://localhost:3001/api/sales-order/${editingOrder.id}`, {
          ...formData,
          advance_amount: parseFloat(formData.advance_amount) || 0,
        });
        
        if (response.data.success) {
          await fetchSalesOrders();
          handleClose();
        } else {
          setError('Failed to update sales order');
        }
      } else {
        // Create new sales order
        const response = await axios.post('http://localhost:3001/api/sales-order', {
          ...formData,
          advance_amount: parseFloat(formData.advance_amount) || 0,
        });
        
        // Refresh the sales orders list
        await fetchSalesOrders();
        await fetchApprovedQuotations(); // Refresh to remove used quotations
        handleClose();
      }
    } catch (error) {
      console.error('Error saving sales order:', error);
      setError(error.response?.data?.message || 'Failed to save sales order');
    }
  };

  const handleConfirmOrder = async (id) => {
    if (window.confirm('Are you sure you want to confirm this sales order?')) {
      try {
        await axios.post(`http://localhost:3001/api/sales-order/${id}/confirm`);
        await fetchSalesOrders(); // Refresh list
      } catch (error) {
        console.error('Error confirming sales order:', error);
        setError('Failed to confirm sales order');
      }
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`http://localhost:3001/api/sales-order/${id}/status`, {
        status: status
      });
      await fetchSalesOrders(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleEditOrder = (order) => {
    setFormData({
      quotation_id: order.quotation_id,
      customer_po_number: order.customer_po_number || '',
      customer_po_date: order.customer_po_date ? order.customer_po_date.split('T')[0] : '',
      expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '',
      advance_amount: order.advance_amount || '',
      production_priority: order.production_priority || 'medium',
      special_instructions: order.special_instructions || '',
      billing_address: order.billing_address || '',
      shipping_address: order.shipping_address || '',
    });
    setEditingOrder(order);
    setOpen(true);
  };

  const handlePreviewOrder = (order) => {
    setSelectedOrder(order);
    setPreviewDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'in_production': return 'info';
      case 'ready_for_dispatch': return 'warning';
      case 'dispatched': return 'primary';
      case 'delivered': return 'success';
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Orders</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ backgroundColor: '#1976d2' }}
        >
          New Sales Order
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order No.</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Expected Delivery</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No sales orders found. Create your first sales order from an approved quotation!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                salesOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.sales_order_id}</TableCell>
                    <TableCell>{order.client_name}</TableCell>
                    <TableCell>{order.project_name || 'N/A'}</TableCell>
                    <TableCell>₹{order.total_amount?.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.production_priority}
                        color={getPriorityColor(order.production_priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {order.expected_delivery_date ? 
                        new Date(order.expected_delivery_date).toLocaleDateString('en-IN') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" title="View Details" onClick={() => handleViewOrder(order)}>
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" title="Preview Sales Order" onClick={() => handlePreviewOrder(order)}>
                        <PreviewIcon />
                      </IconButton>
                      {order.status === 'draft' && (
                        <IconButton 
                          size="small" 
                          title="Edit Order"
                          onClick={() => handleEditOrder(order)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {order.status === 'draft' && (
                        <IconButton 
                          size="small" 
                          title="Confirm Order"
                          onClick={() => handleConfirmOrder(order.id)}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      {order.status === 'confirmed' && (
                        <IconButton 
                          size="small" 
                          title="Start Production"
                          onClick={() => handleStatusUpdate(order.id, 'in_production')}
                        >
                          <ProductionIcon />
                        </IconButton>
                      )}
                      {order.status === 'in_production' && (
                        <IconButton 
                          size="small" 
                          title="Ready for Dispatch"
                          onClick={() => handleStatusUpdate(order.id, 'ready_for_dispatch')}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      {order.status === 'ready_for_dispatch' && (
                        <IconButton 
                          size="small" 
                          title="Mark as Dispatched"
                          onClick={() => handleStatusUpdate(order.id, 'dispatched')}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      {order.status === 'dispatched' && (
                        <IconButton 
                          size="small" 
                          title="Mark as Delivered"
                          onClick={() => handleStatusUpdate(order.id, 'delivered')}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose} 
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
              📦
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingOrder ? 'Edit Sales Order' : 'New Sales Order'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {editingOrder ? 'Update sales order details' : 'Convert approved quotations to sales orders'}
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
              📋 Sales Order Information
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
                      Select Quotation *
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.quotation_id}
                        onChange={(e) => setFormData({ ...formData, quotation_id: e.target.value })}
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
                          <em style={{ color: '#999', fontSize: '15px' }}>Select an approved quotation</em>
                        </MenuItem>
                        {quotations.map((quotation) => (
                          <MenuItem key={quotation.id} value={quotation.id}>
                            <Box>
                              <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                {quotation.quotation_id} - {quotation.client_name}
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
                      Customer PO Number
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.customer_po_number}
                      onChange={(e) => setFormData({ ...formData, customer_po_number: e.target.value })}
                      placeholder="Enter customer PO number"
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
                      Customer PO Date
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.customer_po_date}
                      onChange={(e) => setFormData({ ...formData, customer_po_date: e.target.value })}
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
                      Expected Delivery Date
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
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
                      Advance Amount (₹)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={formData.advance_amount}
                      onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                      placeholder="Enter advance amount"
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
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1, color: '#666', fontWeight: 600 }}>
                            ₹
                          </Box>
                        )
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
                      Production Priority
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.production_priority}
                        onChange={(e) => setFormData({ ...formData, production_priority: e.target.value })}
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
                      Special Instructions
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={formData.special_instructions}
                      onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                      placeholder="Any special instructions for production, delivery, installation, or client requirements..."
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
            onClick={handleClose}
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
            onClick={handleSubmit} 
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
            📦 {editingOrder ? 'Update Sales Order' : 'Create Sales Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Sales Order Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
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
              📋
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sales Order Details
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedOrder?.sales_order_id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
          {selectedOrder && (
            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    p: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                      📋 Order Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography><strong>Order ID:</strong> {selectedOrder.sales_order_id}</Typography>
                      <Typography><strong>Client:</strong> {selectedOrder.client_name}</Typography>
                      <Typography><strong>Project:</strong> {selectedOrder.project_name || 'N/A'}</Typography>
                      <Typography><strong>Status:</strong> 
                        <Chip
                          label={selectedOrder.status}
                          color={getStatusColor(selectedOrder.status)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography><strong>Priority:</strong> 
                        <Chip
                          label={selectedOrder.production_priority}
                          color={getPriorityColor(selectedOrder.production_priority)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    p: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                      📅 Dates & Financials
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography><strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</Typography>
                      <Typography><strong>Expected Delivery:</strong> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                      <Typography><strong>Total Amount:</strong> ₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</Typography>
                      <Typography><strong>Advance Amount:</strong> ₹{selectedOrder.advance_amount?.toLocaleString('en-IN') || '0'}</Typography>
                      <Typography><strong>Created By:</strong> {selectedOrder.created_by_name}</Typography>
                      {selectedOrder.approved_by_name && (
                        <Typography><strong>Approved By:</strong> {selectedOrder.approved_by_name}</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
                {selectedOrder.customer_po_number && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      p: 3,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        📄 Purchase Order Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>PO Number:</strong> {selectedOrder.customer_po_number}</Typography>
                        <Typography><strong>PO Date:</strong> {selectedOrder.customer_po_date ? new Date(selectedOrder.customer_po_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                {selectedOrder.special_instructions && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      p: 3,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        📝 Special Instructions
                      </Typography>
                      <Typography>{selectedOrder.special_instructions}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed'
        }}>
          <Button 
            onClick={() => setViewDialogOpen(false)}
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
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Sales Order Dialog */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa',
            maxHeight: '90vh'
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
              📄
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sales Order Preview
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedOrder?.sales_order_id} - Complete order as sent to customer
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa', maxHeight: '70vh', overflow: 'auto' }}>
          {selectedOrder && (
            <Box sx={{ p: 0 }}>
              {/* Sales Order Header */}
              <Box sx={{ 
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: '2px solid #1976d2'
              }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                    VTRIA ENGINEERING SOLUTIONS PVT LTD
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#333' }}>
                    SALES ORDER
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#666', mt: 1 }}>
                    Order No: {selectedOrder.sales_order_id}
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        📋 Order Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</Typography>
                        <Typography><strong>Expected Delivery:</strong> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                        <Typography><strong>Priority:</strong> {selectedOrder.production_priority?.toUpperCase()}</Typography>
                        <Typography><strong>Status:</strong> {selectedOrder.status?.toUpperCase()}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        🏢 Customer Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Client:</strong> {selectedOrder.client_name}</Typography>
                        <Typography><strong>Project:</strong> {selectedOrder.project_name || 'N/A'}</Typography>
                        <Typography><strong>City:</strong> {selectedOrder.city}, {selectedOrder.state}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {selectedOrder.customer_po_number && (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ 
                      backgroundColor: '#fff3cd',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #ffeaa7'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#856404', fontWeight: 600 }}>
                        📄 Purchase Order Reference
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>PO Number:</strong> {selectedOrder.customer_po_number}</Typography>
                        <Typography><strong>PO Date:</strong> {selectedOrder.customer_po_date ? new Date(selectedOrder.customer_po_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Order Items Section */}
              <Box sx={{ 
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 600 }}>
                  📦 Order Items
                </Typography>
                <Box sx={{ 
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    backgroundColor: '#1976d2',
                    color: 'white',
                    p: 2,
                    display: 'flex',
                    fontWeight: 600
                  }}>
                    <Box sx={{ flex: 1 }}>Item Description</Box>
                    <Box sx={{ width: '80px', textAlign: 'center' }}>Qty</Box>
                    <Box sx={{ width: '100px', textAlign: 'right' }}>Rate</Box>
                    <Box sx={{ width: '120px', textAlign: 'right' }}>Amount</Box>
                  </Box>
                  <Box sx={{ p: 2, backgroundColor: '#f8f9fa', fontStyle: 'italic', color: '#666' }}>
                    <em>Items will be populated from the associated quotation...</em>
                  </Box>
                </Box>
              </Box>

              {/* Financial Summary */}
              <Box sx={{ 
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 600 }}>
                  💰 Financial Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        📊 Order Totals
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Total Amount:</strong> ₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</Typography>
                        <Typography><strong>Advance Amount:</strong> ₹{selectedOrder.advance_amount?.toLocaleString('en-IN')}</Typography>
                        <Typography><strong>Balance Amount:</strong> ₹{(selectedOrder.total_amount - selectedOrder.advance_amount)?.toLocaleString('en-IN')}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        📋 Terms & Conditions
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Payment Terms:</strong> {selectedOrder.payment_terms}</Typography>
                        <Typography><strong>Delivery Terms:</strong> {selectedOrder.delivery_terms}</Typography>
                        <Typography><strong>Warranty:</strong> {selectedOrder.warranty_terms}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Addresses */}
              <Box sx={{ 
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 600 }}>
                  📍 Addresses
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#28a745' }}>
                        📤 Billing Address
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-line' }}>
                        {selectedOrder.billing_address}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#dc3545' }}>
                        📦 Shipping Address
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-line' }}>
                        {selectedOrder.shipping_address}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Special Instructions */}
              {selectedOrder.special_instructions && (
                <Box sx={{ 
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  p: 4,
                  m: 3,
                  mt: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                    📝 Special Instructions
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-line', backgroundColor: '#f8f9fa', p: 2, borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    {selectedOrder.special_instructions}
                  </Typography>
                </Box>
              )}

              {/* Footer */}
              <Box sx={{ 
                backgroundColor: '#1976d2',
                color: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                textAlign: 'center'
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Thank you for your business!
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  For any queries, please contact us at info@vtrai.com | +91-XXXXXXXXXX
                </Typography>
                <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.7 }}>
                  This is a computer generated sales order. Generated on {new Date().toLocaleDateString('en-IN')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed'
        }}>
          <Button 
            onClick={() => setPreviewDialogOpen(false)}
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
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesOrders;
