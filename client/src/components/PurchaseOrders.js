import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ShoppingCart,
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  GetApp,
  CheckCircle,
  Send,
  Cancel,
  Warning,
  Schedule,
  PictureAsPdf,
  Visibility
} from '@mui/icons-material';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`purchase-tabpanel-${index}`}
      aria-labelledby={`purchase-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Purchase Dashboard Component
const PurchaseDashboard = ({ dashboardData }) => {
  // Default empty data structure - Purchase Orders will be created from approved Purchase Requisitions
  const defaultData = {
    totalPOs: 0,
    pendingApprovals: 0,
    overdueDeliveries: 0,
    monthlyValue: 0,
    recentPOs: [],
    pendingReceipts: []
  };

  const data = dashboardData || defaultData;

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <ShoppingCart color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total POs
                </Typography>
                <Typography variant="h4">
                  {data.totalPOs}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Schedule color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Pending Approvals
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {data.pendingApprovals}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Warning color="error" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Overdue Deliveries
                </Typography>
                <Typography variant="h4" color="error.main">
                  {data.overdueDeliveries}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <TrendingUp color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Monthly Value
                </Typography>
                <Typography variant="h4" color="success.main">
                  ₹{(data.monthlyValue / 100000).toFixed(1)}L
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent POs */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Purchase Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>{po.po_number}</TableCell>
                      <TableCell>{po.supplier}</TableCell>
                      <TableCell align="right">₹{po.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={po.status.replace('_', ' ')}
                          color={po.status === 'approved' ? 'success' : po.status === 'sent_to_supplier' ? 'info' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Pending Receipts */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Receipts
            </Typography>
            {data.pendingReceipts.map((receipt, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">{receipt.po_number}</Typography>
                <Typography variant="caption" color="textSecondary">{receipt.supplier}</Typography>
                <Box display="flex" justifyContent="between" alignItems="center">
                  <Typography variant="caption">Expected: {receipt.expectedDate}</Typography>
                  {receipt.daysOverdue > 0 && (
                    <Chip
                      label={`${receipt.daysOverdue} days overdue`}
                      color="error"
                      size="small"
                    />
                  )}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Purchase Orders List Component
const PurchaseOrdersList = ({ orders = [], onAdd, onEdit, onView, onDownload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const data = orders;
  console.log('PurchaseOrdersList received orders:', orders.length, 'orders');

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'sent_to_supplier': return 'info';
      case 'pending_approval': return 'warning';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
      case 'received': return 'success';
      case 'partially_received': return 'warning';
      default: return 'default';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = (order.po_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });



  const statuses = [...new Set(orders.map(order => order.status))];

  return (
    <Box>
      {/* Controls */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder="Search POs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
          }}
          sx={{ minWidth: 250 }}
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statuses.map(status => (
              <MenuItem key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
        >
          Create PO
        </Button>
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PO Number</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>PO Date</TableCell>
              <TableCell>Expected Delivery</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Receipt Status</TableCell>
              <TableCell align="center">Items</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {data.length === 0 ? 'No purchase orders found. Total orders: 0' : `No purchase orders match the current filters. Total orders: ${data.length}`}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.po_id}</TableCell>
                  <TableCell>{order.supplier_name}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>{order.delivery_date}</TableCell>
                  <TableCell align="right">₹{(order.grand_total || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={(order.status || '').replace('_', ' ')}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{order.status === 'approved' ? 'Pending Receipt' : order.status === 'received' ? 'Received' : 'Pending'}</TableCell>
                  <TableCell align="center">-</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton onClick={() => onView(order)} size="small">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download PDF">
                      <IconButton onClick={() => onDownload && onDownload(order)} size="small">
                        <PictureAsPdf />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Purchase Order">
                      <IconButton onClick={() => {
                        console.log('PO Edit button clicked for:', order);
                        onEdit(order);
                      }} size="small">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Main Purchase Orders Component
const PurchaseOrders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [approvedRequisitions, setApprovedRequisitions] = useState([]);
  const [selectedRequisition, setSelectedRequisition] = useState(null);

  // Dialog states
  const [createPODialog, setCreatePODialog] = useState(false);
  const [quoteReviewDialog, setQuoteReviewDialog] = useState(false);
  const [editPODialog, setEditPODialog] = useState(false);
  const [viewPODialog, setViewPODialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  // Quote Review state
  const [reviewingPR, setReviewingPR] = useState(null);
  const [prItems, setPrItems] = useState([]);
  const [vendorTerms, setVendorTerms] = useState({
    delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: 'Net 30 days',
    delivery_terms: 'Standard delivery',
    notes: ''
  });

  // Edit PO state
  const [editingPO, setEditingPO] = useState(null);
  const [editPOData, setEditPOData] = useState({
    delivery_date: '',
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    status: ''
  });

  const loadApprovedRequisitions = async () => {
    try {
      const { data, error } = await api.get('/api/purchase-requisition');
      if (error) {
        throw new Error(error);
      }
      // Filter for approved requisitions that don't have POs yet
      const approved = (data || []).filter(pr =>
        pr.status === 'approved' &&
        pr.supplier_id // Must have a supplier selected
        // Temporarily remove items requirement for testing
        // pr.items_count > 0 // Must have items
      );
      setApprovedRequisitions(approved);
    } catch (error) {
      console.error('Error loading approved requisitions:', error);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);

      // Direct fetch to bypass any API utility issues
      const response = await fetch('/api/purchase-order', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPurchaseOrders(data.data);
        console.log('Successfully loaded', data.data.length, 'purchase orders');
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setError('Failed to load purchase orders: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
    loadApprovedRequisitions();
  }, []);

  const handleCreatePO = () => {
    loadApprovedRequisitions(); // Refresh the list when opening dialog
    setSelectedRequisition(null); // Reset selection
    setCreatePODialog(true);
  };

  const handleReviewQuote = async () => {
    if (!selectedRequisition) {
      setError('Please select a purchase requisition');
      return;
    }

    try {
      setLoading(true);
      // Fetch PR details with items for review
      const { data, error } = await api.get(`/api/purchase-requisitions/${selectedRequisition.id}`);

      if (error) {
        throw new Error(error);
      }

      // Set up the review dialog with PR items
      setReviewingPR(selectedRequisition);
      setPrItems(data.items.map(item => ({
        ...item,
        vendor_price: item.estimated_price || 0,
        final_quantity: item.quantity || 1,
        vendor_hsn: item.hsn_code || '',
        vendor_notes: ''
      })));

      setCreatePODialog(false);
      setQuoteReviewDialog(true);

    } catch (error) {
      console.error('Error fetching PR items:', error);
      setError(`Error loading PR items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePOFromQuotes = async () => {
    if (!reviewingPR) {
      setError('No purchase requisition selected');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await api.post('/api/purchase-orders/from-requisition', {
        purchase_requisition_id: reviewingPR.id,
        delivery_date: vendorTerms.delivery_date,
        payment_terms: vendorTerms.payment_terms,
        delivery_terms: vendorTerms.delivery_terms,
        notes: vendorTerms.notes,
        items: prItems.map(item => ({
          product_id: item.product_id,
          product_name: item.item_name || item.product_name,
          description: item.description,
          quantity: item.final_quantity,
          unit_price: item.vendor_price,
          unit: item.unit,
          hsn_code: item.vendor_hsn,
          notes: item.vendor_notes
        }))
      });

      if (error) {
        throw new Error(error);
      }

      // Close dialog and refresh data
      setQuoteReviewDialog(false);
      setReviewingPR(null);
      setPrItems([]);
      setSelectedRequisition(null);
      await loadPurchaseOrders();
      await loadApprovedRequisitions();

      // Show success message
      setError(''); // Clear any previous errors
      alert(`Purchase Order ${data.po_number} created successfully with vendor quotes!`);

    } catch (error) {
      console.error('Error creating purchase order:', error);
      setError(`Error creating purchase order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  const handleEditPO = (po) => {
    setEditingPO(po);
    setEditPOData({
      delivery_date: po.delivery_date ? po.delivery_date.split('T')[0] : '',
      payment_terms: po.payment_terms || 'Net 30 days',
      delivery_terms: po.delivery_terms || 'Standard delivery',
      notes: po.notes || '',
      status: po.status || 'draft'
    });
    setEditPODialog(true);
  };

  const handleViewPO = (po) => {
    setSelectedPO(po);
    setViewPODialog(true);
  };

  const handleUpdatePO = async () => {
    try {
      if (!editingPO) return;

      setLoading(true);
      const { data, error } = await api.put(`/api/purchase-order/${editingPO.id}`, editPOData);

      if (error) {
        throw new Error(error);
      }

      // Success - refresh data and close dialog
      loadPurchaseOrders();
      setEditPODialog(false);
      setEditingPO(null);
      setEditPOData({
        delivery_date: '',
        payment_terms: '',
        delivery_terms: '',
        notes: '',
        status: ''
      });

      alert(`Purchase Order ${editingPO.po_id} updated successfully!`);

    } catch (error) {
      console.error('Error updating purchase order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError(`Error updating purchase order: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePR = async (pr) => {
    if (window.confirm('Are you sure you want to approve this purchase requisition?')) {
      try {
        const { error } = await api.put(`/api/purchase-requisition/${pr.id}/status`, {
          status: 'approved'
        });
        if (error) {
          throw new Error(error);
        }
        loadRequisitions(); // Refresh the list
        loadApprovedRequisitions(); // Refresh approved list
      } catch (error) {
        console.error('Error approving PR:', error);
        setError('Error approving purchase requisition');
      }
    }
  };



  const handleDownloadPO = async (po) => {
    try {
      setError('');

      // Generate PDF using the PDF API
      const response = await fetch(`http://localhost:3001/api/pdf/purchase-order/${po.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'test'}`
        }
      });

      const result = await response.json();

      if (result.success) {
        // Download the generated PDF
        const downloadUrl = `http://localhost:3001${result.downloadUrl}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        // Extract filename from the response
        const fileName = result.downloadUrl.split('/').pop();
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PO PDF:', error);
      setError('Error downloading purchase order PDF: ' + error.message);
    }
  };





  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Purchase Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<ShoppingCart />}
          onClick={handleCreatePO}
          color="primary"
        >
          Create Purchase Order
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Debug info */}
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Debug: {purchaseOrders.length} purchase orders loaded
      </Typography>

      {/* Purchase Orders List - No more redundant tabs! */}
      <PurchaseOrdersList
        orders={purchaseOrders}
        onAdd={handleCreatePO}
        onEdit={handleEditPO}
        onView={handleViewPO}
        onDownload={handleDownloadPO}
      />

      {/* Create PO Dialog */}
      <Dialog open={createPODialog} onClose={() => setCreatePODialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Purchase Order from Approved Requisition</DialogTitle>
        <DialogContent>
          {approvedRequisitions.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                No Approved Requisitions Available
              </Typography>
              <Typography variant="body2" paragraph>
                To create purchase orders, you need approved purchase requisitions with:
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li>Approved status</li>
                <li>Selected supplier</li>
                <li>Items added</li>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/vtria-erp/purchase-requisition')}
                  sx={{ mr: 1 }}
                >
                  Go to Purchase Requisitions
                </Button>
              </Box>
            </Alert>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Select an approved purchase requisition to create a purchase order:
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PR Number</TableCell>
                      <TableCell>Case Number</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedRequisitions.map((pr) => (
                      <TableRow key={pr.id}>
                        <TableCell>{pr.pr_number}</TableCell>
                        <TableCell>{pr.case_number || '-'}</TableCell>
                        <TableCell>{pr.client_name || '-'}</TableCell>
                        <TableCell>{pr.supplier_name || '-'}</TableCell>
                        <TableCell>{pr.items_count || 0}</TableCell>
                        <TableCell align="right">
                          ₹{parseFloat(pr.total_value || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => setSelectedRequisition(pr)}
                            disabled={selectedRequisition?.id === pr.id}
                          >
                            {selectedRequisition?.id === pr.id ? 'Selected' : 'Select'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePODialog(false)}>Cancel</Button>
          {selectedRequisition && (
            <Button
              variant="contained"
              onClick={() => handleReviewQuote()}
              color="primary"
            >
              Review Items & Quotes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Quote Review Dialog */}
      <Dialog open={quoteReviewDialog} onClose={() => setQuoteReviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Review Items & Vendor Quotes
          {reviewingPR && (
            <Typography variant="subtitle2" color="textSecondary">
              Purchase Requisition: {reviewingPR.pr_number} | Supplier: {reviewingPR.vendor_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Vendor Terms Section */}
            <Typography variant="h6" gutterBottom>
              Delivery & Payment Terms
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expected Delivery Date"
                  value={vendorTerms.delivery_date}
                  onChange={(e) => setVendorTerms(prev => ({ ...prev, delivery_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Payment Terms"
                  value={vendorTerms.payment_terms}
                  onChange={(e) => setVendorTerms(prev => ({ ...prev, payment_terms: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Delivery Terms"
                  value={vendorTerms.delivery_terms}
                  onChange={(e) => setVendorTerms(prev => ({ ...prev, delivery_terms: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={vendorTerms.notes}
                  onChange={(e) => setVendorTerms(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>

            {/* Items Table */}
            <Typography variant="h6" gutterBottom>
              Items & Vendor Quotes
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Est. Qty</TableCell>
                    <TableCell>Final Qty</TableCell>
                    <TableCell>Est. Price</TableCell>
                    <TableCell>Vendor Price</TableCell>
                    <TableCell>HSN Code</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.item_name || item.product_name}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.unit || 'Nos'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.final_quantity}
                          onChange={(e) => {
                            const newItems = [...prItems];
                            newItems[index].final_quantity = parseFloat(e.target.value) || 0;
                            setPrItems(newItems);
                          }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>₹{parseFloat(item.estimated_price || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.vendor_price}
                          onChange={(e) => {
                            const newItems = [...prItems];
                            newItems[index].vendor_price = parseFloat(e.target.value) || 0;
                            setPrItems(newItems);
                          }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.vendor_hsn}
                          onChange={(e) => {
                            const newItems = [...prItems];
                            newItems[index].vendor_hsn = e.target.value;
                            setPrItems(newItems);
                          }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.vendor_notes}
                          onChange={(e) => {
                            const newItems = [...prItems];
                            newItems[index].vendor_notes = e.target.value;
                            setPrItems(newItems);
                          }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        ₹{(item.final_quantity * item.vendor_price).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Total Summary */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" align="right">
                Total Vendor Quote: ₹{prItems.reduce((sum, item) => sum + (item.final_quantity * item.vendor_price), 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteReviewDialog(false)}>Cancel</Button>
          <Button onClick={() => setCreatePODialog(true)}>Back to PR Selection</Button>
          <Button
            variant="contained"
            onClick={handleCreatePOFromQuotes}
            color="primary"
            disabled={prItems.length === 0}
          >
            Create Purchase Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit PO Dialog */}
      <Dialog open={editPODialog} onClose={() => setEditPODialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Purchase Order</DialogTitle>
        <DialogContent>
          {editingPO && (
            <Box sx={{ pt: 2 }}>
              {/* PO Details Header */}
              <Card sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  Purchase Order Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">PO Number</Typography>
                    <Typography variant="body1" fontWeight="bold">{editingPO.po_id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Supplier</Typography>
                    <Typography variant="body1" fontWeight="bold">{editingPO.supplier_name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                    <Typography variant="body1" fontWeight="bold">Rs.{editingPO.grand_total?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Current Status</Typography>
                    <Chip label={editingPO.status} size="small" color="primary" />
                  </Grid>
                </Grid>
              </Card>

              {/* Edit Form */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Delivery Date"
                    value={editPOData.delivery_date}
                    onChange={(e) => setEditPOData({ ...editPOData, delivery_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    value={editPOData.status}
                    onChange={(e) => setEditPOData({ ...editPOData, status: e.target.value })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="pending_approval">Pending Approval</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="sent_to_supplier">Sent to Supplier</MenuItem>
                    <MenuItem value="received">Received</MenuItem>
                    <MenuItem value="partially_received">Partially Received</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    value={editPOData.payment_terms}
                    onChange={(e) => setEditPOData({ ...editPOData, payment_terms: e.target.value })}
                    placeholder="e.g., Net 30 days, 50% advance"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Delivery Terms"
                    value={editPOData.delivery_terms}
                    onChange={(e) => setEditPOData({ ...editPOData, delivery_terms: e.target.value })}
                    placeholder="e.g., FOB, Ex-works, Door delivery"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    value={editPOData.notes}
                    onChange={(e) => setEditPOData({ ...editPOData, notes: e.target.value })}
                    placeholder="Additional notes or instructions..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPODialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdatePO}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Purchase Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View PO Dialog */}
      <Dialog open={viewPODialog} onClose={() => setViewPODialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Purchase Order Details</DialogTitle>
        <DialogContent>
          {selectedPO && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Order Information</Typography>
                  <Typography><strong>PO Number:</strong> {selectedPO.po_id}</Typography>
                  <Typography><strong>Date:</strong> {selectedPO.date}</Typography>
                  <Typography><strong>Status:</strong> {selectedPO.status}</Typography>
                  <Typography><strong>Delivery Date:</strong> {selectedPO.delivery_date || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Supplier Information</Typography>
                  <Typography><strong>Supplier:</strong> {selectedPO.supplier_name}</Typography>
                  <Typography><strong>Grand Total:</strong> ₹{(selectedPO.grand_total || 0).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Terms</Typography>
                  <Typography><strong>Payment Terms:</strong> {selectedPO.payment_terms || 'N/A'}</Typography>
                  <Typography><strong>Delivery Terms:</strong> {selectedPO.delivery_terms || 'N/A'}</Typography>
                  {selectedPO.notes && (
                    <Typography><strong>Notes:</strong> {selectedPO.notes}</Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewPODialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PurchaseOrders;
