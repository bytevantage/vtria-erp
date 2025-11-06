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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    city: '',
    state: '',
    pincode: '',
    pan_number: '',
    payment_terms: '',
    credit_limit: 0,
    rating: 'B',
    tax_category: 'REGISTERED',
    vendor_type: 'DOMESTIC',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vendors`);
      if (response.data.success) {
        setVendors(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const generateVendorCode = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `VESPL/VEN/${year}/${randomNum}`;
  };

  const handleOpen = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        vendor_code: vendor.vendor_code || '',
        vendor_name: vendor.vendor_name || '',
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        gstin: vendor.gstin || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
        pan_number: vendor.pan_number || '',
        payment_terms: vendor.payment_terms || '',
        credit_limit: vendor.credit_limit || 0,
        rating: vendor.rating || 'B',
        tax_category: vendor.tax_category || 'REGISTERED',
        vendor_type: vendor.vendor_type || 'DOMESTIC',
      });
    } else {
      setEditingVendor(null);
      setFormData({
        vendor_code: generateVendorCode(), // Auto-generate for new vendors
        vendor_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        gstin: '',
        city: '',
        state: '',
        pincode: '',
        pan_number: '',
        payment_terms: '',
        credit_limit: 0,
        rating: 'B',
        tax_category: 'REGISTERED',
        vendor_type: 'DOMESTIC',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingVendor(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingVendor) {
        // Update existing vendor
        const response = await axios.put(`${API_BASE_URL}/api/vendors/${editingVendor.id}`, formData);
        if (response.data.success) {
          await fetchVendors(); // Refresh the list
        }
      } else {
        // Add new vendor
        const response = await axios.post(`${API_BASE_URL}/api/vendors`, formData);
        if (response.data.success) {
          await fetchVendors(); // Refresh the list
        }
      }
      handleClose();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Error saving vendor. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        const response = await axios.delete(`${API_BASE_URL}/api/vendors/${id}`);
        if (response.data.success) {
          await fetchVendors(); // Refresh the list
        }
      } catch (error) {
        console.error('Error deleting vendor:', error);
        alert('Error deleting vendor. Please try again.');
      }
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'A': return 'success';
      case 'B': return 'primary';
      case 'C': return 'warning';
      case 'D': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Vendor Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add New Vendor
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vendor Code</TableCell>
              <TableCell>Vendor Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>GST Number</TableCell>
              <TableCell>City, State</TableCell>
              <TableCell>Tax Category</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    {vendor.vendor_code}
                  </Box>
                </TableCell>
                <TableCell>{vendor.vendor_name}</TableCell>
                <TableCell>{vendor.contact_person}</TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>{vendor.phone}</TableCell>
                <TableCell>{vendor.gstin || 'N/A'}</TableCell>
                <TableCell>{vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={vendor.tax_category || 'REGISTERED'}
                    color={vendor.tax_category === 'REGISTERED' ? 'success' : vendor.tax_category === 'COMPOSITION' ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={vendor.rating}
                    color={getRatingColor(vendor.rating)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(vendor)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(vendor.id)} size="small">
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
              🏭
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.9rem' }}>
                {editingVendor ? 'Update vendor information' : 'Create a new vendor profile'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '36px', backgroundColor: '#fafafa' }}>
          <Box sx={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
          }}>
            <Box>
              <Grid container spacing={4}>
                {/* Vendor Code */}
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
                      Vendor Code *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.vendor_code}
                      onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                      placeholder={editingVendor ? "Enter vendor code" : "Auto-generated"}
                      variant="outlined"
                      InputProps={{
                        readOnly: !editingVendor, // Read-only for new vendors
                      }}
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

                {/* Vendor Name */}
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
                      Vendor Name *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      placeholder="Enter vendor name"
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

                {/* Contact Person */}
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
                      Contact Person
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

                {/* Email */}
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
                      Email
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

                {/* Phone */}
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
                      Phone
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

                {/* Address */}
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
                      Address
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter complete address"
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

                {/* GST Number */}
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

                {/* City */}
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

                {/* State */}
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

                {/* Pincode */}
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

                {/* PAN Number */}
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
                      PAN Number
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                      placeholder="Enter PAN number"
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

                {/* Tax Category */}
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
                      Tax Category
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={formData.tax_category}
                        onChange={(e) => setFormData({ ...formData, tax_category: e.target.value })}
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
                        <MenuItem value="REGISTERED">Registered</MenuItem>
                        <MenuItem value="UNREGISTERED">Unregistered</MenuItem>
                        <MenuItem value="COMPOSITION">Composition</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>

                {/* Vendor Type */}
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
                      Vendor Type
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={formData.vendor_type}
                        onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
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
                        <MenuItem value="DOMESTIC">Domestic</MenuItem>
                        <MenuItem value="IMPORT">Import</MenuItem>
                        <MenuItem value="SEZ">SEZ</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>

                {/* Payment Terms */}
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
                      Payment Terms
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder="e.g., Net 30, COD, etc."
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

                {/* Credit Limit */}
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
                      Credit Limit (₹)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      placeholder="Enter credit limit"
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

                {/* Rating */}
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
                      Rating
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
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
                        <MenuItem value="A">A - Excellent</MenuItem>
                        <MenuItem value="B">B - Good</MenuItem>
                        <MenuItem value="C">C - Average</MenuItem>
                        <MenuItem value="D">D - Poor</MenuItem>
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
          backgroundColor: '#fafafa',
          borderTop: '1px solid #e0e0e0',
          gap: 2
        }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderRadius: '16px',
              borderWidth: '2px',
              borderColor: '#e0e0e0',
              color: '#666',
              padding: '12px 28px',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                borderWidth: '2px',
                borderColor: '#ccc',
                backgroundColor: '#f5f5f5'
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
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: 'white',
              padding: '12px 28px',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)'
              }
            }}
          >
            {editingVendor ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vendors;