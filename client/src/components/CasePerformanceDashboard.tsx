import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Button,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Alert,
    CircularProgress,
    LinearProgress,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import {
    Assessment as AnalyticsIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Notifications as NotificationsIcon,
    Escalator as EscalateIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    GetApp as ExportIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CasePerformanceDashboard: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    // Data states
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [slaCompliance, setSlaCompliance] = useState<any[]>([]);
    const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
    const [notificationQueue, setNotificationQueue] = useState<any[]>([]);
    const [escalationRules, setEscalationRules] = useState<any[]>([]);
    const [escalationHistory, setEscalationHistory] = useState<any[]>([]);

    // Filter states
    const [periodFilter, setPeriodFilter] = useState('30');
    const [stateFilter, setStateFilter] = useState('');

    // Dialog states
    const [notificationDialog, setNotificationDialog] = useState(false);
    const [escalationDialog, setEscalationDialog] = useState(false);
    const [selectedCase, setSelectedCase] = useState<string>('');

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    useEffect(() => {
        fetchDashboardData();
        fetchSLACompliance();
        fetchPerformanceMetrics();
        fetchNotificationQueue();
        fetchEscalationRules();
    }, [periodFilter, stateFilter]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/analytics/dashboard-data`);
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSLACompliance = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/analytics/sla-compliance`);
            setSlaCompliance(response.data.data);
        } catch (error) {
            console.error('Error fetching SLA compliance:', error);
        }
    };

    const fetchPerformanceMetrics = async () => {
        try {
            const params = new URLSearchParams({
                period: periodFilter,
                ...(stateFilter && { state_name: stateFilter })
            });
            const response = await axios.get(`${API_BASE_URL}/api/case-management/analytics/performance?${params}`);
            setPerformanceMetrics(response.data.data);
        } catch (error) {
            console.error('Error fetching performance metrics:', error);
        }
    };

    const fetchNotificationQueue = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/notifications/queue?limit=20`);
            setNotificationQueue(response.data.data);
        } catch (error) {
            console.error('Error fetching notification queue:', error);
        }
    };

    const fetchEscalationRules = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/escalations/rules`);
            setEscalationRules(response.data.data);
        } catch (error) {
            console.error('Error fetching escalation rules:', error);
        }
    };

    const handleTestNotification = async () => {
        if (!selectedCase) return;

        try {
            await axios.post(`${API_BASE_URL}/api/case-management/notifications/test/${selectedCase}`, {
                template_type: 'sla_warning'
            });
            setNotificationDialog(false);
            // Show success message
        } catch (error) {
            console.error('Error sending test notification:', error);
        }
    };

    const renderOverviewCards = () => (
        <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                            <WarningIcon color="error" fontSize="large" />
                            <Box>
                                <Typography variant="h4" color="error">
                                    {dashboardData?.sla_breaches_24h || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    SLA Breaches (24h)
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                            <CheckCircleIcon color="success" fontSize="large" />
                            <Box>
                                <Typography variant="h4" color="success.main">
                                    {Math.round(dashboardData?.performance_overview?.avg_sla_compliance || 0)}%
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Avg SLA Compliance
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                            <ScheduleIcon color="primary" fontSize="large" />
                            <Box>
                                <Typography variant="h4">
                                    {Math.round(dashboardData?.performance_overview?.avg_cycle_time || 0)}h
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Avg Cycle Time
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                            <EscalateIcon color="warning" fontSize="large" />
                            <Box>
                                <Typography variant="h4" color="warning.main">
                                    {dashboardData?.escalations_by_state?.reduce((sum: number, item: any) =>
                                        sum + item.escalation_count, 0) || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Escalations (7d)
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    const renderSLAComplianceChart = () => (
        <Card sx={{ mb: 3 }}>
            <CardHeader
                title="SLA Compliance by State"
                action={
                    <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={fetchSLACompliance}
                    >
                        Refresh
                    </Button>
                }
            />
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={slaCompliance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="current_state" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="compliance_percentage" fill="#00C49F" name="Compliance %" />
                        <Bar dataKey="total_cases" fill="#0088FE" name="Total Cases" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );

    const renderEscalationTrends = () => (
        <Card sx={{ mb: 3 }}>
            <CardHeader title="Escalations by State" />
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={dashboardData?.escalations_by_state || []}
                            dataKey="escalation_count"
                            nameKey="current_state"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) => `${name}: ${value}`}
                        >
                            {(dashboardData?.escalations_by_state || []).map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );

    const renderNotificationStats = () => (
        <Card>
            <CardHeader
                title="Notification Queue Status"
                action={
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setNotificationDialog(true)}
                        startIcon={<NotificationsIcon />}
                    >
                        Test Notification
                    </Button>
                }
            />
            <CardContent>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Case</TableCell>
                                <TableCell>Template</TableCell>
                                <TableCell>Recipient</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Scheduled</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {notificationQueue.slice(0, 10).map((notification) => (
                                <TableRow key={notification.id}>
                                    <TableCell>{notification.case_number}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={notification.template_name}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{notification.recipient_name || notification.recipient_email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={notification.status}
                                            color={
                                                notification.status === 'sent' ? 'success' :
                                                    notification.status === 'failed' ? 'error' :
                                                        'default'
                                            }
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {new Date(notification.scheduled_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
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
    );

    const renderEscalationRules = () => (
        <Card>
            <CardHeader title="Active Escalation Rules" />
            <CardContent>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Rule Name</TableCell>
                                <TableCell>Trigger</TableCell>
                                <TableCell>State</TableCell>
                                <TableCell>Hours Overdue</TableCell>
                                <TableCell>Escalate To</TableCell>
                                <TableCell>Auto Reassign</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {escalationRules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>{rule.rule_name}</TableCell>
                                    <TableCell>
                                        <Chip label={rule.trigger_type} size="small" />
                                    </TableCell>
                                    <TableCell>{rule.state_name || 'All'}</TableCell>
                                    <TableCell>{rule.hours_overdue || 'Immediate'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={rule.escalate_to_role}
                                            color="primary"
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={rule.auto_reassign ? 'Yes' : 'No'}
                                            color={rule.auto_reassign ? 'success' : 'default'}
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
    );

    const renderPerformanceMetrics = () => (
        <Card>
            <CardHeader
                title="Case Performance Metrics"
                subheader={`Last ${periodFilter} days`}
                action={
                    <Box display="flex" gap={1}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Period</InputLabel>
                            <Select
                                value={periodFilter}
                                label="Period"
                                onChange={(e) => setPeriodFilter(e.target.value)}
                            >
                                <MenuItem value="7">7 Days</MenuItem>
                                <MenuItem value="30">30 Days</MenuItem>
                                <MenuItem value="90">90 Days</MenuItem>
                            </Select>
                        </FormControl>
                        <Button startIcon={<ExportIcon />} variant="outlined" size="small">
                            Export
                        </Button>
                    </Box>
                }
            />
            <CardContent>
                {performanceMetrics.summary && (
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h6">
                                    {performanceMetrics.summary.total_cases}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Total Cases
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h6">
                                    {performanceMetrics.summary.average_cycle_time_hours}h
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Avg Cycle Time
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h6" color="success.main">
                                    {performanceMetrics.summary.average_sla_compliance}%
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    SLA Compliance
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Case Performance Analytics Dashboard
            </Typography>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {renderOverviewCards()}

            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
                <Tab label="SLA & Compliance" />
                <Tab label="Notifications" />
                <Tab label="Escalations" />
                <Tab label="Performance" />
            </Tabs>

            {tabValue === 0 && (
                <Box>
                    {renderSLAComplianceChart()}
                    {renderPerformanceMetrics()}
                </Box>
            )}

            {tabValue === 1 && (
                <Box>
                    {renderNotificationStats()}
                </Box>
            )}

            {tabValue === 2 && (
                <Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            {renderEscalationTrends()}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {renderEscalationRules()}
                        </Grid>
                    </Grid>
                </Box>
            )}

            {tabValue === 3 && (
                <Box>
                    {renderPerformanceMetrics()}
                </Box>
            )}

            {/* Test Notification Dialog */}
            <Dialog open={notificationDialog} onClose={() => setNotificationDialog(false)}>
                <DialogTitle>Test Notification</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Case Number"
                        value={selectedCase}
                        onChange={(e) => setSelectedCase(e.target.value)}
                        placeholder="VESPL/C/2025/001"
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNotificationDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleTestNotification}
                        disabled={!selectedCase}
                    >
                        Send Test
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CasePerformanceDashboard;