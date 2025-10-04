import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  People,
  BusinessCenter,
  Schedule,
  CalendarToday,
  TrendingUp,
  Warning,
  CheckCircle,
  Cancel,
  AccessTime,
  LocationOn,
  Notifications
} from '@mui/icons-material';

interface EmployeeStats {
  status: string;
  count: number;
}

interface DepartmentStats {
  department_name: string;
  employee_count: number;
}

interface AttendanceStats {
  total_employees: number;
  checked_in: number;
  on_leave: number;
  late_arrivals: number;
}

interface DashboardData {
  employee_status_summary: EmployeeStats[];
  department_summary: DepartmentStats[];
  today_attendance: AttendanceStats;
  pending_leaves: number;
}

interface RecentActivity {
  id: number;
  type: 'attendance' | 'leave' | 'employee';
  message: string;
  timestamp: string;
  employee_name?: string;
  avatar?: string;
}

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentActivities] = useState<RecentActivity[]>([
    {
      id: 1,
      type: 'attendance',
      message: 'Checked in at Head Office',
      timestamp: '9:15 AM',
      employee_name: 'John Doe'
    },
    {
      id: 2,
      type: 'leave',
      message: 'Applied for sick leave',
      timestamp: '8:30 AM',
      employee_name: 'Jane Smith'
    },
    {
      id: 3,
      type: 'employee',
      message: 'New employee onboarded',
      timestamp: 'Yesterday',
      employee_name: 'Mike Johnson'
    }
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employees/dashboard/data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData({
        employee_status_summary: [],
        department_summary: [],
        today_attendance: {
          total_employees: 0,
          checked_in: 0,
          on_leave: 0,
          late_arrivals: 0
        },
        pending_leaves: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_leave':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <Schedule color="primary" />;
      case 'leave':
        return <CalendarToday color="warning" />;
      case 'employee':
        return <People color="success" />;
      default:
        return <Notifications />;
    }
  };

  const attendancePercentage = dashboardData
    ? Math.round((dashboardData.today_attendance.checked_in / dashboardData.today_attendance.total_employees) * 100)
    : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Employee Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<People />}
            onClick={() => navigate('/employee-management')}
          >
            Manage Employees
          </Button>
          <Button
            variant="outlined"
            startIcon={<Schedule />}
            onClick={() => navigate('/attendance-management')}
          >
            Attendance
          </Button>
          <Button
            variant="outlined"
            startIcon={<CalendarToday />}
            onClick={() => navigate('/leave-management')}
          >
            Leave Management
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Employees
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.today_attendance.total_employees || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +5% this month
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'primary.light' }}>
                  <People sx={{ color: 'primary.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Present Today
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.today_attendance.checked_in || 0}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {attendancePercentage}% attendance
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'success.light' }}>
                  <CheckCircle sx={{ color: 'success.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    On Leave
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.today_attendance.on_leave || 0}
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    Approved absences
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'warning.light' }}>
                  <CalendarToday sx={{ color: 'warning.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Pending Leaves
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.pending_leaves || 0}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    Requires approval
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'error.light' }}>
                  <Warning sx={{ color: 'error.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Department Summary */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Department-wise Employee Distribution
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Employees</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.department_summary.map((dept) => {
                      const percentage = dashboardData.today_attendance.total_employees > 0
                        ? Math.round((dept.employee_count / dashboardData.today_attendance.total_employees) * 100)
                        : 0;

                      return (
                        <TableRow key={dept.department_name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <BusinessCenter fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight="medium">
                                {dept.department_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {dept.employee_count}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {percentage}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label="Active"
                              color="success"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity & Quick Actions */}
        <Grid item xs={12} md={4}>
          {/* Attendance Overview */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Attendance
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Attendance Rate</Typography>
                  <Typography variant="body2">{attendancePercentage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={attendancePercentage}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Present:</Typography>
                  <Typography variant="body2" color="success.main" fontWeight="medium">
                    {dashboardData?.today_attendance.checked_in || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Late Arrivals:</Typography>
                  <Typography variant="body2" color="warning.main" fontWeight="medium">
                    {dashboardData?.today_attendance.late_arrivals || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">On Leave:</Typography>
                  <Typography variant="body2" color="info.main" fontWeight="medium">
                    {dashboardData?.today_attendance.on_leave || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List dense>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          <strong>{activity.employee_name}</strong> {activity.message}
                        </Typography>
                      }
                      secondary={activity.timestamp}
                    />
                  </ListItem>
                ))}
              </List>

              <Button
                variant="text"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => window.location.href = '/employees/activity'}
              >
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts Section */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="body2">
                5 employees have exceeded their monthly overtime limit
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2">
                3 probation periods ending this week - action required
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default EmployeeDashboard;