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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
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
  discount_percentage?: number;
  manufacturing_date?: string;
  quality_grade?: string;
  storage_location?: string;
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
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<number>(locationId || 0);
  const [selectedProduct, setSelectedProduct] = useState<number>(productId || 0);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<string>('purchase_date');
  const [expandedProduct, setExpandedProduct] = useState<string | false>(false);
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    fetchProducts();
    fetchLocations();
    fetchSuppliers();
    fetchBatchData();
    fetchCostingSummary();
  }, [selectedLocation, selectedProduct, statusFilter]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      // Mock locations for now
      setLocations([
        { id: 1, name: 'Main Warehouse' },
        { id: 2, name: 'Production Floor' },
        { id: 3, name: 'Quality Control' },
      ]);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchBatchData = async () => {
    setLoading(true);
    try {
      // Generate mock batch data based on products
      const mockBatches: InventoryBatch[] = products.slice(0, 5).flatMap((product, index) => [
        {
          id: index * 2 + 1,
          batch_number: `BTH-${product.product_code || product.part_code || ''}-001`,
          product_id: product.id,
          product_name: product.name || product.product_name || '',
          product_code: product.product_code || product.part_code || '',
          location_id: 1,
          location_name: 'Main Warehouse',
          supplier_name: 'ABC Suppliers',
          purchase_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          purchase_price: 100 + Math.random() * 500,
          received_quantity: 100 + Math.floor(Math.random() * 500),
          consumed_quantity: Math.floor(Math.random() * 50),
          available_quantity: 80 + Math.floor(Math.random() * 200),
          batch_value: (100 + Math.random() * 500) * (80 + Math.floor(Math.random() * 200)),
          expiry_date: new Date(Date.now() + (60 + Math.random() * 300) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days_to_expiry: 60 + Math.floor(Math.random() * 300),
          status: 'active' as const,
          discount_percentage: Math.random() * 10,
          manufacturing_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quality_grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
          storage_location: `A-${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 20) + 1}`,
        },
        {
          id: index * 2 + 2,
          batch_number: `BTH-${product.product_code || product.part_code || ''}-002`,
          product_id: product.id,
          product_name: product.name || product.product_name || '',
          product_code: product.product_code || product.part_code || '',
          location_id: 1,
          location_name: 'Main Warehouse',
          supplier_name: 'XYZ Corporation',
          purchase_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          purchase_price: 80 + Math.random() * 400,
          received_quantity: 50 + Math.floor(Math.random() * 300),
          consumed_quantity: Math.floor(Math.random() * 30),
          available_quantity: 40 + Math.floor(Math.random() * 150),
          batch_value: (80 + Math.random() * 400) * (40 + Math.floor(Math.random() * 150)),
          expiry_date: new Date(Date.now() + (30 + Math.random() * 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days_to_expiry: 30 + Math.floor(Math.random() * 180),
          status: Math.random() > 0.8 ? 'expired' as const : 'active' as const,
          discount_percentage: Math.random() * 15,
          manufacturing_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quality_grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
          storage_location: `B-${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 20) + 1}`,
        },
      ]);

      const filteredBatches = statusFilter === 'all' 
        ? mockBatches 
        : mockBatches.filter(batch => batch.status === statusFilter);

      setBatches(filteredBatches);
    } catch (error) {
      console.error('Failed to fetch batch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostingSummary = async () => {
    try {
      // Generate mock costing summary
      const mockSummary: CostingSummary[] = products.slice(0, 3).map((product) => ({
        product_id: product.id,
        product_name: product.name || product.product_name || '',
        product_code: product.product_code || product.part_code || '',
        location_name: 'Main Warehouse',
        fifo_cost: 100 + Math.random() * 50,
        lifo_cost: 90 + Math.random() * 60,
        average_cost: 95 + Math.random() * 55,
        last_cost: 105 + Math.random() * 45,
        total_quantity: 500 + Math.floor(Math.random() * 1000),
        total_value: (95 + Math.random() * 55) * (500 + Math.floor(Math.random() * 1000)),
      }));

      setCostingSummary(mockSummary);
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

  const handleAddBatch = () => {
    setEditingBatch(null);
    setOpenBatchDialog(true);
  };

  const handleEditBatch = (batch: InventoryBatch) => {
    setEditingBatch(batch);
    setOpenBatchDialog(true);
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon />
              Batch-wise Inventory Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddBatch}
            >
              Add New Batch
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Location</InputLabel>
              <Select
                value={selectedLocation}
                label="Location"
                onChange={(e) => setSelectedLocation(e.target.value as number)}
              >
                <MenuItem value={0}>All Locations</MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select
                value={selectedProduct}
                label="Product"
                onChange={(e) => setSelectedProduct(e.target.value as number)}
              >
                <MenuItem value={0}>All Products</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.product_code || product.part_code} - {product.name || product.product_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
                        <TableCell align="right">Discount %</TableCell>
                        <TableCell align="right">Available</TableCell>
                        <TableCell align="right">Batch Value</TableCell>
                        <TableCell>Quality</TableCell>
                        <TableCell>Expiry</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productBatches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {batch.batch_number}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {batch.storage_location}
                              </Typography>
                            </Box>
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
                            <Typography variant="body2" color="success.main">
                              {batch.discount_percentage?.toFixed(1)}%
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
                            <Chip
                              label={batch.quality_grade}
                              color={batch.quality_grade === 'A' ? 'success' : batch.quality_grade === 'B' ? 'warning' : 'default'}
                              size="small"
                            />
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
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEditBatch(batch)}
                            >
                              <EditIcon />
                            </IconButton>
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

      {/* Add/Edit Batch Dialog */}
      <Dialog
        open={openBatchDialog}
        onClose={() => setOpenBatchDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingBatch ? 'Edit Batch' : 'Add New Batch'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Batch Number"
                defaultValue={editingBatch?.batch_number || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Product</InputLabel>
                <Select defaultValue={editingBatch?.product_id || ''}>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.product_code || product.part_code} - {product.name || product.product_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Supplier</InputLabel>
                <Select defaultValue={editingBatch?.supplier_name || ''}>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Price"
                type="number"
                defaultValue={editingBatch?.purchase_price || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Received Quantity"
                type="number"
                defaultValue={editingBatch?.received_quantity || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Discount %"
                type="number"
                defaultValue={editingBatch?.discount_percentage || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Date"
                type="date"
                defaultValue={editingBatch?.purchase_date || ''}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expiry Date"
                type="date"
                defaultValue={editingBatch?.expiry_date || ''}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Quality Grade</InputLabel>
                <Select defaultValue={editingBatch?.quality_grade || 'A'}>
                  <MenuItem value="A">Grade A</MenuItem>
                  <MenuItem value="B">Grade B</MenuItem>
                  <MenuItem value="C">Grade C</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Storage Location"
                defaultValue={editingBatch?.storage_location || ''}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenBatchDialog(false)}>
            {editingBatch ? 'Update' : 'Add'} Batch
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BatchInventoryManager;