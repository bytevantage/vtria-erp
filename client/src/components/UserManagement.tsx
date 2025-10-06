import React, { useState, useEffect } from 'react';
import {
  Box,
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Alert,
  LinearProgress,
  FormHelperText,
  CircularProgress,
  SelectChangeEvent,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  AdminPanelSettings,
  Group
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

// User interface
interface User {
  id: number;
  email: string;
  full_name: string;
  user_role: 'director' | 'admin' | 'sales-admin' | 'designer' | 'accounts' | 'technician';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  email: string;
  full_name: string;
  user_role: string;
  password?: string;
  status: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    user_role: '',
    password: '',
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const { enqueueSnackbar } = useSnackbar();

  // User roles with descriptions
  const userRoles = [
    { value: 'director', label: 'Director', description: 'Full system access and executive controls' },
    { value: 'admin', label: 'Administrator', description: 'System administration and user management' },
    { value: 'sales-admin', label: 'Sales Admin', description: 'Sales operations and customer management' },
    { value: 'designer', label: 'Designer', description: 'Design and estimation access' },
    { value: 'accounts', label: 'Accounts', description: 'Financial and accounting operations' },
    { value: 'technician', label: 'Technician', description: 'Production and technical operations' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        enqueueSnackbar('Failed to fetch users', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Error fetching users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        full_name: user.full_name,
        user_role: user.user_role,
        password: '',
        status: user.status
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        full_name: '',
        user_role: '',
        password: '',
        status: 'active'
      });
    }
    setFormErrors({});
    setShowPassword(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      user_role: '',
      password: '',
      status: 'active'
    });
    setFormErrors({});
    setShowPassword(false);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.full_name) {
      errors.full_name = 'Full name is required';
    }

    if (!formData.user_role) {
      errors.user_role = 'User role is required';
    }

    if (!editingUser && !formData.password) {
      errors.password = 'Password is required for new users';
    }

    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const payload = {
        email: formData.email,
        full_name: formData.full_name,
        user_role: formData.user_role,
        status: formData.status,
        ...(formData.password && { password: formData.password })
      };

      if (editingUser) {
        const response = await axios.put(`/api/users/${editingUser.id}`, payload);
        if (response.data.success) {
          enqueueSnackbar('User updated successfully', { variant: 'success' });
          fetchUsers();
          handleCloseDialog();
        } else {
          enqueueSnackbar(response.data.message || 'Failed to update user', { variant: 'error' });
        }
      } else {
        const response = await axios.post('/api/users', payload);
        if (response.data.success) {
          enqueueSnackbar('User created successfully', { variant: 'success' });
          fetchUsers();
          handleCloseDialog();
        } else {
          enqueueSnackbar(response.data.message || 'Failed to create user', { variant: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'Error saving user';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.full_name}"? This action cannot be undone.`)) {
      try {
        const response = await axios.delete(`/api/users/${user.id}`);
        if (response.data.success) {
          enqueueSnackbar('User deleted successfully', { variant: 'success' });
          fetchUsers();
        } else {
          enqueueSnackbar(response.data.message || 'Failed to delete user', { variant: 'error' });
        }
      } catch (error: any) {
        console.error('Error deleting user:', error);
        const errorMessage = error.response?.data?.message || 'Error deleting user';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStatusChip = (status: string) => {
    return (
      <Chip
        label={status}
        color={status === 'active' ? 'success' : 'default'}
        size="small"
      />
    );
  };

  const getRoleChip = (role: string) => {
    const roleInfo = userRoles.find(r => r.value === role);
    return (
      <Chip
        label={roleInfo?.label || role}
        color={role === 'director' ? 'primary' : role === 'admin' ? 'secondary' : 'default'}
        size="small"
      />
    );
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AdminPanelSettings color="primary" />
              <Typography variant="h4" component="h1">
                User Management
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ ml: 'auto' }}
            >
              Add User
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            Manage system users and their access levels. Users created here can log in to the system with their assigned roles.
          </Alert>

          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          </Box>

          {/* Users Table */}
          {loading ? (
            <LinearProgress />
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person color="action" />
                            {user.full_name}
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleChip(user.user_role)}</TableCell>
                        <TableCell>{getStatusChip(user.status)}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(user)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Group color="primary" />
            {editingUser ? 'Edit User' : 'Add New User'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                error={!!formErrors.full_name}
                helperText={formErrors.full_name}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.user_role}>
                <InputLabel>User Role</InputLabel>
                <Select
                  value={formData.user_role}
                  label="User Role"
                  onChange={(e) => handleInputChange('user_role', e.target.value)}
                >
                  {userRoles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {role.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.user_role && (
                  <FormHelperText>{formErrors.user_role}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password || (editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters')}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={(e) => handleInputChange('status', e.target.checked ? 'active' : 'inactive')}
                  />
                }
                label="Active User"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Inactive users cannot log in to the system
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={editingUser ? <Edit /> : <Add />}
          >
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;