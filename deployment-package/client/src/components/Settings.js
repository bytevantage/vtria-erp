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
  Divider,
  MenuItem,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Receipt as TaxIcon,
  Storage as DatabaseIcon,
  CloudDownload as ExportIcon,
  CloudUpload as ImportIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [companyConfig, setCompanyConfig] = useState({
    company_name: 'VTRIA ENGINEERING SOLUTIONS PVT LTD',
    motto: 'Engineering for a Better Tomorrow',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
    pan_number: '',
    cin_number: '',
    website: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    download_folder_path: '',
    financial_year_start: '04-01',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });
  const [locations, setLocations] = useState([]);
  const [taxConfig, setTaxConfig] = useState({ home_state: 'Karnataka', available_states: [] });
  const [loading, setLoading] = useState(true);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [newLocation, setNewLocation] = useState({
    name: '',
    city: '',
    state: '',
    address: '',
    contact_person: '',
    contact_number: '',
    gstin: '',
    pincode: '',
    email: '',
    phone: '',
    status: 'active'
  });

  // Database management state
  const [databaseInfo, setDatabaseInfo] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [selectiveImportFile, setSelectiveImportFile] = useState(null);
  const [selectiveImporting, setSelectiveImporting] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState(new Set());
  const [analyzingFile, setAnalyzingFile] = useState(false);

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
      setTaxConfig(taxResponse.data.data || { home_state: 'Karnataka', available_states: [] });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyConfig = async () => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/company-config`, companyConfig);

      if (response.data.success) {
        alert('Company configuration updated successfully!');
      } else {
        alert('Error: ' + (response.data.message || 'Unknown error occurred'));
      }
    } catch (error) {
      console.error('Error saving company config:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert(`Error saving company configuration: ${errorMessage}`);
    }
  }; const addLocation = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/company-config/locations`, newLocation);

      if (response.data.success) {
        alert('Location added successfully!');
        setOpenLocationDialog(false);
        fetchAllData();
        resetLocationForm();
      }
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error adding location');
    }
  };

  const updateLocation = async () => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/company-config/locations/${editingLocation.id}`, newLocation);

      if (response.data.success) {
        alert('Location updated successfully!');
        setOpenLocationDialog(false);
        setEditingLocation(null);
        fetchAllData();
        resetLocationForm();
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location');
    }
  };

  const deleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/company-config/locations/${locationId}`);

      if (response.data.success) {
        alert('Location deleted successfully!');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error deleting location');
    }
  };

  const handleEditLocation = (location) => {
    setEditingLocation(location);
    setNewLocation({
      name: location.name || '',
      city: location.city || '',
      state: location.state || '',
      address: location.address || '',
      contact_person: location.contact_person || '',
      contact_number: location.contact_number || '',
      gstin: location.gstin || '',
      pincode: location.pincode || '',
      email: location.email || '',
      phone: location.phone || '',
      status: location.status || 'active'
    });
    setOpenLocationDialog(true);
  };

  const resetLocationForm = () => {
    setNewLocation({
      name: '',
      city: '',
      state: '',
      address: '',
      contact_person: '',
      contact_number: '',
      gstin: '',
      pincode: '',
      email: '',
      phone: '',
      status: 'active'
    });
  };

  const handleCloseLocationDialog = () => {
    setOpenLocationDialog(false);
    setEditingLocation(null);
    resetLocationForm();
  };

  const handleHomeStateChange = async (newHomeState) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/company-config/tax-config`, {
        home_state: newHomeState
      });

      if (response.data.success) {
        setTaxConfig(prev => ({
          ...prev,
          home_state: newHomeState
        }));
        console.log('Home state updated successfully');
      }
    } catch (error) {
      console.error('Error updating home state:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Database management functions
  const fetchDatabaseInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/database/info`);

      if (response.data && response.data.success && response.data.data) {
        const apiData = response.data.data;
        setDatabaseInfo({
          database: process.env.REACT_APP_DB_NAME || 'vtria_erp',
          tableCount: apiData.tables ? apiData.tables.length : 0,
          totalSize: `${apiData.total_size_mb} MB`,
          tables: apiData.tables || []
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching database info:', error);
      alert('Failed to fetch database information: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleExportDatabase = async () => {
    try {
      setExporting(true);
      const response = await axios.get(`${API_BASE_URL}/api/database/export`, {
        responseType: 'blob',
        timeout: 300000, // 5 minutes timeout for large databases
        headers: {
          'Accept': 'application/octet-stream'
        }
      });

      // Verify we got a valid response
      if (!response.data || response.data.size === 0) {
        throw new Error('Empty response received from server');
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/sql' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vtria_erp_backup_${new Date().toISOString().split('T')[0]}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('Database exported successfully!');
    } catch (error) {
      console.error('Error exporting database:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('Failed to export database: ' + errorMsg);
    } finally {
      setExporting(false);
    }
  };

  const handleImportDatabase = async () => {
    if (!importFile) {
      alert('Please select a SQL file to import');
      return;
    }

    const confirmImport = window.confirm(
      'WARNING: This will replace all existing data in the database. Are you sure you want to continue?'
    );

    if (!confirmImport) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('sqlFile', importFile);

      const response = await axios.post(`${API_BASE_URL}/api/database/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes timeout for large imports
      });

      if (response.data.success) {
        alert('Database imported successfully! Please refresh the page.');
        setImportFile(null);
        // Refresh the page after successful import
        window.location.reload();
      } else {
        alert('Import failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error importing database:', error);
      alert('Failed to import database: ' + (error.response?.data?.message || error.message));
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.sql')) {
      setImportFile(file);
    } else {
      alert('Please select a valid SQL file');
      event.target.value = '';
    }
  };

  const handleSelectiveFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.sql')) {
      setSelectiveImportFile(file);
      setAnalyzingFile(true);
      setAvailableTables([]);
      setSelectedTables(new Set());

      try {
        // Analyze the SQL file to extract table names
        const formData = new FormData();
        formData.append('sqlFile', file);

        const response = await axios.post(`${API_BASE_URL}/api/database/analyze-sql`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.success) {
          setAvailableTables(response.data.data.tables || []);
        } else {
          throw new Error(response.data.message || 'Failed to analyze SQL file');
        }
      } catch (error) {
        console.error('Error analyzing SQL file:', error);
        alert('Failed to analyze SQL file: ' + (error.response?.data?.message || error.message));
        setSelectiveImportFile(null);
        event.target.value = '';
      } finally {
        setAnalyzingFile(false);
      }
    } else {
      alert('Please select a valid SQL file');
      event.target.value = '';
    }
  };

  // Handle table selection functions
  const handleTableSelect = (tableName, checked) => {
    setSelectedTables(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(tableName);
      } else {
        newSet.delete(tableName);
      }
      return newSet;
    });
  };

  const handleSelectAllTables = (checked) => {
    if (checked) {
      setSelectedTables(new Set(availableTables.map(table => table.name)));
    } else {
      setSelectedTables(new Set());
    }
  };

  const handleQuickSelectSafeTables = () => {
    const safeTables = availableTables
      .filter(table => table.isSafe)
      .map(table => table.name);
    setSelectedTables(new Set(safeTables));
  };

  const handleSelectiveImport = async () => {
    if (!selectiveImportFile) {
      alert('Please select a SQL file first');
      return;
    }

    if (selectedTables.size === 0) {
      alert('Please select at least one table to import');
      return;
    }

    const selectedTableNames = Array.from(selectedTables);
    const confirmed = window.confirm(
      `Are you sure you want to import the following ${selectedTableNames.length} tables?\n\n${selectedTableNames.join(', ')}`
    );

    if (!confirmed) return;

    setSelectiveImporting(true);
    const formData = new FormData();
    formData.append('sqlFile', selectiveImportFile);
    formData.append('selectedTables', JSON.stringify(selectedTableNames));

    try {
      const response = await axios.post(`${API_BASE_URL}/api/database/selective-import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000 // 5 minutes timeout
      });

      if (response.data.success) {
        alert(`Selective import completed successfully!\n\nImported tables: ${response.data.importedTables?.join(', ')}\nSkipped tables: ${response.data.skippedTables?.join(', ')}`);
        setSelectiveImportFile(null);
        // Reset file input
        const fileInput = document.getElementById('selective-sql-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(response.data.message || 'Import failed');
      }
    } catch (error) {
      console.error('Error in selective import:', error);
      alert('Failed to import selected tables: ' + (error.response?.data?.message || error.message));
    } finally {
      setSelectiveImporting(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirmClear = window.confirm(
      'CRITICAL WARNING: This will permanently delete ALL data from the database while keeping the structure intact. This action CANNOT be undone. Are you absolutely sure you want to proceed?'
    );

    if (!confirmClear) return;

    // Double confirmation for such a destructive action
    const doubleConfirm = window.confirm(
      'FINAL CONFIRMATION: This will wipe your entire database clean. All customers, orders, inventory, employees, and all other data will be lost forever. Type "CLEAR" in the next prompt to proceed.'
    );

    if (!doubleConfirm) return;

    const typeConfirm = prompt('Type "CLEAR" (in capital letters) to confirm database wipe:');
    if (typeConfirm !== 'CLEAR') {
      alert('Database clear cancelled. Incorrect confirmation text.');
      return;
    }

    try {
      setClearing(true);
      const response = await axios.post(`${API_BASE_URL}/api/database/clear`, {}, {
        timeout: 120000, // 2 minutes timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data && response.data.success) {
        alert(`Database cleared successfully! ${response.data.message}`);
        // Refresh database info
        setDatabaseInfo(null);
        fetchDatabaseInfo();
      } else {
        alert('Clear failed: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error clearing database:', error);
      alert('Failed to clear database: ' + (error.response?.data?.message || error.message));
    } finally {
      setClearing(false);
    }
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
          <Tab icon={<DatabaseIcon />} label="Database Management" />
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
                  label="Website"
                  value={companyConfig.website || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, website: e.target.value })}
                  helperText="Company website URL"
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
                  label="PAN Number"
                  value={companyConfig.pan_number || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, pan_number: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CIN Number"
                  value={companyConfig.cin_number || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, cin_number: e.target.value })}
                  helperText="Corporate Identification Number"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bank Name"
                  value={companyConfig.bank_name || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, bank_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bank Account Number"
                  value={companyConfig.bank_account_number || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, bank_account_number: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bank IFSC Code"
                  value={companyConfig.bank_ifsc_code || ''}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, bank_ifsc_code: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  value={companyConfig.currency || 'INR'}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, currency: e.target.value })}
                  helperText="Default currency (e.g., INR, USD)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Timezone"
                  value={companyConfig.timezone || 'Asia/Kolkata'}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, timezone: e.target.value })}
                  helperText="Timezone (e.g., Asia/Kolkata)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Financial Year Start"
                  value={companyConfig.financial_year_start || '04-01'}
                  onChange={(e) => setCompanyConfig({ ...companyConfig, financial_year_start: e.target.value })}
                  helperText="Format: MM-DD (e.g., 04-01 for April 1st)"
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
                    <TableCell><strong>GSTIN</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
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
                      <TableCell>{location.gstin || '-'}</TableCell>
                      <TableCell>
                        <Typography color={location.status === 'active' ? 'success.main' : 'error.main'}>
                          {location.status?.toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          onClick={() => handleEditLocation(location)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => deleteLocation(location.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
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
            <Typography variant="h6" sx={{ mb: 3 }}>
              Tax Configuration
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Simplified Tax Setup</strong>
              </Typography>
              <Typography variant="body2">
                Set your company's home state below. Tax rates are configured per product (5%, 12%, 18%, 28%).
                Sales within your home state will use CGST+SGST, and sales to other states will use IGST automatically.
              </Typography>
            </Alert>

            <Paper sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Company Home State"
                    value={taxConfig.home_state || 'Karnataka'}
                    onChange={(e) => handleHomeStateChange(e.target.value)}
                    helperText="This determines when to apply CGST+SGST vs IGST"
                  >
                    {(taxConfig.available_states || []).map((state) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Alert severity="success" variant="outlined">
                    <Typography variant="body2">
                      <strong>Current Setup:</strong><br />
                      Home State: {taxConfig.home_state || 'Karnataka'}<br />
                      Same State → CGST + SGST<br />
                      Other States → IGST
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}

        {/* Database Management Tab */}
        {tabValue === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Database Management
            </Typography>

            <Grid container spacing={3}>
              {/* Database Information Card */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <DatabaseIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Database Information
                  </Typography>
                  {databaseInfo ? (
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        <strong>Database:</strong> {databaseInfo.database}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Tables:</strong> {databaseInfo.tableCount}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Total Size:</strong> {databaseInfo.totalSize}
                      </Typography>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={fetchDatabaseInfo}
                      startIcon={<DatabaseIcon />}
                    >
                      Load Database Info
                    </Button>
                  )}
                </Paper>
              </Grid>

              {/* Export Database Card */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <ExportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Export Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Download a complete backup of your database
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleExportDatabase}
                    disabled={exporting}
                    startIcon={exporting ? <CircularProgress size={20} /> : <ExportIcon />}
                    fullWidth
                  >
                    {exporting ? 'Exporting...' : 'Export Database'}
                  </Button>
                </Paper>
              </Grid>

              {/* Import Database Card */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <ImportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Import Database
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Warning:</strong> Importing a database will replace all existing data.
                      Please ensure you have a backup before proceeding.
                    </Typography>
                  </Alert>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <input
                        accept=".sql"
                        style={{ display: 'none' }}
                        id="sql-file-input"
                        type="file"
                        onChange={handleFileSelect}
                      />
                      <label htmlFor="sql-file-input">
                        <Button
                          variant="outlined"
                          component="span"
                          fullWidth
                          startIcon={<ImportIcon />}
                        >
                          Select SQL File
                        </Button>
                      </label>
                      {importFile && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Selected: {importFile.name}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Button
                        variant="contained"
                        onClick={handleImportDatabase}
                        disabled={!importFile || importing}
                        startIcon={importing ? <CircularProgress size={20} /> : <ImportIcon />}
                        fullWidth
                        color="error"
                      >
                        {importing ? 'Importing...' : 'Import Database'}
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Selective Import Card */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <ImportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Selective Table Import
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Choose exactly which tables to import from your SQL file.
                      Perfect for importing only the data you need without affecting production transactions.
                    </Typography>
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <input
                        accept=".sql"
                        style={{ display: 'none' }}
                        id="selective-sql-file-input"
                        type="file"
                        onChange={handleSelectiveFileSelect}
                      />
                      <label htmlFor="selective-sql-file-input">
                        <Button
                          variant="outlined"
                          component="span"
                          fullWidth
                          startIcon={analyzingFile ? <CircularProgress size={20} /> : <ImportIcon />}
                          disabled={analyzingFile}
                        >
                          {analyzingFile ? 'Analyzing SQL File...' : 'Select SQL File for Analysis'}
                        </Button>
                      </label>
                      {selectiveImportFile && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Selected: {selectiveImportFile.name}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Button
                        variant="contained"
                        onClick={handleSelectiveImport}
                        disabled={!selectiveImportFile || selectiveImporting || selectedTables.size === 0}
                        startIcon={selectiveImporting ? <CircularProgress size={20} /> : <ImportIcon />}
                        fullWidth
                        color="primary"
                      >
                        {selectiveImporting ? 'Importing Selected Tables...' : `Import ${selectedTables.size} Selected Tables`}
                      </Button>
                    </Grid>

                    {/* Table Selection Interface */}
                    {availableTables.length > 0 && (
                      <Grid item xs={12}>
                        <Accordion defaultExpanded>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">
                              Select Tables to Import ({selectedTables.size} of {availableTables.length} selected)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ mb: 2 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ mr: 1, mb: 1 }}
                                onClick={() => handleSelectAllTables(selectedTables.size !== availableTables.length)}
                              >
                                {selectedTables.size === availableTables.length ? 'Deselect All' : 'Select All'}
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ mr: 1, mb: 1 }}
                                onClick={handleQuickSelectSafeTables}
                                color="success"
                              >
                                Quick Select Safe Tables
                              </Button>
                            </Box>

                            <Grid container spacing={1}>
                              {availableTables.map((table) => (
                                <Grid item xs={12} sm={6} md={4} key={table.name}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={selectedTables.has(table.name)}
                                        onChange={(e) => handleTableSelect(table.name, e.target.checked)}
                                        color={table.isSafe ? 'success' : 'warning'}
                                      />
                                    }
                                    label={
                                      <Box>
                                        <Typography variant="body2" component="span">
                                          {table.name}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color={table.isSafe ? 'success.main' : 'warning.main'}
                                          display="block"
                                        >
                                          {table.isSafe ? '✓ Safe for import' : '⚠ Transactional data'}
                                        </Typography>
                                        {table.recordCount !== undefined && (
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            ~{table.recordCount} records
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                  />
                                </Grid>
                              ))}
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Clear Database Card */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <DeleteIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Clear Database
                  </Typography>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>DANGER ZONE:</strong> This will permanently delete ALL data from your database
                      while keeping the table structure intact. This action cannot be undone.
                      Use this to start completely fresh.
                    </Typography>
                  </Alert>

                  <Button
                    variant="contained"
                    onClick={handleClearDatabase}
                    disabled={clearing}
                    startIcon={clearing ? <CircularProgress size={20} /> : <DeleteIcon />}
                    color="error"
                    sx={{
                      backgroundColor: '#d32f2f',
                      '&:hover': { backgroundColor: '#b71c1c' }
                    }}
                  >
                    {clearing ? 'Clearing Database...' : 'Clear All Data'}
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Location Dialog */}
      <Dialog open={openLocationDialog} onClose={handleCloseLocationDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location Name"
                value={newLocation.name || ''}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="e.g., Mangalore Office"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                value={newLocation.city || ''}
                onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State"
                value={newLocation.state || ''}
                onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pincode"
                value={newLocation.pincode || ''}
                onChange={(e) => setNewLocation({ ...newLocation, pincode: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={newLocation.contact_person || ''}
                onChange={(e) => setNewLocation({ ...newLocation, contact_person: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Number"
                value={newLocation.contact_number || ''}
                onChange={(e) => setNewLocation({ ...newLocation, contact_number: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newLocation.phone || ''}
                onChange={(e) => setNewLocation({ ...newLocation, phone: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newLocation.email || ''}
                onChange={(e) => setNewLocation({ ...newLocation, email: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GSTIN"
                value={newLocation.gstin || ''}
                onChange={(e) => setNewLocation({ ...newLocation, gstin: e.target.value })}
                placeholder="GST Identification Number"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={newLocation.status || 'active'}
                onChange={(e) => setNewLocation({ ...newLocation, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Address"
                value={newLocation.address || ''}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLocationDialog}>Cancel</Button>
          <Button
            onClick={editingLocation ? updateLocation : addLocation}
            variant="contained"
            disabled={!newLocation.name || !newLocation.city || !newLocation.state}
          >
            {editingLocation ? 'Update Location' : 'Add Location'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Settings;
