/**
 * Users Management Page for VTRIA ERP
 * Admin interface for user and role management
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
  OutlinedInput,
  Avatar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  PersonAdd,
  Security
} from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// Sample users data - replace with API calls
const sampleUsers = [
  {
    id: '1',
    email: 'admin@vtria.com',
    first_name: 'System',
    last_name: 'Administrator',
    employee_id: 'VTRIA001',
    department: 'IT',
    roles: ['Director'],
    locations: ['Mangalore', 'Bangalore', 'Pune'],
    is_active: true,
    last_login: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    email: 'john.doe@vtria.com',
    first_name: 'John',
    last_name: 'Doe',
    employee_id: 'VTRIA002',
    department: 'Engineering',
    roles: ['Engineer'],
    locations: ['Mangalore'],
    is_active: true,
    last_login: '2024-01-19T14:15:00Z'
  },
  {
    id: '3',
    email: 'jane.smith@vtria.com',
    first_name: 'Jane',
    last_name: 'Smith',
    employee_id: 'VTRIA003',
    department: 'Sales',
    roles: ['Sales Admin', 'Manager'],
    locations: ['Bangalore', 'Pune'],
    is_active: true,
    last_login: '2024-01-18T09:45:00Z'
  }
];

const availableRoles = ['Director', 'Manager', 'Sales Admin', 'Engineer', 'User'];
const availableLocations = ['Mangalore', 'Bangalore', 'Pune'];

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  employee_id: Yup.string().required('Employee ID is required'),
  department: Yup.string().required('Department is required'),
  password: Yup.string().min(8, 'Password must be at least 8 characters')
});

const Users = () => {
  const [users, setUsers] = useState(sampleUsers);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      field: 'avatar',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          {params.row.first_name[0]}{params.row.last_name[0]}
        </Avatar>
      )
    },
    {
      field: 'employee_id',
      headerName: 'Employee ID',
      width: 120
    },
    {
      field: 'full_name',
      headerName: 'Name',
      width: 180,
      valueGetter: (params) => `${params.row.first_name} ${params.row.last_name}`
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 220,
      flex: 1
    },
    {
      field: 'department',
      headerName: 'Department',
      width: 120
    },
    {
      field: 'roles',
      headerName: 'Roles',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {params.value.map((role, index) => (
            <Chip
              key={index}
              label={role}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )
    },
    {
      field: 'locations',
      headerName: 'Locations',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value.join(', ')}
        </Typography>
      )
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      )
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
            onClick={() => handleEdit(params.row)}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleManageRoles(params.row)}
          >
            <Security />
          </IconButton>
        </Box>
      )
    }
  ];

  const handleEdit = (user) => {
    setEditingUser(user);
    setOpenDialog(true);
  };

  const handleManageRoles = (user) => {
    setSelectedUser(user);
    setOpenRoleDialog(true);
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setLoading(true);
      console.log('Saving user:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingUser) {
        // Update existing user
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id ? { ...user, ...values } : user
        ));
      } else {
        // Add new user
        const newUser = {
          id: Date.now().toString(),
          ...values,
          roles: ['User'], // Default role
          locations: ['Mangalore'], // Default location
          is_active: true,
          last_login: null
        };
        setUsers(prev => [...prev, newUser]);
      }
      
      resetForm();
      setOpenDialog(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleRoleUpdate = async (userId, newRoles, newLocations) => {
    try {
      setLoading(true);
      console.log('Updating roles for user:', userId, newRoles, newLocations);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, roles: newRoles, locations: newLocations }
          : user
      ));
      
      setOpenRoleDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users Management</Typography>
        <Button
          startIcon={<PersonAdd />}
          variant="contained"
          onClick={() => setOpenDialog(true)}
        >
          Add User
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          checkboxSelection
          disableSelectionOnClick
          loading={loading}
        />
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <Formik
          initialValues={{
            email: editingUser?.email || '',
            first_name: editingUser?.first_name || '',
            last_name: editingUser?.last_name || '',
            employee_id: editingUser?.employee_id || '',
            department: editingUser?.department || '',
            password: ''
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
                      name="first_name"
                      label="First Name"
                      fullWidth
                      required
                      value={values.first_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.first_name && Boolean(errors.first_name)}
                      helperText={touched.first_name && errors.first_name}
                    />
                    
                    <TextField
                      name="last_name"
                      label="Last Name"
                      fullWidth
                      required
                      value={values.last_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.last_name && Boolean(errors.last_name)}
                      helperText={touched.last_name && errors.last_name}
                    />
                  </Box>
                  
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    fullWidth
                    required
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      name="employee_id"
                      label="Employee ID"
                      fullWidth
                      required
                      value={values.employee_id}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.employee_id && Boolean(errors.employee_id)}
                      helperText={touched.employee_id && errors.employee_id}
                    />
                    
                    <TextField
                      name="department"
                      label="Department"
                      fullWidth
                      required
                      value={values.department}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.department && Boolean(errors.department)}
                      helperText={touched.department && errors.department}
                    />
                  </Box>
                  
                  <TextField
                    name="password"
                    label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
                    type="password"
                    fullWidth
                    required={!editingUser}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                  />
                </Box>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={() => {
                  setOpenDialog(false);
                  setEditingUser(null);
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {editingUser ? 'Update' : 'Create'} User
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Manage Roles - {selectedUser?.first_name} {selectedUser?.last_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={selectedUser?.roles || []}
                onChange={(e) => setSelectedUser(prev => ({ ...prev, roles: e.target.value }))}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Locations</InputLabel>
              <Select
                multiple
                value={selectedUser?.locations || []}
                onChange={(e) => setSelectedUser(prev => ({ ...prev, locations: e.target.value }))}
                input={<OutlinedInput label="Locations" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableLocations.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => {
            setOpenRoleDialog(false);
            setSelectedUser(null);
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleRoleUpdate(
              selectedUser.id,
              selectedUser.roles,
              selectedUser.locations
            )}
            disabled={loading}
          >
            Update Roles
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
