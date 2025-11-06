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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Divider
} from '@mui/material';
import {
  Visibility as ViewIcon,
  History as HistoryIcon,
  Archive as ArchiveIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  RequestQuote as QuoteIcon,
  ShoppingCart as OrderIcon,
  LocalShipping as ShippingIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = '';

const ClosedCasesManager = () => {
  const [closedCases, setClosedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDialog, setViewDialog] = useState({ open: false, case: null });
  const [filterClient, setFilterClient] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('all');

  useEffect(() => {
    fetchClosedCases();
  }, []);

  const fetchClosedCases = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/closed-cases`);
      if (response.data.success) {
        setClosedCases(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching closed cases:', error);
      setError('Failed to load closed cases');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCaseHistory = async (caseId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/closed-cases/${caseId}/history`);
      if (response.data.success) {
        setViewDialog({ open: true, case: response.data.data });
      }
    } catch (error) {
      console.error('Error fetching case history:', error);
      setError('Failed to load case history');
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'sales_enquiry': return <BusinessIcon />;
      case 'estimation': return <AssignmentIcon />;
      case 'quotation': return <QuoteIcon />;
      case 'sales_order': return <OrderIcon />;
      case 'delivery': return <ShippingIcon />;
      default: return <HistoryIcon />;
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'sales_enquiry': return 'info';
      case 'estimation': return 'warning';
      case 'quotation': return 'primary';
      case 'sales_order': return 'success';
      case 'delivery': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const filteredCases = closedCases.filter(caseItem => {
    const clientMatch = !filterClient || 
      caseItem.client_name.toLowerCase().includes(filterClient.toLowerCase());
    
    let dateMatch = true;
    if (filterDateRange !== 'all') {
      const caseDate = new Date(caseItem.closed_date);
      const now = new Date();
      const daysAgo = parseInt(filterDateRange);
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
      dateMatch = caseDate >= cutoffDate;
    }
    
    return clientMatch && dateMatch;
  });

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
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                <ArchiveIcon sx={{ mr: 2, fontSize: '2rem' }} />
                Closed Cases Archive
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Complete transaction history for shipped orders
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Filters
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search by Client"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                placeholder="Enter client name..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  label="Date Range"
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="30">Last 30 Days</MenuItem>
                  <MenuItem value="90">Last 3 Months</MenuItem>
                  <MenuItem value="180">Last 6 Months</MenuItem>
                  <MenuItem value="365">Last Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Closed Cases Table */}
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Closed Cases ({filteredCases.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Case ID</strong></TableCell>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Project</strong></TableCell>
                  <TableCell><strong>Final Status</strong></TableCell>
                  <TableCell><strong>Total Value</strong></TableCell>
                  <TableCell><strong>Closed Date</strong></TableCell>
                  <TableCell><strong>Duration</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {caseItem.enquiry_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Started: {formatDate(caseItem.created_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {caseItem.client_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {caseItem.city}, {caseItem.state}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {caseItem.project_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="DELIVERED"
                        color="success"
                        size="small"
                        icon={<ShippingIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(caseItem.total_value)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(caseItem.closed_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {caseItem.duration_days} days
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Complete History">
                        <IconButton
                          size="small"
                          onClick={() => handleViewCaseHistory(caseItem.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Case History Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={() => setViewDialog({ open: false, case: null })}
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            <HistoryIcon sx={{ mr: 1 }} />
            Complete Transaction History - {viewDialog.case?.enquiry_id}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {viewDialog.case && (
            <Box sx={{ mt: 2 }}>
              {/* Case Summary */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <BusinessIcon sx={{ mr: 1 }} />
                        Client Details
                      </Typography>
                      <Typography variant="body2">
                        <strong>Company:</strong> {viewDialog.case.client_name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Contact:</strong> {viewDialog.case.contact_person}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Location:</strong> {viewDialog.case.city}, {viewDialog.case.state}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <AssignmentIcon sx={{ mr: 1 }} />
                        Project Summary
                      </Typography>
                      <Typography variant="body2">
                        <strong>Project:</strong> {viewDialog.case.project_name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Duration:</strong> {viewDialog.case.duration_days} days
                      </Typography>
                      <Typography variant="body2">
                        <strong>Final Value:</strong> {formatCurrency(viewDialog.case.total_value)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <CalendarIcon sx={{ mr: 1 }} />
                        Timeline
                      </Typography>
                      <Typography variant="body2">
                        <strong>Started:</strong> {formatDate(viewDialog.case.created_date)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Closed:</strong> {formatDate(viewDialog.case.closed_date)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> 
                        <Chip label="COMPLETED" color="success" size="small" sx={{ ml: 1 }} />
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Transaction Timeline */}
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Transaction Timeline
              </Typography>
              
              <Timeline>
                {viewDialog.case.timeline?.map((event, index) => (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot color={getStatusColor(event.type)}>
                        {getStatusIcon(event.type)}
                      </TimelineDot>
                      {index < viewDialog.case.timeline.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {event.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {event.description}
                              </Typography>
                              {event.reference_id && (
                                <Typography variant="caption" sx={{ 
                                  backgroundColor: '#f5f5f5', 
                                  px: 1, 
                                  py: 0.5, 
                                  borderRadius: 1 
                                }}>
                                  Ref: {event.reference_id}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(event.date)}
                              </Typography>
                              {event.amount && (
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {formatCurrency(event.amount)}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                by {event.created_by}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>

              {/* Documents & Files */}
              {viewDialog.case.documents && viewDialog.case.documents.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Related Documents
                  </Typography>
                  <Grid container spacing={2}>
                    {viewDialog.case.documents.map((doc, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {doc.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {doc.type} • {formatDate(doc.created_at)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, case: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClosedCasesManager;
