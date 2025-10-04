import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Fab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  CheckCircle as ApproveIcon,
  Assignment as QuoteIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const QuotationManager = () => {
  const [quotations, setQuotations] = useState([]);
  const [approvedEstimations, setApprovedEstimations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState({ open: false, quotation: null });
  
  // Form states
  const [selectedEstimation, setSelectedEstimation] = useState('');
  const [quotationForm, setQuotationForm] = useState({
    terms_conditions: 'Standard terms and conditions apply',
    delivery_terms: '4-6 weeks from approval',
    payment_terms: '30% advance, 70% on delivery',
    warranty_terms: '12 months warranty from date of installation',
    valid_days: 30,
    discount_percentage: 0
  });

  useEffect(() => {
    fetchQuotations();
    fetchApprovedEstimations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/quotations`);
      if (response.data.success) {
        setQuotations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setError('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedEstimations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/quotations/available-estimations`);
      if (response.data.success) {
        setApprovedEstimations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching available estimations:', error);
    }
  };

  const handleCreateQuotation = async () => {
    try {
      if (!selectedEstimation) {
        setError('Please select an approved estimation');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/quotations`, {
        estimation_id: selectedEstimation,
        ...quotationForm
      });

      if (response.data.success) {
        // Transition case to quotation state if it exists
        try {
          const estimation = availableEstimations.find(e => e.id === selectedEstimation);
          if (estimation && estimation.enquiry_id) {
            // Find the case number for this enquiry
            const caseResponse = await axios.get(`${API_BASE_URL}/api/case-management/search/query?q=${estimation.enquiry_id}`);
            if (caseResponse.data.success && caseResponse.data.data.length > 0) {
              const caseNumber = caseResponse.data.data[0].case_number;
              await axios.put(`${API_BASE_URL}/api/case-management/${caseNumber}/transition`, {
                new_state: 'quotation',
                notes: `Quotation ${response.data.data.quotation_id} created from approved estimation`
              });
            }
          }
        } catch (caseError) {
          console.error('Error updating case state:', caseError);
          // Don't fail quotation creation if case update fails
        }
        
        await fetchQuotations();
        setCreateDialog(false);
        setSelectedEstimation('');
        setQuotationForm({
          terms_conditions: 'Standard terms and conditions apply',
          delivery_terms: '4-6 weeks from approval',
          payment_terms: '30% advance, 70% on delivery',
          warranty_terms: '12 months warranty from date of installation',
          valid_days: 30,
          discount_percentage: 0
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      setError(error.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleViewQuotation = async (quotationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/quotations/${quotationId}`);
      if (response.data.success) {
        setViewDialog({ open: true, quotation: response.data.data });
      }
    } catch (error) {
      console.error('Error fetching quotation details:', error);
      setError('Failed to load quotation details');
    }
  };

  const handlePrintQuotation = (quotationId) => {
    window.open(`${API_BASE_URL}/api/quotations/${quotationId}/pdf`, '_blank');
  };

  const handleApproveQuotation = async (quotationId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quotations/${quotationId}/approve`);
      if (response.data.success) {
        await fetchQuotations();
        setError(null);
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
      setError(error.response?.data?.message || 'Failed to approve quotation');
    }
  };

  const handleDeleteQuotation = async (quotationId) => {
    if (window.confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      try {
        const response = await axios.delete(`${API_BASE_URL}/api/quotations/${quotationId}`);
        if (response.data.success) {
          await fetchQuotations();
          await fetchApprovedEstimations(); // Refresh available estimations
          setError(null);
        }
      } catch (error) {
        console.error('Error deleting quotation:', error);
        setError(error.response?.data?.message || 'Failed to delete quotation');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_approval': return 'warning';
      case 'approved': return 'success';
      case 'sent': return 'info';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                <QuoteIcon sx={{ mr: 2, fontSize: '2rem' }} />
                Quotation Management
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Create and manage quotations from approved estimations
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }}
            >
              Create Quotation
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quotations Table */}
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            All Quotations
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Quote ID</strong></TableCell>
                  <TableCell><strong>Project</strong></TableCell>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Valid Until</strong></TableCell>
                  <TableCell><strong>Amount</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {quotation.quotation_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {quotation.project_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Est: {quotation.estimation_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {quotation.client_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {quotation.city}, {quotation.state}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(quotation.date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(quotation.valid_until).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(quotation.grand_total)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={quotation.status?.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(quotation.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewQuotation(quotation.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print/PDF">
                          <IconButton
                            size="small"
                            onClick={() => handlePrintQuotation(quotation.id)}
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                        {quotation.status === 'pending_approval' && (
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApproveQuotation(quotation.id)}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {['draft', 'pending_approval'].includes(quotation.status) && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteQuotation(quotation.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Quotation Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">
            <AddIcon sx={{ mr: 1 }} />
            Create New Quotation
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Select Approved Estimation</InputLabel>
                <Select
                  value={selectedEstimation}
                  onChange={(e) => setSelectedEstimation(e.target.value)}
                  label="Select Approved Estimation"
                >
                  {approvedEstimations.map((estimation) => (
                    <MenuItem key={estimation.id} value={estimation.id}>
                      {estimation.estimation_id} - {estimation.project_name} 
                      ({formatCurrency(estimation.total_final_price)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Validity (Days)"
                type="number"
                value={quotationForm.valid_days}
                onChange={(e) => setQuotationForm(prev => ({ 
                  ...prev, 
                  valid_days: parseInt(e.target.value) || 30 
                }))}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Additional Discount (%)"
                type="number"
                value={quotationForm.discount_percentage}
                onChange={(e) => setQuotationForm(prev => ({ 
                  ...prev, 
                  discount_percentage: parseFloat(e.target.value) || 0 
                }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Terms & Conditions"
                value={quotationForm.terms_conditions}
                onChange={(e) => setQuotationForm(prev => ({ 
                  ...prev, 
                  terms_conditions: e.target.value 
                }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Delivery Terms"
                value={quotationForm.delivery_terms}
                onChange={(e) => setQuotationForm(prev => ({ 
                  ...prev, 
                  delivery_terms: e.target.value 
                }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Terms"
                value={quotationForm.payment_terms}
                onChange={(e) => setQuotationForm(prev => ({ 
                  ...prev, 
                  payment_terms: e.target.value 
                }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Warranty Terms"
                value={quotationForm.warranty_terms}
                onChange={(e) => setQuotationForm(prev => ({ 
                  ...prev, 
                  warranty_terms: e.target.value 
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateQuotation}
            disabled={!selectedEstimation}
          >
            Create Quotation
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Quotation Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={() => setViewDialog({ open: false, quotation: null })}
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            <ViewIcon sx={{ mr: 1 }} />
            Quotation Details - {viewDialog.quotation?.quotation?.quotation_id}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {viewDialog.quotation && (
            <Box sx={{ mt: 2 }}>
              {/* Quotation Header */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <BusinessIcon sx={{ mr: 1 }} />
                        Client Information
                      </Typography>
                      <Typography variant="body2">
                        <strong>Company:</strong> {viewDialog.quotation.quotation.client_name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Contact:</strong> {viewDialog.quotation.quotation.client_contact}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Address:</strong> {viewDialog.quotation.quotation.client_address}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <CalendarIcon sx={{ mr: 1 }} />
                        Quotation Details
                      </Typography>
                      <Typography variant="body2">
                        <strong>Date:</strong> {new Date(viewDialog.quotation.quotation.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Valid Until:</strong> {new Date(viewDialog.quotation.quotation.valid_until).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> 
                        <Chip 
                          label={viewDialog.quotation.quotation.status?.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(viewDialog.quotation.quotation.status)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Quotation Items */}
              <Typography variant="h6" gutterBottom>
                <MoneyIcon sx={{ mr: 1 }} />
                Quotation Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Sr No</strong></TableCell>
                      <TableCell><strong>Section/Item</strong></TableCell>
                      <TableCell><strong>HSN/SAC</strong></TableCell>
                      <TableCell><strong>Qty</strong></TableCell>
                      <TableCell><strong>Unit</strong></TableCell>
                      <TableCell><strong>Rate</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewDialog.quotation.items?.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.section_name || item.product_name}</TableCell>
                        <TableCell>{item.hsn_code}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{formatCurrency(item.rate)}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals */}
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        <strong>Subtotal:</strong> {formatCurrency(viewDialog.quotation.quotation.subtotal)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Discount:</strong> {formatCurrency(viewDialog.quotation.quotation.discount_amount)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Tax:</strong> {formatCurrency(viewDialog.quotation.quotation.total_tax)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" color="primary">
                        <strong>Grand Total: {formatCurrency(viewDialog.quotation.quotation.grand_total)}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, quotation: null })}>
            Close
          </Button>
          {viewDialog.quotation && (
            <Button 
              variant="contained" 
              startIcon={<PdfIcon />}
              onClick={() => handlePrintQuotation(viewDialog.quotation.quotation.id)}
            >
              Print/PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuotationManager;
