import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import PaymentRecordingDialog from './PaymentRecordingDialog';
import EnterpriseButton from './common/EnterpriseButton';

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  customer_id: number;
  customer_name: string;
  customer_gstin?: string;
  subtotal: number;
  discount_amount: number;
  total_tax_amount: number;
  total_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  balance_amount: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  days_overdue?: number;
  sales_order_id?: number;
  sales_order_number?: string;
}

interface SalesOrder {
  id: number;
  sales_order_id: string;
  case_number: string;
  client_name: string;
  project_name?: string;
  total_amount: number;
  status: string;
  expected_delivery_date?: string;
  created_at: string;
}

interface InvoiceItem {
  id?: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  description?: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  item_discount_percentage?: number;
  item_discount_amount?: number;
  gst_rate: number;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
}

interface NewInvoice {
  invoice_type: string;
  customer_id: string;
  customer_name: string;
  reference_type: string;
  reference_id: number | null;
  reference_number: string;
  sales_order_id: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  discount_percentage: number;
  discount_amount: number;
  advance_amount: number;
  notes: string;
  terms_conditions: string;
}

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    customer_id: '',
    invoice_type: '',
    payment_status: '',
    status: '',
    from_date: '',
    to_date: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [approvedSalesOrders, setApprovedSalesOrders] = useState<SalesOrder[]>([]);
  const [loadingSalesOrders, setLoadingSalesOrders] = useState(false);
  const [salesOrdersError, setSalesOrdersError] = useState<string | null>(null);

  // Invoice Creation Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState<NewInvoice>({
    invoice_type: 'sales',
    customer_id: '',
    customer_name: '',
    reference_type: 'sales_order',
    reference_id: null,
    reference_number: '',
    sales_order_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'Net 30',
    discount_percentage: 0,
    discount_amount: 0,
    advance_amount: 0,
    notes: '',
    terms_conditions: 'Payment due within 30 days of invoice date.'
  });
  const [error, setError] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      product_name: '',
      quantity: 1,
      unit: 'Nos',
      unit_price: 0,
      gst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
      hsn_code: ''
    }
  ]);

  useEffect(() => {
    fetchInvoices();
    fetchApprovedSalesOrders();
  }, [filters, pagination.page]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const { data, error } = await api.get(`/api/financial/invoices?${queryParams}`);
      
      if (error) {
        throw new Error(error);
      }
      
      setInvoices(data.data || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedSalesOrders = async () => {
    setLoadingSalesOrders(true);
    setSalesOrdersError(null);
    try {
      // Fetch only confirmed and delivered sales orders that are eligible for invoicing
      const { data, error } = await api.get('/api/sales-orders/approved');
      
      if (error) {
        setSalesOrdersError('Failed to fetch approved sales orders');
        setApprovedSalesOrders([]);
      } else {
        setApprovedSalesOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching approved sales orders:', error);
      setSalesOrdersError('Error connecting to server');
      setApprovedSalesOrders([]);
    } finally {
      setLoadingSalesOrders(false);
    }
  };

  const handleSalesOrderChange = async (salesOrderId: string) => {
    const selectedOrder = approvedSalesOrders.find(order => order.id.toString() === salesOrderId);
    if (selectedOrder) {
      setNewInvoice({
        ...newInvoice,
        sales_order_id: salesOrderId,
        reference_id: selectedOrder.id,
        reference_number: selectedOrder.sales_order_id,
        customer_id: selectedOrder.client_id,
        customer_name: selectedOrder.client_name,
        // Set due date to 30 days from now if not already set
        due_date: newInvoice.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      // Fetch sales order details including items
      try {
        const { data, error } = await api.get(`/api/sales-orders/${selectedOrder.id}`);
        
        if (!error && data.success && data.data) {
          const salesOrderData = data.data;

          // Update invoice with advance payment information
          setNewInvoice(prev => ({
            ...prev,
            advance_amount: parseFloat(salesOrderData.advance_amount) || 0,
            payment_terms: salesOrderData.payment_terms || prev.payment_terms
          }));

          // Convert sales order items to invoice items format
          if (salesOrderData.items && salesOrderData.items.length > 0) {
            const invoiceItemsFromSO = salesOrderData.items.map((item: any) => {
              const quantity = parseFloat(item.quantity) || 1;
              const unitPrice = parseFloat(item.unit_price || item.rate) || 0;
              const gstRate = parseFloat(item.gst_rate) || 18;
              const cgstRate = gstRate / 2;
              const sgstRate = gstRate / 2;
              const itemTotal = quantity * unitPrice;
              const cgstAmount = (itemTotal * cgstRate) / 100;
              const sgstAmount = (itemTotal * sgstRate) / 100;
              
              return {
                product_name: item.item_name || item.product_name || item.description || '',
                description: item.description || item.item_name || '',
                quantity: quantity,
                unit: item.unit || 'Nos',
                unit_price: unitPrice,
                gst_rate: gstRate,
                cgst_rate: cgstRate,
                cgst_amount: cgstAmount,
                sgst_rate: sgstRate,
                sgst_amount: sgstAmount,
                hsn_code: item.hsn_code || '',
                item_discount_amount: parseFloat(item.discount_amount) || 0
              };
            });

            setInvoiceItems(invoiceItemsFromSO);
          }
        }
      } catch (error) {
        console.error('Error fetching sales order details:', error);
        // Keep the default empty item if fetch fails
      }
    }
  };

  const handleCreateInvoice = async () => {
    try {
      // Validate that a sales order is selected
      if (!newInvoice.sales_order_id) {
        setError('Please select an approved sales order');
        return;
      }
      // Calculate GST amounts for items
      const processedItems = invoiceItems.map(item => {
        const itemTotal = item.quantity * item.unit_price;
        const itemDiscount = item.item_discount_amount || 0;
        const discountedAmount = itemTotal - itemDiscount;

        const cgstAmount = (discountedAmount * (item.cgst_rate || 0)) / 100;
        const sgstAmount = (discountedAmount * (item.sgst_rate || 0)) / 100;
        const igstAmount = (discountedAmount * (item.igst_rate || 0)) / 100;

        return {
          ...item,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount
        };
      });

      const invoiceData = {
        ...newInvoice,
        items: processedItems
      };

      const { data, error } = await api.post('/api/financial/invoices', invoiceData);

      if (!error) {
        setCreateDialogOpen(false);
        setError(null);
        fetchInvoices();
        // Reset form
        setNewInvoice({
          invoice_type: 'sales',
          customer_id: '',
          customer_name: '',
          reference_type: 'manual',
          reference_id: null,
          reference_number: '',
          sales_order_id: '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: '',
          payment_terms: 'Net 30',
          discount_percentage: 0,
          discount_amount: 0,
          advance_amount: 0,
          notes: '',
          terms_conditions: 'Payment due within 30 days of invoice date.'
        });
        setInvoiceItems([{
          product_name: '',
          quantity: 1,
          unit: 'Nos',
          unit_price: 0,
          gst_rate: 18,
          cgst_rate: 9,
          sgst_rate: 9,
          hsn_code: ''
        }]);
      } else {
        console.error('Error creating invoice:', error);
        setError(error);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await api.delete(`/api/financial/invoices/${invoiceId}`);
      
      if (!error) {
        fetchInvoices(); // Refresh the invoice list
        fetchApprovedSalesOrders(); // Refresh sales orders as the deleted invoice may make a sales order available again
      } else {
        console.error('Error deleting invoice:', error);
        setError('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError('Failed to delete invoice');
    }
  };

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  
  // Payment Recording Dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  
  // Current user context (this would normally come from auth context)
  const currentUser = { role: 'user', id: 1 };

  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const { data, error } = await api.get(`/api/financial/invoices/${invoiceId}`);
      if (!error && data.success) {
        setSelectedInvoice(data.data);
        setViewDialogOpen(true);
      } else {
        console.error('Error fetching invoice:', error);
        setError('Failed to fetch invoice details');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Failed to fetch invoice details');
    }
  };


  const handlePrintInvoice = (invoiceId: number) => {
    // Generate print-friendly version using the current page
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      // Create a new window with print-optimized content
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice ${invoice.invoice_number}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-details { margin-bottom: 20px; }
                .invoice-details div { margin: 5px 0; }
                @media print { 
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>INVOICE</h1>
                <h2>${invoice.invoice_number}</h2>
              </div>
              <div class="invoice-details">
                <div><strong>Customer:</strong> ${invoice.customer_name}</div>
                <div><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</div>
                <div><strong>Total Amount:</strong> ₹${parseFloat(invoice.total_amount).toLocaleString()}</div>
                <div><strong>Payment Status:</strong> ${invoice.payment_status}</div>
                <div><strong>Status:</strong> ${invoice.status}</div>
              </div>
              <div class="no-print">
                <button onclick="window.print()">Print</button>
                <button onclick="window.close()">Close</button>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleEmailInvoice = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice && invoice.customer_email) {
      const subject = `Invoice ${invoice.invoice_number}`;
      const body = `Please find attached invoice ${invoice.invoice_number} for ₹${parseFloat(invoice.total_amount).toLocaleString()}.`;
      window.location.href = `mailto:${invoice.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      alert('Customer email not available');
    }
  };

  const handleRecordPayment = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoiceForPayment(invoice);
      setPaymentDialogOpen(true);
    }
  };

  const handlePaymentRecorded = (paymentData: any) => {
    // Refresh the invoices list to reflect updated balance
    fetchInvoices();
    
    // Show success message
    setError(null);
    // Note: Success message is handled by the PaymentRecordingDialog component
  };

  const handleEditInvoice = async (invoiceId: number) => {
    try {
      const { data, error } = await api.get(`/api/financial/invoices/${invoiceId}`);
      if (!error && data.success) {
        setEditInvoice(data.data);
        setEditDialogOpen(true);
      } else {
        setError(error || 'Failed to fetch invoice details');
      }
    } catch (err) {
      console.error('Error fetching invoice for edit:', err);
      setError('Failed to fetch invoice details');
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editInvoice) return;

    try {
      setError(null);
      const { data, error } = await api.put(`/api/financial/invoices/${editInvoice.id}`, {
        invoice_number: editInvoice.invoice_number,
        invoice_type: editInvoice.invoice_type,
        invoice_date: editInvoice.invoice_date,
        due_date: editInvoice.due_date,
        payment_terms: editInvoice.payment_terms,
        reference_number: editInvoice.reference_number,
        status: editInvoice.status,
        notes: editInvoice.notes
      });

      if (!error && data.success) {
        setEditDialogOpen(false);
        setEditInvoice(null);
        fetchInvoices(); // Refresh the list
        alert('Invoice updated successfully!');
      } else {
        setError(error || 'Failed to update invoice');
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError('Failed to update invoice');
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'info';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'primary';
      case 'viewed':
        return 'info';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, {
      product_name: '',
      quantity: 1,
      unit: 'Nos',
      unit_price: 0,
      gst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
      hsn_code: ''
    }]);
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setInvoiceItems(updatedItems);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const calculateInvoiceTotal = () => {
    const subtotal = invoiceItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price) - (item.item_discount_amount || 0);
    }, 0);

    const totalTax = invoiceItems.reduce((sum, item) => {
      const itemTotal = (item.quantity * item.unit_price) - (item.item_discount_amount || 0);
      return sum + (itemTotal * (item.gst_rate || 0) / 100);
    }, 0);

    const discountAmount = newInvoice.discount_amount || (subtotal * (newInvoice.discount_percentage || 0) / 100);

    return {
      subtotal: subtotal - discountAmount,
      totalTax,
      total: subtotal - discountAmount + totalTax
    };
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              Invoice Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                if (approvedSalesOrders.length === 0) {
                  // Fetch orders to ensure we have the latest data
                  fetchApprovedSalesOrders();
                }
                setCreateDialogOpen(true)
              }}
              disabled={loadingSalesOrders}
            >
              Create Invoice
            </Button>
          </Box>

          {/* Filters */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Invoice Type</InputLabel>
                <Select
                  value={filters.invoice_type}
                  label="Invoice Type"
                  onChange={(e) => setFilters({ ...filters, invoice_type: e.target.value })}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="sales">Sales Invoice</MenuItem>
                  <MenuItem value="proforma">Proforma Invoice</MenuItem>
                  <MenuItem value="credit_note">Credit Note</MenuItem>
                  <MenuItem value="debit_note">Debit Note</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={filters.payment_status}
                  label="Payment Status"
                  onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="partial">Partially Paid</MenuItem>
                  <MenuItem value="paid">Fully Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="From Date"
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="To Date"
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={8} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Invoice number, customer name..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={fetchInvoices}
              >
                Filter
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">Loading...</TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">No invoices found</TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{invoice.customer_name}</Typography>
                          {invoice.customer_gstin && (
                            <Typography variant="caption" color="text.secondary">
                              GSTIN: {invoice.customer_gstin}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.invoice_type.replace('_', ' ').toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        ₹{invoice.total_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right">
                        ₹{invoice.paid_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          ₹{invoice.balance_amount.toLocaleString('en-IN')}
                          {invoice.days_overdue && invoice.days_overdue > 0 && (
                            <Chip
                              label={`${invoice.days_overdue}d overdue`}
                              color="error"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.payment_status.replace('_', ' ').toUpperCase()}
                          color={getPaymentStatusColor(invoice.payment_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status.toUpperCase()}
                          color={getStatusColor(invoice.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Invoice">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewInvoice(invoice.id)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Invoice">
                            <IconButton 
                              size="small"
                              onClick={() => handleEditInvoice(invoice.id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print Invoice">
                            <IconButton 
                              size="small"
                              onClick={() => handlePrintInvoice(invoice.id)}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Email Invoice">
                            <IconButton 
                              size="small"
                              onClick={() => handleEmailInvoice(invoice.id)}
                            >
                              <EmailIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Invoice">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                          {invoice.balance_amount > 0 && (
                            <EnterpriseButton
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={() => handleRecordPayment(invoice.id)}
                              startIcon={<PaymentIcon />}
                              requirePermission={true}
                              userRole={currentUser.role}
                              allowedRoles={['admin', 'manager', 'accountant', 'user']}
                              enableAuditLog={true}
                              auditAction="initiate_payment_recording"
                              enableThrottling={true}
                              throttleDelay={1000}
                              sx={{ mr: 1, minWidth: 'auto', px: 1 }}
                            >
                              Pay
                            </EnterpriseButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {approvedSalesOrders.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="flex-start">
              <Typography variant="h6">Create New Invoice</Typography>
              <Typography variant="subtitle2" color="error">
                No approved sales orders available. Please approve a sales order first.
              </Typography>
            </Box>
          ) : (
            'Create New Invoice'
          )}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Invoice Header */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Invoice Type</InputLabel>
                <Select
                  value={newInvoice.invoice_type}
                  label="Invoice Type"
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoice_type: e.target.value })}
                >
                  <MenuItem value="sales">Sales Invoice</MenuItem>
                  <MenuItem value="proforma">Proforma Invoice</MenuItem>
                  <MenuItem value="credit_note">Credit Note</MenuItem>
                  <MenuItem value="debit_note">Debit Note</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sales Order *</InputLabel>
                <Select
                  value={newInvoice.sales_order_id}
                  label="Sales Order *"
                  onChange={(e) => handleSalesOrderChange(e.target.value as string)}
                  required
                  error={!newInvoice.sales_order_id}
                >
                  <MenuItem value="" disabled>
                    <em>Select an approved sales order</em>
                  </MenuItem>
                  {loadingSalesOrders ? (
                    <MenuItem disabled>
                      <em>Loading sales orders...</em>
                    </MenuItem>
                  ) : approvedSalesOrders.length === 0 ? (
                    <MenuItem disabled>
                      <em>No approved sales orders available</em>
                    </MenuItem>
                  ) : (
                    approvedSalesOrders.map((order) => (
                      <MenuItem key={order.id} value={order.id.toString()}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Typography variant="body2">
                            {order.sales_order_id} - {order.client_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total: ₹{parseFloat(order.total_amount).toLocaleString()} | 
                            Advance: ₹{parseFloat(order.advance_amount || 0).toLocaleString()} | 
                            Balance: ₹{parseFloat(order.balance_amount).toLocaleString()}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
                {salesOrdersError && (
                  <Typography color="error" variant="caption">
                    {salesOrdersError}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer"
                value={newInvoice.customer_name}
                disabled
                InputLabelProps={{ shrink: Boolean(newInvoice.customer_name) }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Invoice Date"
                type="date"
                value={newInvoice.invoice_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoice_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Advance Payment"
                type="number"
                value={newInvoice.advance_amount}
                disabled
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <span style={{ marginRight: '8px' }}>₹</span>,
                }}
                helperText="Advance payment from sales order"
              />
            </Grid>

            {/* Invoice Items */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Invoice Items</Typography>
              {invoiceItems.map((item, index) => (
                <Card key={index} sx={{ mb: 2, p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Product Name"
                        value={item.product_name}
                        onChange={(e) => updateInvoiceItem(index, 'product_name', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={6} md={1}>
                      <TextField
                        fullWidth
                        label="Qty"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', Number(e.target.value))}
                        required
                      />
                    </Grid>
                    <Grid item xs={6} md={1}>
                      <TextField
                        fullWidth
                        label="Unit"
                        value={item.unit}
                        onChange={(e) => updateInvoiceItem(index, 'unit', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        label="Unit Price"
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, 'unit_price', Number(e.target.value))}
                        required
                      />
                    </Grid>
                    <Grid item xs={6} md={1}>
                      <TextField
                        fullWidth
                        label="GST %"
                        type="number"
                        value={item.gst_rate}
                        onChange={(e) => {
                          const gstRate = Number(e.target.value);
                          updateInvoiceItem(index, 'gst_rate', gstRate);
                          updateInvoiceItem(index, 'cgst_rate', gstRate / 2);
                          updateInvoiceItem(index, 'sgst_rate', gstRate / 2);
                        }}
                      />
                    </Grid>
                    <Grid item xs={8} md={2}>
                      <TextField
                        fullWidth
                        label="HSN Code"
                        value={item.hsn_code}
                        onChange={(e) => updateInvoiceItem(index, 'hsn_code', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={4} md={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Total: ₹{((item.quantity * item.unit_price) * (1 + (item.gst_rate || 0) / 100)).toFixed(2)}
                        </Typography>
                        {invoiceItems.length > 1 && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeInvoiceItem(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              ))}

              <Button
                variant="outlined"
                onClick={addInvoiceItem}
                startIcon={<AddIcon />}
              >
                Add Item
              </Button>
            </Grid>

            {/* Invoice Summary */}
            <Grid item xs={12}>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>Invoice Summary</Typography>
                <Grid container>
                  <Grid item xs={6}>
                    <Typography>Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography>₹{calculateInvoiceTotal().subtotal.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>Tax:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography>₹{calculateInvoiceTotal().totalTax.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">₹{calculateInvoiceTotal().total.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* Additional Fields */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateInvoice} variant="contained">
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Invoice Details - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2"><strong>Customer:</strong> {selectedInvoice.customer_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2"><strong>Invoice Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2"><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2"><strong>Payment Terms:</strong> {selectedInvoice.payment_terms}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2"><strong>Reference:</strong> {selectedInvoice.reference_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2"><strong>Status:</strong> 
                  <Chip size="small" label={selectedInvoice.status} sx={{ ml: 1 }} />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Invoice Items</Typography>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((item: any, index: number) => (
                    <Card key={index} sx={{ mb: 1, p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2"><strong>{item.product_name}</strong></Typography>
                          <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="body2">Qty: {item.quantity}</Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="body2">Price: ₹{parseFloat(item.unit_price).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Typography variant="body2"><strong>Total: ₹{parseFloat(item.total_price).toLocaleString()}</strong></Typography>
                        </Grid>
                      </Grid>
                    </Card>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No items found</Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ border: 1, borderColor: 'divider', p: 2, mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Subtotal: ₹{parseFloat(selectedInvoice.subtotal).toLocaleString()}</Typography>
                      <Typography variant="body2">Tax: ₹{parseFloat(selectedInvoice.total_tax_amount).toLocaleString()}</Typography>
                      <Typography variant="h6"><strong>Total: ₹{parseFloat(selectedInvoice.total_amount).toLocaleString()}</strong></Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Paid: ₹{parseFloat(selectedInvoice.paid_amount).toLocaleString()}</Typography>
                      <Typography variant="body2" color={parseFloat(selectedInvoice.balance_amount) > 0 ? 'error.main' : 'success.main'}>
                        <strong>Balance: ₹{parseFloat(selectedInvoice.balance_amount).toLocaleString()}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => selectedInvoice && handlePrintInvoice(selectedInvoice.id)}>Print</Button>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Edit Invoice - {editInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}
          {editInvoice && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Basic Invoice Information */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={editInvoice.invoice_number}
                  onChange={(e) => setEditInvoice({ ...editInvoice, invoice_number: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Invoice Type</InputLabel>
                  <Select
                    value={editInvoice.invoice_type}
                    label="Invoice Type"
                    onChange={(e) => setEditInvoice({ ...editInvoice, invoice_type: e.target.value })}
                  >
                    <MenuItem value="sales">Sales Invoice</MenuItem>
                    <MenuItem value="proforma">Proforma Invoice</MenuItem>
                    <MenuItem value="credit_note">Credit Note</MenuItem>
                    <MenuItem value="debit_note">Debit Note</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  type="date"
                  value={editInvoice.invoice_date ? editInvoice.invoice_date.split('T')[0] : ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, invoice_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={editInvoice.due_date ? editInvoice.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, due_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Terms"
                  value={editInvoice.payment_terms || ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, payment_terms: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={editInvoice.reference_number || ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, reference_number: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editInvoice.status}
                    label="Status"
                    onChange={(e) => setEditInvoice({ ...editInvoice, status: e.target.value })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={editInvoice.notes || ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, notes: e.target.value })}
                />
              </Grid>

              {/* Financial Summary (Read-only) */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Financial Summary</Typography>
                <Box sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">Subtotal: ₹{parseFloat(editInvoice.subtotal || '0').toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">Tax: ₹{parseFloat(editInvoice.total_tax_amount || '0').toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2"><strong>Total: ₹{parseFloat(editInvoice.total_amount || '0').toLocaleString()}</strong></Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color={parseFloat(editInvoice.balance_amount || '0') > 0 ? 'error.main' : 'success.main'}>
                        <strong>Balance: ₹{parseFloat(editInvoice.balance_amount || '0').toLocaleString()}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateInvoice} variant="contained">
            Update Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Recording Dialog */}
      <PaymentRecordingDialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
        onPaymentRecorded={handlePaymentRecorded}
        currentUser={currentUser}
      />
    </Box>
  );
};

export default InvoiceManagement;