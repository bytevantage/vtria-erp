import React, { useState, useEffect } from 'react';
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
  Visibility as ViewIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

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
  
  // Invoice Creation Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    invoice_type: 'sales',
    customer_id: '',
    reference_type: 'manual',
    reference_id: null,
    reference_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'Net 30',
    discount_percentage: 0,
    discount_amount: 0,
    notes: '',
    terms_conditions: 'Payment due within 30 days of invoice date.'
  });
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

      const response = await fetch(`/api/financial/invoices?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setInvoices(result.data);
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
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

      const response = await fetch('/api/financial/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        fetchInvoices();
        // Reset form
        setNewInvoice({
          invoice_type: 'sales',
          customer_id: '',
          reference_type: 'manual',
          reference_id: null,
          reference_number: '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: '',
          payment_terms: 'Net 30',
          discount_percentage: 0,
          discount_amount: 0,
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
        const error = await response.json();
        console.error('Error creating invoice:', error);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
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
              onClick={() => setCreateDialogOpen(true)}
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
                  onChange={(e) => setFilters({...filters, invoice_type: e.target.value})}
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
                  onChange={(e) => setFilters({...filters, payment_status: e.target.value})}
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
                onChange={(e) => setFilters({...filters, from_date: e.target.value})}
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
                onChange={(e) => setFilters({...filters, to_date: e.target.value})}
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
                onChange={(e) => setFilters({...filters, search: e.target.value})}
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
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Invoice">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print Invoice">
                            <IconButton size="small">
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Email Invoice">
                            <IconButton size="small">
                              <EmailIcon />
                            </IconButton>
                          </Tooltip>
                          {invoice.balance_amount > 0 && (
                            <Tooltip title="Record Payment">
                              <IconButton size="small" color="primary">
                                <PaymentIcon />
                              </IconButton>
                            </Tooltip>
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
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Invoice Header */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Invoice Type</InputLabel>
                <Select
                  value={newInvoice.invoice_type}
                  label="Invoice Type"
                  onChange={(e) => setNewInvoice({...newInvoice, invoice_type: e.target.value})}
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
                label="Customer ID"
                value={newInvoice.customer_id}
                onChange={(e) => setNewInvoice({...newInvoice, customer_id: e.target.value})}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Invoice Date"
                type="date"
                value={newInvoice.invoice_date}
                onChange={(e) => setNewInvoice({...newInvoice, invoice_date: e.target.value})}
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
                onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                InputLabelProps={{ shrink: true }}
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
                onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
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
    </Box>
  );
};

export default InvoiceManagement;