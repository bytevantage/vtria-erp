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
  Avatar,
  IconButton,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Add,
  CalendarToday,
  Check,
  Close,
  Info,
  Schedule,
  DateRange,
  Person,
  BeachAccess,
  LocalHospital,
  Work,
  Home
} from '@mui/icons-material';

interface LeaveApplication {
  id: number;
  application_id: string;
  employee_name: string;
  employee_id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  applied_date: string;
  approved_by_name?: string;
}

interface LeaveBalance {
  id: number;
  leave_type_name: string;
  leave_code: string;
  entitled_days: number;
  used_days: number;
  available_balance: number;
  is_paid: boolean;
}

interface LeaveType {
  id: number;
  leave_type_name: string;
  leave_code: string;
  max_days_per_year: number;
  is_paid: boolean;
}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
}

const LeaveManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    is_half_day: false,
    reason: '',
    emergency_contact_during_leave: '',
    contact_phone: '',
    handover_notes: ''
  });

  useEffect(() => {
    fetchCurrentEmployee(); // Fetch logged-in employee
    fetchLeaveApplications();
    fetchLeaveTypes();
    fetchEmployees();
  }, [statusFilter, employeeFilter]);

  const resetForm = () => {
    setFormData({
      employee_id: currentEmployee?.id.toString() || '',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      is_half_day: false,
      reason: '',
      emergency_contact_during_leave: '',
      contact_phone: '',
      handover_notes: ''
    });
  };

  const fetchCurrentEmployee = async () => {
    try {
      const token = localStorage.getItem('vtria_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/employees/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const empData: Employee = {
            id: result.data.id,
            employee_id: result.data.employee_id,
            first_name: result.data.first_name,
            last_name: result.data.last_name
          };
          setCurrentEmployee(empData);
          // Auto-set employee_id in form
          setFormData(prev => ({ ...prev, employee_id: empData.id.toString() }));
          console.log('Current employee loaded:', empData);
        }
      } else {
        console.error('Failed to fetch current employee');
      }
    } catch (error) {
      console.error('Error fetching current employee:', error);
    }
  };

  const fetchLeaveApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(employeeFilter && { employee_id: employeeFilter })
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/leave-policy/applications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setLeaveApplications(result.data);
      }
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      setLeaveApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/leave-policy/types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setLeaveTypes(result.data || []);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching leave types:', error);
      setLeaveTypes([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('vtria_token');
      if (!token) {
        console.error('No authentication token found');
        setEmployees([]);
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/employees?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setEmployees(result.data || []);
        console.log(`Employees fetched successfully: ${result.data?.length || 0}`);
      } else if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed for employee fetch');
        setEmployees([]);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchLeaveBalances = async (employeeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/leave-policy/balance/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setLeaveBalances(result.data);
      }
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      setLeaveBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/leave-policy/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          employee_id: parseInt(formData.employee_id),
          leave_type_id: parseInt(formData.leave_type_id),
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason,
          emergency_contact: formData.emergency_contact_during_leave,
          handover_notes: formData.handover_notes,
          is_half_day: formData.is_half_day
        })
      });

      if (response.ok) {
        setOpenDialog(false);
        resetForm();
        fetchLeaveApplications();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit leave application');
      }
    } catch (error) {
      console.error('Error applying for leave:', error);
      alert('Failed to submit leave application');
    }
  };

  const handleProcessApplication = async (applicationId: number, action: 'approve' | 'reject', comments?: string) => {
    // Confirmation dialog
    const actionText = action === 'approve' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${actionText} this leave application?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/leave-policy/applications/${applicationId}/process`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({ action, comments })
      });

      if (response.ok) {
        alert(`Leave application ${action}d successfully!`);
        fetchLeaveApplications();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to process application');
      }
    } catch (error) {
      console.error('Error processing application:', error);
      alert('Failed to process application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'submitted':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getLeaveTypeIcon = (leaveType: string) => {
    switch (leaveType.toLowerCase()) {
      case 'annual leave':
        return <BeachAccess />;
      case 'sick leave':
        return <LocalHospital />;
      case 'work from home':
        return <Home />;
      default:
        return <Work />;
    }
  };

  const calculateLeaveDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return formData.is_half_day ? 0.5 : diffDays;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Leave Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Apply for Leave
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Leave Applications" />
        <Tab label="Leave Balances" />
      </Tabs>

      {tabValue === 0 && (
        <>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="submitted">Pending Approval</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      value={employeeFilter}
                      label="Employee"
                      onChange={(e) => setEmployeeFilter(e.target.value)}
                    >
                      <MenuItem value="">All Employees</MenuItem>
                      {employees.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id.toString()}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    startIcon={<DateRange />}
                    fullWidth
                  >
                    Export Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Applications Table */}
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Leave Type</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Applied Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No leave applications found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveApplications.map((application) => (
                        <TableRow key={application.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                                {getInitials(
                                  application.employee_name.split(' ')[0],
                                  application.employee_name.split(' ')[1] || ''
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {application.employee_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {application.employee_id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getLeaveTypeIcon(application.leave_type_name)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {application.leave_type_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(application.start_date).toLocaleDateString()} - {new Date(application.end_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {application.total_days} {application.total_days === 1 ? 'day' : 'days'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {application.reason}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(application.applied_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={application.status.toUpperCase()}
                              color={getStatusColor(application.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {application.status === 'submitted' && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleProcessApplication(application.id, 'approve')}
                                >
                                  <Check fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleProcessApplication(application.id, 'reject')}
                                >
                                  <Close fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                            <IconButton size="small">
                              <Info fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {tabValue === 1 && (
        <>
          {/* Employee Selection for Leave Balances */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Employee to View Balances</InputLabel>
                <Select
                  value=""
                  label="Select Employee to View Balances"
                  onChange={(e) => fetchLeaveBalances(e.target.value)}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id.toString()}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          {/* Leave Balances */}
          <Grid container spacing={3}>
            {leaveBalances.map((balance) => (
              <Grid item xs={12} md={6} lg={4} key={balance.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getLeaveTypeIcon(balance.leave_type_name)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {balance.leave_type_name}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Available</Typography>
                        <Typography variant="h6" color="success.main">
                          {balance.available_balance}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(balance.available_balance / balance.entitled_days) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Entitled:</Typography>
                      <Typography variant="body2">{balance.entitled_days}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Used:</Typography>
                      <Typography variant="body2" color="warning.main">{balance.used_days}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Type:</Typography>
                      <Chip
                        label={balance.is_paid ? 'Paid' : 'Unpaid'}
                        size="small"
                        color={balance.is_paid ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Apply Leave Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Apply for Leave</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employee"
                value={currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name} (${currentEmployee.employee_id})` : 'Loading...'}
                disabled
                helperText="You can only apply leave for yourself"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Leave Type *</InputLabel>
                <Select
                  value={formData.leave_type_id}
                  label="Leave Type *"
                  onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                >
                  {leaveTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id.toString()}>
                      {type.leave_type_name}{type.leave_code ? ` (${type.leave_code})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date *"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date *"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason *"
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                error={formData.reason.length > 0 && formData.reason.trim().length === 0}
                helperText={formData.reason.length > 0 && formData.reason.trim().length === 0 ? "Reason cannot be empty" : "Please provide a detailed reason for your leave"}
                placeholder="Provide a detailed reason for your leave request..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergency_contact_during_leave}
                onChange={(e) => setFormData({ ...formData, emergency_contact_during_leave: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Handover Notes"
                multiline
                rows={2}
                value={formData.handover_notes || ''}
                onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
                placeholder="Provide any handover instructions or notes for your absence..."
              />
            </Grid>

            {calculateLeaveDays() > 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Total leave days: {calculateLeaveDays()}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDialog(false); resetForm(); }}>Cancel</Button>
          <Button
            onClick={handleApplyLeave}
            variant="contained"
            disabled={
              !formData.leave_type_id?.toString().trim() ||
              !formData.start_date?.trim() ||
              !formData.end_date?.trim() ||
              !formData.reason?.trim() ||
              (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) ||
              loading ||
              !currentEmployee
            }
            title={
              !currentEmployee ? 'Loading employee data...' :
                !formData.leave_type_id ? 'Please select a leave type' :
                  !formData.start_date ? 'Please select start date' :
                    !formData.end_date ? 'Please select end date' :
                      (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) ? 'End date must be after start date' :
                        !formData.reason?.trim() ? 'Please provide a reason' :
                          loading ? 'Submitting application...' :
                            'Submit your leave application'
            }
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveManagement;