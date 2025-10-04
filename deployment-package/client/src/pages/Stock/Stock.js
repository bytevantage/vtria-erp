/**
 * Stock Management Page for VTRIA ERP
 * Multi-location inventory tracking with DataGrid
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Warning,
  FilterList,
  LocationOn
} from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// Sample stock data - replace with API calls
const sampleStock = [
  {
    id: '1',
    item_code: 'PUMP001',
    item_name: 'Industrial Water Pump',
    category: 'Pumps',
    quantity: 15,
    min_stock_level: 10,
    unit: 'PCS',
    unit_price: 25000,
    location: 'Mangalore',
    supplier: 'ABC Pumps Ltd',
    last_updated: '2024-01-20'
  },
  {
    id: '2',
    item_code: 'MOTOR002',
    item_name: '5HP Electric Motor',
    category: 'Motors',
    quantity: 5,
    min_stock_level: 8,
    unit: 'PCS',
    unit_price: 15000,
    location: 'Bangalore',
    supplier: 'XYZ Motors',
    last_updated: '2024-01-18'
  },
  {
    id: '3',
    item_code: 'VALVE003',
    item_name: 'Ball Valve 2 inch',
    category: 'Valves',
    quantity: 3,
    min_stock_level: 15,
    unit: 'PCS',
    unit_price: 2500,
    location: 'Pune',
    supplier: 'Valve Solutions',
    last_updated: '2024-01-15'
  }
];

const validationSchema = Yup.object({
  item_code: Yup.string().required('Item code is required'),
  item_name: Yup.string().required('Item name is required'),
  category: Yup.string().required('Category is required'),
  quantity: Yup.number().required('Quantity is required').min(0, 'Quantity cannot be negative'),
  min_stock_level: Yup.number().required('Minimum stock level is required').min(0),
  unit_price: Yup.number().required('Unit price is required').min(0),
  location_id: Yup.string().required('Location is required')
});

const Stock = () => {
  const [stock, setStock] = useState(sampleStock);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');

  const columns = [
    {
      field: 'item_code',
      headerName: 'Item Code',
      width: 120
    },
    {
      field: 'item_name',
      headerName: 'Item Name',
      width: 200,
      flex: 1
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      type: 'number',
      renderCell: (params) => {
        const isLowStock = params.value <= params.row.min_stock_level;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              color={isLowStock ? 'error.main' : 'text.primary'}
              fontWeight={isLowStock ? 'bold' : 'normal'}
            >
              {params.value}
            </Typography>
            {isLowStock && <Warning color="error" fontSize="small" />}
          </Box>
        );
      }
    },
    {
      field: 'unit',
      headerName: 'Unit',
      width: 80
    },
    {
      field: 'unit_price',
      headerName: 'Unit Price',
      width: 120,
      type: 'number',
      valueFormatter: (params) => `₹${params.value?.toLocaleString()}`
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={<LocationOn />}
          label={params.value}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'supplier',
      headerName: 'Supplier',
      width: 150
    },
    {
      field: 'stock_status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        const isLowStock = params.row.quantity <= params.row.min_stock_level;
        return (
          <Chip
            label={isLowStock ? 'Low Stock' : 'In Stock'}
            color={isLowStock ? 'error' : 'success'}
            size="small"
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={() => handleEdit(params.row)}
        >
          <Edit />
        </IconButton>
      )
    }
  ];

  const handleEdit = (item) => {
    setEditingItem(item);
    setOpenDialog(true);
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setLoading(true);
      console.log('Saving stock item:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingItem) {
        // Update existing item
        setStock(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...values } : item
        ));
      } else {
        // Add new item
        const newItem = {
          id: Date.now().toString(),
          ...values,
          last_updated: new Date().toISOString().split('T')[0]
        };
        setStock(prev => [...prev, newItem]);
      }
      
      resetForm();
      setOpenDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving stock item:', error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const filteredStock = locationFilter 
    ? stock.filter(item => item.location === locationFilter)
    : stock;

  const lowStockCount = stock.filter(item => item.quantity <= item.min_stock_level).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Stock Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              label="Location"
            >
              <MenuItem value="">All Locations</MenuItem>
              <MenuItem value="Mangalore">Mangalore</MenuItem>
              <MenuItem value="Bangalore">Bangalore</MenuItem>
              <MenuItem value="Pune">Pune</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setOpenDialog(true)}
          >
            Add Item
          </Button>
        </Box>
      </Box>

      {lowStockCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{lowStockCount}</strong> items are running low on stock and need replenishment.
          </Typography>
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredStock}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          checkboxSelection
          disableSelectionOnClick
          loading={loading}
          getRowClassName={(params) => 
            params.row.quantity <= params.row.min_stock_level ? 'low-stock-row' : ''
          }
          sx={{
            '& .low-stock-row': {
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
            },
          }}
        />
      </Paper>

      {/* Add/Edit Stock Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
        </DialogTitle>
        <Formik
          initialValues={{
            item_code: editingItem?.item_code || '',
            item_name: editingItem?.item_name || '',
            category: editingItem?.category || '',
            quantity: editingItem?.quantity || 0,
            min_stock_level: editingItem?.min_stock_level || 0,
            unit: editingItem?.unit || 'PCS',
            unit_price: editingItem?.unit_price || 0,
            supplier: editingItem?.supplier || '',
            location_id: editingItem?.location || ''
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      name="item_code"
                      label="Item Code"
                      fullWidth
                      required
                      value={values.item_code}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.item_code && Boolean(errors.item_code)}
                      helperText={touched.item_code && errors.item_code}
                    />
                    
                    <TextField
                      name="item_name"
                      label="Item Name"
                      fullWidth
                      required
                      value={values.item_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.item_name && Boolean(errors.item_name)}
                      helperText={touched.item_name && errors.item_name}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      name="category"
                      label="Category"
                      fullWidth
                      required
                      value={values.category}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.category && Boolean(errors.category)}
                      helperText={touched.category && errors.category}
                    />
                    
                    <FormControl fullWidth required>
                      <InputLabel>Location</InputLabel>
                      <Select
                        name="location_id"
                        value={values.location_id}
                        onChange={handleChange}
                        label="Location"
                        error={touched.location_id && Boolean(errors.location_id)}
                      >
                        <MenuItem value="Mangalore">Mangalore</MenuItem>
                        <MenuItem value="Bangalore">Bangalore</MenuItem>
                        <MenuItem value="Pune">Pune</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      name="quantity"
                      label="Current Quantity"
                      type="number"
                      fullWidth
                      required
                      value={values.quantity}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.quantity && Boolean(errors.quantity)}
                      helperText={touched.quantity && errors.quantity}
                    />
                    
                    <TextField
                      name="min_stock_level"
                      label="Minimum Stock Level"
                      type="number"
                      fullWidth
                      required
                      value={values.min_stock_level}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.min_stock_level && Boolean(errors.min_stock_level)}
                      helperText={touched.min_stock_level && errors.min_stock_level}
                    />
                    
                    <TextField
                      name="unit"
                      label="Unit"
                      fullWidth
                      value={values.unit}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      name="unit_price"
                      label="Unit Price (₹)"
                      type="number"
                      fullWidth
                      required
                      value={values.unit_price}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.unit_price && Boolean(errors.unit_price)}
                      helperText={touched.unit_price && errors.unit_price}
                    />
                    
                    <TextField
                      name="supplier"
                      label="Supplier"
                      fullWidth
                      value={values.supplier}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Box>
                </Box>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={() => {
                  setOpenDialog(false);
                  setEditingItem(null);
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </Box>
  );
};

export default Stock;
