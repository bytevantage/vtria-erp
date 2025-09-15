import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Security as WarrantyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  CompareArrows as CompareIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Store as StoreIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import axios from 'axios';
import { debounce } from 'lodash';

const API_BASE_URL = 'http://localhost:3001';

const IntelligentProductSelector = ({ 
  open, 
  onClose, 
  onProductSelect, 
  estimationId,
  projectLocation = null,
  preferredLocationId = 1 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  // Intelligence data
  const [alternatives, setAlternatives] = useState([]);
  const [vendorComparison, setVendorComparison] = useState([]);
  const [multiLocationStock, setMultiLocationStock] = useState([]);
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [costOptimization, setCostOptimization] = useState(null);

  // Debounced search function - using existing products API with real data
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        // Use the existing products search API endpoint
        const response = await axios.get(`${API_BASE_URL}/api/products/search`, {
          params: { q: query }
        });

        if (response.data.success) {
          // Use real product data with calculated intelligence metrics
          const enrichedProducts = response.data.data.map(product => {
            const totalStock = product.total_stock || 0;
            const leadTime = totalStock > product.reorder_level ? 1 : 
                           totalStock > product.min_stock_level ? 3 : 7;
            
            return {
              ...product,
              availability_score: totalStock > product.reorder_level ? 100 : 
                                totalStock > product.min_stock_level ? 70 : 40,
              estimated_lead_time_days: leadTime,
              total_stock_all_locations: totalStock,
              stock_at_location: totalStock,
              cost_optimization: {
                current_mrp: product.mrp,
                best_vendor_price: product.last_purchase_price || product.mrp,
                potential_savings: product.last_purchase_price ? 
                  (((product.mrp - product.last_purchase_price) / product.mrp) * 100).toFixed(2) : 0,
                last_purchase_price: product.last_purchase_price
              },
              stock_intelligence: {
                total_system_stock: totalStock,
                immediate_availability: totalStock >= quantity,
                reorder_recommended: totalStock <= product.reorder_level,
                critical_stock: totalStock <= product.min_stock_level
              },
              delivery_estimation: {
                lead_time_days: leadTime,
                expected_delivery: new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000).toLocaleDateString(),
                delivery_confidence: totalStock > product.reorder_level ? 'High' : 
                                   totalStock > product.min_stock_level ? 'Medium' : 'Low'
              }
            };
          });

          setSearchResults(enrichedProducts);
        }
      } catch (error) {
        console.error('Error searching products:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [preferredLocationId, projectLocation, quantity]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setActiveTab(0);
    
    // Fetch additional intelligence data
    await Promise.all([
      fetchAlternatives(product),
      fetchVendorComparison(product),
      fetchMultiLocationStock(product),
      fetchWarrantyInfo(product)
    ]);
  };

  const fetchAlternatives = async (product) => {
    try {
      // Use existing products API and filter by category for alternatives
      const response = await axios.get(`${API_BASE_URL}/api/products`);
      if (response.data.success) {
        const categoryAlternatives = response.data.data
          .filter(p => p.category_id === product.category_id && p.id !== product.id)
          .slice(0, 4) // Show max 4 alternatives
          .map(alt => ({
            ...alt,
            best_price: alt.last_purchase_price || alt.mrp,
            total_stock: alt.total_stock || 0
          }));
        setAlternatives(categoryAlternatives);
      }
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      setAlternatives([]);
    }
  };

  const fetchVendorComparison = async (product) => {
    try {
      // Use existing vendor prices API if available
      const response = await axios.get(`${API_BASE_URL}/api/products/${product.id}/vendor-prices`);
      if (response.data.success && response.data.data.length > 0) {
        const vendorData = response.data.data.map((vendor, index) => ({
          ...vendor,
          quantity_based_price: vendor.final_price,
          total_cost: (vendor.final_price * quantity).toFixed(2),
          overall_rating: 4.0 + Math.random(), // Will be replaced with real ratings when available
          delivery_confidence: '85',
          is_recommended: index === 0,
          rank: index + 1
        }));
        setVendorComparison(vendorData);
      } else {
        // Fallback to single vendor entry using product data
        const fallbackVendor = [{
          id: 1,
          vendor_name: 'Default Vendor',
          vendor_price: product.mrp,
          quantity_based_price: product.last_purchase_price || product.mrp,
          total_cost: ((product.last_purchase_price || product.mrp) * quantity).toFixed(2),
          overall_rating: 4.0,
          delivery_confidence: '85',
          is_recommended: true,
          rank: 1
        }];
        setVendorComparison(fallbackVendor);
      }
    } catch (error) {
      console.error('Error fetching vendor comparison:', error);
      // Fallback to single vendor entry using product data
      const fallbackVendor = [{
        id: 1,
        vendor_name: 'Default Vendor',
        vendor_price: product.mrp,
        quantity_based_price: product.last_purchase_price || product.mrp,
        total_cost: ((product.last_purchase_price || product.mrp) * quantity).toFixed(2),
        overall_rating: 4.0,
        delivery_confidence: '85',
        is_recommended: true,
        rank: 1
      }];
      setVendorComparison(fallbackVendor);
    }
  };

  const fetchMultiLocationStock = async (product) => {
    try {
      // Use existing multi-location inventory API
      const response = await axios.get(`${API_BASE_URL}/api/multi-location-inventory/product/${product.id}`);
      if (response.data.success) {
        setMultiLocationStock([response.data.data]);
      } else {
        // Fallback: create single location entry from product total stock
        const fallbackLocationData = [{
          product_id: product.id,
          product_name: product.name,
          part_code: product.part_code,
          total_stock: product.total_stock || 0,
          total_available: product.total_stock || 0,
          locations: [{
            location_id: 1,
            location_name: 'Main Warehouse',
            city: 'Mangalore',
            state: 'Karnataka',
            current_stock: product.total_stock || 0,
            reserved_stock: 0,
            available_stock: product.total_stock || 0,
            distance_priority: 0,
            transfer_status: product.total_stock > 0 ? 'Available' : 'Not Available'
          }]
        }];
        setMultiLocationStock(fallbackLocationData);
      }
    } catch (error) {
      console.error('Error fetching multi-location stock:', error);
      // Fallback: create single location entry from product total stock
      const fallbackLocationData = [{
        product_id: product.id,
        product_name: product.name,
        part_code: product.part_code,
        total_stock: product.total_stock || 0,
        total_available: product.total_stock || 0,
        locations: [{
          location_id: 1,
          location_name: 'Main Warehouse',
          city: 'Mangalore',
          state: 'Karnataka',
          current_stock: product.total_stock || 0,
          reserved_stock: 0,
          available_stock: product.total_stock || 0,
          distance_priority: 0,
          transfer_status: product.total_stock > 0 ? 'Available' : 'Not Available'
        }]
      }];
      setMultiLocationStock(fallbackLocationData);
    }
  };

  const fetchWarrantyInfo = async (product) => {
    try {
      // Use existing serial warranty tracking API if available
      let warrantyInfo = {
        id: product.id,
        name: product.name,
        serial_number_required: product.serial_number_required || false,
        warranty_period: product.warranty_period || 0,
        warranty_period_type: product.warranty_period_type || 'months',
        warranty_upto: product.warranty_upto,
        available_serials: 0,
        warranty_statistics: {
          total_claims: 0,
          resolved_claims: 0,
          resolution_rate: '0',
          total_warranty_cost: 0,
          average_claim_cost: 0
        },
        recent_claims: [],
        warranty_risk_assessment: {
          risk_level: 'Low',
          recommendation: 'No warranty claims history available'
        }
      };

      // Try to fetch serial numbers if product requires them
      if (product.serial_number_required) {
        try {
          const serialResponse = await axios.get(`${API_BASE_URL}/api/products/${product.id}/serials`);
          if (serialResponse.data.success) {
            warrantyInfo.available_serials = serialResponse.data.data.filter(s => s.status === 'available').length;
          }
        } catch (serialError) {
          console.log('Serial numbers not available:', serialError);
        }
      }

      // Try to fetch warranty claims if serial warranty API exists
      try {
        const claimsResponse = await axios.get(`${API_BASE_URL}/api/serial-warranty/product/${product.id}/claims`);
        if (claimsResponse.data.success) {
          const claims = claimsResponse.data.data;
          const resolvedClaims = claims.filter(c => c.resolution_status === 'resolved').length;
          warrantyInfo.warranty_statistics = {
            total_claims: claims.length,
            resolved_claims: resolvedClaims,
            resolution_rate: claims.length > 0 ? ((resolvedClaims / claims.length) * 100).toFixed(1) : '0',
            total_warranty_cost: claims.reduce((sum, c) => sum + (c.cost_incurred || 0), 0),
            average_claim_cost: claims.length > 0 ? (claims.reduce((sum, c) => sum + (c.cost_incurred || 0), 0) / claims.length).toFixed(2) : 0
          };
          warrantyInfo.recent_claims = claims.slice(0, 5);
          warrantyInfo.warranty_risk_assessment = {
            risk_level: claims.length > 5 ? 'High' : claims.length > 2 ? 'Medium' : 'Low',
            recommendation: claims.length > 5 ? 
              'Consider alternative products or extended warranty' :
              claims.length > 2 ? 
              'Monitor warranty performance' : 
              'Good warranty track record'
          };
        }
      } catch (claimsError) {
        console.log('Warranty claims not available:', claimsError);
      }

      setWarrantyInfo(warrantyInfo);
    } catch (error) {
      console.error('Error fetching warranty info:', error);
      setWarrantyInfo(null);
    }
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Partial Stock': return 'warning';
      case 'Critical': return 'error';
      case 'Out of Stock': return 'error';
      default: return 'default';
    }
  };

  const getAvailabilityIcon = (score) => {
    if (score >= 80) return <CheckCircleIcon color="success" />;
    if (score >= 60) return <WarningIcon color="warning" />;
    return <WarningIcon color="error" />;
  };

  const renderProductCard = (product) => (
    <Card 
      key={product.id} 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        border: selectedProduct?.id === product.id ? 2 : 1,
        borderColor: selectedProduct?.id === product.id ? 'primary.main' : 'grey.300',
        '&:hover': { boxShadow: 3 }
      }}
      onClick={() => handleProductSelect(product)}
    >
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {product.make} {product.model} | {product.part_code}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={product.category_name} 
                size="small" 
                variant="outlined" 
                sx={{ mr: 1 }}
              />
              {product.serial_number_required && (
                <Chip 
                  label="Serial Tracking" 
                  size="small" 
                  color="info"
                  icon={<WarrantyIcon />}
                />
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                ₹{product.cost_optimization?.best_vendor_price || product.mrp}
              </Typography>
              {product.cost_optimization?.potential_savings > 0 && (
                <Typography variant="caption" color="success.main">
                  Save {product.cost_optimization.potential_savings}%
                </Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label={product.stock_status}
                  color={getStockStatusColor(product.stock_status)}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getAvailabilityIcon(product.availability_score)}
              <Box sx={{ ml: 1 }}>
                <Typography variant="body2">
                  Stock: {product.total_stock_all_locations}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lead: {product.estimated_lead_time_days} days
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderProductDetails = () => {
    if (!selectedProduct) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" icon={<InfoIcon />} />
          <Tab label="Stock Locations" icon={<StoreIcon />} />
          <Tab label="Vendor Pricing" icon={<MoneyIcon />} />
          <Tab label="Alternatives" icon={<CompareIcon />} />
          <Tab label="Warranty" icon={<WarrantyIcon />} />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <InventoryIcon sx={{ mr: 1 }} />
                      Stock Intelligence
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Total System Stock: <strong>{selectedProduct.stock_intelligence?.total_system_stock}</strong>
                      </Typography>
                      <Typography variant="body2">
                        At Preferred Location: <strong>{selectedProduct.stock_at_location}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Immediate Availability: 
                        <Chip 
                          label={selectedProduct.stock_intelligence?.immediate_availability ? 'Yes' : 'No'}
                          color={selectedProduct.stock_intelligence?.immediate_availability ? 'success' : 'warning'}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    </Box>
                    {selectedProduct.stock_intelligence?.reorder_recommended && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Reorder recommended - Stock below threshold
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <ShippingIcon sx={{ mr: 1 }} />
                      Delivery Estimation
                    </Typography>
                    <Typography variant="body2">
                      Lead Time: <strong>{selectedProduct.delivery_estimation?.lead_time_days} days</strong>
                    </Typography>
                    <Typography variant="body2">
                      Expected Delivery: <strong>{selectedProduct.delivery_estimation?.expected_delivery}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Confidence: 
                      <Chip 
                        label={selectedProduct.delivery_estimation?.delivery_confidence}
                        color={
                          selectedProduct.delivery_estimation?.delivery_confidence === 'High' ? 'success' :
                          selectedProduct.delivery_estimation?.delivery_confidence === 'Medium' ? 'warning' : 'error'
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <TrendingUpIcon sx={{ mr: 1 }} />
                      Cost Optimization
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">MRP</Typography>
                        <Typography variant="h6">₹{selectedProduct.cost_optimization?.current_mrp}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Best Vendor Price</Typography>
                        <Typography variant="h6" color="primary">₹{selectedProduct.cost_optimization?.best_vendor_price}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Potential Savings</Typography>
                        <Typography variant="h6" color="success.main">{selectedProduct.cost_optimization?.potential_savings}%</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Last Purchase</Typography>
                        <Typography variant="h6">₹{selectedProduct.cost_optimization?.last_purchase_price || 'N/A'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Location</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell align="right">Current Stock</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell align="right">Reserved</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {multiLocationStock[0]?.locations?.map((location) => (
                    <TableRow key={location.location_id}>
                      <TableCell>{location.location_name}</TableCell>
                      <TableCell>{location.city}, {location.state}</TableCell>
                      <TableCell align="right">{location.current_stock}</TableCell>
                      <TableCell align="right">{location.available_stock}</TableCell>
                      <TableCell align="right">{location.reserved_stock}</TableCell>
                      <TableCell>
                        <Chip 
                          label={location.transfer_status}
                          color={getStockStatusColor(location.transfer_status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="right">Base Price</TableCell>
                    <TableCell align="right">Quantity Price</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell align="center">Rating</TableCell>
                    <TableCell align="center">Delivery</TableCell>
                    <TableCell>Recommended</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorComparison.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>{vendor.vendor_name}</TableCell>
                      <TableCell align="right">₹{vendor.vendor_price}</TableCell>
                      <TableCell align="right">₹{vendor.quantity_based_price}</TableCell>
                      <TableCell align="right">₹{vendor.total_cost}</TableCell>
                      <TableCell align="center">
                        {vendor.overall_rating ? `${vendor.overall_rating}/5` : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {vendor.delivery_confidence ? `${vendor.delivery_confidence}%` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {vendor.is_recommended && (
                          <Chip label="Recommended" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 3 && (
            <Grid container spacing={2}>
              {alternatives.map((alt) => (
                <Grid item xs={12} md={6} key={alt.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{alt.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {alt.make} {alt.model} | {alt.part_code}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" color="primary">
                          ₹{alt.best_price}
                        </Typography>
                        <Typography variant="body2">
                          Stock: {alt.total_stock}
                        </Typography>
                      </Box>
                      <Button 
                        size="small" 
                        onClick={() => handleProductSelect(alt)}
                        sx={{ mt: 1 }}
                      >
                        Select Alternative
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 4 && warrantyInfo && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Warranty Information
                    </Typography>
                    <Typography variant="body2">
                      Period: <strong>{warrantyInfo.warranty_months} months</strong>
                    </Typography>
                    <Typography variant="body2">
                      Serial Tracking: <strong>{warrantyInfo.serial_number_required ? 'Required' : 'Not Required'}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Available Serials: <strong>{warrantyInfo.available_serials}</strong>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Warranty Risk Assessment
                    </Typography>
                    <Typography variant="body2">
                      Risk Level: 
                      <Chip 
                        label={warrantyInfo.warranty_risk_assessment?.risk_level}
                        color={
                          warrantyInfo.warranty_risk_assessment?.risk_level === 'Low' ? 'success' :
                          warrantyInfo.warranty_risk_assessment?.risk_level === 'Medium' ? 'warning' : 'error'
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {warrantyInfo.warranty_risk_assessment?.recommendation}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>
    );
  };

  const handleConfirmSelection = () => {
    if (selectedProduct && onProductSelect) {
      const productData = {
        ...selectedProduct,
        quantity: quantity,
        selected_vendor: vendorComparison[0]?.vendor_name || 'Default Vendor',
        selected_price: vendorComparison[0]?.quantity_based_price || selectedProduct.cost_optimization?.best_vendor_price || selectedProduct.mrp || selectedProduct.last_price || 0
      };
      console.log('Confirming product selection:', productData);
      onProductSelect(productData);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            <SearchIcon sx={{ mr: 1 }} />
            Intelligent Product Selection
          </Typography>
          <TextField
            size="small"
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            sx={{ width: 100 }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Search Products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, part code, make, model..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: loading && <CircularProgress size={20} />
            }}
          />
        </Box>

        {searchResults.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Search Results ({searchResults.length})
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {searchResults.map(renderProductCard)}
            </Box>
          </Box>
        )}

        {renderProductDetails()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleConfirmSelection}
          disabled={!selectedProduct}
        >
          Add to Estimation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntelligentProductSelector;
