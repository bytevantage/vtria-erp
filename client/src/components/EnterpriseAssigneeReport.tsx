import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  Visibility as ViewIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TrendingDown as TrendingDownIcon,
  Star as StarIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface AssigneeProfile {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar_url?: string;
  status: 'active' | 'busy' | 'offline';
  totalCases: number;
  activeCases: number;
  completedCases: number;
  overdueCases: number;
  avgCompletionTime: number;
  efficiency: number;
  workloadPercentage: number;
  casesByState: { [key: string]: number };
  cases: Array<{
    case_number: string;
    client_name: string;
    project_name: string;
    current_state: string;
    created_at: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimated_completion?: string;
    delay_days?: number;
  }>;
  performance_metrics: {
    monthly_trend: Array<{
      month: string;
      completed: number;
      avg_time: number;
      efficiency: number;
    }>;
    skill_utilization: Array<{
      skill: string;
      usage_percentage: number;
      proficiency: number;
    }>;
    customer_feedback: {
      rating: number;
      feedback_count: number;
      positive_feedback: number;
    };
  };
}

interface WorkloadAnalytics {
  total_assignees: number;
  avg_workload: number;
  team_efficiency: number;
  capacity_utilization: number;
  workload_distribution: {
    balanced: number;
    overloaded: number;
    underutilized: number;
  };
  department_performance: Array<{
    department: string;
    assignees: number;
    avg_efficiency: number;
    workload: number;
    cases_completed: number;
  }>;
  alerts: Array<{
    type: 'overload' | 'underutilized' | 'performance' | 'deadline';
    assignee: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assignee-tabpanel-${index}`}
      aria-labelledby={`assignee-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnterpriseAssigneeReport: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [assigneeData, setAssigneeData] = useState<AssigneeProfile[]>([]);
  const [analytics, setAnalytics] = useState<WorkloadAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [workloadFilter, setWorkloadFilter] = useState('all');
  const [sortBy, setSortBy] = useState('efficiency');

  const workflowStates = [
    { key: 'enquiry', label: 'Sales Enquiry', color: '#2196f3' },
    { key: 'estimation', label: 'Estimation', color: '#ff9800' },
    { key: 'quotation', label: 'Quotation', color: '#9c27b0' },
    { key: 'order', label: 'Sales Order', color: '#4caf50' },
    { key: 'production', label: 'Production', color: '#f44336' },
    { key: 'delivery', label: 'Delivery', color: '#607d8b' }
  ];

  useEffect(() => {
    fetchAssigneeReport();
  }, [departmentFilter, workloadFilter, sortBy]);

  const fetchAssigneeReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/api/analytics/assignee-workload`, {
        params: { department: departmentFilter, workload: workloadFilter, sortBy }
      });

      if (response.data.success) {
        setAssigneeData(response.data.data.assignees);
        setAnalytics(response.data.data.analytics);
      } else {
        // Fallback to enhanced mock data
        const mockData = generateEnhancedMockData();
        setAssigneeData(mockData.assignees);
        setAnalytics(mockData.analytics);
      }
    } catch (error) {
      console.error('Error fetching assignee report:', error);
      const mockData = generateEnhancedMockData();
      setAssigneeData(mockData.assignees);
      setAnalytics(mockData.analytics);
    } finally {
      setLoading(false);
    }
  };

  const generateEnhancedMockData = () => {
    const assignees: AssigneeProfile[] = [
      {
        id: 1,
        name: 'Rajesh Kumar',
        role: 'Senior Engineer',
        department: 'Engineering',
        email: 'rajesh.kumar@vtria.com',
        phone: '+91 98765 43210',
        status: 'active',
        totalCases: 25,
        activeCases: 8,
        completedCases: 17,
        overdueCases: 2,
        avgCompletionTime: 5.2,
        efficiency: 89,
        workloadPercentage: 85,
        casesByState: {
          'enquiry': 2,
          'estimation': 3,
          'quotation': 1,
          'order': 1,
          'production': 1,
          'delivery': 0
        },
        cases: [
          {
            case_number: 'CASE-2024-001',
            client_name: 'ABC Manufacturing',
            project_name: 'Automated Assembly Line',
            current_state: 'estimation',
            created_at: '2024-03-15T09:00:00Z',
            priority: 'high',
            estimated_completion: '2024-03-25T17:00:00Z',
            delay_days: 0
          },
          {
            case_number: 'CASE-2024-005',
            client_name: 'XYZ Industries',
            project_name: 'Robotic Welding System',
            current_state: 'production',
            created_at: '2024-03-10T14:30:00Z',
            priority: 'medium',
            estimated_completion: '2024-03-22T17:00:00Z',
            delay_days: 3
          }
        ],
        performance_metrics: {
          monthly_trend: [
            { month: 'Jan', completed: 6, avg_time: 5.5, efficiency: 85 },
            { month: 'Feb', completed: 5, avg_time: 5.0, efficiency: 87 },
            { month: 'Mar', completed: 6, avg_time: 4.8, efficiency: 89 }
          ],
          skill_utilization: [
            { skill: 'PLC Programming', usage_percentage: 80, proficiency: 95 },
            { skill: 'System Design', usage_percentage: 60, proficiency: 90 },
            { skill: 'Project Management', usage_percentage: 40, proficiency: 85 }
          ],
          customer_feedback: {
            rating: 4.8,
            feedback_count: 15,
            positive_feedback: 14
          }
        }
      },
      {
        id: 2,
        name: 'Priya Sharma',
        role: 'Project Manager',
        department: 'Project Management',
        email: 'priya.sharma@vtria.com',
        phone: '+91 98765 43211',
        status: 'busy',
        totalCases: 22,
        activeCases: 12,
        completedCases: 10,
        overdueCases: 1,
        avgCompletionTime: 6.8,
        efficiency: 78,
        workloadPercentage: 95,
        casesByState: {
          'enquiry': 1,
          'estimation': 2,
          'quotation': 4,
          'order': 3,
          'production': 2,
          'delivery': 0
        },
        cases: [
          {
            case_number: 'CASE-2024-003',
            client_name: 'DEF Corp',
            project_name: 'Smart Factory Initiative',
            current_state: 'quotation',
            created_at: '2024-03-12T11:00:00Z',
            priority: 'critical',
            estimated_completion: '2024-03-20T17:00:00Z',
            delay_days: 1
          }
        ],
        performance_metrics: {
          monthly_trend: [
            { month: 'Jan', completed: 4, avg_time: 7.2, efficiency: 75 },
            { month: 'Feb', completed: 3, avg_time: 6.8, efficiency: 76 },
            { month: 'Mar', completed: 3, avg_time: 6.5, efficiency: 78 }
          ],
          skill_utilization: [
            { skill: 'Project Planning', usage_percentage: 90, proficiency: 92 },
            { skill: 'Team Coordination', usage_percentage: 85, proficiency: 88 },
            { skill: 'Risk Management', usage_percentage: 70, proficiency: 85 }
          ],
          customer_feedback: {
            rating: 4.5,
            feedback_count: 12,
            positive_feedback: 10
          }
        }
      },
      {
        id: 3,
        name: 'Amit Patel',
        role: 'Field Engineer',
        department: 'Field Service',
        email: 'amit.patel@vtria.com',
        phone: '+91 98765 43212',
        status: 'active',
        totalCases: 18,
        activeCases: 5,
        completedCases: 13,
        overdueCases: 0,
        avgCompletionTime: 3.5,
        efficiency: 92,
        workloadPercentage: 65,
        casesByState: {
          'enquiry': 0,
          'estimation': 1,
          'quotation': 0,
          'order': 1,
          'production': 2,
          'delivery': 1
        },
        cases: [
          {
            case_number: 'CASE-2024-007',
            client_name: 'GHI Manufacturing',
            project_name: 'Conveyor System Upgrade',
            current_state: 'delivery',
            created_at: '2024-03-18T08:30:00Z',
            priority: 'medium',
            estimated_completion: '2024-03-21T17:00:00Z',
            delay_days: 0
          }
        ],
        performance_metrics: {
          monthly_trend: [
            { month: 'Jan', completed: 5, avg_time: 3.8, efficiency: 90 },
            { month: 'Feb', completed: 4, avg_time: 3.5, efficiency: 91 },
            { month: 'Mar', completed: 4, avg_time: 3.2, efficiency: 92 }
          ],
          skill_utilization: [
            { skill: 'Installation', usage_percentage: 95, proficiency: 94 },
            { skill: 'Troubleshooting', usage_percentage: 80, proficiency: 90 },
            { skill: 'Customer Training', usage_percentage: 60, proficiency: 85 }
          ],
          customer_feedback: {
            rating: 4.9,
            feedback_count: 18,
            positive_feedback: 18
          }
        }
      }
    ];

    const analytics: WorkloadAnalytics = {
      total_assignees: assignees.length,
      avg_workload: assignees.reduce((sum, a) => sum + a.workloadPercentage, 0) / assignees.length,
      team_efficiency: assignees.reduce((sum, a) => sum + a.efficiency, 0) / assignees.length,
      capacity_utilization: 82,
      workload_distribution: {
        balanced: 1,
        overloaded: 1,
        underutilized: 1
      },
      department_performance: [
        { department: 'Engineering', assignees: 1, avg_efficiency: 89, workload: 85, cases_completed: 17 },
        { department: 'Project Management', assignees: 1, avg_efficiency: 78, workload: 95, cases_completed: 10 },
        { department: 'Field Service', assignees: 1, avg_efficiency: 92, workload: 65, cases_completed: 13 }
      ],
      alerts: [
        { type: 'overload', assignee: 'Priya Sharma', description: 'Workload exceeds 90%', severity: 'high' },
        { type: 'deadline', assignee: 'Rajesh Kumar', description: '2 cases approaching deadline', severity: 'medium' },
        { type: 'underutilized', assignee: 'Amit Patel', description: 'Capacity available for more cases', severity: 'low' }
      ]
    };

    return { assignees, analytics };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStateColor = (state: string) => {
    const stateObj = workflowStates.find(s => s.key === state);
    return stateObj ? stateObj.color : '#666';
  };

  const getWorkloadColor = (workload: number) => {
    if (workload >= 90) return '#f44336';
    if (workload >= 70) return '#ff9800';
    return '#4caf50';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return '#4caf50';
    if (efficiency >= 70) return '#ff9800';
    return '#f44336';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#f44336';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'busy': return '#ff9800';
      case 'offline': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const renderOverviewTab = () => {
    if (!analytics) return null;

    return (
      <Grid container spacing={3}>
        {/* Analytics Cards */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {analytics.total_assignees}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Assignees
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {Math.round(analytics.avg_workload)}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Avg Workload
                  </Typography>
                </Box>
                <WorkIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {Math.round(analytics.team_efficiency)}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Team Efficiency
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {analytics.capacity_utilization}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Capacity Utilization
                  </Typography>
                </Box>
                <AnalyticsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Performance */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Department Performance Analysis
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Assignees</TableCell>
                      <TableCell align="right">Avg Efficiency</TableCell>
                      <TableCell align="right">Workload</TableCell>
                      <TableCell align="right">Cases Completed</TableCell>
                      <TableCell align="right">Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.department_performance.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {dept.department}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={dept.assignees} size="small" color="primary" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ color: getEfficiencyColor(dept.avg_efficiency) }}
                            fontWeight={500}
                          >
                            {dept.avg_efficiency}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <LinearProgress
                            variant="determinate"
                            value={dept.workload}
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getWorkloadColor(dept.workload)
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={dept.cases_completed} 
                            size="small" 
                            color="success" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {dept.avg_efficiency >= 85 ? (
                              <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                            ) : (
                              <TrendingDownIcon sx={{ color: '#f44336', fontSize: 20 }} />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts & Workload Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Workload Alerts
              </Typography>
              
              {analytics.alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {alert.assignee}
                  </Typography>
                  <Typography variant="body2">
                    {alert.description}
                  </Typography>
                </Alert>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Workload Distribution
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="success.main">
                        {analytics.workload_distribution.balanced}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Balanced
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="error.main">
                        {analytics.workload_distribution.overloaded}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Overloaded
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="warning.main">
                        {analytics.workload_distribution.underutilized}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Under-utilized
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderAssigneeDetails = () => {
    const sortedAssignees = [...assigneeData].sort((a, b) => {
      switch (sortBy) {
        case 'efficiency': return b.efficiency - a.efficiency;
        case 'workload': return b.workloadPercentage - a.workloadPercentage;
        case 'cases': return b.totalCases - a.totalCases;
        default: return 0;
      }
    });

    return (
      <Grid container spacing={3}>
        {/* Filters */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={departmentFilter}
                      label="Department"
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Departments</MenuItem>
                      <MenuItem value="Engineering">Engineering</MenuItem>
                      <MenuItem value="Project Management">Project Management</MenuItem>
                      <MenuItem value="Field Service">Field Service</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Workload</InputLabel>
                    <Select
                      value={workloadFilter}
                      label="Workload"
                      onChange={(e) => setWorkloadFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Workloads</MenuItem>
                      <MenuItem value="high">High (&gt;80%)</MenuItem>
                      <MenuItem value="medium">Medium (50-80%)</MenuItem>
                      <MenuItem value="low">Low (&lt;50%)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort By"
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <MenuItem value="efficiency">Efficiency</MenuItem>
                      <MenuItem value="workload">Workload</MenuItem>
                      <MenuItem value="cases">Total Cases</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    {sortedAssignees.length} assignee(s) found
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Assignee List */}
        {sortedAssignees.map((assignee) => (
          <Grid item xs={12} key={assignee.id}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box display="flex" alignItems="center">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getStatusColor(assignee.status),
                              border: '2px solid white'
                            }}
                          />
                        }
                      >
                        <Avatar sx={{ mr: 2, bgcolor: getEfficiencyColor(assignee.efficiency) }}>
                          {getInitials(assignee.name)}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {assignee.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {assignee.role} • {assignee.department}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Typography variant="body2" color="text.secondary">
                      Active Cases
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {assignee.activeCases}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Typography variant="body2" color="text.secondary">
                      Efficiency
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ color: getEfficiencyColor(assignee.efficiency) }}
                    >
                      {assignee.efficiency}%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Typography variant="body2" color="text.secondary">
                      Workload
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={assignee.workloadPercentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        mt: 0.5,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getWorkloadColor(assignee.workloadPercentage)
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {assignee.workloadPercentage}%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box display="flex" gap={1}>
                      {Object.entries(assignee.casesByState).map(([state, count]) => 
                        count > 0 ? (
                          <Chip
                            key={state}
                            label={`${count}`}
                            size="small"
                            sx={{ 
                              backgroundColor: getStateColor(state), 
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                        ) : null
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Box display="flex" gap={1}>
                      {assignee.overdueCases > 0 && (
                        <Badge badgeContent={assignee.overdueCases} color="error">
                          <WarningIcon sx={{ color: '#f44336' }} />
                        </Badge>
                      )}
                      <Box display="flex" alignItems="center">
                        <StarIcon sx={{ color: '#ffc107', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption">
                          {assignee.performance_metrics.customer_feedback.rating.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Performance Metrics */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom>
                      Performance Overview
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Completed
                            </Typography>
                            <Typography variant="h6" color="success.main">
                              {assignee.completedCases}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Avg Time
                            </Typography>
                            <Typography variant="h6">
                              {assignee.avgCompletionTime}d
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Rating
                            </Typography>
                            <Typography variant="h6" color="warning.main">
                              {assignee.performance_metrics.customer_feedback.rating.toFixed(1)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Feedback
                            </Typography>
                            <Typography variant="h6">
                              {assignee.performance_metrics.customer_feedback.feedback_count}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Skills Utilization */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom>
                      Skills Utilization
                    </Typography>
                    {assignee.performance_metrics.skill_utilization.map((skill, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={500}>
                            {skill.skill}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {skill.usage_percentage}% usage
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={skill.proficiency}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            mt: 0.5,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: skill.proficiency >= 90 ? '#4caf50' : 
                                              skill.proficiency >= 80 ? '#ff9800' : '#f44336'
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Proficiency: {skill.proficiency}%
                        </Typography>
                      </Box>
                    ))}
                  </Grid>

                  {/* Current Cases */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom>
                      Current Cases
                    </Typography>
                    <List dense>
                      {assignee.cases.slice(0, 3).map((caseItem, index) => (
                        <ListItem key={index}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: getStateColor(caseItem.current_state) }}>
                              <AssignmentIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={caseItem.case_number}
                            secondary={`${caseItem.project_name} • ${caseItem.client_name}`}
                          />
                          <Box display="flex" flexDirection="column" alignItems="flex-end">
                            <Chip
                              label={caseItem.priority}
                              size="small"
                              sx={{
                                backgroundColor: getPriorityColor(caseItem.priority),
                                color: 'white',
                                mb: 0.5
                              }}
                            />
                            {caseItem.delay_days && caseItem.delay_days > 0 && (
                              <Chip
                                label={`${caseItem.delay_days}d delay`}
                                size="small"
                                color="error"
                              />
                            )}
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  {/* Monthly Trend */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Monthly Performance Trend
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Month</TableCell>
                            <TableCell align="right">Cases Completed</TableCell>
                            <TableCell align="right">Avg Time</TableCell>
                            <TableCell align="right">Efficiency</TableCell>
                            <TableCell align="right">Trend</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {assignee.performance_metrics.monthly_trend.map((trend, index) => {
                            const prevEfficiency = index > 0 ? assignee.performance_metrics.monthly_trend[index - 1].efficiency : trend.efficiency;
                            const isImproving = trend.efficiency >= prevEfficiency;
                            
                            return (
                              <TableRow key={trend.month}>
                                <TableCell>{trend.month} 2024</TableCell>
                                <TableCell align="right">
                                  <Chip label={trend.completed} color="primary" variant="outlined" size="small" />
                                </TableCell>
                                <TableCell align="right">{trend.avg_time}d</TableCell>
                                <TableCell align="right">
                                  <Typography 
                                    variant="body2" 
                                    sx={{ color: getEfficiencyColor(trend.efficiency) }}
                                  >
                                    {trend.efficiency}%
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {isImproving ? (
                                    <TrendingUpIcon sx={{ color: '#4caf50' }} />
                                  ) : (
                                    <TrendingDownIcon sx={{ color: '#f44336' }} />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <ReportIcon sx={{ mr: 2, fontSize: 36 }} />
          Enterprise Assignee Workload Report
        </Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAssigneeReport}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => console.log('Export data')}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab 
              label="Overview" 
              icon={<AnalyticsIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Assignee Details" 
              icon={<PersonIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderOverviewTab()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderAssigneeDetails()}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default EnterpriseAssigneeReport;