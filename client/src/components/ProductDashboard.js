import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Paper
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  QrCode as QrCodeIcon,
  ShoppingCart as ShoppingCartIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = '';

const ProductDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockProducts: [],
    serialRequiredProducts: [],
    recentProducts: [],
    categoryStats: [],
    stockValue: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        productsResponse,
        lowStockResponse,
        serialRequiredResponse
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/products`),
        axios.get(`${API_BASE_URL}/api/products/low-stock`),
        axios.get(`${API_BASE_URL}/api/products/serial-required`)
      ]);

      // Calculate stats
      const products = productsResponse.data.data || [];
      const lowStockProducts = lowStockResponse.data.data || [];
      const serialRequiredProducts = serialRequiredResponse.data.data || [];

      // Calculate category distribution
      const categoryStats = products.reduce((acc, product) => {
        const category = product.category_name || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = { name: category, count: 0, value: 0 };
        }
        acc[category].count++;
        acc[category].value += parseFloat(product.mrp || 0) * (product.total_stock || 0);
        return acc;
      }, {});

      // Calculate total stock value
      const stockValue = products.reduce((total, product) => {
        return total + (parseFloat(product.mrp || 0) * (product.total_stock || 0));
      }, 0);

      setDashboardData({
        totalProducts: products.length,
        lowStockProducts,
        serialRequiredProducts,
        recentProducts: products.slice(0, 5),
        categoryStats: Object.values(categoryStats),
        stockValue
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        Product Dashboard
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <InventoryIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {dashboardData.totalProducts}
              </Typography>
              <Typography color="text.secondary">Total Products</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {dashboardData.lowStockProducts.length}
              </Typography>
              <Typography color="text.secondary">Low Stock Items</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <QrCodeIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {dashboardData.serialRequiredProducts.length}
              </Typography>
              <Typography color="text.secondary">Serial Tracked</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                ₹{dashboardData.stockValue.toLocaleString('en-IN')}
              </Typography>
              <Typography color="text.secondary">Stock Value</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Low Stock Products */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" />
                  Low Stock Alert
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate('/products')}
                  variant="outlined"
                >
                  View All
                </Button>
              </Box>
              
              {dashboardData.lowStockProducts.length === 0 ? (
                <Typography color="text.secondary">No low stock items</Typography>
              ) : (
                <List dense>
                  {dashboardData.lowStockProducts.slice(0, 5).map((product) => (
                    <ListItem key={product.id} divider>
                      <ListItemIcon>
                        <Chip 
                          label={product.stock_status}
                          color={product.stock_status === 'Critical' ? 'error' : 'warning'}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={product.name}
                        secondary={`Stock: ${product.total_stock} ${product.unit} | Reorder: ${product.reorder_level}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssessmentIcon color="primary" />
                Category Distribution
              </Typography>
              
              {dashboardData.categoryStats.map((category, index) => (
                <Box key={category.name} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2">{category.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.count} items
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(category.count / dashboardData.totalProducts) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={['primary', 'secondary', 'info', 'warning', 'success'][index % 5]}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Value: ₹{category.value.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Serial Number Tracking */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCodeIcon color="info" />
                  Serial Number Tracking
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate('/products')}
                  variant="outlined"
                >
                  Manage
                </Button>
              </Box>
              
              {dashboardData.serialRequiredProducts.length === 0 ? (
                <Typography color="text.secondary">No products require serial tracking</Typography>
              ) : (
                <List dense>
                  {dashboardData.serialRequiredProducts.slice(0, 5).map((product) => (
                    <ListItem key={product.id} divider>
                      <ListItemIcon>
                        <QrCodeIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={product.name}
                        secondary={`${product.make} - ${product.model} | Warranty: ${product.warranty_period} ${product.warranty_period_type}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<InventoryIcon />}
                    onClick={() => navigate('/products')}
                  >
                    Manage Products
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => navigate('/estimation')}
                  >
                    Create Estimation
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<WarningIcon />}
                    onClick={() => navigate('/products')}
                    color="warning"
                  >
                    Check Low Stock
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<QrCodeIcon />}
                    onClick={() => navigate('/products')}
                    color="info"
                  >
                    Serial Tracking
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductDashboard;
