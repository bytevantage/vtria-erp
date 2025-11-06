import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Alert,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import axios from 'axios';

const StockAvailabilityChecker = ({ 
  productId, 
  requiredQuantity, 
  locationId = null,
  showDetails = false,
  onStockCheck = null 
}) => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const API_BASE_URL = '';

  useEffect(() => {
    if (productId && requiredQuantity > 0) {
      checkStockAvailability();
    }
  }, [productId, requiredQuantity, locationId]);

  const checkStockAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        productId: productId.toString(),
        requiredQuantity: requiredQuantity.toString()
      });

      if (locationId) {
        params.append('locationId', locationId.toString());
      }

      const response = await axios.get(
        `${API_BASE_URL}/inventory/stock-availability?${params}`
      );

      if (response.data.success) {
        setStockData(response.data.stockInfo);
        
        // Callback to parent component
        if (onStockCheck) {
          onStockCheck({
            productId,
            available: response.data.stockInfo.isAvailable,
            stockData: response.data.stockInfo
          });
        }
      }
    } catch (error) {
      console.error('Error checking stock availability:', error);
      setError('Failed to check stock availability');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = () => {
    if (!stockData) return 'unknown';
    
    if (stockData.isAvailable) {
      return 'available';
    } else if (stockData.totalStock > 0) {
      return 'insufficient';
    } else {
      return 'out_of_stock';
    }
  };

  const getStatusColor = () => {
    const status = getStockStatus();
    switch (status) {
      case 'available': return 'success';
      case 'insufficient': return 'warning';
      case 'out_of_stock': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    const status = getStockStatus();
    switch (status) {
      case 'available': return <CheckCircleIcon />;
      case 'insufficient': return <WarningIcon />;
      case 'out_of_stock': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  const getStatusText = () => {
    if (!stockData) return 'Checking...';
    
    const status = getStockStatus();
    switch (status) {
      case 'available': 
        return `Available (${stockData.totalStock} in stock)`;
      case 'insufficient': 
        return `Insufficient (${stockData.totalStock} available, need ${requiredQuantity})`;
      case 'out_of_stock': 
        return 'Out of stock';
      default: 
        return 'Unknown';
    }
  };

  const renderStockChip = () => {
    if (loading) {
      return (
        <Chip
          size="small"
          label="Checking..."
          color="default"
          variant="outlined"
        />
      );
    }

    if (error) {
      return (
        <Tooltip title={error}>
          <Chip
            size="small"
            label="Error"
            color="error"
            variant="outlined"
            icon={<ErrorIcon />}
          />
        </Tooltip>
      );
    }

    return (
      <Tooltip title={getStatusText()}>
        <Chip
          size="small"
          label={getStatusText()}
          color={getStatusColor()}
          variant="outlined"
          icon={getStatusIcon()}
          onClick={showDetails ? () => setShowDialog(true) : undefined}
          sx={{ 
            cursor: showDetails ? 'pointer' : 'default',
            '&:hover': showDetails ? { opacity: 0.8 } : {}
          }}
        />
      </Tooltip>
    );
  };

  const renderLocationBreakdown = () => {
    if (!stockData?.locationBreakdown) return null;

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Location</TableCell>
              <TableCell align="right">Available Stock</TableCell>
              <TableCell align="right">Reserved</TableCell>
              <TableCell align="right">Total Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockData.locationBreakdown.map((location) => (
              <TableRow key={location.locationId}>
                <TableCell>{location.locationName}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={location.availableStock}
                    color={location.availableStock >= requiredQuantity ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{location.reservedStock}</TableCell>
                <TableCell align="right">{location.currentStock}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      {renderStockChip()}
      
      {/* Stock Details Dialog */}
      <Dialog 
        open={showDialog} 
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <InventoryIcon />
            Stock Availability Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {stockData && (
            <Box>
              <Alert 
                severity={getStatusColor()} 
                icon={getStatusIcon()}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  <strong>Status:</strong> {getStatusText()}
                </Typography>
                <Typography variant="body2">
                  <strong>Required:</strong> {requiredQuantity} units
                </Typography>
                <Typography variant="body2">
                  <strong>Total Available:</strong> {stockData.totalStock} units
                </Typography>
              </Alert>

              {stockData.shortfall > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Shortfall:</strong> {stockData.shortfall} units need to be procured
                  </Typography>
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>
                Stock by Location
              </Typography>
              {renderLocationBreakdown()}

              {stockData.reorderInfo && (
                <Box mt={2}>
                  <Typography variant="h6" gutterBottom>
                    Reorder Information
                  </Typography>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Reorder Point:</strong> {stockData.reorderInfo.reorderPoint} units
                    </Typography>
                    <Typography variant="body2">
                      <strong>Reorder Quantity:</strong> {stockData.reorderInfo.reorderQuantity} units
                    </Typography>
                    {stockData.reorderInfo.preferredSupplier && (
                      <Typography variant="body2">
                        <strong>Preferred Supplier:</strong> {stockData.reorderInfo.preferredSupplier}
                      </Typography>
                    )}
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Bulk Stock Checker Component for multiple items
export const BulkStockChecker = ({ items, onStockResults }) => {
  const [stockResults, setStockResults] = useState({});
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = '';

  useEffect(() => {
    if (items && items.length > 0) {
      checkBulkStock();
    }
  }, [items]);

  const checkBulkStock = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${API_BASE_URL}/inventory/bulk-stock-check`, {
        items: items.map(item => ({
          productId: item.productId,
          requiredQuantity: item.quantity,
          locationId: item.locationId
        }))
      });

      if (response.data.success) {
        setStockResults(response.data.stockResults);
        
        if (onStockResults) {
          onStockResults(response.data.stockResults);
        }
      }
    } catch (error) {
      console.error('Error checking bulk stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallStatus = () => {
    const results = Object.values(stockResults);
    if (results.length === 0) return 'unknown';
    
    const unavailableItems = results.filter(r => !r.isAvailable);
    if (unavailableItems.length === 0) return 'all_available';
    if (unavailableItems.length === results.length) return 'none_available';
    return 'partial_available';
  };

  const renderOverallStatus = () => {
    if (loading) {
      return (
        <Alert severity="info">
          Checking stock availability for {items.length} items...
        </Alert>
      );
    }

    const status = getOverallStatus();
    const results = Object.values(stockResults);
    const unavailableCount = results.filter(r => !r.isAvailable).length;

    switch (status) {
      case 'all_available':
        return (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            All {results.length} items are available in stock
          </Alert>
        );
      case 'none_available':
        return (
          <Alert severity="error" icon={<ErrorIcon />}>
            None of the {results.length} items are available in sufficient quantities
          </Alert>
        );
      case 'partial_available':
        return (
          <Alert severity="warning" icon={<WarningIcon />}>
            {unavailableCount} out of {results.length} items have insufficient stock
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {renderOverallStatus()}
    </Box>
  );
};

export default StockAvailabilityChecker;
