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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { QuotationPDFGenerator } from './PDFGenerator';

const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [availableEstimations, setAvailableEstimations] = useState([]);
  const [formData, setFormData] = useState({
    estimation_id: '',
    description: '',
    status: 'draft',
  });

  useEffect(() => {
    fetchQuotations();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('vtria_token') || 'demo-token'}`
  });

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError('');
      // Prefer enhanced endpoint for richer data; fall back to basic if unauthorized
      let response;
      try {
        response = await axios.get('http://localhost:3001/api/quotations/enhanced/all', { headers: authHeaders() });
      } catch (enhErr) {
        if (enhErr.response && enhErr.response.status === 401) {
          response = await axios.get('http://localhost:3001/api/quotations', { headers: authHeaders() });
        } else {
          throw enhErr;
        }
      }
      setQuotations(response.data.data || []);
      await fetchAvailableEstimations();
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setError('Failed to load quotations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEstimations = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/estimation', { headers: authHeaders() });
      const allEstimations = response.data.data || [];
      const estimationsWithoutQuotations = allEstimations.filter(estimation =>
        estimation.status === 'approved' &&
        !quotations.some(quotation => (quotation.estimation_fk_id || quotation.estimation_id) === estimation.id)
      );
      setAvailableEstimations(estimationsWithoutQuotations);
    } catch (error) {
      console.error('Error fetching estimations:', error);
    }
  };

  const handleOpen = (quotation = null) => {
    if (quotation) {
      setEditingQuotation(quotation);
      setFormData({
        estimation_id: quotation.estimation_id || '',
        description: quotation.description || '',
        status: quotation.status || 'draft',
      });
    } else {
      setEditingQuotation(null);
      // Auto-populate with first available estimation if any
      const firstAvailableEstimation = availableEstimations[0];
      setFormData({
        estimation_id: firstAvailableEstimation ? firstAvailableEstimation.id.toString() : '',
        description: firstAvailableEstimation ? `Quotation for ${firstAvailableEstimation.project_name || 'Project'}` : '',
        status: 'draft',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingQuotation(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (editingQuotation) {
        // Update existing quotation - not implemented yet
        setError('Edit functionality not yet implemented');
        return;
      } else {
        // Create new quotation
        const response = await axios.post('http://localhost:3001/api/quotations', formData, { headers: authHeaders() });

        // Refresh the quotations list and available estimations
        await fetchQuotations();
        await fetchAvailableEstimations();
      }
      handleClose();
    } catch (error) {
      console.error('Error saving quotation:', error);
      setError(error.response?.data?.message || 'Failed to save quotation');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await axios.delete(`http://localhost:3001/api/quotations/${id}`, { headers: authHeaders() });
        setQuotations(quotations.filter(quotation => quotation.id !== id));
        // Refresh available estimations since one might now be available
        await fetchAvailableEstimations();
        setError('');
      } catch (error) {
        console.error('Error deleting quotation:', error);
        setError(error.response?.data?.message || 'Failed to delete quotation');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'accepted': return 'success';
      case 'pending': return 'warning';
      case 'pending_approval': return 'warning';
      case 'draft': return 'default';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const calculateProfitPercentage = (quotation) => {
    if (quotation.profit_percentage_calculated != null) {
      return `${Number(quotation.profit_percentage_calculated).toFixed(2)}%`;
    }
    if (quotation.total_mrp && quotation.total_final_price) {
      const mrp = parseFloat(quotation.total_mrp);
      const finalPrice = parseFloat(quotation.total_final_price);
      if (mrp > 0) return `${(((mrp - finalPrice) / mrp) * 100).toFixed(2)}%`;
    }
    return 'N/A';
  };

  const handleApprove = async (quotationId) => {
    try {
      // First approve the quotation
      const approveResponse = await axios.post(`http://localhost:3001/api/quotations/enhanced/${quotationId}/approve`, {}, { headers: authHeaders() });

      if (approveResponse.data.success) {
        // Then automatically create manufacturing case
        try {
          const manufacturingResponse = await axios.post(
            'http://localhost:3001/api/manufacturing/cases/create-from-quote',
            { quotation_id: quotationId, priority: 'medium', notes: 'Manufacturing case auto-created from approved quotation' },
            { headers: authHeaders() }
          );

          if (manufacturingResponse.data.success) {
            await fetchQuotations();
            alert(`✅ Quotation approved and manufacturing case ${manufacturingResponse.data.data.case_number} created successfully!\n\nYou can now manage the manufacturing process in the Manufacturing section.`);
          } else {
            await fetchQuotations();
            alert('✅ Quotation approved successfully!\n⚠️ Please manually create manufacturing case from Manufacturing section.');
          }
        } catch (manufacturingError) {
          console.error('Error creating manufacturing case:', manufacturingError);
          await fetchQuotations();
          alert('✅ Quotation approved successfully!\n⚠️ Please manually create manufacturing case from Manufacturing section.');
        }
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
      alert('❌ Failed to approve quotation. Please try again.');
    }
  };

  const handleStatusUpdate = async (quotationId, newStatus) => {
    try {
      const response = await axios.put(`http://localhost:3001/api/quotations/enhanced/${quotationId}/status`, {
        status: newStatus
      }, { headers: authHeaders() });
      if (response.data.success) {
        await fetchQuotations();
      }
    } catch (error) {
      console.error('Error updating quotation status:', error);
      alert('Failed to update quotation status. Please try again.');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Quotations</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ backgroundColor: '#1976d2' }}
        >
          New Quotation
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Quotation No.</TableCell>
                <TableCell>Est.No</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Profit %</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No quotations found. Create your first quotation!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.quotation_id}</TableCell>
                    <TableCell>{quotation.estimation_code || quotation.estimation_id || quotation.estimation_fk_id || 'N/A'}</TableCell>
                    <TableCell>{quotation.client_name}</TableCell>
                    <TableCell>{quotation.project_name}</TableCell>
                    <TableCell>₹{quotation.total_amount?.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{calculateProfitPercentage(quotation)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={quotation.status}
                          color={getStatusColor(quotation.status)}
                          size="small"
                        />
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={quotation.status}
                            onChange={(e) => handleStatusUpdate(quotation.id, e.target.value)}
                            size="small"
                            sx={{ height: '28px' }}
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="pending_approval">Pending Approval</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="accepted">Accepted by Client</MenuItem>
                            <MenuItem value="rejected">Rejected</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-IN') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1} alignItems="center">
                        <IconButton onClick={() => handleOpen(quotation)} size="small" title="Edit">
                          <EditIcon />
                        </IconButton>

                        {(quotation.status === 'draft' || quotation.status === 'pending_approval') && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleApprove(quotation.id)}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            Approve & Start Manufacturing
                          </Button>
                        )}

                        <QuotationPDFGenerator
                          quotationId={quotation.id}
                          quotationNumber={quotation.quotation_id}
                          variant="text"
                          size="small"
                        />

                        <IconButton onClick={() => handleDelete(quotation.id)} size="small" title="Delete">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          padding: '28px 36px',
          borderBottom: 'none'
        }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              💰
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingQuotation ? 'Edit Quotation' : 'New Quotation'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create professional quotations for VTRIA Engineering Solutions
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
          {error && (
            <Box sx={{ p: 4, pb: 0 }}>
              <Alert
                severity="error"
                sx={{
                  borderRadius: '16px',
                  border: '1px solid #ffcdd2',
                  backgroundColor: '#fff8f8'
                }}
              >
                {error}
              </Alert>
            </Box>
          )}
          <Box sx={{ p: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 4,
                color: '#2c3e50',
                fontWeight: 600,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              📋 Quotation Information
            </Typography>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e8eaed'
              }}
            >
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Estimation ID *
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={formData.estimation_id}
                        onChange={(e) => {
                          const selectedEstimation = availableEstimations.find(est => est.id.toString() === e.target.value);
                          setFormData({
                            ...formData,
                            estimation_id: e.target.value,
                            description: selectedEstimation ? `Quotation for ${selectedEstimation.project_name || 'Project'}` : formData.description
                          });
                        }}
                        displayEmpty
                        variant="outlined"
                        sx={{
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>Select an estimation</em>
                        </MenuItem>
                        {availableEstimations.map((estimation) => (
                          <MenuItem key={estimation.id} value={estimation.id.toString()}>
                            {estimation.estimation_id} - {estimation.project_name || 'Unnamed Project'} ({estimation.client_name})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: '#555',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Quotation Description
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide detailed terms, conditions, specifications, delivery terms, payment terms, and any special considerations..."
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed',
          gap: 3
        }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.8,
              borderColor: '#e0e7ff',
              color: '#666',
              fontSize: '1rem',
              borderWidth: '2px',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderWidth: '2px'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 700,
              px: 5,
              py: 1.8,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {editingQuotation ? '✓ Update Quotation' : '💰 Create Quotation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Quotations;
