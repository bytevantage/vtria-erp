import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = '';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [serialRequiredProducts, setSerialRequiredProducts] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    part_code: '',
    product_code: '',
    category_id: '',
    sub_category_id: '',
    description: '',
    mrp: '',
    vendor_discount: 0,
    last_price: '',
    last_purchase_price: '',
    unit: 'nos',
    hsn_code: '',
    gst_rate: 18.00,
    serial_number_required: false,
    warranty_period: 0,
    warranty_period_type: 'months',
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_level: 0
  });

  const units = ['nos', 'kgs', 'liters', 'meters', 'pieces', 'boxes', 'sets'];
  const warrantyTypes = ['months', 'years'];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchLowStockProducts();
    fetchSerialRequiredProducts();
  }, []);

  const fetchProducts = async (retryCount = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/products`, {
        timeout: 10000 // 10 second timeout
      });
      if (response.data.success) {
        setProducts(response.data.data);
        setError(null); // Clear any previous errors
      } else {
        setError(`API Error: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Retry logic for network failures
      if (retryCount < 2 && (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR')) {
        console.log(`Retrying... attempt ${retryCount + 1}`);
        setTimeout(() => fetchProducts(retryCount + 1), 2000);
        return;
      }
      
      if (error.response) {
        setError(`Server Error (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        setError('Network Error: Unable to connect to server. Please check if the API is running.');
      } else {
        setError(`Request Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/categories/flat`);
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLowStockProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/low-stock`);
      if (response.data.success) {
        setLowStockProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    }
  };

  const fetchSerialRequiredProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/serial-required`);
      if (response.data.success) {
        setSerialRequiredProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching serial required products:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/products`, formData);
      
      if (response.data.success) {
        await fetchProducts();
        handleClose();
      } else {
        setError('Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Error creating product');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setFormData({
      name: '',
      make: '',
      model: '',
      part_code: '',
      product_code: '',
      category_id: '',
      sub_category_id: '',
      description: '',
      mrp: '',
      vendor_discount: 0,
      last_price: '',
      last_purchase_price: '',
      unit: 'nos',
      hsn_code: '',
      gst_rate: 18.00,
      serial_number_required: false,
      warranty_period: 0,
      warranty_period_type: 'months',
      min_stock_level: 0,
      max_stock_level: 0,
      reorder_level: 0
    });
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setViewDialogOpen(true);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'Critical': return 'error';
      case 'Low Stock': return 'warning';
      case 'In Stock': return 'success';
      default: return 'default';
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.make?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || 
      product.category_name === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const renderProductsTab = () => (
    <Box>
      {/* Search and Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Filter by Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
              >
                Add Product
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product Info</TableCell>
              <TableCell>Code/Part No</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Pricing</TableCell>
              <TableCell>Stock Status</TableCell>
              <TableCell>Warranty</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{product.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.make} - {product.model}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{product.product_code}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {product.part_code}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={product.category_name} size="small" />
                  {product.sub_category_name && (
                    <Chip 
                      label={product.sub_category_name} 
                      size="small" 
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      MRP: ₹{parseFloat(product.mrp || 0).toLocaleString('en-IN')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last: ₹{parseFloat(product.last_purchase_price || 0).toLocaleString('en-IN')}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      GST: {product.gst_rate || 18}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={`${product.total_stock} ${product.unit}`}
                      color={getStockStatusColor(product.stock_status)}
                      size="small"
                    />
                    {product.stock_status !== 'In Stock' && (
                      <WarningIcon color="warning" fontSize="small" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {product.warranty_period > 0 && (
                      <Chip 
                        label={`${product.warranty_period} ${product.warranty_period_type}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {product.serial_number_required && (
                      <QrCodeIcon fontSize="small" color="primary" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleViewProduct(product)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Product">
                      <IconButton size="small" color="secondary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderLowStockTab = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Current Stock</TableCell>
            <TableCell>Reorder Level</TableCell>
            <TableCell>Suggested Order</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lowStockProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Box>
                  <Typography variant="subtitle2">{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.product_code}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {product.total_stock} {product.unit}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {product.reorder_level} {product.unit}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="primary">
                  {product.suggested_order_qty} {product.unit}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={product.stock_status}
                  color={getStockStatusColor(product.stock_status)}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Product Management
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="All Products" />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              Low Stock
              {lowStockProducts.length > 0 && (
                <Chip 
                  label={lowStockProducts.length} 
                  size="small" 
                  color="warning"
                />
              )}
            </Box>
          } 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              Serial Tracking
              <QrCodeIcon fontSize="small" />
            </Box>
          } 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              Inventory View
              <InventoryIcon fontSize="small" />
            </Box>
          } 
        />
      </Tabs>

      {/* Tab Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tabValue === 0 && renderProductsTab()}
          {tabValue === 1 && renderLowStockTab()}
          {tabValue === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Product Code</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Warranty Period</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serialRequiredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.make} - {product.model}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.product_code}</TableCell>
                      <TableCell>
                        <Chip label={product.category_name} size="small" />
                      </TableCell>
                      <TableCell>
                        {product.warranty_period > 0 && (
                          <Chip 
                            label={`${product.warranty_period} ${product.warranty_period_type}`}
                            size="small"
                            color="primary"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 3 && (
            <Box>
              {/* Inventory Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <InventoryIcon color="primary" sx={{ mr: 2 }} />
                        <Box>
                          <Typography variant="h5">{products.length}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Items in Inventory
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
                          <Typography variant="h5">{lowStockProducts.length}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Low Stock Alerts
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
                          <Typography variant="h5">{serialRequiredProducts.length}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Serial Tracked Items
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Box>
                        <Typography variant="h5" color="success.main">
                          ₹{products.reduce((sum, p) => sum + (p.total_stock || 0) * (p.mrp || 0), 0).toLocaleString('en-IN')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Inventory Value
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Inventory Table with Stock Details */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product Details</TableCell>
                      <TableCell>Product Code</TableCell>
                      <TableCell>Current Stock</TableCell>
                      <TableCell>Min Stock</TableCell>
                      <TableCell>Max Stock</TableCell>
                      <TableCell>Reorder Level</TableCell>
                      <TableCell>Stock Value</TableCell>
                      <TableCell>Serial Tracking</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {product.make} - {product.model}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.product_code || product.part_code || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {product.total_stock || 0} {product.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.min_stock_level || 0}</TableCell>
                        <TableCell>{product.max_stock_level || 0}</TableCell>
                        <TableCell>{product.reorder_level || 0}</TableCell>
                        <TableCell>
                          ₹{((product.total_stock || 0) * (product.mrp || 0)).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={product.serial_number_required ? <QrCodeIcon /> : null}
                            label={product.serial_number_required ? 'Required' : 'Not Required'}
                            variant={product.serial_number_required ? 'filled' : 'outlined'}
                            color={product.serial_number_required ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={product.stock_status || 'Unknown'}
                            color={getStockStatusColor(product.stock_status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}

      {/* Add Product Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">Basic Information</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Code"
                value={formData.product_code}
                onChange={(e) => setFormData({...formData, product_code: e.target.value})}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Make"
                value={formData.make}
                onChange={(e) => setFormData({...formData, make: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Part Code"
                value={formData.part_code}
                onChange={(e) => setFormData({...formData, part_code: e.target.value})}
              />
            </Grid>

            {/* Categories */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">Category & Classification</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Category"
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth required>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.unit}
                  label="Unit"
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="HSN Code"
                value={formData.hsn_code}
                onChange={(e) => setFormData({...formData, hsn_code: e.target.value})}
              />
            </Grid>

            {/* Pricing */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">Pricing Information</Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="MRP"
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData({...formData, mrp: e.target.value})}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Vendor Discount %"
                type="number"
                value={formData.vendor_discount}
                onChange={(e) => setFormData({...formData, vendor_discount: e.target.value})}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Last Purchase Price"
                type="number"
                value={formData.last_purchase_price}
                onChange={(e) => setFormData({...formData, last_purchase_price: e.target.value})}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="GST Rate %"
                type="number"
                value={formData.gst_rate}
                onChange={(e) => setFormData({...formData, gst_rate: e.target.value})}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            {/* Stock Management */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">Stock Management</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Minimum Stock Level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Maximum Stock Level"
                type="number"
                value={formData.max_stock_level}
                onChange={(e) => setFormData({...formData, max_stock_level: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Reorder Level"
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({...formData, reorder_level: e.target.value})}
              />
            </Grid>

            {/* Warranty & Tracking */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">Warranty & Tracking</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Warranty Period"
                type="number"
                value={formData.warranty_period}
                onChange={(e) => setFormData({...formData, warranty_period: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Warranty Type</InputLabel>
                <Select
                  value={formData.warranty_period_type}
                  label="Warranty Type"
                  onChange={(e) => setFormData({...formData, warranty_period_type: e.target.value})}
                >
                  {warrantyTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.serial_number_required}
                    onChange={(e) => setFormData({...formData, serial_number_required: e.target.checked})}
                  />
                }
                label="Requires Serial Number Tracking"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">{selectedProduct.name}</Typography>
                <Typography color="text.secondary">
                  {selectedProduct.make} - {selectedProduct.model}
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  <strong>Product Code:</strong> {selectedProduct.product_code}
                </Typography>
                <Typography variant="body2">
                  <strong>Part Code:</strong> {selectedProduct.part_code}
                </Typography>
                <Typography variant="body2">
                  <strong>HSN Code:</strong> {selectedProduct.hsn_code}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  <strong>MRP:</strong> ₹{parseFloat(selectedProduct.mrp || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2">
                  <strong>Vendor Discount:</strong> {selectedProduct.vendor_discount}%
                </Typography>
                <Typography variant="body2">
                  <strong>Last Purchase Price:</strong> ₹{parseFloat(selectedProduct.last_purchase_price || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2">
                  <strong>GST Rate:</strong> {selectedProduct.gst_rate}%
                </Typography>
                <Typography variant="body2">
                  <strong>Current Stock:</strong> {selectedProduct.total_stock} {selectedProduct.unit}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagement;
