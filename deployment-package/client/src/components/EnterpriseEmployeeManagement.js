import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Enterprise Employee Management Component
 * 
 * Comprehensive employee management with:
 * - Role-based access control
 * - Multi-group management
 * - Hierarchical organization structure
 * - Advanced filtering and search
 */
const EnterpriseEmployeeManagement = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [employees, setEmployees] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  
  // Dialog states
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [roleAssignmentDialog, setRoleAssignmentDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    department_id: '',
    employment_status: 'active',
    employee_type: '',
    page: 1,
    limit: 20
  });
  
  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    position_id: '',
    hire_date: '',
    employee_type: 'full_time',
    basic_salary: '',
    work_location_id: '',
    initial_roles: [],
    initial_groups: []
  });

  const [groupForm, setGroupForm] = useState({
    group_name: '',
    description: '',
    group_type: 'functional_team',
    department_id: '',
    max_members: '',
    is_public: false,
    initial_roles: []
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  });

  // Load initial data
  useEffect(() => {
    loadEmployees();
    loadMasterData();
  }, [filters]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`/api/enterprise-employees?${params}`);
      
      if (response.data.success) {
        setEmployees(response.data.data);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      setError('Failed to load employees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [rolesRes, deptRes, locRes] = await Promise.all([
        axios.get('/api/enterprise-employees/master/roles'),
        axios.get('/api/enterprise-employees/master/departments'),
        axios.get('/api/enterprise-employees/master/locations')
      ]);

      setRoles(rolesRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (error) {
      console.error('Failed to load master data:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await axios.get('/api/enterprise-employees/groups?include_members=true');
      if (response.data.success) {
        setGroups(response.data.data);
      }
    } catch (error) {
      setError('Failed to load groups: ' + error.message);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = selectedEmployee 
        ? await axios.put(`/api/enterprise-employees/${selectedEmployee.id}`, employeeForm)
        : await axios.post('/api/enterprise-employees', employeeForm);
      
      if (response.data.success) {
        setSuccess(selectedEmployee ? 'Employee updated successfully' : 'Employee created successfully');
        setEmployeeDialog(false);
        resetEmployeeForm();
        loadEmployees();
      }
    } catch (error) {
      setError('Failed to save employee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('/api/enterprise-employees/groups', groupForm);
      
      if (response.data.success) {
        setSuccess('Group created successfully');
        setGroupDialog(false);
        resetGroupForm();
        loadGroups();
      }
    } catch (error) {
      setError('Failed to create group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleAssignment = async (employeeId, roleId, action = 'assign') => {
    setLoading(true);
    
    try {
      if (action === 'assign') {
        await axios.post(`/api/enterprise-employees/${employeeId}/roles`, {
          role_id: roleId,
          assignment_reason: 'Role assigned via UI'
        });
        setSuccess('Role assigned successfully');
      } else {
        await axios.delete(`/api/enterprise-employees/${employeeId}/roles/${roleId}`, {
          data: { revocation_reason: 'Role revoked via UI' }
        });
        setSuccess('Role revoked successfully');
      }
      
      loadEmployees();
    } catch (error) {
      setError(`Failed to ${action} role: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupMembership = async (groupId, employeeId, action = 'add') => {
    setLoading(true);
    
    try {
      if (action === 'add') {
        await axios.post(`/api/enterprise-employees/groups/${groupId}/members/${employeeId}`);
        setSuccess('Employee added to group successfully');
      } else {
        await axios.delete(`/api/enterprise-employees/groups/${groupId}/members/${employeeId}`);
        setSuccess('Employee removed from group successfully');
      }
      
      loadGroups();
      loadEmployees();
    } catch (error) {
      setError(`Failed to ${action} group member: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department_id: '',
      position_id: '',
      hire_date: '',
      employee_type: 'full_time',
      basic_salary: '',
      work_location_id: '',
      initial_roles: [],
      initial_groups: []
    });
    setSelectedEmployee(null);
  };

  const resetGroupForm = () => {
    setGroupForm({
      group_name: '',
      description: '',
      group_type: 'functional_team',
      department_id: '',
      max_members: '',
      is_public: false,
      initial_roles: []
    });
    setSelectedGroup(null);
  };

  const openEmployeeDialog = (employee = null) => {
    if (employee) {
      setEmployeeForm({ ...employee });
      setSelectedEmployee(employee);
    } else {
      resetEmployeeForm();
    }
    setEmployeeDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'success',
      'inactive': 'warning', 
      'terminated': 'error',
      'on_leave': 'info',
      'suspended': 'error'
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Tab panels
  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
        <Link color="inherit" href="/" onClick={() => navigate('/')}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Typography color="text.primary">Enterprise Employee Management</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Enterprise Employee Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openEmployeeDialog()}
            sx={{ mr: 1 }}
          >
            Add Employee
          </Button>
          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setGroupDialog(true)}
          >
            Create Group
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<PersonIcon />} label="Employees" />
          <Tab icon={<GroupIcon />} label="Groups & Teams" />
          <Tab icon={<SecurityIcon />} label="Roles & Permissions" />
          <Tab icon={<BusinessIcon />} label="Organization" />
        </Tabs>
      </Box>

      {/* Employee Management Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Search Employees"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      placeholder="Name, email, employee ID..."
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={filters.department_id}
                        onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
                      >
                        <MenuItem value="">All Departments</MenuItem>
                        {departments.map(dept => (
                          <MenuItem key={dept.id} value={dept.id}>
                            {dept.department_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.employment_status}
                        onChange={(e) => setFilters({ ...filters, employment_status: e.target.value })}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="terminated">Terminated</MenuItem>
                        <MenuItem value="on_leave">On Leave</MenuItem>
                        <MenuItem value="all">All</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Employee Type</InputLabel>
                      <Select
                        value={filters.employee_type}
                        onChange={(e) => setFilters({ ...filters, employee_type: e.target.value })}
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <MenuItem value="full_time">Full Time</MenuItem>
                        <MenuItem value="part_time">Part Time</MenuItem>
                        <MenuItem value="contract">Contract</MenuItem>
                        <MenuItem value="intern">Intern</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setFilters({
                        search: '',
                        department_id: '',
                        employment_status: 'active',
                        employee_type: '',
                        page: 1,
                        limit: 20
                      })}
                    >
                      Clear
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Employee List */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Employees ({pagination.totalRecords || 0})
                </Typography>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell>Department</TableCell>
                          <TableCell>Position</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Roles</TableCell>
                          <TableCell>Groups</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ mr: 2 }}>
                                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    {employee.full_name || `${employee.first_name} ${employee.last_name}`}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    {employee.employee_id} • {employee.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{employee.department_name || '-'}</TableCell>
                            <TableCell>{employee.position_title || employee.designation || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={employee.employment_status}
                                color={getStatusColor(employee.employment_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${employee.total_roles || 0} roles`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${employee.total_groups || 0} groups`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => navigate(`/employees/${employee.id}`)}
                              >
                                <ViewIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => openEmployeeDialog(employee)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => setRoleAssignmentDialog(true)}
                              >
                                <AssignmentIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                      disabled={!pagination.hasPrev}
                      onClick={() => setFilters({ ...filters, page: pagination.currentPage - 1 })}
                    >
                      Previous
                    </Button>
                    <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </Typography>
                    <Button
                      disabled={!pagination.hasNext}
                      onClick={() => setFilters({ ...filters, page: pagination.currentPage + 1 })}
                    >
                      Next
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Groups Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                  <Typography variant="h6">Groups & Teams</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setGroupDialog(true);
                      loadGroups();
                    }}
                  >
                    Create Group
                  </Button>
                </Box>
                
                <Grid container spacing={2}>
                  {groups.map((group) => (
                    <Grid item xs={12} md={6} lg={4} key={group.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {group.group_name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            {group.description}
                          </Typography>
                          <Box display="flex" justifyContent="between" alignItems="center" mt={2}>
                            <Chip label={group.group_type} size="small" />
                            <Typography variant="body2">
                              {group.member_count} members
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Roles Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Roles
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Role</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Permissions</TableCell>
                        <TableCell>Assigned Users</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">
                                {role.role_name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {role.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={role.role_type} size="small" />
                          </TableCell>
                          <TableCell>{role.hierarchy_level}</TableCell>
                          <TableCell>{role.permission_count || 0}</TableCell>
                          <TableCell>{role.assigned_users || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Organization Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Departments
                </Typography>
                
                {departments.map((dept) => (
                  <Accordion key={dept.id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" justifyContent="between" width="100%">
                        <Typography>{dept.department_name}</Typography>
                        <Chip 
                          label={`${dept.employee_count} employees`} 
                          size="small"
                          sx={{ mr: 2 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="textSecondary">
                        {dept.description}
                      </Typography>
                      {dept.head_name && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Head:</strong> {dept.head_name}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Work Locations
                </Typography>
                
                {locations.map((location) => (
                  <Box key={location.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle1">
                      {location.location_name}
                      {location.is_headquarters && (
                        <Chip label="HQ" size="small" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {location.city}, {location.state}
                    </Typography>
                    <Typography variant="body2">
                      {location.employee_count} employees
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Employee Dialog */}
      <Dialog open={employeeDialog} onClose={() => setEmployeeDialog(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleEmployeeSubmit}>
          <DialogTitle>
            {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="First Name"
                  value={employeeForm.first_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Last Name"
                  value={employeeForm.last_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={employeeForm.department_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department_id: e.target.value })}
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.department_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Work Location</InputLabel>
                  <Select
                    value={employeeForm.work_location_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, work_location_id: e.target.value })}
                  >
                    {locations.map(loc => (
                      <MenuItem key={loc.id} value={loc.id}>
                        {loc.location_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Hire Date"
                  value={employeeForm.hire_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Employee Type</InputLabel>
                  <Select
                    value={employeeForm.employee_type}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_type: e.target.value })}
                  >
                    <MenuItem value="full_time">Full Time</MenuItem>
                    <MenuItem value="part_time">Part Time</MenuItem>
                    <MenuItem value="contract">Contract</MenuItem>
                    <MenuItem value="intern">Intern</MenuItem>
                    <MenuItem value="consultant">Consultant</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Basic Salary"
                  value={employeeForm.basic_salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmployeeDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : (selectedEmployee ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleGroupSubmit}>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Group Name"
                  value={groupForm.group_name}
                  onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Group Type</InputLabel>
                  <Select
                    value={groupForm.group_type}
                    onChange={(e) => setGroupForm({ ...groupForm, group_type: e.target.value })}
                  >
                    <MenuItem value="department">Department</MenuItem>
                    <MenuItem value="project_team">Project Team</MenuItem>
                    <MenuItem value="functional_team">Functional Team</MenuItem>
                    <MenuItem value="committee">Committee</MenuItem>
                    <MenuItem value="temporary">Temporary</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={groupForm.department_id}
                    onChange={(e) => setGroupForm({ ...groupForm, department_id: e.target.value })}
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.department_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Create Group'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default EnterpriseEmployeeManagement;