import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Alert,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  RequestQuote as QuoteIcon,
  TrendingUp as ProfitIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
  MonetizationOn as CostIcon,
  AttachMoney as PriceIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as ApproveIcon
} from '@mui/icons-material';
import { api } from '../utils/api';

const ProfitTrackingQuotation = () => {
  const [estimations, setEstimations] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]);
  const [selectedEstimation, setSelectedEstimation] = useState(null);
  const [quotationForm, setQuotationForm] = useState({
    estimation_id: '',
    vendor_cost_basis: [],
    markup_percentage: 25,
    items: [],
    terms_conditions: 'Standard terms and conditions apply',
    delivery_terms: '4-6 weeks from approval',
    payment_terms: '30% advance, 70% on delivery',
    warranty_terms: '12 months warranty',
    valid_days: 30
  });

  const [showProfitDetails, setShowProfitDetails] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApprovedEstimations();
  }, []);

  const fetchApprovedEstimations = async () => {
    try {
      const response = await api.get('/api/estimations');
      if (response.data.success) {
        const approved = response.data.data.filter(est => est.status === 'approved');
        setEstimations(approved);
      }
    } catch (err) {
      setError('Failed to fetch estimations');
    }
  };

  const fetchVendorQuotes = async (estimationId) => {
    try {
      const response = await api.get(`/api/purchase-price-comparison/estimation/${estimationId}/quotes`);
      if (response.data.success) {
        setVendorQuotes(response.data.data || []);
      }
    } catch (err) {
      console.log('No vendor quotes found for this estimation');
      setVendorQuotes([]);
    }
  };

  const handleEstimationSelect = async (estimationId) => {
    const estimation = estimations.find(est => est.id === parseInt(estimationId));
    setSelectedEstimation(estimation);

    // Fetch vendor quotes if available
    await fetchVendorQuotes(estimationId);

    // Fetch estimation details
    try {
      const response = await api.get(`/api/estimation/${estimationId}/details`);
      if (response.data.success) {
        const details = response.data.data;
        const items = [];

        // Process estimation items
        if (details.sections) {
          details.sections.forEach(section => {
            if (section.subsections) {
              section.subsections.forEach(subsection => {
                if (subsection.items) {
                  subsection.items.forEach(item => {
                    items.push({
                      id: item.id,
                      item_name: item.item_name || item.product_name,
                      quantity: item.quantity || 1,
                      estimated_cost: item.final_price / item.quantity, // Original estimation price as fallback cost
                      vendor_cost: 0, // Will be filled from vendor quotes
                      selling_price: item.final_price / item.quantity, // Start with estimation price
                      section: section.heading,
                      subsection: subsection.subsection_name
                    });
                  });
                }
              });
            }
          });
        }

        setQuotationForm(prev => ({
          ...prev,
          estimation_id: estimationId,
          items: items
        }));
      }
    } catch (err) {
      setError('Failed to fetch estimation details');
    }
  };

  const applyVendorCosts = (vendorQuoteId) => {
    const selectedQuote = vendorQuotes.find(q => q.id === parseInt(vendorQuoteId));
    if (!selectedQuote) return;

    const updatedItems = quotationForm.items.map(item => {
      // Find matching item in vendor quote
      const vendorItem = selectedQuote.items?.find(vi =>
        vi.item_name.toLowerCase().includes(item.item_name.toLowerCase()) ||
        item.item_name.toLowerCase().includes(vi.item_name.toLowerCase())
      );

      if (vendorItem) {
        const vendorCost = vendorItem.quoted_price || item.estimated_cost;
        const newSellingPrice = vendorCost * (1 + quotationForm.markup_percentage / 100);

        return {
          ...item,
          vendor_cost: vendorCost,
          selling_price: newSellingPrice,
          vendor_quote_ref: selectedQuote.quote_number,
          vendor_name: selectedQuote.vendor_name
        };
      }

      return item;
    });

    setQuotationForm(prev => ({
      ...prev,
      items: updatedItems,
      vendor_cost_basis: [...prev.vendor_cost_basis, selectedQuote.id]
    }));
  };

  const updateItemPrice = (index, field, value) => {
    const updatedItems = [...quotationForm.items];
    updatedItems[index][field] = parseFloat(value) || 0;

    // Auto-calculate profit when costs change
    if (field === 'vendor_cost') {
      updatedItems[index].selling_price = updatedItems[index].vendor_cost * (1 + quotationForm.markup_percentage / 100);
    }

    setQuotationForm(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const calculateProfitMetrics = () => {
    const totalCost = quotationForm.items.reduce((sum, item) =>
      sum + ((item.vendor_cost || item.estimated_cost) * item.quantity), 0
    );

    const totalSelling = quotationForm.items.reduce((sum, item) =>
      sum + (item.selling_price * item.quantity), 0
    );

    const totalProfit = totalSelling - totalCost;
    const profitPercentage = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;

    return {
      totalCost,
      totalSelling,
      totalProfit,
      profitPercentage: profitPercentage.toFixed(2)
    };
  };

  const handleCreateQuotation = async () => {
    try {
      setLoading(true);

      const metrics = calculateProfitMetrics();

      const quotationData = {
        estimation_id: quotationForm.estimation_id,
        items: quotationForm.items.map(item => ({
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.selling_price, // Customer sees this price
          internal_cost: item.vendor_cost || item.estimated_cost, // Internal cost tracking
          vendor_reference: item.vendor_quote_ref || null,
          profit_margin: ((item.selling_price - (item.vendor_cost || item.estimated_cost)) / (item.vendor_cost || item.estimated_cost) * 100).toFixed(2)
        })),
        total_cost: metrics.totalCost, // Internal field
        total_selling: metrics.totalSelling,
        profit_amount: metrics.totalProfit, // Internal field
        profit_percentage: metrics.profitPercentage, // Internal field
        markup_percentage: quotationForm.markup_percentage,
        terms_conditions: quotationForm.terms_conditions,
        delivery_terms: quotationForm.delivery_terms,
        payment_terms: quotationForm.payment_terms,
        warranty_terms: quotationForm.warranty_terms,
        valid_days: quotationForm.valid_days
      };

      const response = await api.post('/api/quotations-enhanced', quotationData);

      if (response.data.success) {
        alert(`✅ Customer quotation created successfully!\n\n💰 Total: ₹${metrics.totalSelling.toLocaleString()}\n📈 Profit: ₹${metrics.totalProfit.toLocaleString()} (${metrics.profitPercentage}%)`);
        setCreateDialog(false);

        // Reset form
        setQuotationForm({
          estimation_id: '',
          vendor_cost_basis: [],
          markup_percentage: 25,
          items: [],
          terms_conditions: 'Standard terms and conditions apply',
          delivery_terms: '4-6 weeks from approval',
          payment_terms: '30% advance, 70% on delivery',
          warranty_terms: '12 months warranty',
          valid_days: 30
        });
      }
    } catch (err) {
      setError('Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
  };

  const metrics = calculateProfitMetrics();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                <ProfitIcon sx={{ mr: 2, fontSize: '2rem' }} />
                💰 Profit-Tracking Quotations
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Create customer quotations with vendor cost basis and profit tracking
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<QuoteIcon />}
              onClick={() => setCreateDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }}
            >
              Create New Quotation
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Content placeholder */}
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <ProfitIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            🎯 Simplified Profit-Driven Quotations
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create quotations with clear profit visibility based on vendor costs
          </Typography>
          <Button
            variant="contained"
            startIcon={<QuoteIcon />}
            onClick={() => setCreateDialog(true)}
          >
            Create Your First Quotation
          </Button>
        </CardContent>
      </Card>

      {/* Create Quotation Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <ProfitIcon color="warning" />
            <Box>
              <Typography variant="h6">Create Profit-Tracking Quotation</Typography>
              <Typography variant="body2" color="text.secondary">
                Vendor cost → Markup → Customer price with profit visibility
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>

            {/* Estimation Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Approved Estimation</InputLabel>
                <Select
                  value={quotationForm.estimation_id}
                  onChange={(e) => handleEstimationSelect(e.target.value)}
                  label="Select Approved Estimation"
                >
                  {estimations.map((est) => (
                    <MenuItem key={est.id} value={est.id}>
                      {est.estimation_id} - {est.project_name} ({formatCurrency(est.total_final_price)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Markup Percentage */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Markup %"
                type="number"
                value={quotationForm.markup_percentage}
                onChange={(e) => setQuotationForm(prev => ({
                  ...prev,
                  markup_percentage: parseFloat(e.target.value) || 25
                }))}
                helperText="Standard markup percentage"
              />
            </Grid>

            {/* Profit Visibility Toggle */}
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant={showProfitDetails ? "contained" : "outlined"}
                startIcon={showProfitDetails ? <EyeOffIcon /> : <EyeIcon />}
                onClick={() => setShowProfitDetails(!showProfitDetails)}
                color="warning"
              >
                {showProfitDetails ? 'Hide' : 'Show'} Profit Details
              </Button>
            </Grid>

            {/* Vendor Quote Selection */}
            {vendorQuotes.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" color="success.main" gutterBottom>
                  📋 Available Vendor Quotes
                </Typography>
                <Grid container spacing={2}>
                  {vendorQuotes.map((quote) => (
                    <Grid item xs={12} md={4} key={quote.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" color="primary">
                            {quote.vendor_name}
                          </Typography>
                          <Typography variant="body2">
                            {quote.quote_number} | {formatCurrency(quote.total_amount)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Valid: {new Date(quote.valid_until).toLocaleDateString()}
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            fullWidth
                            sx={{ mt: 1 }}
                            onClick={() => applyVendorCosts(quote.id)}
                          >
                            Apply Cost Basis
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Profit Summary - Only show if enabled */}
            {showProfitDetails && quotationForm.items.length > 0 && (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      💰 INTERNAL PROFIT ANALYSIS (Not shown to customer)
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(metrics.totalCost)}
                        </Typography>
                        <Typography variant="body2">Total Cost</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(metrics.totalSelling)}
                        </Typography>
                        <Typography variant="body2">Selling Price</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                          {formatCurrency(metrics.totalProfit)}
                        </Typography>
                        <Typography variant="body2">Profit Amount</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                          {metrics.profitPercentage}%
                        </Typography>
                        <Typography variant="body2">Profit Margin</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Items Table */}
            {quotationForm.items.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  📋 Quotation Items
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        {showProfitDetails && <TableCell align="right">Cost (Internal)</TableCell>}
                        <TableCell align="right">Selling Price</TableCell>
                        {showProfitDetails && <TableCell align="right">Profit/Unit</TableCell>}
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quotationForm.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="500">
                              {item.item_name}
                            </Typography>
                            {item.vendor_name && (
                              <Typography variant="caption" color="success.main">
                                Cost from: {item.vendor_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>

                          {showProfitDetails && (
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={item.vendor_cost || item.estimated_cost}
                                onChange={(e) => updateItemPrice(index, 'vendor_cost', e.target.value)}
                                sx={{ width: 100 }}
                                InputProps={{
                                  startAdornment: '₹',
                                  style: { backgroundColor: '#ffecb3' } // Internal cost highlight
                                }}
                              />
                            </TableCell>
                          )}

                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={item.selling_price}
                              onChange={(e) => updateItemPrice(index, 'selling_price', e.target.value)}
                              sx={{ width: 100 }}
                              InputProps={{
                                startAdornment: '₹'
                              }}
                            />
                          </TableCell>

                          {showProfitDetails && (
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={formatCurrency(item.selling_price - (item.vendor_cost || item.estimated_cost))}
                                color={item.selling_price > (item.vendor_cost || item.estimated_cost) ? 'success' : 'error'}
                              />
                            </TableCell>
                          )}

                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(item.selling_price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            {/* Terms */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Terms & Conditions"
                value={quotationForm.terms_conditions}
                onChange={(e) => setQuotationForm(prev => ({
                  ...prev,
                  terms_conditions: e.target.value
                }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Delivery Terms"
                value={quotationForm.delivery_terms}
                onChange={(e) => setQuotationForm(prev => ({
                  ...prev,
                  delivery_terms: e.target.value
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>

          {showProfitDetails && (
            <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="success.main">
                💰 Profit: {formatCurrency(metrics.totalProfit)} ({metrics.profitPercentage}%)
              </Typography>
            </Box>
          )}

          <Button
            onClick={handleCreateQuotation}
            variant="contained"
            color="success"
            disabled={loading || quotationForm.items.length === 0}
            startIcon={<ApproveIcon />}
          >
            Create Customer Quotation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfitTrackingQuotation;