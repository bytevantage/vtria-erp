import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../utils/api';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [serialProducts, setSerialProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockDialog, setStockDialog] = useState(false);
  const [serialDialog, setSerialDialog] = useState(false);
  const [serialNumbers, setSerialNumbers] = useState([]);

  // Fetch all products with stock info
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await api.get('/api/products');
      
      if (fetchError) {
        throw new Error(fetchError);
      }
      
      if (data?.success) {
        const productsData = data?.data || [];
        setProducts(productsData);
        
        // Filter low stock and serial products
        const lowStock = productsData.filter(p => 
          p.stock_status === 'Low Stock' || p.stock_status === 'Critical' || p.stock_status === 'low'
        );
        const serialRequired = productsData.filter(p => 
          p.requires_serial_tracking === 1 || p.serial_number_required === 1
        );
        
        setLowStockProducts(lowStock);
        setSerialProducts(serialRequired);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError({
        message: 'Failed to load inventory data',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch serial numbers for a product
  const fetchSerialNumbers = async (productId) => {
    try {
      const { data, error: fetchError } = await api.get(`/api/products/${productId}/serials`);
      
      if (fetchError) {
        throw new Error(fetchError);
      }
      
      setSerialNumbers(data?.data || []);
    } catch (error) {
      console.error('Error fetching serial numbers:', error);
      setError({
        message: `Failed to load serial numbers for product ${productId}`,
        details: error.message,
        timestamp: new Date().toISOString()
      });
      setSerialNumbers([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEditItem = (item) => {
    setSelectedProduct(item);
    setStockDialog(true);
  };

  const handleViewSerials = async (item) => {
    setSelectedProduct(item);
    await fetchSerialNumbers(item.id);
    setSerialDialog(true);
  };

  const handleDeleteItem = (itemId) => {
    console.log('Deleting item:', itemId);
    // Add delete functionality here
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock': return 'success';
      case 'Low Stock': return 'warning';
      case 'Critical': return 'error';
      default: return 'default';
    }
  };

  const renderProductsTable = (productList, showActions = true) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Make/Model</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Stock</TableCell>
            <TableCell>Unit Price</TableCell>
            <TableCell>GST Rate</TableCell>
            <TableCell>Total Value</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Serial Required</TableCell>
            {showActions && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {productList.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.item_code || item.product_code || item.part_code || '-'}</TableCell>
              <TableCell>{item.item_name || item.name}</TableCell>
              <TableCell>{item.brand ? `${item.brand} ${item.model_number || item.model || ''}`.trim() : (item.make ? `${item.make} ${item.model || ''}`.trim() : '-')}</TableCell>
              <TableCell>{item.main_category_name || item.category_name || '-'}</TableCell>
              <TableCell>{item.current_stock || item.total_stock || 0}</TableCell>
              <TableCell>₹{(parseFloat(item.selling_price) || parseFloat(item.mrp) || 0).toLocaleString('en-IN')}</TableCell>
              <TableCell>
                <Chip
                  label={`${item.gst_rate || 18}%`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </TableCell>
              <TableCell>₹{((item.current_stock || item.total_stock || 0) * (parseFloat(item.selling_price) || parseFloat(item.mrp) || 0)).toLocaleString('en-IN')}</TableCell>
              <TableCell>
                <Chip
                  label={item.stock_status || 'Unknown'}
                  color={getStatusColor(item.stock_status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  icon={(item.requires_serial_tracking || item.serial_number_required) ? <QrCodeIcon /> : null}
                  label={(item.requires_serial_tracking || item.serial_number_required) ? 'Yes' : 'No'}
                  variant={(item.requires_serial_tracking || item.serial_number_required) ? 'filled' : 'outlined'}
                  color={(item.requires_serial_tracking || item.serial_number_required) ? 'primary' : 'default'}
                  size="small"
                />
              </TableCell>
              {showActions && (
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditItem(item)} title="Edit Stock">
                    <EditIcon />
                  </IconButton>
                  {(item.requires_serial_tracking || item.serial_number_required) && (
                    <IconButton size="small" onClick={() => handleViewSerials(item)} title="View Serial Numbers">
                      <QrCodeIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleDeleteItem(item.id)} title="Delete">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchProducts}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          <Typography variant="subtitle2">{error.message}</Typography>
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            {error.details}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Error occurred at: {new Date(error.timestamp).toLocaleString()}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Inventory Management</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchProducts}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            Add Stock Entry
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <InventoryIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{products.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Products
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
                <WarningIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{lowStockProducts.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Low Stock Items
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
                <QrCodeIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{serialProducts.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Serial Tracked
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
                <Typography variant="h6" color="success.main">
                  ₹{products.reduce((sum, p) => sum + (p.current_stock || p.total_stock || 0) * (parseFloat(p.selling_price) || parseFloat(p.mrp) || 0), 0).toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Inventory Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary">
          <Tab label="All Products" />
          <Tab label="Low Stock" />
          <Tab label="Serial Tracked" />
        </Tabs>
      </Paper>

      {/* Content based on selected tab */}
      {tabValue === 0 && renderProductsTable(products)}
      {tabValue === 1 && renderProductsTable(lowStockProducts)}
      {tabValue === 2 && renderProductsTable(serialProducts)}

      {/* Stock Edit Dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Stock - {selectedProduct?.item_name || selectedProduct?.name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Current Stock"
            type="number"
            fullWidth
            variant="outlined"
            defaultValue={selectedProduct?.current_stock || selectedProduct?.total_stock || 0}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Warehouse Location"
            fullWidth
            variant="outlined"
            placeholder="e.g., Warehouse A, Section 1"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Stock adjustment reason..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(false)}>Cancel</Button>
          <Button variant="contained">Update Stock</Button>
        </DialogActions>
      </Dialog>

      {/* Serial Numbers Dialog */}
      <Dialog open={serialDialog} onClose={() => setSerialDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Serial Numbers - {selectedProduct?.item_name || selectedProduct?.name}</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serialNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No serial numbers found
                    </TableCell>
                  </TableRow>
                ) : (
                  serialNumbers.map((serial, index) => (
                    <TableRow key={index}>
                      <TableCell>{serial.serial_number}</TableCell>
                      <TableCell>
                        <Chip label={serial.status} size="small" />
                      </TableCell>
                      <TableCell>{serial.location || '-'}</TableCell>
                      <TableCell>{serial.last_updated || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSerialDialog(false)}>Close</Button>
          <Button variant="contained">Add Serial Number</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
