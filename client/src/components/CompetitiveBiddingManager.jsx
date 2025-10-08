import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  Compare as CompareIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  Timer as TimerIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  MonetizationOn as PriceIcon
} from '@mui/icons-material';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';

const API_BASE_URL = 'http://localhost:3001';

const CompetitiveBiddingManager = () => {
  const [rfqCampaigns, setRfqCampaigns] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [openQuotations, setOpenQuotations] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [supplierBids, setSupplierBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rfqDetails, setRfqDetails] = useState({
    title: '',
    description: '',
    deadline: '',
    terms: ''
  });

  useEffect(() => {
    fetchOpenQuotations();
    fetchSuppliers();
    fetchRfqCampaigns();
  }, []);

  const fetchOpenQuotations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/purchase-requisition/open-quotations-grouped`, {
        headers: getAuthHeaders()
      });
      setOpenQuotations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching open quotations:', error);
      setError('Error fetching quotations');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/suppliers`, {
        headers: getAuthHeaders()
      });
      console.log('Suppliers API response:', response.data);

      // The API returns { success: true, data: [...] }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setAvailableSuppliers(response.data.data);
      } else {
        console.warn('Unexpected suppliers response format:', response.data);
        setAvailableSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setAvailableSuppliers([]); // Ensure it's always an array
    }
  };

  const fetchRfqCampaigns = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/rfq-campaigns`, {
        headers: getAuthHeaders()
      });
      setRfqCampaigns(response.data.data || []);
    } catch (error) {
      console.error('Error fetching RFQ campaigns:', error);
    }
  };

  const handleCreateRfq = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/rfq-campaigns/create`, {
        quotation_id: selectedQuotation.quotation_id,
        suppliers: selectedSuppliers,
        title: rfqDetails.title,
        description: rfqDetails.description,
        deadline: rfqDetails.deadline,
        terms: rfqDetails.terms
      }, {
        headers: getAuthHeaders()
      });

      setCreateDialogOpen(false);
      resetForm();
      fetchRfqCampaigns();
      fetchOpenQuotations(); // Remove quotation from open list
    } catch (error) {
      console.error('Error creating RFQ:', error);
      setError('Error creating RFQ campaign');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierBids = async (rfqId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/rfq-campaigns/${rfqId}/bids`, {
        headers: getAuthHeaders()
      });
      setSupplierBids(response.data.data || []);
    } catch (error) {
      console.error('Error fetching supplier bids:', error);
    }
  };

  const handleCompareBids = (rfq) => {
    setSelectedRfq(rfq);
    fetchSupplierBids(rfq.id);
    setCompareDialogOpen(true);
  };

  const handleSelectWinningBid = async (bidId, supplierId) => {
    try {
      await axios.post(`${API_BASE_URL}/api/rfq-campaigns/${selectedRfq.id}/select-winner`, {
        winning_bid_id: bidId,
        supplier_id: supplierId
      }, {
        headers: getAuthHeaders()
      });

      // Create Purchase Requisition with winning supplier
      await axios.post(`${API_BASE_URL}/api/purchase-requisition/from-rfq-winner`, {
        rfq_id: selectedRfq.id,
        supplier_id: supplierId,
        bid_id: bidId
      }, {
        headers: getAuthHeaders()
      });

      setCompareDialogOpen(false);
      fetchRfqCampaigns();
    } catch (error) {
      console.error('Error selecting winning bid:', error);
      setError('Error selecting winning bid');
    }
  };

  const resetForm = () => {
    setSelectedQuotation(null);
    setSelectedSuppliers([]);
    setRfqDetails({
      title: '',
      description: '',
      deadline: '',
      terms: ''
    });
  };

  const getRfqStatus = (status) => {
    const statusConfig = {
      'draft': { color: 'default', label: 'Draft' },
      'sent': { color: 'info', label: 'Sent to Suppliers' },
      'bidding': { color: 'warning', label: 'Active Bidding' },
      'evaluation': { color: 'secondary', label: 'Under Evaluation' },
      'completed': { color: 'success', label: 'Winner Selected' },
      'cancelled': { color: 'error', label: 'Cancelled' }
    };
    return statusConfig[status] || { color: 'default', label: status };
  };

  const calculateSavings = (bids) => {
    if (bids.length < 2) return null;
    const prices = bids.map(bid => parseFloat(bid.total_price)).filter(p => p > 0);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return {
      amount: maxPrice - minPrice,
      percentage: ((maxPrice - minPrice) / maxPrice * 100).toFixed(1)
    };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🏆 Competitive Bidding Manager
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          color="primary"
        >
          Create RFQ Campaign
        </Button>
      </Box>

      <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.secondary', mb: 4 }}>
        Send RFQs to multiple suppliers, collect competitive bids, and select the best offer
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* RFQ Campaigns List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Active RFQ Campaigns
          </Typography>

          {rfqCampaigns.length === 0 ? (
            <Alert severity="info">
              No RFQ campaigns yet. Create your first campaign to start competitive bidding!
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>RFQ Title</TableCell>
                    <TableCell>Quotation</TableCell>
                    <TableCell>Suppliers</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Bids Received</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rfqCampaigns.map((rfq) => {
                    const statusConfig = getRfqStatus(rfq.status);
                    return (
                      <TableRow key={rfq.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{rfq.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rfq.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{rfq.quotation_number}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rfq.client_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${rfq.suppliers_count} suppliers`} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusConfig.label}
                            color={statusConfig.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(rfq.deadline).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${rfq.bids_received}/${rfq.suppliers_count}`}
                            color={rfq.bids_received > 0 ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleCompareBids(rfq)}
                            disabled={rfq.bids_received === 0}
                          >
                            <CompareIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create RFQ Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>🚀 Create Competitive RFQ Campaign</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Step 1: Select Quotation */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Quotation</InputLabel>
                <Select
                  value={selectedQuotation?.quotation_id || ''}
                  onChange={(e) => {
                    const quotation = openQuotations.find(q => q.quotation_id === e.target.value);
                    setSelectedQuotation(quotation);
                    setRfqDetails(prev => ({
                      ...prev,
                      title: `RFQ for ${quotation?.client_name} - ${quotation?.project_name}`,
                      description: `Competitive bidding for ${quotation?.total_items} items`
                    }));
                  }}
                >
                  {openQuotations.map((quotation) => (
                    <MenuItem key={quotation.quotation_id} value={quotation.quotation_id}>
                      <Box>
                        <Typography variant="subtitle2">
                          {quotation.quotation_number} - {quotation.client_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {quotation.project_name} • {quotation.total_items} items • ₹{quotation.total_value?.toLocaleString()}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Step 2: Select Suppliers */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                📋 Select Suppliers for Competitive Bidding
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Choose multiple suppliers to ensure competitive pricing
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {Array.isArray(availableSuppliers) && availableSuppliers.length > 0 ? (
                  availableSuppliers.map((supplier) => (
                    <Grid item xs={12} sm={6} md={4} key={supplier.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedSuppliers.includes(supplier.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSuppliers([...selectedSuppliers, supplier.id]);
                              } else {
                                setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id));
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle2">{supplier.company_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {supplier.contact_person}
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      No suppliers available. Please add suppliers to enable competitive bidding.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Step 3: RFQ Details */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="RFQ Title"
                value={rfqDetails.title}
                onChange={(e) => setRfqDetails(prev => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={rfqDetails.description}
                onChange={(e) => setRfqDetails(prev => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Response Deadline"
                type="date"
                value={rfqDetails.deadline}
                onChange={(e) => setRfqDetails(prev => ({ ...prev, deadline: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Terms & Conditions"
                multiline
                rows={3}
                value={rfqDetails.terms}
                onChange={(e) => setRfqDetails(prev => ({ ...prev, terms: e.target.value }))}
                placeholder="Payment terms, delivery requirements, quality specifications..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateRfq}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!selectedQuotation || selectedSuppliers.length < 2 || loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Send RFQ to Suppliers'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Bids Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>📊 Compare Supplier Bids - {selectedRfq?.title}</DialogTitle>
        <DialogContent>
          {supplierBids.length === 0 ? (
            <Alert severity="info">
              No bids received yet. Suppliers have until {selectedRfq?.deadline} to submit their quotes.
            </Alert>
          ) : (
            <Box>
              {/* Savings Summary */}
              {(() => {
                const savings = calculateSavings(supplierBids);
                return savings && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">
                      💰 Competitive Savings: ₹{savings.amount.toLocaleString()} ({savings.percentage}%)
                    </Typography>
                    <Typography variant="caption">
                      Difference between highest and lowest bid
                    </Typography>
                  </Alert>
                );
              })()}

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Total Price</TableCell>
                      <TableCell>Delivery Time</TableCell>
                      <TableCell>Payment Terms</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {supplierBids.map((bid) => (
                      <TableRow key={bid.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{bid.supplier_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Contact: {bid.contact_person}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" color="primary">
                            ₹{parseFloat(bid.total_price).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{bid.delivery_days} days</TableCell>
                        <TableCell>{bid.payment_terms}</TableCell>
                        <TableCell>
                          <Chip
                            label={bid.status}
                            color={bid.status === 'submitted' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => handleSelectWinningBid(bid.id, bid.supplier_id)}
                            disabled={bid.status !== 'submitted'}
                          >
                            Select Winner
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
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompetitiveBiddingManager;