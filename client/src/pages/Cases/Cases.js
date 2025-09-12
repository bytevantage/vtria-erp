/**
 * Cases Management Page for VTRIA ERP
 * DataGrid with filtering and case management
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
  MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Visibility,
  FilterList
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// Sample data - replace with API calls
const sampleCases = [
  {
    id: '1',
    case_number: 'CASE-2024-0001',
    title: 'Pump Installation - Client A',
    status: 'OPEN',
    priority: 'HIGH',
    client_name: 'ABC Industries',
    assigned_to: 'John Doe',
    location: 'Mangalore',
    created_at: '2024-01-15',
    due_date: '2024-01-30'
  },
  {
    id: '2',
    case_number: 'CASE-2024-0002',
    title: 'Motor Maintenance - Client B',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    client_name: 'XYZ Corp',
    assigned_to: 'Jane Smith',
    location: 'Bangalore',
    created_at: '2024-01-10',
    due_date: '2024-01-25'
  }
];

const statusColors = {
  OPEN: 'error',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
  ON_HOLD: 'info'
};

const priorityColors = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error'
};

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required').min(5, 'Title must be at least 5 characters'),
  description: Yup.string(),
  priority: Yup.string().required('Priority is required'),
  client_name: Yup.string().required('Client name is required'),
  location_id: Yup.string().required('Location is required')
});

const Cases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState(sampleCases);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      field: 'case_number',
      headerName: 'Case Number',
      width: 150,
      renderCell: (params) => (
        <Button
          variant="text"
          onClick={() => navigate(`/cases/${params.row.id}`)}
          sx={{ textTransform: 'none' }}
        >
          {params.value}
        </Button>
      )
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 250,
      flex: 1
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={statusColors[params.value]}
          size="small"
        />
      )
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={priorityColors[params.value]}
          size="small"
        />
      )
    },
    {
      field: 'client_name',
      headerName: 'Client',
      width: 150
    },
    {
      field: 'assigned_to',
      headerName: 'Assigned To',
      width: 130
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 120
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 120,
      type: 'date',
      valueGetter: (params) => new Date(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => navigate(`/cases/${params.row.id}`)}
          >
            <Visibility />
          </IconButton>
          <IconButton size="small">
            <Edit />
          </IconButton>
        </Box>
      )
    }
  ];

  const handleCreateCase = async (values, { setSubmitting, resetForm }) => {
    try {
      setLoading(true);
      // API call would go here
      console.log('Creating case:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      resetForm();
      setOpenDialog(false);
      // Refresh cases list
    } catch (error) {
      console.error('Error creating case:', error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Cases Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<FilterList />}
            variant="outlined"
          >
            Filter
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setOpenDialog(true)}
          >
            New Case
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={cases}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection
          disableSelectionOnClick
          loading={loading}
        />
      </Paper>

      {/* Create Case Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Case</DialogTitle>
        <Formik
          initialValues={{
            title: '',
            description: '',
            priority: 'MEDIUM',
            client_name: '',
            client_contact: '',
            location_id: '',
            estimated_hours: ''
          }}
          validationSchema={validationSchema}
          onSubmit={handleCreateCase}
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    name="title"
                    label="Case Title"
                    fullWidth
                    required
                    value={values.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.title && Boolean(errors.title)}
                    helperText={touched.title && errors.title}
                  />
                  
                  <TextField
                    name="description"
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        name="priority"
                        value={values.priority}
                        onChange={handleChange}
                        label="Priority"
                      >
                        <MenuItem value="LOW">Low</MenuItem>
                        <MenuItem value="MEDIUM">Medium</MenuItem>
                        <MenuItem value="HIGH">High</MenuItem>
                        <MenuItem value="CRITICAL">Critical</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth required>
                      <InputLabel>Location</InputLabel>
                      <Select
                        name="location_id"
                        value={values.location_id}
                        onChange={handleChange}
                        label="Location"
                      >
                        <MenuItem value="MNG">Mangalore</MenuItem>
                        <MenuItem value="BLR">Bangalore</MenuItem>
                        <MenuItem value="PUN">Pune</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      name="client_name"
                      label="Client Name"
                      fullWidth
                      required
                      value={values.client_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.client_name && Boolean(errors.client_name)}
                      helperText={touched.client_name && errors.client_name}
                    />
                    
                    <TextField
                      name="client_contact"
                      label="Client Contact"
                      fullWidth
                      value={values.client_contact}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Box>
                  
                  <TextField
                    name="estimated_hours"
                    label="Estimated Hours"
                    type="number"
                    fullWidth
                    value={values.estimated_hours}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Box>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  Create Case
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </Box>
  );
};

export default Cases;
