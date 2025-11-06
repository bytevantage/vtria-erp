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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

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

  const handleOpen = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        company_name: client.company_name || '',
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        pincode: client.pincode || '',
        gstin: client.gstin || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        // Update existing client
        const response = await axios.put(`${API_BASE_URL}/api/clients/${editingClient.id}`, formData);
        if (response.data.success) {
          await fetchClients(); // Refresh the list
        }
      } else {
        // Add new client
        const response = await axios.post(`${API_BASE_URL}/api/clients`, formData);
        if (response.data.success) {
          await fetchClients(); // Refresh the list
        }
      }
      handleClose();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error saving client. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const response = await axios.delete(`${API_BASE_URL}/api/clients/${id}`);
        if (response.data.success) {
          await fetchClients(); // Refresh the list
        }
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Error deleting client. Please try again.');
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Client Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add New Client
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>GST Number</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    {client.company_name}
                  </Box>
                </TableCell>
                <TableCell>{client.contact_person}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.city}, {client.state}</TableCell>
                <TableCell>{client.gstin}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(client)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(client.id)} size="small">
                    <DeleteIcon />
                  </IconButton>
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
              🏢
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Manage client information and contact details
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
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
              📋 Client Information
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
                      Company Name *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Enter company name"
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
                      Contact Person *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="Enter contact person name"
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
                      Email Address
                    </Typography>
                    <TextField
                      fullWidth
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
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
                      Phone Number *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
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
                      Address
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter complete address including street, area, and landmarks"
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
                <Grid item xs={12} md={4}>
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
                      City
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Enter city"
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
                <Grid item xs={12} md={4}>
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
                      State
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Enter state"
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
                <Grid item xs={12} md={4}>
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
                      Pincode
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Enter pincode"
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
                      GST Number
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="Enter GST number"
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
            {editingClient ? '✓ Update Client' : '🏢 Add Client'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Clients;
