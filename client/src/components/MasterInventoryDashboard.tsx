import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Paper,
  IconButton,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Badge
} from '@mui/material';
import {
  Inventory as PackageIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as AlertTriangleIcon,
  Factory as FactoryIcon,
  GpsFixed as TargetIcon,
  BarChart as BarChart3Icon,
  LocationOn as MapPinIcon,
  AttachMoney as DollarSignIcon,
  Schedule as ClockIcon,
  People as UsersIcon,
  LocalShipping as TruckIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

// Import existing components
import BatchInventoryManager from './BatchInventoryManager';
import VendorPerformanceDashboard from './VendorPerformanceDashboard';

interface InventoryMetrics {
  total_products: number;
  total_value: number;
  low_stock_items: number;
  critical_stock_items: number;
  serial_tracked_items: number;
  expiring_soon: number;
  total_batches: number;
  avg_inventory_turnover: number;
  carrying_cost_percentage: number;
  stockout_incidents: number;
}

interface LocationSummary {
  location_id: number;
  location_name: string;
  city: string;
  state: string;
  total_products: number;
  total_value: number;
  utilization_percentage: number;
  last_movement: string;
}

interface TopProducts {
  product_id: number;
  product_name: string;
  current_stock: number;
  stock_value: number;
  turnover_rate: number;
  margin_percentage: number;
  classification: 'A' | 'B' | 'C';
}

interface AlertItem {
  id: number;
  type: 'low_stock' | 'expiry' | 'quality' | 'vendor' | 'allocation';
  severity: 'high' | 'medium' | 'low';
  message: string;
  product_name?: string;
  batch_number?: string;
  days_remaining?: number;
  action_required: string;
  created_at: string;
}

const MasterInventoryDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    total_products: 1247,
    total_value: 15600000,
    low_stock_items: 23,
    critical_stock_items: 5,
    serial_tracked_items: 89,
    expiring_soon: 12,
    total_batches: 456,
    avg_inventory_turnover: 4.2,
    carrying_cost_percentage: 12.5,
    stockout_incidents: 3
  });
  
  const [locations, setLocations] = useState<LocationSummary[]>([
    { location_id: 1, location_name: 'Mumbai Warehouse', city: 'Mumbai', state: 'Maharashtra', total_products: 567, total_value: 8500000, utilization_percentage: 78, last_movement: '2 hours ago' },
    { location_id: 2, location_name: 'Delhi Distribution Center', city: 'Delhi', state: 'Delhi', total_products: 423, total_value: 4200000, utilization_percentage: 65, last_movement: '4 hours ago' },
    { location_id: 3, location_name: 'Chennai Hub', city: 'Chennai', state: 'Tamil Nadu', total_products: 257, total_value: 2900000, utilization_percentage: 45, last_movement: '1 hour ago' }
  ]);
  
  const [topProducts, setTopProducts] = useState<TopProducts[]>([
    { product_id: 1, product_name: 'Siemens S7-1200 PLC', current_stock: 45, stock_value: 450000, turnover_rate: 6.2, margin_percentage: 28.5, classification: 'A' },
    { product_id: 2, product_name: 'ABB VFD Drive 5.5kW', current_stock: 23, stock_value: 230000, turnover_rate: 4.8, margin_percentage: 22.3, classification: 'A' },
    { product_id: 3, product_name: 'Schneider HMI Panel', current_stock: 67, stock_value: 335000, turnover_rate: 3.9, margin_percentage: 25.1, classification: 'B' },
    { product_id: 4, product_name: 'Phoenix Terminal Blocks', current_stock: 890, stock_value: 89000, turnover_rate: 8.2, margin_percentage: 18.7, classification: 'C' },
    { product_id: 5, product_name: 'Wago I/O Modules', current_stock: 156, stock_value: 234000, turnover_rate: 5.1, margin_percentage: 24.8, classification: 'B' },
    { product_id: 6, product_name: 'Omron Proximity Sensors', current_stock: 234, stock_value: 46800, turnover_rate: 12.1, margin_percentage: 32.4, classification: 'A' }
  ]);
  
  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: 1, type: 'low_stock', severity: 'high', message: 'Critical stock level for Siemens PLC modules', product_name: 'Siemens S7-1200 PLC', days_remaining: 3, action_required: 'Reorder immediately', created_at: '2024-01-15T10:30:00Z' },
    { id: 2, type: 'expiry', severity: 'medium', message: 'Warranty expiring soon for VFD drives', product_name: 'ABB VFD Drive 5.5kW', days_remaining: 15, action_required: 'Contact supplier', created_at: '2024-01-15T09:15:00Z' },
    { id: 3, type: 'quality', severity: 'low', message: 'Quality check required for batch #B2024-001', batch_number: 'B2024-001', action_required: 'Schedule inspection', created_at: '2024-01-15T08:45:00Z' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getClassificationColor = (classification: string): 'error' | 'warning' | 'success' => {
    switch (classification) {
      case 'A': return 'error';
      case 'B': return 'warning';
      case 'C': return 'success';
      default: return 'success';
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading inventory dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Master Inventory Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive inventory management and analytics
          </Typography>
        </Box>
        <Box display="flex" sx={{ gap: 1 }}>
          <Button variant="outlined" onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon sx={{ mr: 1 }} />
            Refresh
          </Button>
          <Button variant="outlined">
            <DownloadIcon sx={{ mr: 1 }} />
            Export
          </Button>
          <Button variant="contained">
            <SettingsIcon sx={{ mr: 1 }} />
            Settings
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Batch Management" />
          <Tab label="Smart Allocation" />
          <Tab label="Multi-Location" />
          <Tab label="Vendor Performance" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Overview Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Products
                        </Typography>
                        <Typography variant="h4">
                          {metrics.total_products.toLocaleString()}
                        </Typography>
                      </Box>
                      <PackageIcon color="primary" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Value
                        </Typography>
                        <Typography variant="h4">
                          ₹{(metrics.total_value / 10000000).toFixed(1)}Cr
                        </Typography>
                      </Box>
                      <DollarSignIcon color="success" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Low Stock
                        </Typography>
                        <Typography variant="h4" color="warning.main">
                          {metrics.low_stock_items}
                        </Typography>
                      </Box>
                      <AlertTriangleIcon color="warning" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Turnover Rate
                        </Typography>
                        <Typography variant="h4">
                          {metrics.avg_inventory_turnover.toFixed(1)}x
                        </Typography>
                      </Box>
                      <TrendingUpIcon color="secondary" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Critical Alerts */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '400px' }}>
                  <CardHeader
                    title={
                      <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                        <AlertTriangleIcon color="error" />
                        <Typography variant="h6">Critical Alerts</Typography>
                      </Box>
                    }
                  />
                  <CardContent>
                    <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                      {alerts.map((alert) => (
                        <Alert 
                          key={alert.id} 
                          severity={getSeverityColor(alert.severity)}
                          sx={{ mb: 2 }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="start">
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {alert.message}
                              </Typography>
                              {alert.product_name && (
                                <Typography variant="caption" color="text.secondary">
                                  Product: {alert.product_name}
                                </Typography>
                              )}
                              {alert.days_remaining && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Days remaining: {alert.days_remaining}
                                </Typography>
                              )}
                            </Box>
                            <Chip 
                              label={alert.severity.toUpperCase()} 
                              size="small"
                              color={getSeverityColor(alert.severity)}
                            />
                          </Box>
                        </Alert>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Location Summary */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '400px' }}>
                  <CardHeader
                    title={
                      <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                        <MapPinIcon />
                        <Typography variant="h6">Location Summary</Typography>
                      </Box>
                    }
                  />
                  <CardContent>
                    <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                      {locations.map((location) => (
                        <Paper key={location.location_id} sx={{ p: 2, mb: 2 }} variant="outlined">
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {location.location_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {location.city}, {location.state}
                              </Typography>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="body1" fontWeight="medium">
                                ₹{(location.total_value / 100000).toFixed(1)}L
                              </Typography>
                              <Box display="flex" alignItems="center" sx={{ gap: 1, mt: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={location.utilization_percentage}
                                  sx={{ width: 60, height: 6 }}
                                />
                                <Typography variant="caption">
                                  {location.utilization_percentage}%
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Top Performing Products */}
            <Card sx={{ mt: 3 }}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                    <BarChart3Icon />
                    <Typography variant="h6">Top Performing Products (ABC Analysis)</Typography>
                  </Box>
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  {topProducts.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product.product_id}>
                      <Paper sx={{ p: 2 }} variant="outlined">
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Typography variant="body1" fontWeight="medium" noWrap>
                            {product.product_name}
                          </Typography>
                          <Chip 
                            label={`Class ${product.classification}`}
                            size="small"
                            color={getClassificationColor(product.classification)}
                          />
                        </Box>
                        <Box sx={{ fontSize: '0.875rem' }}>
                          <Box display="flex" justifyContent="space-between">
                            <span>Stock:</span>
                            <span>{product.current_stock.toLocaleString()}</span>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <span>Value:</span>
                            <span>₹{(product.stock_value / 1000).toFixed(0)}K</span>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <span>Turnover:</span>
                            <span>{product.turnover_rate.toFixed(1)}x</span>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <span>Margin:</span>
                            <span style={{ color: 'green' }}>{product.margin_percentage.toFixed(1)}%</span>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Manufacturing Integration Insights */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" sx={{ gap: 2 }}>
                      <FactoryIcon color="primary" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Production Ready
                        </Typography>
                        <Typography variant="h6">
                          {topProducts.filter(p => p.current_stock > 50).length} Products
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" sx={{ gap: 2 }}>
                      <TargetIcon color="success" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Optimal Allocation
                        </Typography>
                        <Typography variant="h6">92% Efficiency</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" sx={{ gap: 2 }}>
                      <ClockIcon color="secondary" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Lead Time
                        </Typography>
                        <Typography variant="h6">5.2 Days</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Batch Management Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <BatchInventoryManager />
          </Box>
        )}

        {/* Smart Allocation Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Smart Allocation Engine
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Smart allocation component will be integrated here. This system intelligently allocates inventory based on business context (estimation vs manufacturing vs sales).
            </Alert>
            <Paper sx={{ p: 3, minHeight: 300 }}>
              <Typography variant="body1" color="text.secondary" textAlign="center">
                Smart Allocation Manager Component
              </Typography>
              <Box textAlign="center" mt={2}>
                <Typography variant="body2">
                  • Context-aware allocation (Estimation, Manufacturing, Sales)
                </Typography>
                <Typography variant="body2">
                  • Multi-criteria scoring (Cost, FIFO, Warranty, Performance)
                </Typography>
                <Typography variant="body2">
                  • Real-time optimization recommendations
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Multi-Location Tab */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Multi-Location Inventory Management
            </Typography>
            
            <Grid container spacing={3}>
              {locations.map((location) => (
                <Grid item xs={12} md={4} key={location.location_id}>
                  <Card>
                    <CardHeader
                      title={
                        <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                          <MapPinIcon />
                          {location.location_name}
                        </Box>
                      }
                    />
                    <CardContent>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">
                          Location
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {location.city}, {location.state}
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Products
                          </Typography>
                          <Typography variant="h6">
                            {location.total_products}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Value
                          </Typography>
                          <Typography variant="h6">
                            ₹{(location.total_value / 100000).toFixed(1)}L
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Utilization</Typography>
                          <Typography variant="body2">{location.utilization_percentage}%</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={location.utilization_percentage}
                        />
                      </Box>

                      <Box display="flex" sx={{ gap: 1 }}>
                        <Button variant="outlined" size="small" fullWidth>
                          <SearchIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          Details
                        </Button>
                        <Button variant="outlined" size="small" fullWidth>
                          <TruckIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          Transfer
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Transfer Requests */}
            <Card sx={{ mt: 3 }}>
              <CardHeader title="Recent Transfer Requests" />
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        PLC Modules: Mumbai → Delhi
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        50 units • Requested 2 hours ago
                      </Typography>
                    </Box>
                    <Chip label="Pending Approval" color="warning" size="small" />
                  </Box>
                </Alert>
                
                <Alert severity="success">
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        VFD Drives: Chennai → Bangalore
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        25 units • In Transit
                      </Typography>
                    </Box>
                    <Chip label="In Transit" color="info" size="small" />
                  </Box>
                </Alert>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Vendor Performance Tab */}
        {activeTab === 4 && (
          <Box sx={{ p: 3 }}>
            <VendorPerformanceDashboard />
          </Box>
        )}

        {/* Analytics Tab */}
        {activeTab === 5 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Inventory Analytics & Insights
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: 300 }}>
                  <CardHeader title="Inventory Turnover Trends" />
                  <CardContent>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      height="200px"
                      flexDirection="column"
                    >
                      <BarChart3Icon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Turnover analytics chart would be displayed here
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: 300 }}>
                  <CardHeader title="Cost Analysis" />
                  <CardContent>
                    <Box sx={{ mt: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">Carrying Cost</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {metrics.carrying_cost_percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">Stockout Incidents</Typography>
                        <Typography variant="body1" fontWeight="bold" color="error.main">
                          {metrics.stockout_incidents}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">Total Batches</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {metrics.total_batches}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardHeader title="Manufacturing Integration Metrics" />
                  <CardContent>
                    <Grid container spacing={4} textAlign="center">
                      <Grid item xs={12} sm={3}>
                        <Typography variant="h4" color="primary.main">94%</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Material Availability
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="h4" color="success.main">87%</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allocation Efficiency
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="h4" color="secondary.main">5.2</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Lead Days
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="h4" color="warning.main">91%</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Quality Score
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default MasterInventoryDashboard;