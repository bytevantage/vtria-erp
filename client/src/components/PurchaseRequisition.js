import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const PurchaseRequisition = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    quotation_id: '',
    supplier_id: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prResponse, suppliersResponse, quotationsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/purchase-requisition`),
        axios.get(`${API_BASE_URL}/suppliers`),
        axios.get(`${API_BASE_URL}/quotation`)
      ]);

      setRequisitions(prResponse.data.data || []);
      setSuppliers(suppliersResponse.data.data || []);
      setQuotations(quotationsResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePR = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/purchase-requisition`, formData);
      
      if (response.data.success) {
        alert('Purchase Requisition created successfully!');
        setOpenDialog(false);
        fetchData();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating PR:', error);
      alert('Error creating Purchase Requisition');
    }
  };

  const resetForm = () => {
    setFormData({
      quotation_id: '',
      supplier_id: '',
      notes: '',
      items: []
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'primary';
      case 'responded': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/purchase-requisition/${id}/status`, {
        status: newStatus
      });
      
      fetchData();
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Purchase Requisitions (PR)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create New PR
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>PR Number</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Supplier</strong></TableCell>
                <TableCell><strong>Quotation</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Created By</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requisitions.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {pr.pr_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(pr.pr_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{pr.supplier_name}</TableCell>
                  <TableCell>{pr.quotation_number}</TableCell>
                  <TableCell>
                    <Chip 
                      label={pr.status.toUpperCase()} 
                      color={getStatusColor(pr.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{pr.created_by_name}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => {
                        // View details logic
                        alert(`View PR: ${pr.pr_number}`);
                      }}
                    >
                      View
                    </Button>
                    {pr.status === 'draft' && (
                      <Button
                        size="small"
                        startIcon={<SendIcon />}
                        onClick={() => updateStatus(pr.id, 'sent')}
                        sx={{ ml: 1 }}
                      >
                        Send
                      </Button>
                    )}
                    {pr.status === 'sent' && (
                      <Button
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => updateStatus(pr.id, 'responded')}
                        sx={{ ml: 1 }}
                      >
                        Mark Responded
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {requisitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      No purchase requisitions found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create PR Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Purchase Requisition</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Quotation"
                value={formData.quotation_id}
                onChange={(e) => setFormData({ ...formData, quotation_id: e.target.value })}
              >
                <MenuItem value="">Select Quotation</MenuItem>
                {quotations.map((quotation) => (
                  <MenuItem key={quotation.id} value={quotation.id}>
                    {quotation.quotation_number} - {quotation.client_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Supplier"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              >
                <MenuItem value="">Select Supplier</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional requirements, specifications, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreatePR}
            variant="contained"
            disabled={!formData.quotation_id || !formData.supplier_id}
          >
            Create PR
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseRequisition;
