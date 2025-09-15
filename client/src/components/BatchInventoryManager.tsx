import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface InventoryBatch {
  id: number;
  batch_number: string;
  product_id: number;
  product_name: string;
  product_code: string;
  location_id: number;
  location_name: string;
  supplier_name?: string;
  purchase_date: string;
  purchase_price: number;
  received_quantity: number;
  consumed_quantity: number;
  available_quantity: number;
  batch_value: number;
  expiry_date?: string;
  days_to_expiry?: number;
  status: 'active' | 'consumed' | 'expired' | 'damaged';
}

interface CostingSummary {
  product_id: number;
  product_name: string;
  product_code: string;
  location_name: string;
  fifo_cost: number;
  lifo_cost: number;
  average_cost: number;
  last_cost: number;
  total_quantity: number;
  total_value: number;
}

interface BatchInventoryManagerProps {
  locationId?: number;
  productId?: number;
}

const BatchInventoryManager: React.FC<BatchInventoryManagerProps> = ({
  locationId,
  productId,
}) => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [costingSummary, setCostingSummary] = useState<CostingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<number>(locationId || 0);
  const [selectedProduct, setSelectedProduct] = useState<number>(productId || 0);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<string>('purchase_date');
  const [expandedProduct, setExpandedProduct] = useState<string | false>(false);

  useEffect(() => {
    fetchBatchData();
    fetchCostingSummary();
  }, [selectedLocation, selectedProduct, statusFilter]);

  const fetchBatchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLocation) params.append('location_id', selectedLocation.toString());
      if (selectedProduct) params.append('product_id', selectedProduct.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('sort_by', sortBy);

      const response = await fetch(`/api/inventory/batches?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setBatches(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch batch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostingSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLocation) params.append('location_id', selectedLocation.toString());
      if (selectedProduct) params.append('product_id', selectedProduct.toString());

      const response = await fetch(`/api/inventory/costing-summary?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCostingSummary(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch costing summary:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'consumed':
        return 'default';
      case 'expired':
        return 'error';
      case 'damaged':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getExpiryAlert = (daysToExpiry?: number) => {
    if (!daysToExpiry) return null;
    
    if (daysToExpiry < 0) {
      return <Chip label="EXPIRED" color="error" size="small" />;
    } else if (daysToExpiry < 30) {
      return <Chip label={`${daysToExpiry}d to expiry`} color="warning" size="small" />;
    } else if (daysToExpiry < 90) {
      return <Chip label={`${daysToExpiry}d to expiry`} color="info" size="small" />;
    }
    return null;
  };

  const getCostVariance = (current: number, comparison: number) => {
    const variance = ((current - comparison) / comparison) * 100;
    const isIncrease = variance > 0;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {isIncrease ? (
          <TrendingUpIcon sx={{ fontSize: 16, color: 'error.main' }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: 16, color: 'success.main' }} />
        )}
        <Typography 
          variant="caption" 
          color={isIncrease ? 'error.main' : 'success.main'}
        >
          {Math.abs(variance).toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  // Group batches by product
  const batchesByProduct = batches.reduce((groups, batch) => {
    const key = `${batch.product_id}-${batch.product_name}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(batch);
    return groups;
  }, {} as Record<string, InventoryBatch[]>);

  return (
    <Box>
      {/* Header and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon />
            Batch-wise Inventory Management
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mt: 1 }}>
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocation}
                  label="Location"
                  onChange={(e) => setSelectedLocation(e.target.value as number)}
                >
                  <MenuItem value={0}>All Locations</MenuItem>
                  {/* Add location options */}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="consumed">Consumed</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="damaged">Damaged</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="purchase_date">Purchase Date</MenuItem>
                  <MenuItem value="expiry_date">Expiry Date</MenuItem>
                  <MenuItem value="batch_value">Batch Value</MenuItem>
                  <MenuItem value="available_quantity">Available Quantity</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  fetchBatchData();
                  fetchCostingSummary();
                }}
              >
                Refresh Data
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Costing Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Costing Methods Comparison
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">FIFO Cost</TableCell>
                  <TableCell align="right">LIFO Cost</TableCell>
                  <TableCell align="right">Average Cost</TableCell>
                  <TableCell align="right">Last Cost</TableCell>
                  <TableCell align="right">Total Qty</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costingSummary.map((item) => (
                  <TableRow key={`${item.product_id}-${item.location_name}`}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.product_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product_code} • {item.location_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">
                          ₹{item.fifo_cost.toLocaleString('en-IN')}
                        </Typography>
                        {getCostVariance(item.fifo_cost, item.average_cost)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">
                          ₹{item.lifo_cost.toLocaleString('en-IN')}
                        </Typography>
                        {getCostVariance(item.lifo_cost, item.average_cost)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        ₹{item.average_cost.toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">
                          ₹{item.last_cost.toLocaleString('en-IN')}
                        </Typography>
                        {getCostVariance(item.last_cost, item.average_cost)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {item.total_quantity.toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        ₹{item.total_value.toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Batch Details by Product */}
      <Box>
        {Object.entries(batchesByProduct).map(([productKey, productBatches]) => {
          const firstBatch = productBatches[0];
          const totalQuantity = productBatches.reduce((sum, b) => sum + b.available_quantity, 0);
          const totalValue = productBatches.reduce((sum, b) => sum + b.batch_value, 0);
          const expiringSoon = productBatches.filter(b => b.days_to_expiry && b.days_to_expiry < 30).length;

          return (
            <Accordion
              key={productKey}
              expanded={expandedProduct === productKey}
              onChange={(_, isExpanded) => setExpandedProduct(isExpanded ? productKey : false)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {firstBatch.product_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {firstBatch.product_code} • {productBatches.length} batches
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Quantity
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {totalQuantity.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Value
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        ₹{totalValue.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    
                    {expiringSoon > 0 && (
                      <Tooltip title={`${expiringSoon} batches expiring soon`}>
                        <Chip
                          icon={<WarningIcon />}
                          label={expiringSoon}
                          color="warning"
                          size="small"
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Batch Number</TableCell>
                        <TableCell>Supplier</TableCell>
                        <TableCell>Purchase Date</TableCell>
                        <TableCell align="right">Purchase Price</TableCell>
                        <TableCell align="right">Received</TableCell>
                        <TableCell align="right">Available</TableCell>
                        <TableCell align="right">Batch Value</TableCell>
                        <TableCell>Expiry</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productBatches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {batch.batch_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {batch.supplier_name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(batch.purchase_date).toLocaleDateString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ₹{batch.purchase_price.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {batch.received_quantity.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {batch.available_quantity.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ₹{batch.batch_value.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {batch.expiry_date ? (
                              <Box>
                                <Typography variant="body2">
                                  {new Date(batch.expiry_date).toLocaleDateString('en-IN')}
                                </Typography>
                                {getExpiryAlert(batch.days_to_expiry)}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No Expiry
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={batch.status.toUpperCase()}
                              color={getStatusColor(batch.status) as any}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {batches.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No inventory batches found for the selected criteria.
        </Alert>
      )}
    </Box>
  );
};

export default BatchInventoryManager;