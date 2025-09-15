import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Receipt as TaxIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [companyConfig, setCompanyConfig] = useState({
    company_name: 'VTRIA ENGINEERING SOLUTIONS PVT LTD',
    motto: 'Engineering for a Better Tomorrow',
    logo_url: 'vtria_logo.jpg',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
    download_folder_path: ''
  });
  const [locations, setLocations] = useState([]);
  const [taxConfig, setTaxConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    city: '',
    state: '',
    address: '',
    contact_person: '',
    contact_number: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [companyResponse, locationsResponse, taxResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/company-config`),
        axios.get(`${API_BASE_URL}/api/company-config/locations`),
        axios.get(`${API_BASE_URL}/api/company-config/tax-config`)
      ]);

      setCompanyConfig(companyResponse.data.data || {});
      setLocations(locationsResponse.data.data || []);
      setTaxConfig(taxResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyConfig = async () => {
    try {
      const response = await axios.put(`${API_BASE_URL}/company-config`, companyConfig);
      
      if (response.data.success) {
        alert('Company configuration updated successfully!');
      }
    } catch (error) {
      console.error('Error saving company config:', error);
      alert('Error saving company configuration');
    }
  };

  const addLocation = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/company-config/locations`, newLocation);
      
      if (response.data.success) {
        alert('Location added successfully!');
        setOpenLocationDialog(false);
        fetchAllData();
        setNewLocation({
          name: '',
          city: '',
          state: '',
          address: '',
          contact_person: '',
          contact_number: ''
        });
      }
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error adding location');
    }
  };

  const updateTaxRate = async (id, field, value) => {
    try {
      const updatedData = { [field]: parseFloat(value) || 0 };
      await axios.put(`${API_BASE_URL}/company-config/tax-config/${id}`, updatedData);
      
      // Update local state
      setTaxConfig(prev => prev.map(tax => 
        tax.id === id ? { ...tax, [field]: updatedData[field] } : tax
      ));
      
      alert('Tax rate updated successfully!');
    } catch (error) {
      console.error('Error updating tax rate:', error);
      alert('Error updating tax rate');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        System Settings
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<BusinessIcon />} label="Company" />
          <Tab icon={<LocationIcon />} label="Locations" />
          <Tab icon={<TaxIcon />} label="Tax Configuration" />
        </Tabs>

        {/* Company Configuration Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Company Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={companyConfig.company_name || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, company_name: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Motto"
                  value={companyConfig.motto || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, motto: e.target.value })}
                  helperText="Company tagline or motto"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Logo Filename"
                  value={companyConfig.logo_url || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, logo_url: e.target.value })}
                  helperText="Logo filename (e.g., vtria_logo.jpg)"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Address"
                  value={companyConfig.address || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, address: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={companyConfig.city || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, city: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={companyConfig.state || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, state: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={companyConfig.pincode || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, pincode: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={companyConfig.phone || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, phone: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={companyConfig.email || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, email: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={companyConfig.gstin || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, gstin: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Download Folder Path"
                  value={companyConfig.download_folder_path || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, download_folder_path: e.target.value })}
                  helperText="Default folder for PDF downloads"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveCompanyConfig}
                >
                  Save Company Configuration
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Locations Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Office Locations
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenLocationDialog(true)}
              >
                Add Location
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>City</strong></TableCell>
                    <TableCell><strong>State</strong></TableCell>
                    <TableCell><strong>Contact Person</strong></TableCell>
                    <TableCell><strong>Contact Number</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.city}</TableCell>
                      <TableCell>{location.state}</TableCell>
                      <TableCell>{location.contact_person}</TableCell>
                      <TableCell>{location.contact_number}</TableCell>
                      <TableCell>
                        <Typography color={location.status === 'active' ? 'success.main' : 'error.main'}>
                          {location.status?.toUpperCase()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          No locations configured
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tax Configuration Tab */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              State-wise Tax Configuration
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Configure tax rates for different states. Karnataka is set as home state by default.
            </Alert>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>State</strong></TableCell>
                    <TableCell><strong>State Code</strong></TableCell>
                    <TableCell><strong>CGST Rate (%)</strong></TableCell>
                    <TableCell><strong>SGST Rate (%)</strong></TableCell>
                    <TableCell><strong>IGST Rate (%)</strong></TableCell>
                    <TableCell><strong>Home State</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taxConfig.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell>{tax.state_name}</TableCell>
                      <TableCell>{tax.state_code}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={tax.cgst_rate}
                          onChange={(e) => updateTaxRate(tax.id, 'cgst_rate', e.target.value)}
                          inputProps={{ min: 0, max: 50, step: 0.25 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={tax.sgst_rate}
                          onChange={(e) => updateTaxRate(tax.id, 'sgst_rate', e.target.value)}
                          inputProps={{ min: 0, max: 50, step: 0.25 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={tax.igst_rate}
                          onChange={(e) => updateTaxRate(tax.id, 'igst_rate', e.target.value)}
                          inputProps={{ min: 0, max: 50, step: 0.25 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography color={tax.is_home_state ? 'success.main' : 'text.secondary'}>
                          {tax.is_home_state ? 'Yes' : 'No'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Add Location Dialog */}
      <Dialog open={openLocationDialog} onClose={() => setOpenLocationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location Name"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="e.g., Mangalore Office"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                value={newLocation.city}
                onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State"
                value={newLocation.state}
                onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={newLocation.contact_person}
                onChange={(e) => setNewLocation({ ...newLocation, contact_person: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Number"
                value={newLocation.contact_number}
                onChange={(e) => setNewLocation({ ...newLocation, contact_number: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Address"
                value={newLocation.address}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLocationDialog(false)}>Cancel</Button>
          <Button 
            onClick={addLocation}
            variant="contained"
            disabled={!newLocation.name || !newLocation.city || !newLocation.state}
          >
            Add Location
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
