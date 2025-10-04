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
  Fab,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  Login,
  Logout,
  Schedule,
  LocationOn,
  Today,
  DateRange,
  AccessTime,
  Warning,
  CheckCircle,
  MyLocation,
  FilterList,
  Refresh
} from '@mui/icons-material';

interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_employee_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_location?: string;
  check_out_location?: string;
  total_hours?: string | number; // API returns string, but can be converted to number
  attendance_status: string;
  is_late: boolean;
  late_minutes: number;
}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
}

const AttendanceManagement: React.FC = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCheckInDialog, setOpenCheckInDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [employeeFilter, setEmployeeFilter] = useState('');

  useEffect(() => {
    fetchAttendanceRecords();
    fetchEmployees();
  }, [dateFilter, employeeFilter]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: dateFilter,
        end_date: dateFilter,
        ...(employeeFilter && { employee_id: employeeFilter })
      });

      const response = await fetch(`${API_BASE_URL}/api/employees/attendance/records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAttendanceRecords(result.data);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      // Mock data for demo
      setAttendanceRecords([
        {
          id: 1,
          employee_id: 1,
          employee_name: 'John Doe',
          employee_employee_id: 'EMP/2024/001',
          attendance_date: dateFilter,
          check_in_time: '2025-09-12T09:15:00.000Z',
          check_out_time: '2025-09-12T18:30:00.000Z',
          check_in_location: 'Head Office, Mangalore',
          check_out_location: 'Head Office, Mangalore',
          total_hours: 8.25,
          attendance_status: 'present',
          is_late: true,
          late_minutes: 15
        },
        {
          id: 2,
          employee_id: 2,
          employee_name: 'Jane Smith',
          employee_employee_id: 'EMP/2024/002',
          attendance_date: dateFilter,
          check_in_time: '2025-09-12T08:45:00.000Z',
          total_hours: 0,
          attendance_status: 'present',
          is_late: false,
          late_minutes: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees?status=active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setEmployees(result.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Mock data for demo
      setEmployees([
        { id: 1, employee_id: 'EMP/2024/001', first_name: 'John', last_name: 'Doe' },
        { id: 2, employee_id: 'EMP/2024/002', first_name: 'Jane', last_name: 'Smith' }
      ]);
    }
  };

  const getCurrentLocation = () => {
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setLocationError('Unable to get location. Please enable location access.');
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  const handleAttendanceAction = async (action: 'check_in' | 'check_out') => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    if (!currentLocation && action === 'check_in') {
      alert('Please get your current location first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          employee_id: parseInt(selectedEmployee),
          action,
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng,
          location: 'Current Location', // You could reverse geocode this
          method: 'mobile_gps'
        })
      });

      if (response.ok) {
        setOpenCheckInDialog(false);
        setSelectedEmployee('');
        setCurrentLocation(null);
        fetchAttendanceRecords();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record attendance');
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      alert('Failed to record attendance');
    }
  };

  const getStatusColor = (status: string, isLate: boolean) => {
    if (isLate) return 'warning';
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'on_leave':
        return 'info';
      case 'partial_day':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getTodaysAttendanceStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(record => record.attendance_date === today);

    return {
      total: todayRecords.length,
      present: todayRecords.filter(record => record.check_in_time).length,
      late: todayRecords.filter(record => record.is_late).length,
      checkedOut: todayRecords.filter(record => record.check_out_time).length
    };
  };

  const stats = getTodaysAttendanceStats();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Attendance Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAttendanceRecords}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Schedule />}
            onClick={() => setOpenCheckInDialog(true)}
          >
            Mark Attendance
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Employees
                  </Typography>
                  <Typography variant="h4">
                    {stats.total}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Present Today
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.present}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Late Arrivals
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.late}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Checked Out
                  </Typography>
                  <Typography variant="h4">
                    {stats.checkedOut}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Logout />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
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
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                fullWidth
              >
                More Filters
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
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

      {/* Attendance Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Check Out</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="center">Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No attendance records found for selected date
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                            {getInitials(
                              record.employee_name.split(' ')[0],
                              record.employee_name.split(' ')[1] || ''
                            )}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {record.employee_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.employee_employee_id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {formatTime(record.check_in_time)}
                            </Typography>
                            {record.is_late && (
                              <Typography variant="caption" color="warning.main">
                                Late by {record.late_minutes} min
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Logout fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatTime(record.check_out_time)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {record.check_in_location || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">
                          {record.total_hours ? `${parseFloat(record.total_hours).toFixed(2)}h` : '--'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.attendance_status.toUpperCase()}
                          color={getStatusColor(record.attendance_status, record.is_late) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {!record.check_out_time && record.check_in_time && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSelectedEmployee(record.employee_id.toString());
                              handleAttendanceAction('check_out');
                            }}
                          >
                            Check Out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Attendance Marking Dialog */}
      <Dialog
        open={openCheckInDialog}
        onClose={() => setOpenCheckInDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mark Attendance</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={selectedEmployee}
                  label="Select Employee"
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id.toString()}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'grey.50', border: '1px dashed grey.300' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationOn sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="medium">
                      Location Information
                    </Typography>
                  </Box>

                  {!currentLocation && !locationError && (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<MyLocation />}
                        onClick={getCurrentLocation}
                      >
                        Get Current Location
                      </Button>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Location is required for attendance marking
                      </Typography>
                    </Box>
                  )}

                  {currentLocation && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Location captured successfully!
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                      </Typography>
                    </Alert>
                  )}

                  {locationError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {locationError}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCheckInDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleAttendanceAction('check_in')}
            variant="contained"
            startIcon={<Login />}
            disabled={!selectedEmployee || !currentLocation}
          >
            Check In
          </Button>
          <Button
            onClick={() => handleAttendanceAction('check_out')}
            variant="outlined"
            startIcon={<Logout />}
            disabled={!selectedEmployee}
          >
            Check Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceManagement;