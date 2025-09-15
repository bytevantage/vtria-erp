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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Send as SubmitIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Build as DesignIcon,
} from '@mui/icons-material';
import axios from 'axios';
import EstimationDesigner from './EstimationDesigner';
import EstimationDetailView from './EstimationDetailView';

const API_BASE_URL = 'http://localhost:3001';

const Estimation = () => {
  const [estimations, setEstimations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    enquiry_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [editingEstimation, setEditingEstimation] = useState(null);
  const [selectedEstimation, setSelectedEstimation] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerEstimation, setDesignerEstimation] = useState(null);

  useEffect(() => {
    fetchEstimations();
    fetchAvailableEnquiries();
  }, []);

  const fetchEstimations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/estimation`);
      
      if (response.data.success) {
        setEstimations(response.data.data);
      } else {
        setError('Failed to fetch estimations');
      }
    } catch (error) {
      console.error('Error fetching estimations:', error);
      setError('Error connecting to server. Please check if the API is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEnquiries = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sales-enquiry`);
      
      if (response.data.success) {
        // Get existing estimations to filter out enquiries that already have estimations
        const estimationsResponse = await axios.get(`${API_BASE_URL}/api/estimation`);
        const existingEstimations = estimationsResponse.data.success ? estimationsResponse.data.data : [];
        const estimatedEnquiryIds = existingEstimations.map(est => est.enquiry_id);
        
        // Show only enquiries that don't have estimations yet
        const availableEnquiries = response.data.data.filter(enquiry => 
          (enquiry.status === 'assigned' || enquiry.status === 'new' || enquiry.status === 'for_estimation') &&
          !estimatedEnquiryIds.includes(enquiry.enquiry_id)
        );
        setEnquiries(availableEnquiries);
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'draft': 'default',
      'submitted': 'info',
      'approved': 'success',
      'rejected': 'error'
    };
    return statusColors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  const handleOpen = () => {
    setFormData({ enquiry_id: '' });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setEditingEstimation(null);
    setFormData({
      enquiry_id: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Only validate enquiry_id for new estimations, not when editing
      if (!editingEstimation && !formData.enquiry_id) {
        setError('Please select an enquiry');
        return;
      }

      if (editingEstimation) {
        // Update existing estimation
        const response = await axios.put(`${API_BASE_URL}/api/estimation/${editingEstimation.id}`, formData);
        
        if (response.data.success) {
          await fetchEstimations();
          handleClose();
        } else {
          setError('Failed to update estimation');
        }
      } else {
        // Create new estimation
        const response = await axios.post(`${API_BASE_URL}/api/estimation`, formData);
        
        if (response.data.success) {
          await fetchEstimations();
          handleClose();
        } else {
          setError('Failed to create estimation');
        }
      }
    } catch (error) {
      console.error('Error saving estimation:', error);
      setError('Error saving estimation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEstimation = (estimation) => {
    // Open detailed view dialog with full estimation details
    setSelectedEstimation(estimation);
    setViewDialogOpen(true);
  };

  const handleEditEstimation = (estimation) => {
    // Open edit form with estimation data
    setFormData({
      enquiry_id: estimation.enquiry_id,
      date: estimation.date.split('T')[0], // Format date for input
      notes: estimation.notes || ''
    });
    setEditingEstimation(estimation);
    setOpen(true);
  };

  const handleSubmitEstimation = async (estimationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/estimation/${estimationId}/submit`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchEstimations();
    } catch (error) {
      console.error('Error submitting estimation:', error);
      setError('Failed to submit estimation');
    }
  };

  const handleApproveEstimation = async (estimationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/estimation/${estimationId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchEstimations();
    } catch (error) {
      console.error('Error approving estimation:', error);
      setError('Failed to approve estimation');
    }
  };

  const handleOpenDesigner = (estimation) => {
    setDesignerEstimation(estimation);
    setDesignerOpen(true);
  };

  const handleCloseDesigner = () => {
    setDesignerOpen(false);
    setDesignerEstimation(null);
    // Refresh estimations after designer closes
    fetchEstimations();
  };

  const workflowSteps = [
    'Sales Enquiry',
    'Estimation',
    'Quotation',
    'Sales Order',
    'Purchase Order',
    'Manufacturing',
    'Delivery'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Estimation - VTRIA Engineering Solutions</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          disabled={enquiries.length === 0}
        >
          Create Estimation
        </Button>
      </Box>

      {/* Workflow Indicator */}
      <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            VTRIA ERP Workflow
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {workflowSteps.map((step, index) => (
              <Chip
                key={step}
                label={`${index + 1}. ${step}`}
                color={index === 1 ? 'primary' : 'default'}
                variant={index === 1 ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {loading && enquiries.length === 0 && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && estimations.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No estimations found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create estimations from assigned sales enquiries to begin the estimation process.
            </Typography>
            {enquiries.length > 0 && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
                Create First Estimation
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && estimations.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estimation ID</TableCell>
                <TableCell>Enquiry ID</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Value</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {estimations.map((estimation) => (
                <TableRow key={estimation.id}>
                  <TableCell>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      {estimation.estimation_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="secondary">
                      {estimation.enquiry_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {estimation.client_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {estimation.city}, {estimation.state}
                    </Typography>
                  </TableCell>
                  <TableCell>{estimation.project_name}</TableCell>
                  <TableCell>{estimation.created_by_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={estimation.status}
                      color={getStatusColor(estimation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatCurrency(estimation.total_final_price)}</TableCell>
                  <TableCell>{new Date(estimation.date).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="primary" onClick={() => handleViewEstimation(estimation)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Design Estimation">
                        <IconButton size="small" color="warning" onClick={() => handleOpenDesigner(estimation)}>
                          <DesignIcon />
                        </IconButton>
                      </Tooltip>
                      {estimation.status === 'draft' && (
                        <Tooltip title="Edit Estimation">
                          <IconButton size="small" color="secondary" onClick={() => handleEditEstimation(estimation)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'draft' && (
                        <Tooltip title="Submit for Approval">
                          <IconButton size="small" color="info" onClick={() => handleSubmitEstimation(estimation.id)}>
                            <SubmitIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'submitted' && (
                        <Tooltip title="Approve">
                          <IconButton size="small" color="success" onClick={() => handleApproveEstimation(estimation.id)}>
                            <ApproveIcon />
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
              📊
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingEstimation ? 'Edit Estimation' : 'Create New Estimation'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {editingEstimation ? 'Update estimation details and notes' : 'Generate detailed cost estimations for client projects'}
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
              📋 Estimation Information
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
                {/* Sales Enquiry Field - Only show when creating new estimation */}
                {!editingEstimation && (
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
                      Sales Enquiry *
                    </Typography>
                    <FormControl fullWidth required variant="outlined">
                      <Select
                        value={formData.enquiry_id}
                        onChange={(e) => setFormData({ ...formData, enquiry_id: e.target.value })}
                        displayEmpty
                        sx={{ 
                          borderRadius: '16px',
                          backgroundColor: '#f8f9fa',
                          '& .MuiOutlinedInput-root': {
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
                      >
                        <MenuItem value="" disabled>
                          <em style={{ color: '#999', fontSize: '15px' }}>Select a sales enquiry</em>
                        </MenuItem>
                        {enquiries.map((enquiry) => (
                          <MenuItem key={enquiry.id} value={enquiry.id}>
                            <Box>
                              <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                {enquiry.enquiry_id} - {enquiry.client_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                📋 {enquiry.project_name}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                )}
                
                {/* Show enquiry info when editing */}
                {editingEstimation && (
                <Grid item xs={12}>
                  <Box sx={{ 
                    backgroundColor: '#f0f8ff', 
                    borderRadius: '16px', 
                    p: 3, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: '2px solid #e3f2fd'
                  }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        color: '#1976d2', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      📋 Associated Sales Enquiry
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50', mb: 1 }}>
                      {editingEstimation?.enquiry_id || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Editing existing estimation - enquiry cannot be changed
                    </Typography>
                  </Box>
                </Grid>
                )}
                
                {/* Notes Field */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    backgroundColor: 'white', 
                    borderRadius: '16px', 
                    p: 3, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                  }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        mb: 2.5, 
                        color: '#1976d2',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Notes (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any additional notes or requirements for this estimation..."
                      variant="outlined"
                      sx={{ 
                        borderRadius: '16px',
                        backgroundColor: '#f8f9fa',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
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
            disabled={loading}
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
            disabled={loading}
            startIcon={loading ? <CircularProgress size={22} color="inherit" /> : null}
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
            📊 Create Estimation
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <EstimationDetailView
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        estimationId={selectedEstimation?.id}
      />

      {/* Estimation Designer Dialog */}
      <Dialog 
        open={designerOpen} 
        onClose={handleCloseDesigner}
        maxWidth="xl"
        fullWidth
        fullScreen
      >
        <DialogContent sx={{ p: 0 }}>
          {designerEstimation && (
            <EstimationDesigner 
              estimation={designerEstimation}
              onClose={handleCloseDesigner}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Estimation;
