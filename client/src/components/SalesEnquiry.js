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
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import CaseHistoryTracker from './CaseHistoryTracker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SalesEnquiry = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'assigned_to_me', 'team_queue'
  const currentUserId = '1'; // This would come from auth context in real app
  const currentUser = users.find(u => u.id.toString() === currentUserId);
  const [newClientData, setNewClientData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [formData, setFormData] = useState({
    client_id: '',
    project_name: '',
    description: '',
    enquiry_by: '',
    assigned_to: '',
    status: 'new'
  });

  // Document number generation for VESPL/EQ/2526/XXX format
  const generateEnquiryId = () => {
    const currentYear = new Date().getFullYear();
    const financialYear = currentYear % 100 + '' + ((currentYear + 1) % 100);
    const nextSerial = enquiries.length + 1;
    return `VESPL/EQ/${financialYear}/${nextSerial.toString().padStart(3, '0')}`;
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

  const getActiveStep = (status) => {
    switch (status) {
      case 'new': return 0;
      case 'assigned': return 0;
      case 'estimation': return 1;
      case 'quotation': return 2;
      case 'approved': return 3;
      default: return 0;
    }
  };

  useEffect(() => {
    fetchEnquiries();
    fetchClients();
    fetchUsers();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/sales-enquiry`);
      
      if (response.data.success) {
        setEnquiries(response.data.data);
      } else {
        setError('Failed to fetch enquiries');
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setError('Error connecting to server. Please check if the API is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/clients`);
      
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`);
      
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

    const handleOpen = (enquiry = null) => {
    if (enquiry) {
      setEditingEnquiry(enquiry);
      setFormData({
        client_id: enquiry.client_id || '',
        project_name: enquiry.project_name || '',
        description: enquiry.description || '',
        enquiry_by: enquiry.enquiry_by || '',
        assigned_to: enquiry.assigned_to || '',
        status: enquiry.status || 'new',
      });
    } else {
      setEditingEnquiry(null);
      setFormData({
        client_id: '',
        project_name: '',
        description: '',
        enquiry_by: '',
        assigned_to: '',
        status: 'new'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEnquiry(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.client_id || !formData.project_name || !formData.enquiry_by) {
        setError('Please fill in all required fields');
        return;
      }

      if (editingEnquiry) {
        // Update existing enquiry
        const response = await axios.put(`${API_BASE_URL}/api/sales-enquiry/${editingEnquiry.id}`, formData);
        
        if (response.data.success) {
          await fetchEnquiries(); // Refresh the list
          handleClose();
        } else {
          setError('Failed to update enquiry');
        }
      } else {
        // Create new enquiry
        const response = await axios.post(`${API_BASE_URL}/api/sales-enquiry`, formData);
        
        if (response.data.success) {
          // Create a case for this enquiry
          try {
            const caseData = {
              enquiry_id: response.data.data.id,
              client_id: formData.client_id,
              project_name: formData.project_name,
              description: formData.description || `Sales enquiry for ${formData.project_name}`,
              initial_state: 'enquiry'
            };
            
            await axios.post(`${API_BASE_URL}/api/case-management/create`, caseData);
          } catch (caseError) {
            console.error('Error creating case:', caseError);
            // Don't fail the enquiry creation if case creation fails
          }
          
          await fetchEnquiries(); // Refresh the list
          handleClose();
        } else {
          setError('Failed to create enquiry');
        }
      }
    } catch (error) {
      console.error('Error saving enquiry:', error);
      setError('Error saving enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this enquiry?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/sales-enquiry/${id}`);
        fetchEnquiries();
      } catch (error) {
        console.error('Error deleting enquiry:', error);
        setError('Error deleting enquiry. Please try again.');
      }
    }
  };

  const handleSelfAssign = async (enquiryId) => {
    try {
      const enquiry = enquiries.find(e => e.id === enquiryId);
      const updatedData = {
        ...enquiry,
        assigned_to: currentUserId,
        status: 'assigned'
      };
      
      await axios.put(`${API_BASE_URL}/api/sales-enquiry/${enquiryId}`, updatedData);
      fetchEnquiries();
    } catch (error) {
      console.error('Error self-assigning enquiry:', error);
      setError('Error assigning enquiry to yourself. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'info';
      case 'assigned': return 'warning';
      case 'for_estimation': return 'primary';
      case 'quoted': return 'secondary';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const handleClientChange = (clientId) => {
    if (clientId === 'add_new_client') {
      setNewClientDialog(true);
      return;
    }
    setFormData({
      ...formData,
      client_id: clientId
    });
  };

  const handleNewClientSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields for new client
      if (!newClientData.company_name || !newClientData.contact_person || !newClientData.phone) {
        setError('Please fill in company name, contact person, and phone');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/clients`, newClientData);
      
      if (response.data.success) {
        // Refresh clients list
        await fetchClients();
        
        // Select the newly created client
        setFormData({
          ...formData,
          client_id: response.data.data.id
        });
        
        // Close dialog and reset form
        setNewClientDialog(false);
        setNewClientData({
          company_name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: ''
        });
      } else {
        setError('Failed to create new client');
      }
    } catch (error) {
      console.error('Error creating new client:', error);
      setError('Error creating new client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewClientCancel = () => {
    setNewClientDialog(false);
    setNewClientData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    });
  };

  // Filter enquiries based on view selection
  const filteredEnquiries = (() => {
    switch (viewFilter) {
      case 'assigned_to_me':
        return enquiries.filter(enquiry => enquiry.assigned_to?.toString() === currentUserId);
      case 'team_queue':
        return enquiries.filter(enquiry => !enquiry.assigned_to || enquiry.assigned_to === '');
      default:
        return enquiries;
    }
  })();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Enquiry - VTRIA Engineering Solutions</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: '8px' }}
            >
              <MenuItem value="all">
                <Box display="flex" alignItems="center" gap={1}>
                  <ViewIcon fontSize="small" />
                  All Enquiries
                </Box>
              </MenuItem>
              <MenuItem value="assigned_to_me">
                <Box display="flex" alignItems="center" gap={1}>
                  <AssignmentIcon fontSize="small" />
                  My Assignments ({enquiries.filter(e => e.assigned_to?.toString() === currentUserId).length})
                </Box>
              </MenuItem>
              <MenuItem value="team_queue">
                <Box display="flex" alignItems="center" gap={1}>
                  <TimelineIcon fontSize="small" />
                  Team Queue ({enquiries.filter(e => !e.assigned_to || e.assigned_to === '').length})
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            New Enquiry
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Business Process Flow
          </Typography>
          <Stepper activeStep={0} alternativeLabel>
            {workflowSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" mb={3}>
          <CircularProgress />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Enquiry ID</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Enquiry By</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEnquiries.map((enquiry) => (
              <TableRow key={enquiry.id}>
                <TableCell>
                  <Typography variant="body2" color="primary" fontWeight="bold">
                    {enquiry.enquiry_id}
                  </Typography>
                </TableCell>
                <TableCell>{enquiry.client_name}</TableCell>
                <TableCell>{enquiry.project_name}</TableCell>
                <TableCell>
                  <Tooltip title={enquiry.description}>
                    <span>{enquiry.description ? enquiry.description.substring(0, 50) + '...' : ''}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{enquiry.enquiry_by_name}</TableCell>
                <TableCell>
                  {enquiry.assigned_to ? (
                    <Box>
                      <Typography variant="body2" color="primary" fontWeight={500}>
                        {users.find(u => u.id.toString() === enquiry.assigned_to?.toString())?.full_name || 'Unknown User'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {users.find(u => u.id.toString() === enquiry.assigned_to?.toString())?.user_role.replace('-', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">Unassigned</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={enquiry.status}
                    color={getStatusColor(enquiry.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(enquiry.date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    <IconButton onClick={() => handleOpen(enquiry)} size="small" title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => setSelectedEnquiry(enquiry)} size="small" title="View History">
                      <TimelineIcon />
                    </IconButton>
                    {viewFilter === 'team_queue' && !enquiry.assigned_to && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleSelfAssign(enquiry.id)}
                        sx={{ minWidth: 'auto', px: 1 }}
                        title="Assign to me"
                      >
                        Take
                      </Button>
                    )}
                    <IconButton onClick={() => handleDelete(enquiry.id)} size="small" title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
              📋
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingEnquiry ? 'Edit Sales Enquiry' : 'New Sales Enquiry'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Professional enquiry management for VTRIA Engineering Solutions
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
              🏢 Enquiry Information
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
                      Client Company *
                    </Typography>
                    <FormControl fullWidth required variant="outlined">
                      <Select
                        value={formData.client_id}
                        onChange={(e) => handleClientChange(e.target.value)}
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
                          <em style={{ color: '#999', fontSize: '15px' }}>Select a client company</em>
                        </MenuItem>
                        <MenuItem value="add_new_client" sx={{ 
                          borderTop: '1px solid #e0e0e0',
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#e3f2fd' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', color: '#1976d2' }}>
                            <AddIcon sx={{ mr: 1, fontSize: 20 }} />
                            <Typography variant="body1" fontWeight={600}>
                              Add New Company
                            </Typography>
                          </Box>
                        </MenuItem>
                        {clients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            <Box>
                              <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                {client.company_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                📍 {client.city}, {client.state}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
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
                      Project Name *
                    </Typography>
                    <TextField
                      fullWidth
                      required
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder="Enter project name"
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
                      Project Description
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide detailed description of the project requirements, specifications, timeline, and any special considerations..."
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
                      Handled By (VTRIA Team) *
                    </Typography>
                    <FormControl fullWidth required variant="outlined">
                      <Select
                        value={formData.enquiry_by}
                        onChange={(e) => setFormData({ ...formData, enquiry_by: e.target.value })}
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
                          <em style={{ color: '#999', fontSize: '15px' }}>Select team member</em>
                        </MenuItem>
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            <Box>
                              <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                {user.full_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                {user.user_role.replace('-', ' ').toUpperCase()} - {user.email}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
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
                      Assigned To
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
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
                        <MenuItem value="">
                          <Typography color="textSecondary">Select assignee...</Typography>
                        </MenuItem>
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id.toString()}>
                            <Box display="flex" flexDirection="column">
                              <Typography variant="body2" fontWeight={500}>
                                {user.full_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {user.user_role.replace('-', ' ').toUpperCase()} - {user.email}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
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
                      Enquiry Status
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                        <MenuItem value="new">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#4caf50" />
                            <Typography fontWeight={500}>New</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="assigned">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#ff9800" />
                            <Typography fontWeight={500}>Assigned</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="for_estimation">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#2196f3" />
                            <Typography fontWeight={500}>For Estimation</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="quoted">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#9c27b0" />
                            <Typography fontWeight={500}>Quoted</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="approved">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#4caf50" />
                            <Typography fontWeight={500}>Approved</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="rejected">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor="#f44336" />
                            <Typography fontWeight={500}>Rejected</Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
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
            {editingEnquiry ? '✓ Update Enquiry' : '+ Create Enquiry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog 
        open={newClientDialog} 
        onClose={handleNewClientCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0',
          mb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ mr: 2 }} />
            <Typography variant="h6" fontWeight={600}>
              Add New Company
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Company Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name *"
                value={newClientData.company_name}
                onChange={(e) => setNewClientData({...newClientData, company_name: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* Contact Person */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person *"
                value={newClientData.contact_person}
                onChange={(e) => setNewClientData({...newClientData, contact_person: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newClientData.email}
                onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone *"
                value={newClientData.phone}
                onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={newClientData.address}
                onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* City */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                value={newClientData.city}
                onChange={(e) => setNewClientData({...newClientData, city: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* State */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                value={newClientData.state}
                onChange={(e) => setNewClientData({...newClientData, state: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>

            {/* Pincode */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={newClientData.pincode}
                onChange={(e) => setNewClientData({...newClientData, pincode: e.target.value})}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleNewClientCancel}
            variant="outlined"
            sx={{ 
              borderRadius: '25px',
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleNewClientSubmit}
            variant="contained"
            disabled={loading}
            sx={{ 
              borderRadius: '25px',
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
            ) : null}
            Create Company
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesEnquiry;
