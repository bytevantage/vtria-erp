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
  Alert,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tabs,
  Tab,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  QrCode2 as QrCodeIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Print as PrintIcon,
  Assignment as WarrantyIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface SerialNumberItem {
  id: number;
  serial_number: string;
  product_id: number;
  product_name: string;
  product_code: string;
  batch_id?: number;
  batch_number?: string;
  status: 'available' | 'allocated' | 'sold' | 'damaged' | 'returned' | 'warranty_claim';
  location_id: number;
  location_name: string;
  manufacturing_date?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_period_months?: number;
  customer_id?: number;
  customer_name?: string;
  sales_order_id?: number;
  sales_order_number?: string;
  purchase_price?: number;
  selling_price?: number;
  supplier_name?: string;
  quality_grade?: string;
  notes?: string;
  last_updated: string;
  created_date: string;
}

interface WarrantyClaim {
  id: number;
  serial_number: string;
  claim_number: string;
  claim_date: string;
  customer_name: string;
  issue_description: string;
  claim_status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
  resolution_notes?: string;
  technician_assigned?: string;
  estimated_cost?: number;
  actual_cost?: number;
  warranty_valid: boolean;
}

interface SerialNumberManagerProps {
  productId?: number;
  locationId?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`serial-tabpanel-${index}`}
      aria-labelledby={`serial-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SerialNumberManager: React.FC<SerialNumberManagerProps> = ({
  productId,
  locationId,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [serialNumbers, setSerialNumbers] = useState<SerialNumberItem[]>([]);
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number>(productId || 0);
  const [selectedLocation, setSelectedLocation] = useState<number>(locationId || 0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSerial, setEditingSerial] = useState<SerialNumberItem | null>(null);
  const [openWarrantyDialog, setOpenWarrantyDialog] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    fetchProducts();
    fetchLocations();
    fetchSerialNumbers();
    fetchWarrantyClaims();
  }, [selectedProduct, selectedLocation, statusFilter]);

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
      setLocations([
        { id: 1, name: 'Main Warehouse' },
        { id: 2, name: 'Production Floor' },
        { id: 3, name: 'Quality Control' },
        { id: 4, name: 'Customer Site' },
      ]);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchSerialNumbers = async () => {
    setLoading(true);
    try {
      // Generate mock serial number data
      const mockSerials: SerialNumberItem[] = products.slice(0, 5).flatMap((product, index) => 
        Array.from({ length: 3 }, (_, serialIndex) => ({
          id: index * 3 + serialIndex + 1,
          serial_number: `SN${product.product_code || product.part_code || ''}${String(serialIndex + 1).padStart(4, '0')}`,
          product_id: product.id,
          product_name: product.name || product.product_name || '',
          product_code: product.product_code || product.part_code || '',
          batch_number: `BTH-${product.product_code || product.part_code || ''}-001`,
          status: ['available', 'allocated', 'sold', 'warranty_claim'][Math.floor(Math.random() * 4)] as any,
          location_id: Math.floor(Math.random() * 4) + 1,
          location_name: ['Main Warehouse', 'Production Floor', 'Quality Control', 'Customer Site'][Math.floor(Math.random() * 4)],
          manufacturing_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          warranty_start_date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          warranty_end_date: new Date(Date.now() + (365 + Math.random() * 730) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          warranty_period_months: 12 + Math.floor(Math.random() * 24),
          customer_name: Math.random() > 0.5 ? 'ABC Corporation' : undefined,
          sales_order_number: Math.random() > 0.5 ? `SO-${Math.floor(Math.random() * 10000)}` : undefined,
          purchase_price: 500 + Math.random() * 2000,
          selling_price: 800 + Math.random() * 3000,
          supplier_name: 'Premium Suppliers Ltd',
          quality_grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
          notes: Math.random() > 0.7 ? 'Special handling required' : undefined,
          last_updated: new Date().toISOString(),
          created_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      );

      const filteredSerials = statusFilter === 'all' 
        ? mockSerials 
        : mockSerials.filter(serial => serial.status === statusFilter);

      const searchFiltered = searchTerm 
        ? filteredSerials.filter(serial => 
            serial.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            serial.product_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : filteredSerials;

      setSerialNumbers(searchFiltered);
    } catch (error) {
      console.error('Failed to fetch serial numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarrantyClaims = async () => {
    try {
      // Generate mock warranty claims
      const mockClaims: WarrantyClaim[] = serialNumbers.slice(0, 3).map((serial, index) => ({
        id: index + 1,
        serial_number: serial.serial_number,
        claim_number: `WC-${String(index + 1).padStart(4, '0')}`,
        claim_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_name: serial.customer_name || 'Unknown Customer',
        issue_description: [
          'Product not functioning properly',
          'Manufacturing defect reported',
          'Performance degradation observed',
          'Physical damage during shipping'
        ][Math.floor(Math.random() * 4)],
        claim_status: ['open', 'in_progress', 'resolved', 'closed'][Math.floor(Math.random() * 4)] as any,
        resolution_notes: Math.random() > 0.5 ? 'Replacement unit provided' : undefined,
        technician_assigned: Math.random() > 0.5 ? 'John Smith' : undefined,
        estimated_cost: 100 + Math.random() * 500,
        actual_cost: Math.random() > 0.5 ? 80 + Math.random() * 400 : undefined,
        warranty_valid: Math.random() > 0.2,
      }));

      setWarrantyClaims(mockClaims);
    } catch (error) {
      console.error('Failed to fetch warranty claims:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'allocated':
        return 'warning';
      case 'sold':
        return 'info';
      case 'damaged':
        return 'error';
      case 'returned':
        return 'default';
      case 'warranty_claim':
        return 'error';
      default:
        return 'default';
    }
  };

  const getWarrantyStatus = (endDate?: string) => {
    if (!endDate) return { status: 'No Warranty', color: 'default' };
    
    const today = new Date();
    const warrantyEnd = new Date(endDate);
    const daysRemaining = Math.ceil((warrantyEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return { status: 'Expired', color: 'error' };
    } else if (daysRemaining < 30) {
      return { status: `${daysRemaining}d remaining`, color: 'warning' };
    } else {
      return { status: `${daysRemaining}d remaining`, color: 'success' };
    }
  };

  const handleAddSerial = () => {
    setEditingSerial(null);
    setOpenDialog(true);
  };

  const handleEditSerial = (serial: SerialNumberItem) => {
    setEditingSerial(serial);
    setOpenDialog(true);
  };

  const handleBulkUpload = () => {
    // Implement bulk upload functionality
    console.log('Bulk upload functionality');
  };

  const handlePrintLabels = () => {
    // Implement label printing functionality
    console.log('Print labels functionality');
  };

  const filteredSerialNumbers = serialNumbers;

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab 
                label="Serial Number Registry" 
                icon={<QrCodeIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Warranty Claims" 
                icon={<WarrantyIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      <TabPanel value={tabValue} index={0}>
        {/* Serial Number Registry */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCodeIcon />
                Serial Number Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={handleBulkUpload}
                  size="small"
                >
                  Bulk Upload
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrintLabels}
                  size="small"
                >
                  Print Labels
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddSerial}
                >
                  Add Serial Number
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="allocated">Allocated</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                  <MenuItem value="damaged">Damaged</MenuItem>
                  <MenuItem value="returned">Returned</MenuItem>
                  <MenuItem value="warranty_claim">Warranty Claim</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Search Serial Number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Serial Numbers Table */}
        <Card>
          <CardContent>
            {loading && <LinearProgress sx={{ mb: 2 }} />}
            
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Batch</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Warranty</TableCell>
                    <TableCell align="right">Purchase Price</TableCell>
                    <TableCell align="right">Selling Price</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSerialNumbers.map((serial) => {
                    const warrantyStatus = getWarrantyStatus(serial.warranty_end_date);
                    return (
                      <TableRow key={serial.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {serial.serial_number}
                            </Typography>
                            {serial.quality_grade && (
                              <Chip
                                label={`Grade ${serial.quality_grade}`}
                                size="small"
                                color={serial.quality_grade === 'A' ? 'success' : serial.quality_grade === 'B' ? 'warning' : 'default'}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {serial.product_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {serial.product_code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {serial.batch_number || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={serial.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(serial.status) as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {serial.location_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {serial.customer_name || 'N/A'}
                          </Typography>
                          {serial.sales_order_number && (
                            <Typography variant="caption" color="text.secondary">
                              SO: {serial.sales_order_number}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {serial.warranty_end_date ? (
                            <Box>
                              <Chip
                                label={warrantyStatus.status}
                                color={warrantyStatus.color as any}
                                size="small"
                              />
                              <Typography variant="caption" display="block" color="text.secondary">
                                Until: {new Date(serial.warranty_end_date).toLocaleDateString('en-IN')}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No Warranty
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {serial.purchase_price ? `₹${serial.purchase_price.toLocaleString('en-IN')}` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {serial.selling_price ? `₹${serial.selling_price.toLocaleString('en-IN')}` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditSerial(serial)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredSerialNumbers.length === 0 && !loading && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No serial numbers found for the selected criteria.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Warranty Claims */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarrantyIcon />
              Warranty Claims Management
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Claim Number</TableCell>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Issue Description</TableCell>
                    <TableCell>Claim Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Technician</TableCell>
                    <TableCell align="right">Est. Cost</TableCell>
                    <TableCell align="right">Actual Cost</TableCell>
                    <TableCell>Warranty Valid</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {warrantyClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {claim.claim_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {claim.serial_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {claim.customer_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {claim.issue_description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(claim.claim_date).toLocaleDateString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={claim.claim_status.replace('_', ' ').toUpperCase()}
                          color={
                            claim.claim_status === 'resolved' ? 'success' :
                            claim.claim_status === 'in_progress' ? 'warning' :
                            claim.claim_status === 'rejected' ? 'error' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {claim.technician_assigned || 'Unassigned'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ₹{claim.estimated_cost?.toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {claim.actual_cost ? `₹${claim.actual_cost.toLocaleString('en-IN')}` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {claim.warranty_valid ? (
                          <CheckCircleIcon sx={{ color: 'success.main' }} />
                        ) : (
                          <ErrorIcon sx={{ color: 'error.main' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Add/Edit Serial Number Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingSerial ? 'Edit Serial Number' : 'Add New Serial Number'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Serial Number"
                defaultValue={editingSerial?.serial_number || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Product</InputLabel>
                <Select defaultValue={editingSerial?.product_id || ''}>
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
                <InputLabel>Status</InputLabel>
                <Select defaultValue={editingSerial?.status || 'available'}>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="allocated">Allocated</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                  <MenuItem value="damaged">Damaged</MenuItem>
                  <MenuItem value="returned">Returned</MenuItem>
                  <MenuItem value="warranty_claim">Warranty Claim</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select defaultValue={editingSerial?.location_id || ''}>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Manufacturing Date"
                type="date"
                defaultValue={editingSerial?.manufacturing_date || ''}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Warranty Period (Months)"
                type="number"
                defaultValue={editingSerial?.warranty_period_months || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Price"
                type="number"
                defaultValue={editingSerial?.purchase_price || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Selling Price"
                type="number"
                defaultValue={editingSerial?.selling_price || ''}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                defaultValue={editingSerial?.notes || ''}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            {editingSerial ? 'Update' : 'Add'} Serial Number
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SerialNumberManager;