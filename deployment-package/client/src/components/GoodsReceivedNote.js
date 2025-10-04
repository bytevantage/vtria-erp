import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { api } from '../utils/api';

const GoodsReceivedNote = () => {
  const [grns, setGrns] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    supplier_id: '',
    lr_number: '',
    supplier_invoice_number: '',
    supplier_invoice_date: '',
    items: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [grnsResponse, approvedPOsResponse, suppliersResponse, locationsResponse] = await Promise.all([
        api.get('/api/grn'),
        api.get('/api/purchase-order/approved'),
        api.get('/api/vendors'),
        api.get('/api/company-config/locations')
      ]);

      if (!grnsResponse.error) setGrns(grnsResponse.data.data || []);
      if (!approvedPOsResponse.error) setPurchaseOrders(approvedPOsResponse.data.data || []);
      if (!suppliersResponse.error) setSuppliers(suppliersResponse.data.data || []);
      if (!locationsResponse.error) setLocations(locationsResponse.data.data || []);

      // Log any errors
      if (grnsResponse.error) console.error('Error fetching GRNs:', grnsResponse.error);
      if (approvedPOsResponse.error) console.error('Error fetching approved POs:', approvedPOsResponse.error);
      if (suppliersResponse.error) console.error('Error fetching suppliers:', suppliersResponse.error);
      if (locationsResponse.error) console.error('Error fetching locations:', locationsResponse.error);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGRN = async () => {
    try {
      const { data, error } = await api.post('/api/grn', formData);
      
      if (!error && data.success) {
        alert('GRN created successfully!');
        setOpenDialog(false);
        fetchData();
        resetForm();
      } else {
        alert(error || 'Error creating GRN');
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert('Error creating GRN');
    }
  };

  const resetForm = () => {
    setFormData({
      purchase_order_id: '',
      supplier_id: '',
      lr_number: '',
      supplier_invoice_number: '',
      supplier_invoice_date: '',
      items: []
    });
  };

  // Handle purchase order selection and auto-populate form
  const handlePurchaseOrderChange = async (purchaseOrderId) => {
    try {
      setFormData(prev => ({ ...prev, purchase_order_id: purchaseOrderId }));
      
      if (!purchaseOrderId) {
        setFormData(prev => ({ ...prev, supplier_id: '', items: [] }));
        return;
      }

      // Fetch purchase order details with items
      const { data, error } = await api.get(`/api/purchase-order/${purchaseOrderId}/with-items`);
      
      console.log('API Response:', { data, error }); // Debug log
      
      if (!error && data.success && data.data) {
        const poData = data.data;
        
        console.log('Purchase Order Data:', poData); // Debug log
        console.log('Supplier ID:', poData.supplier_id); // Debug log
        
        // Auto-populate supplier
        setFormData(prev => ({ 
          ...prev, 
          supplier_id: poData.supplier_id 
        }));

        // Auto-populate items from purchase order
        const grnItems = poData.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          part_code: item.part_code,
          make: item.make,
          model: item.model,
          unit: item.unit,
          ordered_quantity: item.quantity,
          received_quantity: 0, // To be filled during GRN
          accepted_quantity: 0, // To be filled during verification
          rejected_quantity: 0, // To be filled during verification
          unit_price: item.unit_price,
          serial_numbers: '',
          warranty_start_date: '',
          warranty_end_date: '',
          location_id: '',
          notes: ''
        }));

        setFormData(prev => ({ ...prev, items: grnItems }));
      } else {
        console.error('Failed to fetch PO details:', error || 'API response indicates failure');
        alert('Failed to load purchase order details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching purchase order details:', error);
      alert('Error loading purchase order details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'verified': return 'primary';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const endpoint = newStatus === 'verified' ? 'verify' : 'approve';
      const { data, error } = await api.put(`/api/grn/${id}/${endpoint}`);
      
      if (!error && data.success) {
        fetchData();
        alert(`GRN ${newStatus} successfully!`);
      } else {
        alert(error || `Error ${newStatus} GRN`);
      }
    } catch (error) {
      console.error(`Error ${newStatus} GRN:`, error);
      alert(`Error ${newStatus} GRN`);
    }
  };

  const addItemToGRN = () => {
    const newItem = {
      product_id: '',
      ordered_quantity: 0,
      received_quantity: 0,
      accepted_quantity: 0,
      rejected_quantity: 0,
      unit_price: 0,
      serial_numbers: '',
      warranty_start_date: '',
      warranty_end_date: '',
      location_id: '',
      notes: ''
    };
    
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    
    // Auto-calculate accepted/rejected quantities when received quantity changes
    if (field === 'received_quantity') {
      const receivedQty = parseInt(value) || 0;
      // If accepted quantity hasn't been manually set, default to received quantity
      if (updatedItems[index].accepted_quantity === 0) {
        updatedItems[index].accepted_quantity = receivedQty;
      }
      // Ensure accepted + rejected doesn't exceed received
      const acceptedQty = updatedItems[index].accepted_quantity || 0;
      const rejectedQty = updatedItems[index].rejected_quantity || 0;
      if (acceptedQty + rejectedQty > receivedQty) {
        updatedItems[index].rejected_quantity = Math.max(0, receivedQty - acceptedQty);
      }
    }
    
    // Ensure accepted + rejected doesn't exceed received
    if (field === 'accepted_quantity' || field === 'rejected_quantity') {
      const receivedQty = updatedItems[index].received_quantity || 0;
      const acceptedQty = field === 'accepted_quantity' ? (parseInt(value) || 0) : (updatedItems[index].accepted_quantity || 0);
      const rejectedQty = field === 'rejected_quantity' ? (parseInt(value) || 0) : (updatedItems[index].rejected_quantity || 0);
      
      if (acceptedQty + rejectedQty > receivedQty) {
        if (field === 'accepted_quantity') {
          updatedItems[index].rejected_quantity = Math.max(0, receivedQty - acceptedQty);
        } else {
          updatedItems[index].accepted_quantity = Math.max(0, receivedQty - rejectedQty);
        }
      }
    }
    
    setFormData({ ...formData, items: updatedItems });
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Goods Received Notes (GRN)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create New GRN
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>GRN Number</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>PO Number</strong></TableCell>
                <TableCell><strong>Supplier</strong></TableCell>
                <TableCell><strong>Invoice No.</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grns.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {grn.grn_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(grn.grn_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{grn.po_number}</TableCell>
                  <TableCell>{grn.supplier_name}</TableCell>
                  <TableCell>{grn.supplier_invoice_number}</TableCell>
                  <TableCell>₹{grn.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={grn.status.toUpperCase()} 
                      color={getStatusColor(grn.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => {
                        // View details logic
                        alert(`View GRN: ${grn.grn_number}`);
                      }}
                    >
                      View
                    </Button>
                    {grn.status === 'draft' && (
                      <Button
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => updateStatus(grn.id, 'verified')}
                        sx={{ ml: 1 }}
                      >
                        Verify
                      </Button>
                    )}
                    {grn.status === 'verified' && (
                      <Button
                        size="small"
                        startIcon={<AssignmentIcon />}
                        onClick={() => updateStatus(grn.id, 'approved')}
                        sx={{ ml: 1 }}
                      >
                        Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {grns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">
                      No GRNs found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create GRN Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create Goods Received Note</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Purchase Order *"
                value={formData.purchase_order_id}
                onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                required
              >
                <MenuItem value="">Select Approved Purchase Order</MenuItem>
                {purchaseOrders.map((po) => (
                  <MenuItem key={po.id} value={po.id}>
                    {po.po_number} - {po.supplier_name} (₹{po.grand_total?.toLocaleString()})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Supplier *"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                disabled={!!formData.purchase_order_id} // Auto-filled from PO
                required
              >
                <MenuItem value="">Select Supplier</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.company_name || supplier.name}
                  </MenuItem>
                ))}
              </TextField>
              {formData.purchase_order_id && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Auto-filled from selected Purchase Order
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="LR Number"
                value={formData.lr_number}
                onChange={(e) => setFormData({ ...formData, lr_number: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Supplier Invoice Number"
                value={formData.supplier_invoice_number}
                onChange={(e) => setFormData({ ...formData, supplier_invoice_number: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Supplier Invoice Date"
                value={formData.supplier_invoice_date}
                onChange={(e) => setFormData({ ...formData, supplier_invoice_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">Items for Verification</Typography>
              {formData.purchase_order_id && (
                <Typography variant="caption" color="text.secondary">
                  Items auto-loaded from Purchase Order. Update quantities as received.
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addItemToGRN}
              disabled={!!formData.purchase_order_id} // Disable if from PO
            >
              Add Item
            </Button>
          </Box>
          
          {formData.items.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product Details</strong></TableCell>
                    <TableCell><strong>Ordered Qty</strong></TableCell>
                    <TableCell><strong>Received Qty</strong></TableCell>
                    <TableCell><strong>Accepted Qty</strong></TableCell>
                    <TableCell><strong>Rejected Qty</strong></TableCell>
                    <TableCell><strong>Unit Price</strong></TableCell>
                    <TableCell><strong>Stock Location</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.product_name ? (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {item.product_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.part_code && `Code: ${item.part_code}`}
                              {item.make && ` | Make: ${item.make}`}
                              {item.model && ` | Model: ${item.model}`}
                            </Typography>
                          </Box>
                        ) : (
                          <TextField
                            size="small"
                            placeholder="Product ID"
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.ordered_quantity}
                          onChange={(e) => updateItem(index, 'ordered_quantity', parseInt(e.target.value) || 0)}
                          disabled={!!formData.purchase_order_id} // Read-only if from PO
                          InputProps={{
                            endAdornment: item.unit && (
                              <Typography variant="caption" color="text.secondary">
                                {item.unit}
                              </Typography>
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.received_quantity}
                          onChange={(e) => updateItem(index, 'received_quantity', parseInt(e.target.value) || 0)}
                          InputProps={{
                            endAdornment: item.unit && (
                              <Typography variant="caption" color="text.secondary">
                                {item.unit}
                              </Typography>
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.accepted_quantity}
                          onChange={(e) => updateItem(index, 'accepted_quantity', parseInt(e.target.value) || 0)}
                          InputProps={{
                            endAdornment: item.unit && (
                              <Typography variant="caption" color="text.secondary">
                                {item.unit}
                              </Typography>
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.rejected_quantity}
                          onChange={(e) => updateItem(index, 'rejected_quantity', parseInt(e.target.value) || 0)}
                          InputProps={{
                            endAdornment: item.unit && (
                              <Typography variant="caption" color="text.secondary">
                                {item.unit}
                              </Typography>
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          disabled={!!formData.purchase_order_id} // Read-only if from PO
                          InputProps={{
                            startAdornment: (
                              <Typography variant="caption" color="text.secondary">
                                ₹
                              </Typography>
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Location"
                          value={item.location_id}
                          onChange={(e) => updateItem(index, 'location_id', e.target.value)}
                          required
                        >
                          <MenuItem value="">Select Location</MenuItem>
                          {locations.map((location) => (
                            <MenuItem key={location.id} value={location.id}>
                              {location.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeItem(index)}
                          disabled={!!formData.purchase_order_id} // Disable if from PO
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {formData.items.length === 0 && (
            <Alert severity="info">
              {formData.purchase_order_id 
                ? "No items found in the selected Purchase Order." 
                : "No items added yet. Select a Purchase Order to auto-load items, or click 'Add Item' to manually add items."
              }
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGRN}
            variant="contained"
            disabled={
              !formData.purchase_order_id || 
              !formData.supplier_id || 
              formData.items.length === 0 ||
              formData.items.some(item => !item.location_id || item.received_quantity <= 0)
            }
          >
            Create GRN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoodsReceivedNote;
