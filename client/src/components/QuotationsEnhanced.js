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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  DateRange as DateRangeIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as ApproveIcon,
  Send as SendIcon,
  ThumbUp as AcceptIcon,
  ThumbDown as RejectIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

const QuotationsEnhanced = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState({ open: false, quotation: null });
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [quotationDetails, setQuotationDetails] = useState(null);
  const [quotationItems, setQuotationItems] = useState([]);
  const [availableEstimations, setAvailableEstimations] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState({
    estimation_id: '',
    client_state: '',
    lead_time_days: 30,
    terms_conditions: 'Standard terms and conditions apply',
    delivery_terms: '4-6 weeks from approval',
    payment_terms: '30% advance, 70% on delivery',
    warranty_terms: '12 months warranty from date of installation',
    notes: '',
  });

  useEffect(() => {
    fetchQuotations();
    fetchAvailableEstimations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch quotations with enhanced detailed information
      const response = await axios.get('http://localhost:3001/api/quotation/enhanced/all');
      if (response.data.success) {
        setQuotations(response.data.data || []);
      } else {
        // Fallback to basic API if enhanced endpoint doesn't exist
        const basicResponse = await axios.get('http://localhost:3001/api/quotation');
        const basicQuotations = basicResponse.data.data || [];
        
        // Enhance quotations with additional data
        const enhancedQuotations = await Promise.all(
          basicQuotations.map(async (quotation) => {
            try {
              // Get estimation details
              const estResponse = await axios.get(`http://localhost:3001/api/estimation/${quotation.estimation_id}`);
              const estimation = estResponse.data.data;
              
              if (estimation && estimation.case_id) {
                // Get case details
                const caseResponse = await axios.get(`http://localhost:3001/api/case-management/${estimation.case_id}`);
                const caseData = caseResponse.data.data;
                
                if (caseData) {
                  // Get client details
                  const clientResponse = await axios.get(`http://localhost:3001/api/clients/${caseData.client_id}`);
                  const client = clientResponse.data.data;
                  
                  return {
                    ...quotation,
                    estimation_number: estimation.estimation_id,
                    case_number: caseData.case_number,
                    project_name: caseData.project_name,
                    client_name: client?.company_name || 'Unknown Client',
                    client_contact: client?.contact_person || '',
                    estimation_total: estimation.total_final_price || 0,
                  };
                }
              }
              
              return {
                ...quotation,
                estimation_number: 'N/A',
                case_number: 'N/A',
                project_name: 'N/A',
                client_name: 'N/A',
                client_contact: '',
                estimation_total: 0,
              };
            } catch (error) {
              console.error('Error enhancing quotation:', error);
              return quotation;
            }
          })
        );
        
        setQuotations(enhancedQuotations);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setError('Failed to load quotations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEstimations = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/estimation');
      const allEstimations = response.data.data || [];
      
      // Get estimations that are approved
      const approvedEstimations = allEstimations.filter(estimation => 
        estimation.status === 'approved'
      );
      
      // Enhance with case and client information
      const enhancedEstimations = await Promise.all(
        approvedEstimations.map(async (estimation) => {
          try {
            // Get case details
            const caseResponse = await axios.get(`http://localhost:3001/api/case-management/${estimation.case_id}`);
            const caseData = caseResponse.data.data;
            
            if (caseData) {
              // Get client details
              const clientResponse = await axios.get(`http://localhost:3001/api/clients/${caseData.client_id}`);
              const client = clientResponse.data.data;
              
              return {
                ...estimation,
                case_number: caseData.case_number,
                project_name: caseData.project_name,
                client_name: client?.company_name || 'Unknown Client',
                hasQuotation: quotations.some(q => q.estimation_id === estimation.id)
              };
            }
            
            return null;
          } catch (error) {
            console.error('Error enhancing estimation:', error);
            return null;
          }
        })
      );
      
      // Filter out null entries and estimations that already have quotations
      const validEstimations = enhancedEstimations
        .filter(est => est !== null && !est.hasQuotation);
      
      setAvailableEstimations(validEstimations);
    } catch (error) {
      console.error('Error fetching estimations:', error);
    }
  };

  const fetchQuotationDetails = async (quotationId) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/quotation/enhanced/${quotationId}`);
      if (response.data.success) {
        setQuotationDetails(response.data.data);
        setQuotationItems(response.data.data.items || []);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching quotation details:', error);
      setError('Failed to fetch quotation details');
    }
    return null;
  };

  const handleOpen = async (quotation = null) => {
    if (quotation) {
      setEditingQuotation(quotation);
      
      // Fetch detailed quotation data including items
      const details = await fetchQuotationDetails(quotation.id);
      
      setFormData({
        estimation_id: quotation.estimation_id?.toString() || '',
        client_state: quotation.client_state || details?.client_state || '',
        lead_time_days: quotation.lead_time_days || 30,
        terms_conditions: quotation.terms_conditions || 'Standard terms and conditions apply',
        delivery_terms: quotation.delivery_terms || '4-6 weeks from approval',
        payment_terms: quotation.payment_terms || '30% advance, 70% on delivery',
        warranty_terms: quotation.warranty_terms || '12 months warranty from date of installation',
        notes: quotation.notes || '',
      });
    } else {
      setEditingQuotation(null);
      setQuotationDetails(null);
      setQuotationItems([]);
      setFormData({
        estimation_id: '',
        client_state: '',
        lead_time_days: 30,
        terms_conditions: 'Standard terms and conditions apply',
        delivery_terms: '4-6 weeks from approval',
        payment_terms: '30% advance, 70% on delivery',
        warranty_terms: '12 months warranty from date of installation',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingQuotation(null);
    setQuotationDetails(null);
    setQuotationItems([]);
    setError('');
    setCurrentTab(0);
  };

  const handleViewClose = () => {
    setViewDialog({ open: false, quotation: null });
  };

  const handleView = (quotation) => {
    setViewDialog({ open: true, quotation });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.estimation_id) {
        setError('Please select an estimation');
        return;
      }
      
      if (editingQuotation) {
        // Update existing quotation using enhanced API
        const response = await axios.put(`http://localhost:3001/api/quotation/enhanced/${editingQuotation.id}`, formData);
        if (response.data.success) {
          await fetchQuotations();
          await fetchAvailableEstimations();
          handleClose();
        } else {
          setError(response.data.message || 'Failed to update quotation');
        }
      } else {
        // Create new quotation using enhanced API
        const response = await axios.post('http://localhost:3001/api/quotation/enhanced/create', formData);
        if (response.data.success) {
          await fetchQuotations();
          await fetchAvailableEstimations();
          handleClose();
        } else {
          setError(response.data.message || 'Failed to create quotation');
        }
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      setError(error.response?.data?.message || 'Failed to save quotation');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        const response = await axios.delete(`http://localhost:3001/api/quotation/${id}`);
        if (response.data.success) {
          await fetchQuotations();
          await fetchAvailableEstimations();
          setError('');
        } else {
          setError(response.data.message || 'Failed to delete quotation');
        }
      } catch (error) {
        console.error('Error deleting quotation:', error);
        setError(error.response?.data?.message || 'Failed to delete quotation');
      }
    }
  };

  const handleApproveQuotation = async (id) => {
    if (window.confirm('Are you sure you want to approve this quotation?')) {
      try {
        setError('');
        const response = await axios.post(`http://localhost:3001/api/quotation/enhanced/${id}/approve`);
        if (response.data.success) {
          await fetchQuotations();
        } else {
          setError(response.data.message || 'Failed to approve quotation');
        }
      } catch (error) {
        console.error('Error approving quotation:', error);
        setError(error.response?.data?.message || 'Failed to approve quotation');
      }
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      setError('');
      const response = await axios.put(`http://localhost:3001/api/quotation/enhanced/${id}/status`, {
        status: status
      });
      if (response.data.success) {
        await fetchQuotations();
      } else {
        setError(response.data.message || `Failed to update status to ${status}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error.response?.data?.message || `Failed to update status to ${status}`);
    }
  };

  const handleSendQuotation = async (id) => {
    if (window.confirm('Send this quotation to the client?')) {
      await handleStatusUpdate(id, 'sent');
    }
  };

  const handleGeneratePDF = async (quotationId, quotationNumber) => {
    try {
      setError('');
      const response = await axios.get(
        `http://localhost:3001/api/quotation/enhanced/${quotationId}/pdf`,
        { responseType: 'blob' }
      );
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation_${quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'sent': return 'info';
      case 'accepted': return 'success';
      case 'pending_approval': return 'warning';
      case 'rejected': return 'error';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ padding: '24px 0' }}>
      {value === index && children}
    </div>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
            📝 Quotations Management
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage quotations linked to approved estimations and cases
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ 
            backgroundColor: '#1976d2',
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            fontWeight: 600,
          }}
          disabled={availableEstimations.length === 0}
        >
          New Quotation
        </Button>
      </Box>

      {availableEstimations.length === 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          <strong>No approved estimations available.</strong>
          <br />
          To create a quotation, you need approved estimations with associated cases.
          Please ensure you have completed the estimation process first.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: '16px', 
            overflow: 'auto',
            maxHeight: '70vh',
            '& .MuiTable-root': {
              minWidth: { xs: 900, sm: 1100, md: 1300, lg: 1400 },
              tableLayout: 'fixed'
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '110px', sm: '120px', md: '130px' },
                  backgroundColor: '#f5f5f5',
                  whiteSpace: 'nowrap'
                }}>
                  Quotation No.
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '90px', sm: '100px' },
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', sm: 'table-cell' }
                }}>
                  Case No.
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '90px', sm: '100px' },
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', md: 'table-cell' }
                }}>
                  Est. No.
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '140px', sm: '160px', md: '180px' },
                  backgroundColor: '#f5f5f5'
                }}>
                  Client
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '120px', sm: '140px', md: '160px' },
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', sm: 'table-cell' }
                }}>
                  Project
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '100px', sm: '110px', md: '120px' },
                  backgroundColor: '#f5f5f5'
                }}>
                  Amount
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '80px', sm: '90px' },
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', lg: 'table-cell' }
                }}>
                  Profit %
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '100px', sm: '110px' },
                  backgroundColor: '#f5f5f5'
                }}>
                  Status
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  width: { xs: '90px', sm: '100px' },
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', md: 'table-cell' }
                }}>
                  Date
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700, 
                    width: { xs: '150px', sm: '180px', md: '200px' },
                    backgroundColor: '#f5f5f5',
                    position: 'sticky',
                    right: 0,
                    zIndex: 1,
                    boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={{ xs: 6, sm: 8, md: 10 }} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      📄 No quotations found. Create your first quotation!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={quotation.id} hover>
                    {/* Quotation No - Always visible */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {quotation.quotation_id}
                      </Typography>
                    </TableCell>
                    
                    {/* Case No - Hidden on mobile */}
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }} noWrap>
                        {quotation.case_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    
                    {/* Est No - Hidden on mobile and tablet */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" noWrap>
                        {quotation.estimation_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    
                    {/* Client - Always visible */}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {quotation.client_name}
                        </Typography>
                        {/* Show additional info on mobile */}
                        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                          <Typography variant="caption" color="textSecondary" noWrap>
                            Case: {quotation.case_number || 'N/A'}
                            {quotation.project_name && ` • ${quotation.project_name.substring(0, 10)}...`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    {/* Project - Hidden on mobile */}
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" noWrap title={quotation.project_name || 'N/A'}>
                        {quotation.project_name ? 
                          (quotation.project_name.length > 15 ? 
                            quotation.project_name.substring(0, 15) + '...' : 
                            quotation.project_name) : 'N/A'}
                      </Typography>
                    </TableCell>
                    
                    {/* Amount - Always visible */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }} noWrap>
                        ₹{quotation.grand_total?.toLocaleString('en-IN') || quotation.estimation_total?.toLocaleString('en-IN') || '0'}
                      </Typography>
                    </TableCell>
                    
                    {/* Profit % - Hidden on smaller screens */}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {quotation.profit_percentage !== undefined && quotation.profit_percentage !== null ? (
                        <Chip
                          label={`${Number(quotation.profit_percentage).toFixed(1)}%`}
                          color={quotation.profit_percentage < 10 ? 'error' : 'success'}
                          size="small"
                          sx={{ borderRadius: '6px', fontWeight: 500 }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    
                    {/* Status - Always visible */}
                    <TableCell>
                      <Box>
                        <Chip
                          label={quotation.status}
                          color={getStatusColor(quotation.status)}
                          size="small"
                          sx={{ borderRadius: '6px', fontWeight: 500 }}
                        />
                        {/* Show profit % on smaller screens where it's hidden */}
                        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                          {quotation.profit_percentage !== undefined && quotation.profit_percentage !== null && (
                            <Typography variant="caption" color="textSecondary" noWrap>
                              Profit: {Number(quotation.profit_percentage).toFixed(1)}%
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    
                    {/* Date - Hidden on mobile and tablet */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" noWrap>
                        {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-IN') : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{ 
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'white',
                        zIndex: 1,
                        boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Box display="flex" gap={0.25} flexWrap="wrap">
                        <IconButton 
                          onClick={() => handleView(quotation)} 
                          size="small" 
                          title="View"
                          sx={{ color: '#1976d2', p: 0.5 }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        
                        {/* PDF download */}
                        <IconButton 
                          onClick={() => handleGeneratePDF(quotation.id, quotation.quotation_id)} 
                          size="small" 
                          title="PDF"
                          sx={{ color: '#2e7d32', p: 0.5 }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>

                        {/* Edit - only for draft and pending_approval */}
                        {['draft', 'pending_approval'].includes(quotation.status) && (
                          <IconButton 
                            onClick={() => handleOpen(quotation)} 
                            size="small" 
                            title="Edit"
                            sx={{ color: '#ed6c02', p: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}

                        {/* Approve - only for pending_approval */}
                        {quotation.status === 'pending_approval' && (
                          <IconButton 
                            onClick={() => handleApproveQuotation(quotation.id)} 
                            size="small" 
                            title="Approve"
                            sx={{ color: '#2e7d32', p: 0.5 }}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        )}

                        {/* Send - only for approved */}
                        {quotation.status === 'approved' && (
                          <IconButton 
                            onClick={() => handleSendQuotation(quotation.id)} 
                            size="small" 
                            title="Send"
                            sx={{ color: '#1976d2', p: 0.5 }}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        )}

                        {/* Accept - only for sent */}
                        {quotation.status === 'sent' && (
                          <IconButton 
                            onClick={() => handleStatusUpdate(quotation.id, 'accepted')} 
                            size="small" 
                            title="Accept"
                            sx={{ color: '#2e7d32', p: 0.5 }}
                          >
                            <AcceptIcon fontSize="small" />
                          </IconButton>
                        )}

                        {/* Reject - only for sent */}
                        {quotation.status === 'sent' && (
                          <IconButton 
                            onClick={() => handleStatusUpdate(quotation.id, 'rejected')} 
                            size="small" 
                            title="Reject"
                            sx={{ color: '#d32f2f', p: 0.5 }}
                          >
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        )}

                        {/* Delete - only for draft and rejected */}
                        {['draft', 'rejected'].includes(quotation.status) && (
                          <IconButton 
                            onClick={() => handleDelete(quotation.id)} 
                            size="small" 
                            title="Delete"
                            sx={{ color: '#d32f2f', p: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.25rem',
          fontWeight: 700,
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <AssignmentIcon />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Professional quotations for VTRIA Engineering Solutions
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="Basic Information" />
            {editingQuotation && <Tab label="Items" />}
            <Tab label="Terms & Conditions" />
            <Tab label="Additional Notes" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          {error && (
            <Box sx={{ p: 3, pb: 0 }}>
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {error}
              </Alert>
            </Box>
          )}

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                📋 Quotation Details
              </Typography>
              
              <Grid container spacing={3}>
                {editingQuotation && quotationDetails ? (
                  // Show read-only case and estimation info when editing
                  <Grid item xs={12}>
                    <Card sx={{ p: 3, backgroundColor: '#f5f5f5', borderRadius: '12px' }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
                        📄 Quotation Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Quotation Number</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {editingQuotation.quotation_id}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Estimation Number</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {quotationDetails.estimation_number}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Project Name</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {quotationDetails.project_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Client</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {quotationDetails.client_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            ₹{parseFloat(quotationDetails.total_amount || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Grand Total</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            ₹{parseFloat(quotationDetails.grand_total || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                ) : (
                  // Show estimation selector when creating new quotation
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Select Case & Estimation *</InputLabel>
                      <Select
                        value={formData.estimation_id}
                        onChange={(e) => setFormData({ ...formData, estimation_id: e.target.value })}
                        label="Select Case & Estimation *"
                        disabled={editingQuotation !== null}
                      >
                        <MenuItem value="">
                          <em>Select an estimation</em>
                        </MenuItem>
                        {availableEstimations.map((estimation) => (
                          <MenuItem key={estimation.id} value={estimation.id.toString()}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {estimation.case_number} → {estimation.estimation_id}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {estimation.project_name} ({estimation.client_name})
                              </Typography>
                              <Typography variant="caption" sx={{ ml: 1, color: '#2e7d32' }}>
                                ₹{estimation.total_final_price?.toLocaleString('en-IN')}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Client State"
                    value={formData.client_state}
                    onChange={(e) => setFormData({ ...formData, client_state: e.target.value })}
                    placeholder="Enter client state for tax calculation"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Lead Time (Days)"
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Items Tab - Only shown when editing */}
          {editingQuotation && (
            <TabPanel value={currentTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                  📦 Quotation Items
                </Typography>
                
                {quotationItems.length > 0 ? (
                  <TableContainer component={Paper} sx={{ borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Rate (₹)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Tax %</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Amount (₹)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quotationItems.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item.item_name}
                              </Typography>
                              {item.hsn_code && (
                                <Typography variant="caption" color="textSecondary">
                                  HSN: {item.hsn_code}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {item.quantity} {item.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {item.tax_percentage}%
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                                ₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    No items found for this quotation.
                  </Alert>
                )}
              </Box>
            </TabPanel>
          )}

          <TabPanel value={currentTab} index={editingQuotation ? 2 : 1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                📝 Terms & Conditions
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Terms & Conditions"
                    multiline
                    rows={3}
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Delivery Terms"
                    multiline
                    rows={3}
                    value={formData.delivery_terms}
                    onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    multiline
                    rows={3}
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Warranty Terms"
                    multiline
                    rows={3}
                    value={formData.warranty_terms}
                    onChange={(e) => setFormData({ ...formData, warranty_terms: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={editingQuotation ? 3 : 2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                📄 Additional Information
              </Typography>
              
              <TextField
                fullWidth
                label="Internal Notes"
                multiline
                rows={6}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any internal notes, special considerations, or additional information..."
                variant="outlined"
              />
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{ borderRadius: '8px', px: 3 }}
          >
            Cancel
          </Button>
          
          {editingQuotation && editingQuotation.status === 'draft' && (
            <Button 
              onClick={async () => {
                await handleSubmit();
                if (editingQuotation) {
                  await handleStatusUpdate(editingQuotation.id, 'pending_approval');
                }
              }}
              variant="contained"
              color="warning"
              sx={{ borderRadius: '8px', px: 3 }}
              startIcon={<EmailIcon />}
            >
              Submit for Approval
            </Button>
          )}
          
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              borderRadius: '8px', 
              px: 4,
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            }}
          >
            {editingQuotation ? 'Update Quotation' : 'Create Quotation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={handleViewClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <ViewIcon />
            <Box>
              <Typography variant="h6">
                Quotation Details: {viewDialog.quotation?.quotation_id}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Complete quotation information and preview
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          {viewDialog.quotation && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="primary" />
                    Client Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText 
                        primary="Company" 
                        secondary={viewDialog.quotation.client_name}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText 
                        primary="Project" 
                        secondary={viewDialog.quotation.project_name}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText 
                        primary="Case Number" 
                        secondary={viewDialog.quotation.case_number}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon color="primary" />
                    Financial Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText 
                        primary="Total Amount" 
                        secondary={`₹${viewDialog.quotation.grand_total?.toLocaleString('en-IN') || '0'}`}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText 
                        primary="Status" 
                        secondary={
                          <Chip 
                            label={viewDialog.quotation.status} 
                            color={getStatusColor(viewDialog.quotation.status)}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText 
                        primary="Valid Until" 
                        secondary={viewDialog.quotation.valid_until ? 
                          new Date(viewDialog.quotation.valid_until).toLocaleDateString('en-IN') : 'N/A'}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentIcon color="primary" />
                    Terms & Conditions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Terms & Conditions:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.terms_conditions || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Delivery Terms:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.delivery_terms || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Payment Terms:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.payment_terms || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Warranty Terms:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.warranty_terms || 'Not specified'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={handleViewClose} variant="outlined">
            Close
          </Button>
          <Button 
            onClick={() => handleOpen(viewDialog.quotation)}
            variant="contained"
            startIcon={<EditIcon />}
          >
            Edit Quotation
          </Button>
          <Button 
            onClick={() => handleGeneratePDF(viewDialog.quotation?.id, viewDialog.quotation?.quotation_id)}
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuotationsEnhanced;