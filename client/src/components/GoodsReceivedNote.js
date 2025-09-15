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
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

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
      const [grnsResponse, posResponse, suppliersResponse, locationsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/grn`),
        axios.get(`${API_BASE_URL}/purchase-order`),
        axios.get(`${API_BASE_URL}/suppliers`),
        axios.get(`${API_BASE_URL}/company-config/locations`)
      ]);

      setGrns(grnsResponse.data.data || []);
      setPurchaseOrders(posResponse.data.data || []);
      setSuppliers(suppliersResponse.data.data || []);
      setLocations(locationsResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGRN = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/grn`, formData);
      
      if (response.data.success) {
        alert('GRN created successfully!');
        setOpenDialog(false);
        fetchData();
        resetForm();
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
      await axios.put(`${API_BASE_URL}/grn/${id}/${endpoint}`);
      
      fetchData();
      alert(`GRN ${newStatus} successfully!`);
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
    
    // Auto-calculate accepted quantity if not manually set
    if (field === 'received_quantity' && !updatedItems[index].accepted_quantity) {
      updatedItems[index].accepted_quantity = value;
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
                label="Purchase Order"
                value={formData.purchase_order_id}
                onChange={(e) => setFormData({ ...formData, purchase_order_id: e.target.value })}
              >
                <MenuItem value="">Select Purchase Order</MenuItem>
                {purchaseOrders.map((po) => (
                  <MenuItem key={po.id} value={po.id}>
                    {po.po_number} - {po.supplier_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Supplier"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              >
                <MenuItem value="">Select Supplier</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </TextField>
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
            <Typography variant="h6">Items Received</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addItemToGRN}
            >
              Add Item
            </Button>
          </Box>
          
          {formData.items.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Ordered</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Accepted</TableCell>
                    <TableCell>Rejected</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Product ID"
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.ordered_quantity}
                          onChange={(e) => updateItem(index, 'ordered_quantity', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.received_quantity}
                          onChange={(e) => updateItem(index, 'received_quantity', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.accepted_quantity}
                          onChange={(e) => updateItem(index, 'accepted_quantity', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.rejected_quantity}
                          onChange={(e) => updateItem(index, 'rejected_quantity', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={item.location_id}
                          onChange={(e) => updateItem(index, 'location_id', e.target.value)}
                        >
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
              No items added yet. Click "Add Item" to start adding received items.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGRN}
            variant="contained"
            disabled={!formData.purchase_order_id || !formData.supplier_id || formData.items.length === 0}
          >
            Create GRN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoodsReceivedNote;
