import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Money as CashIcon,
  QrCode as UPIIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import EnterpriseButton from './common/EnterpriseButton';
import { api } from '../utils/api';

const PaymentRecordingDialog = ({ 
  open, 
  onClose, 
  invoice, 
  onPaymentRecorded,
  currentUser = { role: 'user', id: 1 }
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Payment form data
  const [paymentData, setPaymentData] = useState({
    payment_type: 'receipt',
    party_type: 'customer',
    party_id: invoice?.customer_id || '',
    party_name: invoice?.customer_name || '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    cheque_number: '',
    transaction_reference: '',
    utr_number: '',
    reference_type: 'invoice',
    reference_id: invoice?.id || '',
    reference_number: invoice?.invoice_number || '',
    notes: '',
    invoice_allocations: []
  });

  // Payment history
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (invoice && open) {
      setPaymentData(prev => ({
        ...prev,
        party_id: invoice.customer_id,
        party_name: invoice.customer_name,
        reference_id: invoice.id,
        reference_number: invoice.invoice_number,
        amount: invoice.balance_amount?.toString() || '',
        invoice_allocations: [{
          invoice_id: invoice.id,
          allocated_amount: invoice.balance_amount || 0,
          invoice_number: invoice.invoice_number,
          balance_amount: invoice.balance_amount || 0
        }]
      }));
      fetchPaymentHistory();
    }
  }, [invoice, open]);

  const fetchPaymentHistory = async () => {
    if (!invoice?.id) return;
    
    try {
      const { data } = await api.get(`/api/financial/payments?reference_id=${invoice.id}&reference_type=invoice`);
      if (data.success) {
        setPaymentHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      errors.amount = 'Payment amount is required and must be greater than 0';
    }
    
    if (parseFloat(paymentData.amount) > (invoice?.balance_amount || 0)) {
      errors.amount = 'Payment amount cannot exceed outstanding balance';
    }
    
    if (!paymentData.payment_method) {
      errors.payment_method = 'Payment method is required';
    }
    
    if (paymentData.payment_method === 'cheque' && !paymentData.cheque_number) {
      errors.cheque_number = 'Cheque number is required for cheque payments';
    }
    
    if (paymentData.payment_method === 'bank_transfer' && !paymentData.utr_number) {
      errors.utr_number = 'UTR number is required for bank transfers';
    }
    
    if (paymentData.payment_method === 'card' && !paymentData.transaction_reference) {
      errors.transaction_reference = 'Transaction reference is required for card payments';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-update allocation amount when payment amount changes
    if (field === 'amount' && invoice) {
      const allocatedAmount = Math.min(parseFloat(value) || 0, invoice.balance_amount || 0);
      setPaymentData(prev => ({
        ...prev,
        invoice_allocations: [{
          ...prev.invoice_allocations[0],
          allocated_amount: allocatedAmount
        }]
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please correct the validation errors before submitting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const paymentPayload = {
        ...paymentData,
        amount: parseFloat(paymentData.amount),
        created_by: currentUser.id
      };

      const { data } = await api.post('/api/financial/payments', paymentPayload);
      
      if (data.success) {
        setSuccess('Payment recorded successfully!');
        setActiveStep(2); // Move to confirmation step
        
        // Refresh payment history
        await fetchPaymentHistory();
        
        // Notify parent component
        if (onPaymentRecorded) {
          onPaymentRecorded(data.data);
        }
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      setError(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    setPaymentData({
      payment_type: 'receipt',
      party_type: 'customer',
      party_id: '',
      party_name: '',
      amount: '',
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      bank_name: '',
      cheque_number: '',
      transaction_reference: '',
      utr_number: '',
      reference_type: 'invoice',
      reference_id: '',
      reference_number: '',
      notes: '',
      invoice_allocations: []
    });
    onClose();
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <CashIcon />;
      case 'cheque': return <BankIcon />;
      case 'bank_transfer': return <BankIcon />;
      case 'upi': return <UPIIcon />;
      case 'card': return <CardIcon />;
      default: return <PaymentIcon />;
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" />
              Invoice Details
            </Typography>
            
            <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Invoice Number</Typography>
                    <Typography variant="h6">{invoice?.invoice_number}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Customer</Typography>
                    <Typography variant="h6">{invoice?.customer_name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                    <Typography variant="h6">₹{parseFloat(invoice?.total_amount || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Outstanding Balance</Typography>
                    <Typography variant="h6" color="error.main">
                      ₹{parseFloat(invoice?.balance_amount || 0).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {paymentHistory.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="primary" />
                  Payment History
                </Typography>
                
                <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Reference</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getPaymentMethodIcon(payment.payment_method)}
                              {payment.payment_method.replace('_', ' ').toUpperCase()}
                            </Box>
                          </TableCell>
                          <TableCell>₹{parseFloat(payment.amount).toLocaleString()}</TableCell>
                          <TableCell>{payment.transaction_reference || payment.utr_number || payment.cheque_number || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={payment.payment_status} 
                              color={payment.payment_status === 'cleared' ? 'success' : 'warning'} 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaymentIcon color="primary" />
              Payment Details
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  error={!!validationErrors.amount}
                  helperText={validationErrors.amount || `Max: ₹${parseFloat(invoice?.balance_amount || 0).toLocaleString()}`}
                  inputProps={{ min: 0, max: invoice?.balance_amount, step: 0.01 }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required error={!!validationErrors.payment_method}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentData.payment_method}
                    onChange={(e) => handleInputChange('payment_method', e.target.value)}
                    label="Payment Method"
                  >
                    <MenuItem value="cash">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CashIcon />
                        Cash
                      </Box>
                    </MenuItem>
                    <MenuItem value="cheque">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BankIcon />
                        Cheque
                      </Box>
                    </MenuItem>
                    <MenuItem value="bank_transfer">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BankIcon />
                        Bank Transfer
                      </Box>
                    </MenuItem>
                    <MenuItem value="upi">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <UPIIcon />
                        UPI
                      </Box>
                    </MenuItem>
                    <MenuItem value="card">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CardIcon />
                        Card
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Conditional fields based on payment method */}
              {paymentData.payment_method === 'cheque' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      value={paymentData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cheque Number"
                      value={paymentData.cheque_number}
                      onChange={(e) => handleInputChange('cheque_number', e.target.value)}
                      error={!!validationErrors.cheque_number}
                      helperText={validationErrors.cheque_number}
                      required
                    />
                  </Grid>
                </>
              )}

              {paymentData.payment_method === 'bank_transfer' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      value={paymentData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="UTR Number"
                      value={paymentData.utr_number}
                      onChange={(e) => handleInputChange('utr_number', e.target.value)}
                      error={!!validationErrors.utr_number}
                      helperText={validationErrors.utr_number}
                      required
                    />
                  </Grid>
                </>
              )}

              {(paymentData.payment_method === 'card' || paymentData.payment_method === 'upi') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Transaction Reference"
                    value={paymentData.transaction_reference}
                    onChange={(e) => handleInputChange('transaction_reference', e.target.value)}
                    error={!!validationErrors.transaction_reference}
                    helperText={validationErrors.transaction_reference}
                    required={paymentData.payment_method === 'card'}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={paymentData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this payment..."
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box textAlign="center">
            <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="success.main">
              Payment Recorded Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Payment of ₹{parseFloat(paymentData.amount).toLocaleString()} has been recorded for invoice {invoice?.invoice_number}
            </Typography>
            
            <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Payment Summary</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Amount Paid:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">₹{parseFloat(paymentData.amount).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Payment Method:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">{paymentData.payment_method.replace('_', ' ').toUpperCase()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">New Balance:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      ₹{(parseFloat(invoice?.balance_amount || 0) - parseFloat(paymentData.amount)).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  const steps = [
    'Review Invoice',
    'Enter Payment Details', 
    'Confirmation'
  ];

  if (!invoice) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2
      }}>
        <ReceiptIcon color="primary" />
        Record Payment - {invoice.invoice_number}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {getStepContent(index)}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {index > 0 && index < 2 && (
                    <EnterpriseButton
                      variant="outlined"
                      onClick={() => setActiveStep(index - 1)}
                      disabled={loading}
                    >
                      Back
                    </EnterpriseButton>
                  )}
                  
                  {index < 1 && (
                    <EnterpriseButton
                      variant="contained"
                      onClick={() => setActiveStep(index + 1)}
                      disabled={loading}
                    >
                      Next
                    </EnterpriseButton>
                  )}
                  
                  {index === 1 && (
                    <EnterpriseButton
                      variant="contained"
                      onClick={handleSubmit}
                      loading={loading}
                      requirePermission={true}
                      userRole={currentUser.role}
                      allowedRoles={['admin', 'manager', 'accountant', 'user']}
                      requireConfirmation={true}
                      confirmationTitle="Record Payment"
                      confirmationMessage={`Are you sure you want to record a payment of ₹${parseFloat(paymentData.amount || 0).toLocaleString()} for invoice ${invoice.invoice_number}?`}
                      enableAuditLog={true}
                      auditAction="record_payment"
                      showSuccessMessage={false} // We handle success internally
                      enableRetry={true}
                      maxRetries={2}
                    >
                      Record Payment
                    </EnterpriseButton>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <EnterpriseButton
          variant="outlined"
          onClick={handleClose}
          disabled={loading}
        >
          {activeStep === 2 ? 'Close' : 'Cancel'}
        </EnterpriseButton>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentRecordingDialog;