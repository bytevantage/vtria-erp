import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
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
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Factory as FactoryIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

const ProductionManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [productionItems, setProductionItems] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [manufacturingUnits, setManufacturingUnits] = useState([]);
  const [operations, setOperations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Fetch data from APIs
  useEffect(() => {
    fetchDashboardData();
    fetchProductionItems();
    fetchWorkOrders();
    fetchManufacturingUnits();
    fetchOperations();
    fetchCategories();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/production/dashboard`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchProductionItems = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/production/items`);
      const data = await response.json();
      if (data.success) {
        setProductionItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching production items:', error);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/production/work-orders`);
      const data = await response.json();
      if (data.success) {
        setWorkOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    }
  };

  const fetchManufacturingUnits = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/production/master/manufacturing-units`);
      const data = await response.json();
      if (data.success) {
        setManufacturingUnits(data.data);
      }
    } catch (error) {
      console.error('Error fetching manufacturing units:', error);
    }
  };

  const fetchOperations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/production/master/operations`);
      const data = await response.json();
      if (data.success) {
        setOperations(data.data);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/production/master/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const openDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setFormData({});
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      let url = '';
      let method = 'POST';
      
      if (dialogType === 'productionItem') {
        url = `${process.env.REACT_APP_API_URL}/api/production/items`;
      } else if (dialogType === 'workOrder') {
        url = `${process.env.REACT_APP_API_URL}/api/production/work-orders`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        closeDialog();
        // Refresh data
        if (dialogType === 'productionItem') {
          fetchProductionItems();
        } else if (dialogType === 'workOrder') {
          fetchWorkOrders();
        }
        fetchDashboardData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      paused: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DashboardIcon sx={{ mr: 2 }} />
        Production Dashboard
      </Typography>
      
      {dashboardData && (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Production Items
                </Typography>
                <Typography variant="h4">
                  {dashboardData.production_items_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active BOMs
                </Typography>
                <Typography variant="h4">
                  {dashboardData.bom_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Manufacturing Units
                </Typography>
                <Typography variant="h4">
                  {manufacturingUnits.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Operations
                </Typography>
                <Typography variant="h4">
                  {operations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Work Order Status Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Work Order Status
                </Typography>
                {dashboardData.work_order_stats.map(stat => (
                  <Box key={stat.status} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {stat.status.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="body2">
                        {stat.count}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', bgcolor: 'grey.300', borderRadius: 1, height: 8 }}>
                      <Box
                        sx={{
                          width: `${(stat.count / dashboardData.work_order_stats.reduce((sum, s) => sum + s.count, 0)) * 100}%`,
                          bgcolor: getStatusColor(stat.status) + '.main',
                          height: '100%',
                          borderRadius: 1
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Work Orders */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Work Orders
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Work Order ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.recent_work_orders.map(wo => (
                        <TableRow key={wo.id}>
                          <TableCell>{wo.work_order_id}</TableCell>
                          <TableCell>
                            <Chip 
                              label={wo.status} 
                              color={getStatusColor(wo.status)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={wo.priority} 
                              color={wo.priority === 'high' ? 'error' : wo.priority === 'medium' ? 'warning' : 'default'} 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Production Items Tab
  const ProductionItemsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <FactoryIcon sx={{ mr: 2 }} />
          Production Items
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog('productionItem')}
        >
          Add Production Item
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Code</TableCell>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Standard Cost</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productionItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_code}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.category_name}</TableCell>
                    <TableCell>{item.unit_of_measurement}</TableCell>
                    <TableCell>₹{parseFloat(item.standard_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        color={getStatusColor(item.status)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openDialog('productionItem', item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // Work Orders Tab
  const WorkOrdersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <AssignmentIcon sx={{ mr: 2 }} />
          Work Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog('workOrder')}
        >
          Create Work Order
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Work Order ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Planned Start</TableCell>
                  <TableCell>Estimated Hours</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workOrders.map(wo => (
                  <TableRow key={wo.id}>
                    <TableCell>{wo.work_order_id}</TableCell>
                    <TableCell>{wo.title}</TableCell>
                    <TableCell>
                      <Chip 
                        label={wo.priority} 
                        color={wo.priority === 'high' ? 'error' : wo.priority === 'medium' ? 'warning' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={wo.status} 
                        color={getStatusColor(wo.status)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {wo.planned_start_date ? new Date(wo.planned_start_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{wo.estimated_hours || 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openDialog('workOrder', wo)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // Master Data Tab
  const MasterDataTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2 }} />
        Master Data
      </Typography>
      
      <Grid container spacing={3}>
        {/* Manufacturing Units */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manufacturing Units ({manufacturingUnits.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Unit Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manufacturingUnits.map(unit => (
                      <TableRow key={unit.id}>
                        <TableCell>{unit.unit_name}</TableCell>
                        <TableCell>{unit.unit_code}</TableCell>
                        <TableCell>{unit.capacity_per_day} {unit.unit_of_measurement}</TableCell>
                        <TableCell>{unit.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Production Categories */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Production Categories ({categories.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Lead Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell>{category.category_name}</TableCell>
                        <TableCell>{category.category_code}</TableCell>
                        <TableCell>{category.item_count}</TableCell>
                        <TableCell>{category.default_lead_time_days} days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Production Operations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Production Operations ({operations.length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Operation</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Setup Time</TableCell>
                      <TableCell>Run Time/Unit</TableCell>
                      <TableCell>Hourly Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operations.map(op => (
                      <TableRow key={op.id}>
                        <TableCell>{op.operation_name}</TableCell>
                        <TableCell>{op.operation_code}</TableCell>
                        <TableCell>
                          <Chip 
                            label={op.operation_type} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{op.setup_time_hours}h</TableCell>
                        <TableCell>{op.run_time_per_unit_hours}h</TableCell>
                        <TableCell>₹{op.hourly_rate}/hr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <FactoryIcon sx={{ mr: 2, fontSize: 40 }} />
        Production Management
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="Production Items" />
          <Tab label="Work Orders" />
          <Tab label="Master Data" />
        </Tabs>
      </Box>

      {activeTab === 0 && <DashboardTab />}
      {activeTab === 1 && <ProductionItemsTab />}
      {activeTab === 2 && <WorkOrdersTab />}
      {activeTab === 3 && <MasterDataTab />}

      {/* Dialog for Add/Edit */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Edit' : 'Add'} {dialogType === 'productionItem' ? 'Production Item' : 'Work Order'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {dialogType === 'productionItem' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item Code"
                    value={formData.item_code || ''}
                    onChange={(e) => handleFormChange('item_code', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item Name"
                    value={formData.item_name || ''}
                    onChange={(e) => handleFormChange('item_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category_id || ''}
                      onChange={(e) => handleFormChange('category_id', e.target.value)}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.category_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Standard Cost"
                    type="number"
                    value={formData.standard_cost || ''}
                    onChange={(e) => handleFormChange('standard_cost', e.target.value)}
                  />
                </Grid>
              </>
            )}
            
            {dialogType === 'workOrder' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={formData.title || ''}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority || 'medium'}
                      onChange={(e) => handleFormChange('priority', e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Planned Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.planned_start_date || ''}
                    onChange={(e) => handleFormChange('planned_start_date', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Estimated Hours"
                    type="number"
                    value={formData.estimated_hours || ''}
                    onChange={(e) => handleFormChange('estimated_hours', e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductionManagement;