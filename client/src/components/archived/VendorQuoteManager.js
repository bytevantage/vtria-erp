import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  RequestQuote as QuoteIcon,
  CompareArrows as CompareIcon,
  CheckCircle as SelectIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as ProfitIcon,
  ShoppingCart as OrderIcon
} from '@mui/icons-material';
import { api } from '../utils/api';

const API_BASE_URL = process.env.DOCKER_ENV === 'true'
  ? ''
  : (process.env.REACT_APP_API_URL || '');

const VendorQuoteManager = () => {
  const [tabValue, setTabValue] = useState(0);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dialog states
  const [recordQuoteDialog, setRecordQuoteDialog] = useState(false);
  const [compareDialog, setCompareDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedQuotes, setSelectedQuotes] = useState([]);

  // Form states
  const [quoteForm, setQuoteForm] = useState({
    request_id: '',
    vendor_id: '',
    quote_number: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    payment_terms: '30 days',
    delivery_terms: '2-3 weeks',
    notes: '',
    items: []
  });

  useEffect(() => {
    fetchQuoteRequests();
    fetchVendorQuotes();
  }, []);

  const fetchQuoteRequests = async () => {
    try {
      const response = await api.get('/api/purchase-price-comparison/quote-requests');
      if (response.data.success) {
        setQuoteRequests(response.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch quote requests');
    }
  };

  const fetchVendorQuotes = async () => {
    try {
      const response = await api.get('/api/purchase-price-comparison/supplier-quotes');
      if (response.data.success) {
        setVendorQuotes(response.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch vendor quotes');
    }
  };

  const handleRecordQuote = (request) => {
    setSelectedRequest(request);
    setQuoteForm({
      request_id: request.id,
      vendor_id: '',
      quote_number: `Q-${Date.now()}`,
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_terms: '30 days',
      delivery_terms: '2-3 weeks',
      notes: '',
      items: request.items?.map(item => ({
        item_id: item.id,
        item_name: item.item_name,
        requested_quantity: item.quantity,
        quoted_price: 0,
        minimum_quantity: 1,
        delivery_weeks: 2
      })) || []
    });
    setRecordQuoteDialog(true);
  };

  const handleSubmitQuote = async () => {
    try {
      setLoading(true);

      const quoteData = {
        ...quoteForm,
        valid_until: new Date(quoteForm.valid_until).toISOString().split('T')[0]
      };

      const response = await api.post('/api/purchase-price-comparison/supplier-quotes', quoteData);

      if (response.data.success) {
        alert('Vendor quote recorded successfully!');
        setRecordQuoteDialog(false);
        fetchVendorQuotes();
        fetchQuoteRequests();
      }
    } catch (err) {
      setError('Failed to record vendor quote');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareQuotes = (request) => {
    const relatedQuotes = vendorQuotes.filter(q => q.request_id === request.id);
    setSelectedRequest(request);
    setSelectedQuotes(relatedQuotes);
    setCompareDialog(true);
  };

  const handleCreateCustomerQuote = (request, selectedVendorQuotes) => {
    // This will navigate to quotation creation with vendor quotes as cost basis
    const totalCost = selectedVendorQuotes.reduce((sum, quote) => {
      return sum + quote.items.reduce((itemSum, item) =>
        itemSum + (item.quoted_price * item.requested_quantity), 0
      );
    }, 0);

    const estimatedSelling = totalCost * 1.25; // 25% markup
    const profitAmount = estimatedSelling - totalCost;
    const profitPercentage = ((profitAmount / totalCost) * 100).toFixed(1);

    alert(`Ready to create customer quotation!\n\nCost: ₹${totalCost.toLocaleString()}\nSelling: ₹${estimatedSelling.toLocaleString()}\nProfit: ₹${profitAmount.toLocaleString()} (${profitPercentage}%)`);

    // Here you would navigate to quotation creation
    // window.location.href = `/vtria-erp/quotations?estimation_id=${request.estimation_id}&vendor_cost=${totalCost}`;
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Agile Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                <QuoteIcon sx={{ mr: 2, fontSize: '2rem' }} />
                ⚡ Agile Vendor Procurement
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Fast market sourcing • Quick decisions • Competitive pricing • SME optimized
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip
                label="⚡ Fast Track"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
              <Chip
                label="💰 Best Price"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* When to Use This System */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>⚡ Use Agile Vendor Procurement when:</strong>
        </Typography>
        <Typography variant="body2">
          • Need quick quotes • Project-based sourcing • Market competitive pricing •
          Minimal bureaucracy • SME operations • Emergency procurement • Flexible vendor selection
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
          💡 For formal compliance and strategic sourcing, use <strong>🏢 Enterprise Suppliers</strong>
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`Pending Quotes (${quoteRequests.length})`} />
          <Tab label={`Received Quotes (${vendorQuotes.length})`} />
        </Tabs>
      </Box>

      {/* Quote Requests Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {quoteRequests.map((request) => {
            const relatedQuotes = vendorQuotes.filter(q => q.request_id === request.id);
            const pendingVendors = (request.vendor_count || 0) - relatedQuotes.length;

            return (
              <Grid item xs={12} key={request.id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Typography variant="h6" color="primary">
                          {request.request_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.estimation_number} - {request.client_name}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Due: {new Date(request.due_date).toLocaleDateString()}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Typography variant="body2">
                          <strong>{request.items?.length || 0}</strong> items requested
                        </Typography>
                        <Typography variant="body2">
                          <strong>{relatedQuotes.length}</strong> quotes received
                        </Typography>
                        <Chip
                          size="small"
                          label={pendingVendors > 0 ? `${pendingVendors} pending` : 'Complete'}
                          color={pendingVendors > 0 ? 'warning' : 'success'}
                        />
                      </Grid>

                      <Grid item xs={12} md={5}>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => handleRecordQuote(request)}
                          >
                            Record Quote
                          </Button>

                          {relatedQuotes.length > 0 && (
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              startIcon={<CompareIcon />}
                              onClick={() => handleCompareQuotes(request)}
                            >
                              Compare ({relatedQuotes.length})
                            </Button>
                          )}

                          {relatedQuotes.length > 0 && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<ProfitIcon />}
                              onClick={() => handleCreateCustomerQuote(request, relatedQuotes)}
                            >
                              Create Quote
                            </Button>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}

          {quoteRequests.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <QuoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No quote requests found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create quote requests from approved estimations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Vendor Quotes Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          {vendorQuotes.map((quote) => (
            <Grid item xs={12} md={6} key={quote.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main">
                    {quote.vendor_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quote: {quote.quote_number} | Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Items:</strong> {quote.items?.length || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Value:</strong> {formatCurrency(quote.total_amount)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Payment:</strong> {quote.payment_terms}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Delivery:</strong> {quote.delivery_terms}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                    >
                      Edit
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {vendorQuotes.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <CompareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No vendor quotes received yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Record quotes as they come in from vendors
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Record Quote Dialog */}
      <Dialog open={recordQuoteDialog} onClose={() => setRecordQuoteDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Record Vendor Quote</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedRequest?.request_number} - {selectedRequest?.estimation_number}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Vendor</InputLabel>
                <Select
                  value={quoteForm.vendor_id}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, vendor_id: e.target.value }))}
                  label="Vendor"
                >
                  {selectedRequest?.vendors?.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </MenuItem>
                  )) || []}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Quote Number"
                value={quoteForm.quote_number}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, quote_number: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Quote Date"
                type="date"
                value={quoteForm.quote_date}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, quote_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Valid Until"
                type="date"
                value={quoteForm.valid_until}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, valid_until: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Delivery Terms"
                value={quoteForm.delivery_terms}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, delivery_terms: e.target.value }))}
              />
            </Grid>

            {/* Items Table */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Item Quotes
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Requested Qty</TableCell>
                      <TableCell align="right">Quoted Price (per unit)</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Delivery (weeks)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quoteForm.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell align="right">{item.requested_quantity}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.quoted_price}
                            onChange={(e) => {
                              const updatedItems = [...quoteForm.items];
                              updatedItems[index].quoted_price = parseFloat(e.target.value) || 0;
                              setQuoteForm(prev => ({ ...prev, items: updatedItems }));
                            }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.quoted_price * item.requested_quantity)}
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.delivery_weeks}
                            onChange={(e) => {
                              const updatedItems = [...quoteForm.items];
                              updatedItems[index].delivery_weeks = parseInt(e.target.value) || 2;
                              setQuoteForm(prev => ({ ...prev, items: updatedItems }));
                            }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordQuoteDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitQuote} variant="contained" disabled={loading}>
            Record Quote
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Quotes Dialog */}
      <Dialog open={compareDialog} onClose={() => setCompareDialog(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Compare Vendor Quotes</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedRequest?.request_number} - Select best quotes for customer quotation
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedQuotes.length > 0 ? (
            <Grid container spacing={2}>
              {selectedQuotes.map((quote) => (
                <Grid item xs={12} md={6} lg={4} key={quote.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {quote.vendor_name}
                      </Typography>
                      <Typography variant="caption">
                        Quote: {quote.quote_number} | Valid: {new Date(quote.valid_until).toLocaleDateString()}
                      </Typography>

                      <Table size="small" sx={{ mt: 2 }}>
                        <TableBody>
                          {quote.items?.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ border: 0, py: 0.5, fontSize: '0.75rem' }}>
                                {item.item_name}
                              </TableCell>
                              <TableCell align="right" sx={{ border: 0, py: 0.5, fontSize: '0.75rem' }}>
                                {formatCurrency(item.quoted_price)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" color="success.main">
                          Total: {formatCurrency(quote.total_amount)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Payment: {quote.payment_terms}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Delivery: {quote.delivery_terms}
                        </Typography>
                      </Box>

                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ mt: 2 }}
                        startIcon={<SelectIcon />}
                        onClick={() => handleCreateCustomerQuote(selectedRequest, [quote])}
                      >
                        Select This Quote
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<SelectIcon />}
                  onClick={() => handleCreateCustomerQuote(selectedRequest, selectedQuotes)}
                  sx={{ mt: 2 }}
                >
                  Create Customer Quote with All Selected ({selectedQuotes.length} vendors)
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Typography>No quotes available for comparison</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorQuoteManager;