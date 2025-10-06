import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Description as PreviewIcon,
  CheckCircle as ConfirmIcon,
  Assignment as ProductionIcon,
  GetApp as DownloadIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  Send as SubmitIcon,
  Undo as RejectIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config';

const extractCaseNumber = (caseReference) => {
  if (!caseReference) return '';

  // Handle case number in format VESPL/CASE/YYYY/NNN
  if (caseReference.startsWith('VESPL/CASE/')) {
    const parts = caseReference.split('/');
    if (parts.length >= 4) {
      return parts[3]; // Returns the NNN part
    }
  }
  // If format doesn't match, try to extract numbers
  const match = caseReference.match(/\d+/);
  return match ? match[0] : caseReference;
};

const SalesOrders = () => {

  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [quotationItems, setQuotationItems] = useState([]);
  const [deletedStages, setDeletedStages] = useState([]);
  const [showDeletedStages, setShowDeletedStages] = useState(false);
  const [formData, setFormData] = useState({
    quotation_id: '',
    customer_po_number: '',
    customer_po_date: '',
    expected_delivery_date: '',
    advance_amount: '',
    production_priority: 'medium',
    special_instructions: '',
    billing_address: '',
    shipping_address: '',
  });

  useEffect(() => {
    fetchSalesOrders();
    fetchApprovedQuotations();

    // Check if navigated from Case Dashboard
    const selectedCase = sessionStorage.getItem('selectedCase');
    if (selectedCase) {
      try {
        const caseData = JSON.parse(selectedCase);
        handleCaseNavigation(caseData);
        sessionStorage.removeItem('selectedCase');
      } catch (error) {
        console.error('Error parsing case data from session storage:', error);
      }
    }
  }, []);

  const handleCaseNavigation = async (caseData) => {
    try {
      console.log('🔍 Navigating to sales order for case:', caseData);

      // URL encode the case number to handle forward slashes
      const encodedCaseNumber = encodeURIComponent(caseData.caseNumber);
      console.log('🌐 API URL (encoded):', `${API_BASE_URL}/api/sales-orders/by-case/${encodedCaseNumber}`);

      // Find sales order associated with this case
      const response = await axios.get(`${API_BASE_URL}/api/sales-orders/by-case/${encodedCaseNumber}`);

      console.log('📡 API Response:', response.data);
      console.log('✅ Success:', response.data.success);
      console.log('📄 Has Data:', !!response.data.data);

      if (response.data.success && response.data.data) {
        const salesOrder = response.data.data;
        console.log('🎯 Found sales order:', salesOrder.order_id);

        // Open the sales order for viewing using the existing pattern
        handleViewOrder(salesOrder);
      } else {
        console.log('❌ No sales order data found');
        setError(`No sales order found for case ${caseData.caseNumber}. You may need to create one from an accepted quotation.`);
      }
    } catch (error) {
      console.error('💥 Error loading case sales order:', error);
      console.error('Response:', error.response?.data);
      if (error.response && error.response.status === 404) {
        setError(`No sales order found for case ${caseData.caseNumber}. You may need to create one from an accepted quotation.`);
      } else {
        setError(`Error loading sales order for case ${caseData.caseNumber}: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      setError('');

      // First, get the sales orders from the sales_orders table
      const salesOrdersResponse = await axios.get(`${API_BASE_URL}/api/sales-orders`);

      if (salesOrdersResponse.data.success) {
        // Get case data for these sales orders
        const caseResponse = await axios.get(`${API_BASE_URL}/api/case-management/state/order`);

        // Create a map of case_id to case data for quick lookup
        const caseMap = {};
        if (caseResponse.data.success) {
          caseResponse.data.data.forEach(caseItem => {
            caseMap[caseItem.id] = caseItem;
          });
        }

        // Transform sales order data with case information
        const salesOrderData = salesOrdersResponse.data.data.map(order => {
          // Find the corresponding case data using case_id
          const caseData = caseMap[order.case_id] || {};

          return {
            id: order.id,
            sales_order_id: order.sales_order_id,
            case_number: order.case_number || 'N/A',
            enquiry_id: caseData.enquiry_id,
            project_name: caseData.project_name || order.project_name || 'N/A',
            client_name: caseData.client_name || order.client_name || 'N/A',
            client_contact: caseData.client_contact || order.contact_person || 'N/A',
            client_email: caseData.client_email || order.email || 'N/A',
            quotation_id: order.quotation_id,
            total_amount: order.total_amount || 0,
            tax_amount: order.tax_amount || 0,
            grand_total: order.grand_total || 0,
            advance_amount: order.advance_amount || 0,
            balance_amount: order.balance_amount || 0,
            status: order.status || 'draft',
            created_at: order.date || new Date().toISOString(),
            customer_po_number: order.customer_po_number || '',
            customer_po_date: order.customer_po_date || '',
            expected_delivery_date: order.expected_delivery_date || '',
            production_priority: order.production_priority || 'medium',
            assigned_to: caseData.assigned_to_name || 'Unassigned',
            created_by: order.created_by_name || 'System',
            // Preserve all other order fields
            billing_address: order.billing_address || '',
            shipping_address: order.shipping_address || '',
            payment_terms: order.payment_terms || '',
            delivery_terms: order.delivery_terms || '',
            warranty_terms: order.warranty_terms || '',
            special_instructions: order.special_instructions || ''
          };
        });

        setSalesOrders(salesOrderData);
      } else {
        setError('Failed to load sales orders. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      setError('Failed to load sales orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedQuotations = async () => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.get(`${API_BASE_URL}/api/quotations/enhanced/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter for approved or accepted quotations that don't already have sales orders
      const approvedQuotations = response.data.data?.filter(q => ['approved', 'accepted'].includes(q.status)) || [];
      setQuotations(approvedQuotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      quotation_id: '',
      customer_po_number: '',
      customer_po_date: '',
      expected_delivery_date: '',
      advance_amount: '',
      production_priority: 'medium',
      special_instructions: '',
      billing_address: '',
      shipping_address: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
    setEditingOrder(null);
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.quotation_id) {
        setError('Please select a quotation');
        return;
      }

      if (editingOrder) {
        // Update existing sales order
        const response = await axios.put(`${API_BASE_URL}/api/sales-orders/${editingOrder.id}`, {
          ...formData,
          advance_amount: parseFloat(formData.advance_amount) || 0,
        });

        if (response.data.success) {
          await fetchSalesOrders();
          handleClose();
        } else {
          setError('Failed to update sales order');
        }
      } else {
        // Create new sales order
        const response = await axios.post(`${API_BASE_URL}/api/sales-orders`, {
          ...formData,
          advance_amount: parseFloat(formData.advance_amount) || 0,
        });

        // Refresh the sales orders list
        await fetchSalesOrders();
        await fetchApprovedQuotations(); // Refresh to remove used quotations
        handleClose();
      }
    } catch (error) {
      console.error('Error saving sales order:', error);
      setError(error.response?.data?.message || 'Failed to save sales order');
    }
  };

  const handleConfirmOrder = async (id) => {
    if (window.confirm('Are you sure you want to confirm this sales order?')) {
      try {
        const token = localStorage.getItem('vtria_token') || 'demo-token';
        await axios.post(`${API_BASE_URL}/api/sales-orders/${id}/confirm`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchSalesOrders(); // Refresh list
      } catch (error) {
        console.error('Error confirming sales order:', error);
        setError('Failed to confirm sales order');
      }
    }
  };

  const handleSubmitForApproval = async (id) => {
    if (window.confirm('Are you sure you want to submit this sales order for approval?')) {
      try {
        const token = localStorage.getItem('vtria_token') || 'demo-token';
        await axios.post(`${API_BASE_URL}/api/sales-orders/${id}/submit`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchSalesOrders(); // Refresh list
      } catch (error) {
        console.error('Error submitting sales order for approval:', error);
        setError('Failed to submit sales order for approval');
      }
    }
  };

  const handleRejectForRework = async (id) => {
    const reason = window.prompt('Please provide a reason for rejecting this sales order for rework:');
    if (reason !== null) { // User didn't cancel
      try {
        const token = localStorage.getItem('vtria_token') || 'demo-token';
        await axios.post(`${API_BASE_URL}/api/sales-orders/${id}/reject`, {
          rejection_reason: reason.trim() || 'Rejected for rework'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchSalesOrders(); // Refresh list
      } catch (error) {
        console.error('Error rejecting sales order:', error);
        setError('Failed to reject sales order for rework');
      }
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      console.log(`� Attempting to update status for order ${id} to ${status}`);
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.put(`${API_BASE_URL}/api/sales-orders/${id}/status`, {
        status: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Status update successful:', response.data);
      await fetchSalesOrders(); // Refresh list
      setError(''); // Clear any previous errors
    } catch (error) {
      // Handle manufacturing case validation error specifically (Business rule violations)
      if (error.response?.status === 422 && error.response?.data?.openManufacturingCases) {
        const openCases = error.response.data.openManufacturingCases;
        const caseNumbers = openCases.map(mc => mc.manufacturing_case_number).join(', ');
        setError(
          `❌ Cannot update sales order status: Manufacturing cases must be completed first.\n\n` +
          `📋 Open Manufacturing Cases: ${caseNumbers}\n\n` +
          `💡 Please complete these manufacturing cases in the Production Management page before updating the sales order status.`
        );
        // Log business rule validation (not an actual error)
        console.info(`Status update blocked: Manufacturing cases ${caseNumbers} must be completed first`);
      } else {
        // Log actual unexpected errors
        console.error('Unexpected error updating status:', error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update status';
        setError(`Failed to update status: ${errorMessage}`);
      }
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleEditOrder = (order) => {
    setFormData({
      quotation_id: order.quotation_id,
      customer_po_number: order.customer_po_number || '',
      customer_po_date: order.customer_po_date ? order.customer_po_date.split('T')[0] : '',
      expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '',
      advance_amount: order.advance_amount || '',
      production_priority: order.production_priority || 'medium',
      special_instructions: order.special_instructions || '',
      billing_address: order.billing_address || '',
      shipping_address: order.shipping_address || '',
    });
    setEditingOrder(order);
    setOpen(true);
  };

  const handlePreviewOrder = async (order) => {
    try {
      // Fetch sales order details including items for preview
      const response = await axios.get(`${API_BASE_URL}/api/sales-orders/${order.id}`);

      if (response.data.success && response.data.data.items) {
        setQuotationItems(response.data.data.items || []);
      } else {
        setQuotationItems([]);
      }
    } catch (error) {
      console.error('Error fetching sales order details:', error);
      setQuotationItems([]);
    }
    setSelectedOrder(order);
    setPreviewDialogOpen(true);
  };

  const handleDownloadPDF = async (orderId) => {
    try {
      setError('');
      const token = localStorage.getItem('vtria_token');

      // Generate PDF
      const response = await axios.post(`${API_BASE_URL}/api/pdf/sales-order/${orderId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Download the generated PDF
        const downloadUrl = `${API_BASE_URL}${response.data.downloadUrl}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        // Extract filename from the response
        const fileName = response.data.downloadUrl.split('/').pop();
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const handleDelete = async (salesOrder) => {
    const reason = prompt('Please provide a reason for deleting this sales order stage:');
    if (!reason) return;

    if (window.confirm(`Are you sure you want to delete the sales order stage for case ${salesOrder.case_number}? This will revert the case to quotation approved state.`)) {
      try {
        // Use the standard API base URL

        // Use stage-specific delete if case_number exists (following the pattern from SalesEnquiry.js)
        if (salesOrder.case_number) {
          const encodedCaseNumber = encodeURIComponent(salesOrder.case_number);
          const response = await axios.delete(`${API_BASE_URL}/api/case-management/${encodedCaseNumber}/stage`, {
            data: {
              reason: reason,
              stage: 'sales_order',
              stage_id: salesOrder.id
            }
          });

          if (response.data.success) {
            setError('');
            await fetchSalesOrders();
            alert(`Sales order stage deleted successfully. Case ${salesOrder.case_number} reverted to ${response.data.data.new_state} state. You can recreate the sales order stage if needed.`);
          } else {
            throw new Error(response.data.message || 'Failed to delete sales order stage');
          }
        } else {
          // Fallback to direct sales order delete for legacy records
          await axios.delete(`${API_BASE_URL}/api/sales-orders/${salesOrder.id}`, {
            data: { reason }
          });
          await fetchSalesOrders();
          alert('Sales order deleted successfully.');
        }
      } catch (error) {
        console.error('Error deleting sales order stage:', error);
        setError('Failed to delete sales order stage: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const fetchDeletedStages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/case-management/deleted/list`);

      if (response.data.success) {
        const salesOrderStages = response.data.data.filter(backup => backup.stage === 'sales_order');
        setDeletedStages(salesOrderStages);
      }
    } catch (error) {
      console.error('Error fetching deleted stages:', error);
    }
  };

  const handleRecreateStage = async (backup) => {
    if (window.confirm(`Are you sure you want to recreate the sales order stage for case ${backup.case_number}? This will restore the sales order data and advance the case back to order state.`)) {
      try {
        // Use the standard API base URL
        await axios.post(`${API_BASE_URL}/api/case-management/stage-backup/${backup.id}/recreate`);

        await fetchSalesOrders();
        await fetchDeletedStages();
        alert('Sales order stage recreated successfully!');
      } catch (error) {
        console.error('Error recreating stage:', error);
        setError('Failed to recreate sales order stage: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_approval':
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'in_production': return 'info';
      case 'ready_for_dispatch': return 'warning';
      case 'dispatched': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Orders</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => {
              setShowDeletedStages(!showDeletedStages);
              if (!showDeletedStages) {
                fetchDeletedStages();
              }
            }}
            sx={{ borderColor: '#1976d2', color: '#1976d2' }}
          >
            {showDeletedStages ? 'Hide' : 'View'} Deleted Sales Order Stages
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{ backgroundColor: '#1976d2' }}
          >
            New Sales Order
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}

      {showDeletedStages && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>
            Deleted Sales Order Stages
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 2, border: '2px solid #f44336' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#ffebee' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Case Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Backup Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Original Data Preview</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedStages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No deleted sales order stages found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedStages.map((backup) => (
                    <TableRow key={backup.id} sx={{ backgroundColor: '#fafafa' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="primary">
                          {backup.case_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(backup.created_at).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {backup.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{
                          backgroundColor: '#e3f2fd',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          Sales Order Stage Backup
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleRecreateStage(backup)}
                          sx={{ color: '#4caf50' }}
                          title="Recreate Sales Order Stage"
                        >
                          <RestoreIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order No.</TableCell>
                <TableCell>Case Number</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Expected Delivery</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No sales orders found. Create your first sales order from an approved quotation!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                salesOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.sales_order_id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" color="secondary">
                        {order.case_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{order.client_name}</TableCell>
                    <TableCell>{order.project_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" color="primary" fontWeight={500}>
                          {order.client_contact || 'Unassigned'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          PRODUCTION MANAGER
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          ₹{order.grand_total?.toLocaleString('en-IN')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          (incl. GST ₹{order.tax_amount?.toLocaleString('en-IN')})
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={`${order.status}${order.manufacturing_case_status === 'open' ? ' 🔒' : ''}`}
                          color={getStatusColor(order.status)}
                          size="small"
                          title={order.manufacturing_case_status === 'open' ? 'Status locked - manufacturing case is open' : ''}
                        />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            displayEmpty
                            size="small"
                            sx={{ height: '32px' }}
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem
                              value="pending_approval"
                              disabled={order.manufacturing_case_status === 'open'}
                            >
                              Pending Approval
                              {order.manufacturing_case_status === 'open' && ' (Manufacturing Open)'}
                            </MenuItem>
                            <MenuItem
                              value="confirmed"
                              disabled={order.manufacturing_case_status === 'open'}
                            >
                              Confirmed
                              {order.manufacturing_case_status === 'open' && ' (Manufacturing Open)'}
                            </MenuItem>
                            <MenuItem
                              value="in_production"
                              disabled={order.manufacturing_case_status === 'open'}
                            >
                              In Production
                              {order.manufacturing_case_status === 'open' && ' (Manufacturing Open)'}
                            </MenuItem>
                            <MenuItem
                              value="ready_for_dispatch"
                              disabled={order.manufacturing_case_status === 'open'}
                            >
                              Ready for Dispatch
                              {order.manufacturing_case_status === 'open' && ' (Manufacturing Open)'}
                            </MenuItem>
                            <MenuItem
                              value="dispatched"
                              disabled={order.manufacturing_case_status === 'open'}
                            >
                              Dispatched
                              {order.manufacturing_case_status === 'open' && ' (Manufacturing Open)'}
                            </MenuItem>
                            <MenuItem
                              value="delivered"
                              disabled={order.manufacturing_case_status === 'open'}
                            >
                              Delivered
                              {order.manufacturing_case_status === 'open' && ' (Manufacturing Open)'}
                            </MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.production_priority}
                        color={getPriorityColor(order.production_priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {order.expected_delivery_date ?
                        new Date(order.expected_delivery_date).toLocaleDateString('en-IN') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" title="View Details" onClick={() => handleViewOrder(order)}>
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" title="Preview Sales Order" onClick={() => handlePreviewOrder(order)}>
                        <PreviewIcon />
                      </IconButton>
                      <IconButton size="small" title="Download PDF" onClick={() => handleDownloadPDF(order.id)}>
                        <DownloadIcon />
                      </IconButton>
                      {order.status === 'draft' && (
                        <IconButton
                          size="small"
                          title="Edit Order"
                          onClick={() => handleEditOrder(order)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {order.status === 'draft' && (
                        <IconButton
                          size="small"
                          title="Submit for Approval"
                          onClick={() => handleSubmitForApproval(order.id)}
                        >
                          <SubmitIcon />
                        </IconButton>
                      )}
                      {(order.status === 'pending_approval' || order.status === 'pending') && (
                        <IconButton
                          size="small"
                          title="Approve Order"
                          onClick={() => handleConfirmOrder(order.id)}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      {(order.status === 'pending_approval' || order.status === 'pending') && (
                        <IconButton
                          size="small"
                          title="Reject for Rework"
                          onClick={() => handleRejectForRework(order.id)}
                          sx={{ color: '#ed6c02' }}
                        >
                          <RejectIcon />
                        </IconButton>
                      )}
                      {order.status === 'confirmed' && (
                        <IconButton
                          size="small"
                          title="Start Production"
                          onClick={() => handleStatusUpdate(order.id, 'in_production')}
                        >
                          <ProductionIcon />
                        </IconButton>
                      )}
                      {order.status === 'in_production' && (
                        <IconButton
                          size="small"
                          title="Ready for Dispatch"
                          onClick={() => handleStatusUpdate(order.id, 'ready_for_dispatch')}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      {order.status === 'ready_for_dispatch' && (
                        <IconButton
                          size="small"
                          title="Mark as Dispatched"
                          onClick={() => handleStatusUpdate(order.id, 'dispatched')}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      {order.status === 'dispatched' && (
                        <IconButton
                          size="small"
                          title="Mark as Delivered"
                          onClick={() => handleStatusUpdate(order.id, 'delivered')}
                        >
                          <ConfirmIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        title="Delete Sales Order Stage"
                        onClick={() => handleDelete(order)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          padding: '28px 36px',
          borderBottom: 'none'
        }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              📦
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingOrder ? 'Edit Sales Order' : 'New Sales Order'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {editingOrder ? 'Update sales order details' : 'Convert approved quotations to sales orders'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
          {error && (
            <Box sx={{ p: 4, pb: 0 }}>
              <Alert
                severity="error"
                sx={{
                  borderRadius: '16px',
                  border: '1px solid #ffcdd2',
                  backgroundColor: '#fff8f8'
                }}
              >
                {error}
              </Alert>
            </Box>
          )}
          <Box sx={{ p: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 4,
                color: '#2c3e50',
                fontWeight: 600,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              📋 Sales Order Information
            </Typography>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e8eaed'
              }}
            >
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {editingOrder ? 'Quotation (Read-only)' : 'Select Quotation *'}
                    </Typography>
                    {editingOrder ? (
                      // Read-only display for editing existing orders
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          border: '2px solid #e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box>
                          <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                            {(() => {
                              const selectedQuotation = quotations.find(q => q.id === formData.quotation_id);
                              return selectedQuotation
                                ? `${selectedQuotation.quotation_id} - ${selectedQuotation.client_name}`
                                : `Quotation ID: ${formData.quotation_id}`;
                            })()}
                          </Typography>
                        </Box>
                        <Chip
                          label="Locked"
                          size="small"
                          sx={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                    ) : (
                      // Dropdown for creating new orders
                      <FormControl fullWidth variant="outlined">
                        <Select
                          value={formData.quotation_id}
                          onChange={(e) => setFormData({ ...formData, quotation_id: e.target.value })}
                          displayEmpty
                          sx={{
                            borderRadius: '16px',
                            backgroundColor: '#f8f9fa',
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#e0e7ff',
                                borderWidth: '2px'
                              },
                              '&:hover fieldset': {
                                borderColor: '#1976d2',
                                borderWidth: '2px'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#1976d2',
                                borderWidth: '2px'
                              }
                            }
                          }}
                        >
                          <MenuItem value="" disabled>
                            <em style={{ color: '#999', fontSize: '15px' }}>Select an approved quotation</em>
                          </MenuItem>
                          {quotations.map((quotation) => (
                            <MenuItem key={quotation.id} value={quotation.id}>
                              <Box>
                                <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                  {quotation.quotation_id} - {quotation.client_name}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Customer PO Number
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.customer_po_number}
                      onChange={(e) => setFormData({ ...formData, customer_po_number: e.target.value })}
                      placeholder="Enter customer PO number"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Customer PO Date
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.customer_po_date}
                      onChange={(e) => setFormData({ ...formData, customer_po_date: e.target.value })}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Expected Delivery Date
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Advance Amount (₹)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={formData.advance_amount}
                      onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                      placeholder="Enter advance amount"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1, color: '#666', fontWeight: 600 }}>
                            ₹
                          </Box>
                        )
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Production Priority
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.production_priority}
                        onChange={(e) => setFormData({ ...formData, production_priority: e.target.value })}
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#e0e7ff',
                              borderWidth: '2px'
                            },
                            '&:hover fieldset': {
                              borderColor: '#1976d2',
                              borderWidth: '2px'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#1976d2',
                              borderWidth: '2px'
                            }
                          }
                        }}
                      >
                        <MenuItem value="low">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#4caf50" />
                            <Typography fontWeight={500}>Low</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="medium">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#ff9800" />
                            <Typography fontWeight={500}>Medium</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="high">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#f44336" />
                            <Typography fontWeight={500}>High</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="urgent">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#e91e63" />
                            <Typography fontWeight={500}>Urgent</Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Special Instructions
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={formData.special_instructions}
                      onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                      placeholder="Any special instructions for production, delivery, installation, or client requirements..."
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed',
          gap: 3
        }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.8,
              borderColor: '#e0e7ff',
              color: '#666',
              fontSize: '1rem',
              borderWidth: '2px',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderWidth: '2px'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 700,
              px: 5,
              py: 1.8,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            📦 {editingOrder ? 'Update Sales Order' : 'Create Sales Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Sales Order Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          padding: '28px 36px',
          borderBottom: 'none'
        }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              📋
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sales Order Details
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedOrder?.sales_order_id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
          {selectedOrder && (
            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    p: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                      📋 Order Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography><strong>Order ID:</strong> {selectedOrder.sales_order_id}</Typography>
                      <Typography><strong>Client:</strong> {selectedOrder.client_name}</Typography>
                      <Typography><strong>Project:</strong> {selectedOrder.project_name || 'N/A'}</Typography>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography><strong>Status:</strong></Typography>
                        <Chip
                          label={selectedOrder.status}
                          color={getStatusColor(selectedOrder.status)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography><strong>Priority:</strong></Typography>
                        <Chip
                          label={selectedOrder.production_priority}
                          color={getPriorityColor(selectedOrder.production_priority)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    p: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                      📅 Dates & Financials
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography><strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</Typography>
                      <Typography><strong>Expected Delivery:</strong> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                      <Typography><strong>Total Amount:</strong> ₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</Typography>
                      <Typography><strong>Advance Amount:</strong> ₹{selectedOrder.advance_amount?.toLocaleString('en-IN') || '0'}</Typography>
                      <Typography><strong>Created By:</strong> {selectedOrder.created_by_name}</Typography>
                      {selectedOrder.approved_by_name && (
                        <Typography><strong>Approved By:</strong> {selectedOrder.approved_by_name}</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
                {selectedOrder.customer_po_number && (
                  <Grid item xs={12}>
                    <Box sx={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      p: 3,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        📄 Purchase Order Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>PO Number:</strong> {selectedOrder.customer_po_number}</Typography>
                        <Typography><strong>PO Date:</strong> {selectedOrder.customer_po_date ? new Date(selectedOrder.customer_po_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                {selectedOrder.special_instructions && (
                  <Grid item xs={12}>
                    <Box sx={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      p: 3,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        📝 Special Instructions
                      </Typography>
                      <Typography>{selectedOrder.special_instructions}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed'
        }}>
          <Button
            onClick={() => setViewDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.8,
              borderColor: '#e0e7ff',
              color: '#666',
              fontSize: '1rem',
              borderWidth: '2px',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderWidth: '2px'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Sales Order Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          padding: '28px 36px',
          borderBottom: 'none'
        }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              📄
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sales Order Preview
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedOrder?.sales_order_id} - Complete order as sent to customer
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa', maxHeight: '70vh', overflow: 'auto' }}>
          {selectedOrder && (
            <Box sx={{ p: 0 }}>
              {/* Sales Order Header */}
              <Box sx={{
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: '2px solid #1976d2'
              }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                    VTRIA ENGINEERING SOLUTIONS PVT LTD
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#333' }}>
                    SALES ORDER
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#666', mt: 1 }}>
                    Order No: {selectedOrder.sales_order_id}
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        📋 Order Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</Typography>
                        <Typography><strong>Expected Delivery:</strong> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                        <Typography><strong>Priority:</strong> {selectedOrder.production_priority?.toUpperCase()}</Typography>
                        <Typography><strong>Status:</strong> {selectedOrder.status?.toUpperCase()}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                        🏢 Customer Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Client:</strong> {selectedOrder.client_name}</Typography>
                        <Typography><strong>Project:</strong> {selectedOrder.project_name || 'N/A'}</Typography>
                        <Typography><strong>City:</strong> {selectedOrder.city}, {selectedOrder.state}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {selectedOrder.customer_po_number && (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{
                      backgroundColor: '#fff3cd',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #ffeaa7'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#856404', fontWeight: 600 }}>
                        📄 Purchase Order Reference
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>PO Number:</strong> {selectedOrder.customer_po_number}</Typography>
                        <Typography><strong>PO Date:</strong> {selectedOrder.customer_po_date ? new Date(selectedOrder.customer_po_date).toLocaleDateString('en-IN') : 'N/A'}</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Order Items Section */}
              <Box sx={{
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 600 }}>
                  📦 Order Items
                </Typography>
                <Box sx={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <Box sx={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    p: 2,
                    display: 'flex',
                    fontWeight: 600
                  }}>
                    <Box sx={{ flex: 1 }}>Item Description</Box>
                    <Box sx={{ width: '80px', textAlign: 'center' }}>Qty</Box>
                    <Box sx={{ width: '100px', textAlign: 'right' }}>Rate</Box>
                    <Box sx={{ width: '120px', textAlign: 'right' }}>Amount</Box>
                  </Box>
                  {quotationItems.length > 0 ? (
                    quotationItems.map((item, index) => (
                      <Box key={index} sx={{
                        display: 'flex',
                        p: 2,
                        borderBottom: index < quotationItems.length - 1 ? '1px solid #e9ecef' : 'none',
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                      }}>
                        <Box sx={{ flex: 1 }}>{item.section_name || item.description || item.item_name || 'N/A'}</Box>
                        <Box sx={{ width: '80px', textAlign: 'center' }}>{item.quantity || 0}</Box>
                        <Box sx={{ width: '100px', textAlign: 'right' }}>₹{(item.rate || 0).toLocaleString('en-IN')}</Box>
                        <Box sx={{ width: '120px', textAlign: 'right' }}>₹{(item.amount || 0).toLocaleString('en-IN')}</Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, backgroundColor: '#f8f9fa', fontStyle: 'italic', color: '#666' }}>
                      <em>No items found for this quotation. Items may not be loaded yet.</em>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Financial Summary */}
              <Box sx={{
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 600 }}>
                  💰 Financial Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        📊 Order Totals
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Base Amount:</strong> ₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</Typography>
                        <Typography><strong>GST Amount:</strong> ₹{selectedOrder.tax_amount?.toLocaleString('en-IN')}</Typography>
                        <Typography sx={{ borderTop: '1px solid #ddd', pt: 1, fontWeight: 600 }}>
                          <strong>Grand Total:</strong> ₹{selectedOrder.grand_total?.toLocaleString('en-IN')}
                        </Typography>
                        <Typography><strong>Advance Paid:</strong> ₹{selectedOrder.advance_amount?.toLocaleString('en-IN')}</Typography>
                        <Typography sx={{ color: 'red', fontWeight: 600 }}>
                          <strong>Balance Due:</strong> ₹{(selectedOrder.grand_total - selectedOrder.advance_amount)?.toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        🏛️ GST Breakdown
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {quotationItems.length > 0 ? (
                          <>
                            {quotationItems.some(item => item.igst_percentage > 0) ? (
                              <Typography><strong>IGST (18%):</strong> ₹{quotationItems.reduce((sum, item) => sum + (item.amount * (item.igst_percentage || 0) / 100), 0).toLocaleString('en-IN')}</Typography>
                            ) : (
                              <>
                                <Typography><strong>CGST (9%):</strong> ₹{quotationItems.reduce((sum, item) => sum + (item.amount * (item.cgst_percentage || 0) / 100), 0).toLocaleString('en-IN')}</Typography>
                                <Typography><strong>SGST (9%):</strong> ₹{quotationItems.reduce((sum, item) => sum + (item.amount * (item.sgst_percentage || 0) / 100), 0).toLocaleString('en-IN')}</Typography>
                              </>
                            )}
                            <Typography sx={{ borderTop: '1px solid #ddd', pt: 1, fontWeight: 600 }}>
                              <strong>Total GST:</strong> ₹{selectedOrder.tax_amount?.toLocaleString('en-IN')}
                            </Typography>
                          </>
                        ) : (
                          <Typography color="textSecondary">GST details will be shown when items are loaded</Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Addresses */}
              <Box sx={{
                backgroundColor: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 600 }}>
                  📍 Addresses
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#28a745' }}>
                        📤 Billing Address
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-line' }}>
                        {selectedOrder.billing_address}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      p: 3,
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#dc3545' }}>
                        📦 Shipping Address
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-line' }}>
                        {selectedOrder.shipping_address}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Special Instructions */}
              {selectedOrder.special_instructions && (
                <Box sx={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  p: 4,
                  m: 3,
                  mt: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                    📝 Special Instructions
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-line', backgroundColor: '#f8f9fa', p: 2, borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    {selectedOrder.special_instructions}
                  </Typography>
                </Box>
              )}

              {/* Footer */}
              <Box sx={{
                backgroundColor: '#1976d2',
                color: 'white',
                borderRadius: '16px',
                p: 4,
                m: 3,
                mt: 0,
                textAlign: 'center'
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Thank you for your business!
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  For any queries, please contact us at info@vtrai.com | +91-XXXXXXXXXX
                </Typography>
                <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.7 }}>
                  This is a computer generated sales order. Generated on {new Date().toLocaleDateString('en-IN')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed'
        }}>
          <Button
            onClick={() => setPreviewDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.8,
              borderColor: '#e0e7ff',
              color: '#666',
              fontSize: '1rem',
              borderWidth: '2px',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderWidth: '2px'
              }
            }}
          >
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesOrders;
