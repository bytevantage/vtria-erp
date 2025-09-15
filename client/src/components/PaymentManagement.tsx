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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  payment_type: 'receipt' | 'payment';
  party_type: 'customer' | 'supplier' | 'employee' | 'other';
  party_id?: number;
  party_name: string;
  amount: number;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'online';
  bank_name?: string;
  cheque_number?: string;
  transaction_reference?: string;
  utr_number?: string;
  reference_type: 'invoice' | 'purchase_order' | 'advance' | 'refund' | 'other';
  reference_number?: string;
  payment_status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  notes?: string;
  created_at: string;
}

interface InvoiceAllocation {
  invoice_id: number;
  invoice_number?: string;
  allocated_amount: number;
  balance_amount?: number;
}

interface OutstandingInvoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_amount: number;
  days_overdue: number;
}

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    payment_type: '',
    party_type: '',
    payment_method: '',
    payment_status: '',
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

  // Payment Recording Dialog
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    payment_type: 'receipt' as 'receipt' | 'payment',
    party_type: 'customer' as 'customer' | 'supplier' | 'employee' | 'other',
    party_id: '',
    party_name: '',
    amount: 0,
    payment_method: 'bank_transfer' as 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'online',
    payment_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    cheque_number: '',
    transaction_reference: '',
    utr_number: '',
    reference_type: 'invoice' as 'invoice' | 'purchase_order' | 'advance' | 'refund' | 'other',
    reference_number: '',
    notes: ''
  });

  // Invoice Allocation for Receipts
  const [invoiceAllocations, setInvoiceAllocations] = useState<InvoiceAllocation[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);

  useEffect(() => {
    fetchPayments();
  }, [filters, pagination.page]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/financial/payments?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPayments(result.data);
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingInvoices = async (customerId?: string) => {
    if (!customerId) return;
    
    try {
      const response = await fetch(`/api/financial/invoices?customer_id=${customerId}&payment_status=unpaid,partial`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setOutstandingInvoices(result.data);
      }
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
    }
  };

  const handleRecordPayment = async () => {
    try {
      const paymentData = {
        ...newPayment,
        party_id: newPayment.party_id || undefined,
        invoice_allocations: invoiceAllocations
      };

      const response = await fetch('/api/financial/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        setRecordDialogOpen(false);
        fetchPayments();
        resetPaymentForm();
      } else {
        const error = await response.json();
        console.error('Error recording payment:', error);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const resetPaymentForm = () => {
    setNewPayment({
      payment_type: 'receipt',
      party_type: 'customer',
      party_id: '',
      party_name: '',
      amount: 0,
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      bank_name: '',
      cheque_number: '',
      transaction_reference: '',
      utr_number: '',
      reference_type: 'invoice',
      reference_number: '',
      notes: ''
    });
    setInvoiceAllocations([]);
    setOutstandingInvoices([]);
  };

  const addInvoiceAllocation = () => {
    setInvoiceAllocations([...invoiceAllocations, {
      invoice_id: 0,
      allocated_amount: 0
    }]);
  };

  const updateInvoiceAllocation = (index: number, field: keyof InvoiceAllocation, value: any) => {
    const updated = [...invoiceAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceAllocations(updated);
  };

  const removeInvoiceAllocation = (index: number) => {
    setInvoiceAllocations(invoiceAllocations.filter((_, i) => i !== index));
  };

  const getTotalAllocated = () => {
    return invoiceAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  };

  const getPaymentTypeColor = (type: string) => {
    return type === 'receipt' ? 'success' : 'info';
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'success';
      case 'pending':
        return 'warning';
      case 'bounced':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cheque':
      case 'bank_transfer':
        return <BankIcon />;
      default:
        return <PaymentIcon />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              Payment Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRecordDialogOpen(true)}
            >
              Record Payment
            </Button>
          </Box>

          {/* Filters */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={filters.payment_type}
                  label="Payment Type"
                  onChange={(e) => setFilters({...filters, payment_type: e.target.value})}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="receipt">Receipt (Money In)</MenuItem>
                  <MenuItem value="payment">Payment (Money Out)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Party Type</InputLabel>
                <Select
                  value={filters.party_type}
                  label="Party Type"
                  onChange={(e) => setFilters({...filters, party_type: e.target.value})}
                >
                  <MenuItem value="">All Parties</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="supplier">Supplier</MenuItem>
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={filters.payment_method}
                  label="Payment Method"
                  onChange={(e) => setFilters({...filters, payment_method: e.target.value})}
                >
                  <MenuItem value="">All Methods</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
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

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Payment number, party name..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">Loading...</TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">No payments found</TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.payment_number}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          icon={payment.payment_type === 'receipt' ? <ReceiptIcon /> : <PaymentIcon />}
                          label={payment.payment_type.toUpperCase()}
                          color={getPaymentTypeColor(payment.payment_type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{payment.party_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.party_type.toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getPaymentMethodIcon(payment.payment_method)}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {payment.payment_method.replace('_', ' ').toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={payment.payment_type === 'receipt' ? 'success.main' : 'info.main'}
                          fontWeight="medium"
                        >
                          {payment.payment_type === 'receipt' ? '+' : '-'}₹{payment.amount.toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {payment.reference_number && (
                          <Typography variant="body2">
                            {payment.reference_type.toUpperCase()}: {payment.reference_number}
                          </Typography>
                        )}
                        {payment.transaction_reference && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Ref: {payment.transaction_reference}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.payment_status.toUpperCase()}
                          color={getPaymentStatusColor(payment.payment_status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Payment Type and Party */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={newPayment.payment_type}
                  label="Payment Type"
                  onChange={(e) => setNewPayment({...newPayment, payment_type: e.target.value as any})}
                >
                  <MenuItem value="receipt">Receipt (Money In)</MenuItem>
                  <MenuItem value="payment">Payment (Money Out)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Party Type</InputLabel>
                <Select
                  value={newPayment.party_type}
                  label="Party Type"
                  onChange={(e) => {
                    const partyType = e.target.value as any;
                    setNewPayment({...newPayment, party_type: partyType});
                    if (partyType === 'customer' && newPayment.payment_type === 'receipt') {
                      fetchOutstandingInvoices(newPayment.party_id);
                    }
                  }}
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="supplier">Supplier</MenuItem>
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Party ID (Optional)"
                value={newPayment.party_id}
                onChange={(e) => {
                  setNewPayment({...newPayment, party_id: e.target.value});
                  if (newPayment.party_type === 'customer' && newPayment.payment_type === 'receipt') {
                    fetchOutstandingInvoices(e.target.value);
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Party Name"
                value={newPayment.party_name}
                onChange={(e) => setNewPayment({...newPayment, party_name: e.target.value})}
                required
              />
            </Grid>

            {/* Payment Details */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({...newPayment, amount: Number(e.target.value)})}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={newPayment.payment_date}
                onChange={(e) => setNewPayment({...newPayment, payment_date: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={newPayment.payment_method}
                  label="Payment Method"
                  onChange={(e) => setNewPayment({...newPayment, payment_method: e.target.value as any})}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="online">Online Payment</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Payment Method Specific Fields */}
            {(newPayment.payment_method === 'cheque' || newPayment.payment_method === 'bank_transfer') && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Bank Name"
                    value={newPayment.bank_name}
                    onChange={(e) => setNewPayment({...newPayment, bank_name: e.target.value})}
                  />
                </Grid>
                {newPayment.payment_method === 'cheque' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cheque Number"
                      value={newPayment.cheque_number}
                      onChange={(e) => setNewPayment({...newPayment, cheque_number: e.target.value})}
                    />
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Transaction Reference"
                value={newPayment.transaction_reference}
                onChange={(e) => setNewPayment({...newPayment, transaction_reference: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="UTR Number"
                value={newPayment.utr_number}
                onChange={(e) => setNewPayment({...newPayment, utr_number: e.target.value})}
              />
            </Grid>

            {/* Invoice Allocations for Customer Receipts */}
            {newPayment.payment_type === 'receipt' && newPayment.party_type === 'customer' && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Invoice Allocation
                </Typography>
                
                {invoiceAllocations.map((allocation, index) => (
                  <Card key={index} sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          options={outstandingInvoices}
                          getOptionLabel={(option) => `${option.invoice_number} - ₹${option.balance_amount.toLocaleString('en-IN')}`}
                          value={outstandingInvoices.find(inv => inv.id === allocation.invoice_id) || null}
                          onChange={(_, newValue) => {
                            updateInvoiceAllocation(index, 'invoice_id', newValue?.id || 0);
                            updateInvoiceAllocation(index, 'allocated_amount', newValue?.balance_amount || 0);
                          }}
                          renderInput={(params) => <TextField {...params} label="Select Invoice" />}
                        />
                      </Grid>
                      <Grid item xs={8} md={4}>
                        <TextField
                          fullWidth
                          label="Allocated Amount"
                          type="number"
                          value={allocation.allocated_amount}
                          onChange={(e) => updateInvoiceAllocation(index, 'allocated_amount', Number(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={4} md={2}>
                        <Button
                          color="error"
                          onClick={() => removeInvoiceAllocation(index)}
                        >
                          Remove
                        </Button>
                      </Grid>
                    </Grid>
                  </Card>
                ))}

                <Button
                  variant="outlined"
                  onClick={addInvoiceAllocation}
                  startIcon={<AddIcon />}
                  sx={{ mb: 2 }}
                >
                  Add Invoice
                </Button>

                <Alert severity="info">
                  Payment Amount: ₹{newPayment.amount.toLocaleString('en-IN')} | 
                  Allocated: ₹{getTotalAllocated().toLocaleString('en-IN')} | 
                  Remaining: ₹{(newPayment.amount - getTotalAllocated()).toLocaleString('en-IN')}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={newPayment.notes}
                onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRecordPayment} variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentManagement;