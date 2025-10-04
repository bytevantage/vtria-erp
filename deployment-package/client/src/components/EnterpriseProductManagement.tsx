import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Tab,
  Button,
  Badge,
  Divider,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  QrCode as BarcodeIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Category as CategoryIcon,
  LocalOffer as PriceIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Print as PrintIcon
} from '@mui/icons-material';
// Removed notistack dependency - using simple notifications
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  name: string;
  make?: string;
  model?: string;
  part_code?: string;
  product_code?: string;
  category_id?: number;
  category_name?: string;
  sub_category_name?: string;
  description?: string;
  mrp?: number;
  vendor_discount?: number;
  last_price?: number;
  last_purchase_price?: number;
  unit: string;
  hsn_code?: string;
  gst_rate?: number;
  serial_number_required: boolean;
  warranty_period?: number;
  warranty_period_type?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_level?: number;
  total_stock?: number;
  stock_status?: string;
  abc_classification?: string;
  created_at?: string;
  updated_at?: string;
}

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  lowStockProducts: number;
  totalValue: number;
  averagePrice: number;
  serialTracked: number;
  warrantyEnabled: number;
  activeProducts: number;
}

interface Category {
  id: number;
  name: string;
  display_name: string;
}

const EnterpriseProductManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // Dialog states
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

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

  const units = ['nos', 'kgs', 'liters', 'meters', 'pieces', 'boxes', 'sets', 'pairs', 'packets'];
  const warrantyTypes = ['months', 'years'];

  // Simple notification function to replace notistack
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`);
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/dashboard`);
      if (response.data.success) {
        setDashboardStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/products`, {
        params: {
          search: searchTerm,
          category: filterCategory,
          status: filterStatus,
          sortBy,
          sortOrder
        }
      });
      
      if (response.data.success) {
        setProducts(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please check API connection.');
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const url = editMode ? `${API_BASE_URL}/api/products/${selectedProduct?.id}` : `${API_BASE_URL}/api/products`;
      const method = editMode ? 'put' : 'post';
      
      const response = await axios[method](url, formData);
      
      if (response.data.success) {
        await fetchProducts();
        await fetchDashboardData();
        handleClose();
        showNotification(`Product ${editMode ? 'updated' : 'created'} successfully`, 'success');
      } else {
        setError(response.data.message || `Failed to ${editMode ? 'update' : 'create'} product`);
      }
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} product:`, error);
      setError(`Error ${editMode ? 'updating' : 'creating'} product`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpenProductDialog(false);
    setEditMode(false);
    setSelectedProduct(null);
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

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      make: product.make || '',
      model: product.model || '',
      part_code: product.part_code || '',
      product_code: product.product_code || '',
      category_id: product.category_id?.toString() || '',
      sub_category_id: '',
      description: product.description || '',
      mrp: product.mrp?.toString() || '',
      vendor_discount: product.vendor_discount || 0,
      last_price: product.last_price?.toString() || '',
      last_purchase_price: product.last_purchase_price?.toString() || '',
      unit: product.unit || 'nos',
      hsn_code: product.hsn_code || '',
      gst_rate: product.gst_rate || 18.00,
      serial_number_required: product.serial_number_required || false,
      warranty_period: product.warranty_period || 0,
      warranty_period_type: product.warranty_period_type || 'months',
      min_stock_level: product.min_stock_level || 0,
      max_stock_level: product.max_stock_level || 0,
      reorder_level: product.reorder_level || 0
    });
    setEditMode(true);
    setOpenProductDialog(true);
  };

  const getStockStatusColor = (status?: string) => {
    switch (status) {
      case 'Critical': return 'error';
      case 'Low Stock': return 'warning';
      case 'In Stock': return 'success';
      default: return 'default';
    }
  };

  const getABCClassificationColor = (classification?: string) => {
    switch (classification) {
      case 'A': return 'error';
      case 'B': return 'warning';
      case 'C': return 'success';
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
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'low_stock' && product.stock_status !== 'In Stock') ||
      (filterStatus === 'serial_required' && product.serial_number_required) ||
      (filterStatus === 'warranty' && (product.warranty_period || 0) > 0);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderDashboardTab = () => (
    <Box>
      {/* Dashboard Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <InventoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboardStats?.totalProducts || products.length}
                  </Typography>
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
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <WarningIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {products.filter(p => p.stock_status !== 'In Stock').length}
                  </Typography>
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
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <PriceIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{products.reduce((sum, p) => sum + (p.total_stock || 0) * (p.mrp || 0), 0).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Inventory Value
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
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <CategoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {categories.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Product Categories
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenProductDialog(true)}
              >
                Add Product
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<ImportIcon />}
              >
                Import Products
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
              >
                Export Data
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  fetchProducts();
                  fetchDashboardData();
                }}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analytics Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stock Status Distribution
              </Typography>
              <Box>
                {['In Stock', 'Low Stock', 'Critical'].map((status) => {
                  const count = products.filter(p => p.stock_status === status || (status === 'Critical' && p.stock_status === 'Critical')).length;
                  const percentage = products.length > 0 ? (count / products.length) * 100 : 0;
                  return (
                    <Box key={status} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{status}</Typography>
                        <Typography variant="body2">{count} ({percentage.toFixed(1)}%)</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={status === 'In Stock' ? 'success' : status === 'Low Stock' ? 'warning' : 'error'}
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Distribution
              </Typography>
              <Box>
                {categories.slice(0, 5).map((category) => {
                  const count = products.filter(p => p.category_name === category.name).length;
                  const percentage = products.length > 0 ? (count / products.length) * 100 : 0;
                  return (
                    <Box key={category.id} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{category.display_name}</Typography>
                        <Typography variant="body2">{count} ({percentage.toFixed(1)}%)</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ height: 8, borderRadius: 4 }}
                        color="primary"
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderProductsTab = () => (
    <Box>
      {/* Advanced Search and Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search products by name, code, or make..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status Filter"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Products</MenuItem>
                  <MenuItem value="low_stock">Low Stock</MenuItem>
                  <MenuItem value="serial_required">Serial Tracking</MenuItem>
                  <MenuItem value="warranty">With Warranty</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenProductDialog(true)}
              >
                Add Product
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Enhanced Products Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product Information</TableCell>
              <TableCell>Codes & Category</TableCell>
              <TableCell>Pricing</TableCell>
              <TableCell>Stock Status</TableCell>
              <TableCell>Features</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.make} - {product.model}
                    </Typography>
                    {product.description && (
                      <Typography variant="caption" color="text.secondary">
                        {product.description.length > 50 
                          ? `${product.description.substring(0, 50)}...` 
                          : product.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {product.product_code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Part: {product.part_code || '-'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip label={product.category_name || 'Uncategorized'} size="small" />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      MRP: ₹{parseFloat(product.mrp || '0').toLocaleString('en-IN')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last: ₹{parseFloat(product.last_purchase_price || '0').toLocaleString('en-IN')}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      GST: {product.gst_rate || 18}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Chip 
                      label={`${product.total_stock || 0} ${product.unit}`}
                      color={getStockStatusColor(product.stock_status)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      Reorder: {product.reorder_level || 0}
                    </Typography>
                    {product.abc_classification && (
                      <Chip 
                        label={`ABC: ${product.abc_classification}`}
                        color={getABCClassificationColor(product.abc_classification)}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {product.serial_number_required && (
                      <Chip 
                        icon={<BarcodeIcon />}
                        label="Serial Tracking" 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {(product.warranty_period || 0) > 0 && (
                      <Chip 
                        icon={<SecurityIcon />}
                        label={`${product.warranty_period} ${product.warranty_period_type}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          setSelectedProduct(product);
                          setOpenViewDialog(true);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Product">
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => handleEditProduct(product)}
                      >
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

  const renderAnalyticsTab = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Stock Analytics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <AssessmentIcon sx={{ mr: 1 }} />
                Stock Value Analysis
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Inventory Value
                </Typography>
                <Typography variant="h4" color="success.main" gutterBottom>
                  ₹{products.reduce((sum, p) => sum + (p.total_stock || 0) * (p.mrp || 0), 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Average Product Value
                </Typography>
                <Typography variant="h6">
                  ₹{products.length > 0 ? (products.reduce((sum, p) => sum + (p.mrp || 0), 0) / products.length).toLocaleString('en-IN') : '0'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <TimelineIcon sx={{ mr: 1 }} />
                Performance Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2">Products with Serial Tracking</Typography>
                  <Typography variant="h6">
                    {products.filter(p => p.serial_number_required).length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2">Products with Warranty</Typography>
                  <Typography variant="h6">
                    {products.filter(p => (p.warranty_period || 0) > 0).length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">High-Value Products (>₹10k)</Typography>
                  <Typography variant="h6">
                    {products.filter(p => (p.mrp || 0) > 10000).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <PieChartIcon sx={{ mr: 1 }} />
                Category Performance
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Products</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell align="right">Avg Price</TableCell>
                      <TableCell align="right">Low Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((category) => {
                      const categoryProducts = products.filter(p => p.category_name === category.name);
                      const totalValue = categoryProducts.reduce((sum, p) => sum + (p.total_stock || 0) * (p.mrp || 0), 0);
                      const avgPrice = categoryProducts.length > 0 ? categoryProducts.reduce((sum, p) => sum + (p.mrp || 0), 0) / categoryProducts.length : 0;
                      const lowStockCount = categoryProducts.filter(p => p.stock_status !== 'In Stock').length;
                      
                      return (
                        <TableRow key={category.id}>
                          <TableCell>{category.display_name}</TableCell>
                          <TableCell align="right">{categoryProducts.length}</TableCell>
                          <TableCell align="right">₹{totalValue.toLocaleString('en-IN')}</TableCell>
                          <TableCell align="right">₹{avgPrice.toLocaleString('en-IN')}</TableCell>
                          <TableCell align="right">
                            {lowStockCount > 0 ? (
                              <Chip label={lowStockCount} color="warning" size="small" />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Enterprise Product Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenProductDialog(true)}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Enhanced Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <DashboardIcon />
              Dashboard
            </Box>
          } 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <InventoryIcon />
              Products
              <Chip label={products.length} size="small" />
            </Box>
          } 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <AnalyticsIcon />
              Analytics
            </Box>
          } 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon />
              Alerts
              <Badge 
                badgeContent={products.filter(p => p.stock_status !== 'In Stock').length} 
                color="error"
              >
                <span></span>
              </Badge>
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
          {activeTab === 0 && renderDashboardTab()}
          {activeTab === 1 && renderProductsTab()}
          {activeTab === 2 && renderAnalyticsTab()}
          {activeTab === 3 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Current Stock</TableCell>
                    <TableCell>Reorder Level</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action Required</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products
                    .filter(p => p.stock_status !== 'In Stock')
                    .map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {product.product_code}
                          </Typography>
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
                          <Chip 
                            label={product.stock_status}
                            color={getStockStatusColor(product.stock_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            Create Purchase Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Enhanced Product Form Dialog */}
      <Dialog open={openProductDialog} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                Basic Information
              </Typography>
              <Divider />
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
              <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                Category & Classification
              </Typography>
              <Divider />
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
              <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                Pricing Information
              </Typography>
              <Divider />
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
                onChange={(e) => setFormData({...formData, vendor_discount: parseFloat(e.target.value) || 0})}
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
                onChange={(e) => setFormData({...formData, gst_rate: parseFloat(e.target.value) || 18})}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            {/* Stock Management */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                Stock Management
              </Typography>
              <Divider />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Minimum Stock Level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value) || 0})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Maximum Stock Level"
                type="number"
                value={formData.max_stock_level}
                onChange={(e) => setFormData({...formData, max_stock_level: parseInt(e.target.value) || 0})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Reorder Level"
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 0})}
              />
            </Grid>

            {/* Warranty & Tracking */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                Warranty & Tracking
              </Typography>
              <Divider />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Warranty Period"
                type="number"
                value={formData.warranty_period}
                onChange={(e) => setFormData({...formData, warranty_period: parseInt(e.target.value) || 0})}
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
            {loading ? <CircularProgress size={20} /> : editMode ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced View Product Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Product Details
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>{selectedProduct.name}</Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {selectedProduct.make} - {selectedProduct.model}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" gutterBottom>
                  <strong>Product Code:</strong> {selectedProduct.product_code}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Part Code:</strong> {selectedProduct.part_code || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>HSN Code:</strong> {selectedProduct.hsn_code || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Category:</strong> {selectedProduct.category_name || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom color="success.main">
                  ₹{parseFloat(selectedProduct.mrp || '0').toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>MRP</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" gutterBottom>
                  <strong>Vendor Discount:</strong> {selectedProduct.vendor_discount || 0}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Last Purchase Price:</strong> ₹{parseFloat(selectedProduct.last_purchase_price || '0').toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>GST Rate:</strong> {selectedProduct.gst_rate || 18}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Current Stock:</strong> {selectedProduct.total_stock || 0} {selectedProduct.unit}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Stock Status:</strong> 
                  <Chip 
                    label={selectedProduct.stock_status || 'Unknown'} 
                    color={getStockStatusColor(selectedProduct.stock_status)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Grid>
              {selectedProduct.description && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Description:</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedProduct.description}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" gap={1} flexWrap="wrap">
                  {selectedProduct.serial_number_required && (
                    <Chip 
                      icon={<BarcodeIcon />}
                      label="Serial Tracking Required" 
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {(selectedProduct.warranty_period || 0) > 0 && (
                    <Chip 
                      icon={<SecurityIcon />}
                      label={`Warranty: ${selectedProduct.warranty_period} ${selectedProduct.warranty_period_type}`}
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                  {selectedProduct.abc_classification && (
                    <Chip 
                      label={`ABC Classification: ${selectedProduct.abc_classification}`}
                      color={getABCClassificationColor(selectedProduct.abc_classification)}
                      variant="outlined"
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          {selectedProduct && (
            <Button 
              variant="contained"
              onClick={() => {
                setOpenViewDialog(false);
                handleEditProduct(selectedProduct);
              }}
              startIcon={<EditIcon />}
            >
              Edit Product
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnterpriseProductManagement;