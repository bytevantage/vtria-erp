import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Assignment as BOMIcon,
  Build as ToolIcon,
  Person as PersonIcon,
  AttachMoney as CostIcon,
  Timeline as ProgressIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config';

const BOMViewer = ({ manufacturingCaseId, onMaterialSelect }) => {
  const [bomData, setBomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  const [optimalProducts, setOptimalProducts] = useState([]);

  useEffect(() => {
    if (manufacturingCaseId) {
      fetchBOMData();
    }
  }, [manufacturingCaseId]);

  const fetchBOMData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.get(
        `${API_BASE_URL}/api/manufacturing/cases/${manufacturingCaseId}/bom`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBomData(response.data.data);
    } catch (error) {
      console.error('Error fetching BOM data:', error);
      setError('Failed to load BOM data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = async (bomItem) => {
    try {
      setSelectedItem(bomItem);
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.get(
        `${API_BASE_URL}/api/manufacturing/products/select-optimal`,
        {
          params: {
            part_number: bomItem.part_number,
            quantity_required: bomItem.quantity_required,
            sort_by: 'cost' // Can be 'cost', 'warranty', 'location'
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setOptimalProducts(response.data.data || []);
      setProductSelectionOpen(true);
    } catch (error) {
      console.error('Error fetching optimal products:', error);
      setError('Failed to load product options');
    }
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'partial': return 'warning';
      case 'unavailable': return 'error';
      default: return 'default';
    }
  };

  const getWarrantyStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'success';
      case 'expiring': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  if (loading) return <Typography>Loading BOM...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!bomData) return <Typography>No BOM data available</Typography>;

  return (
    <Box>
      {/* BOM Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bill of Materials - {bomData.bom_number}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  ₹{bomData.total_cost?.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total Material Cost
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {bomData.labor_hours}h
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Estimated Labor Hours
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {bomData.items?.filter(item => item.availability_status === 'available').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Items Available
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main">
                  {bomData.items?.filter(item => item.availability_status === 'unavailable').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Items To Procure
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* BOM Items */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Material Requirements
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Details</TableCell>
                  <TableCell align="center">Required</TableCell>
                  <TableCell align="center">Available</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Total Cost</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bomData.items?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {item.item_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Part No: {item.part_number}
                        </Typography>
                        {item.section && (
                          <Chip
                            label={item.section}
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2">
                        {item.quantity_required} {item.unit}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2">
                        {item.stock_quantity || 0} {item.unit}
                      </Typography>
                      {item.inventory_last_updated && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Updated: {new Date(item.inventory_last_updated).toLocaleDateString()}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2">
                        ₹{item.unit_cost?.toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        ₹{(item.quantity_required * item.unit_cost)?.toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={item.availability_status}
                        color={getAvailabilityColor(item.availability_status)}
                        size="small"
                        icon={
                          item.availability_status === 'available' ? <CheckIcon /> :
                            item.availability_status === 'partial' ? <WarningIcon /> :
                              <ErrorIcon />
                        }
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleSelectProduct(item)}
                        startIcon={<BOMIcon />}
                      >
                        Select Product
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Product Selection Dialog */}
      <Dialog
        open={productSelectionOpen}
        onClose={() => setProductSelectionOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Select Optimal Product for: {selectedItem?.item_name}
          <Typography variant="caption" display="block" color="textSecondary">
            Required: {selectedItem?.quantity_required} {selectedItem?.unit}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Details</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Available Qty</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Warranty</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {optimalProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="subtitle2">{product.product_name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {product.product_code}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {product.serial_number || 'N/A'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {product.quantity_available}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        ₹{product.cost_basis?.toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Chip
                          label={product.warranty_status}
                          color={getWarrantyStatusColor(product.warranty_status)}
                          size="small"
                        />
                        {product.warranty_days_remaining > 0 && (
                          <Typography variant="caption" display="block">
                            {product.warranty_days_remaining} days left
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {product.location}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={product.condition_status}
                        color={product.condition_status === 'new' ? 'success' : 'info'}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          if (onMaterialSelect) {
                            onMaterialSelect(selectedItem, product);
                          }
                          setProductSelectionOpen(false);
                        }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setProductSelectionOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BOMViewer;