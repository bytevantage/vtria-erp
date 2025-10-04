import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
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
    IconButton,
    Tooltip,
    Alert,
    LinearProgress,
    CircularProgress,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Avatar,
    Badge
} from '@mui/material';
import {
    Analytics as AnalyticsIcon,
    TrendingUp as TrendingUpIcon,
    Timeline as TimelineIcon,
    Assessment as AssessmentIcon,
    Speed as SpeedIcon,
    Schedule as ScheduleIcon,
    People as PeopleIcon,
    Assignment as AssignmentIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Visibility as ViewIcon,
    ExpandMore as ExpandMoreIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    PieChart as PieChartIcon,
    BarChart as BarChartIcon,
    ShowChart as LineChartIcon,
    Dashboard as DashboardIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface CaseAnalytics {
    totalCases: number;
    completionRate: number;
    averageProcessingTime: number;
    bottleneckStage: string;
    monthlyTrends: Array<{
        month: string;
        cases: number;
        completed: number;
        avgTime: number;
    }>;
    stageAnalytics: Array<{
        stage: string;
        count: number;
        avgDuration: number;
        efficiency: number;
    }>;
    assigneePerformance: Array<{
        name: string;
        role: string;
        activeCases: number;
        completedCases: number;
        avgTime: number;
        efficiency: number;
    }>;
    alerts: Array<{
        type: 'warning' | 'error' | 'info';
        title: string;
        description: string;
        count: number;
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
            id={`case-tabpanel-${index}`}
            aria-labelledby={`case-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const EnterpriseCaseDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState('30days');
    const [filterBy, setFilterBy] = useState('all');

    // Case workflow states with enhanced metadata
    const workflowStates = [
        { key: 'enquiry', label: 'Enquiry', color: '#2196f3', icon: '📝', target: 2 },
        { key: 'estimation', label: 'Estimation', color: '#9c27b0', icon: '📊', target: 3 },
        { key: 'quotation', label: 'Quotation', color: '#ff9800', icon: '💰', target: 2 },
        { key: 'order', label: 'Order', color: '#4caf50', icon: '✅', target: 1 },
        { key: 'production', label: 'Production', color: '#f44336', icon: '🏭', target: 7 },
        { key: 'delivery', label: 'Delivery', color: '#607d8b', icon: '🚚', target: 1 },
        { key: 'closed', label: 'Closed', color: '#9e9e9e', icon: '🏁', target: 0 }
    ];

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange, filterBy]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            // Simulate enterprise analytics API call
            const response = await axios.get(`${API_BASE_URL}/api/analytics/cases`, {
                params: { dateRange, filterBy }
            });

            if (response.data.success) {
                setAnalytics(response.data.data);
            } else {
                // Fallback to mock data for demonstration
                setAnalytics(generateMockAnalytics());
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            // Use mock data as fallback
            setAnalytics(generateMockAnalytics());
        } finally {
            setLoading(false);
        }
    };

    const generateMockAnalytics = (): CaseAnalytics => {
        return {
            totalCases: 156,
            completionRate: 78.5,
            averageProcessingTime: 12.3,
            bottleneckStage: 'estimation',
            monthlyTrends: [
                { month: 'Jan', cases: 45, completed: 38, avgTime: 11.5 },
                { month: 'Feb', cases: 52, completed: 41, avgTime: 12.8 },
                { month: 'Mar', cases: 38, completed: 35, avgTime: 10.2 },
                { month: 'Apr', cases: 41, completed: 32, avgTime: 13.1 },
                { month: 'May', cases: 47, completed: 39, avgTime: 11.9 },
                { month: 'Jun', cases: 53, completed: 44, avgTime: 12.6 }
            ],
            stageAnalytics: [
                { stage: 'enquiry', count: 23, avgDuration: 1.2, efficiency: 85 },
                { stage: 'estimation', count: 18, avgDuration: 4.5, efficiency: 65 },
                { stage: 'quotation', count: 15, avgDuration: 2.1, efficiency: 82 },
                { stage: 'order', count: 12, avgDuration: 0.8, efficiency: 95 },
                { stage: 'production', count: 8, avgDuration: 8.2, efficiency: 75 },
                { stage: 'delivery', count: 4, avgDuration: 1.1, efficiency: 88 }
            ],
            assigneePerformance: [
                { name: 'Rajesh Kumar', role: 'Sales Engineer', activeCases: 8, completedCases: 24, avgTime: 10.5, efficiency: 89 },
                { name: 'Priya Sharma', role: 'Estimation Engineer', activeCases: 6, completedCases: 18, avgTime: 12.8, efficiency: 75 },
                { name: 'Amit Patel', role: 'Project Manager', activeCases: 12, completedCases: 32, avgTime: 11.2, efficiency: 85 },
                { name: 'Sneha Reddy', role: 'Production Manager', activeCases: 5, completedCases: 15, avgTime: 14.6, efficiency: 72 }
            ],
            alerts: [
                { type: 'warning', title: 'Delayed Cases', description: 'Cases pending beyond target time', count: 8 },
                { type: 'error', title: 'Overdue Estimations', description: 'Estimations pending >5 days', count: 3 },
                { type: 'info', title: 'High Volume', description: 'Cases in production stage', count: 12 }
            ]
        };
    };

    const getEfficiencyColor = (efficiency: number) => {
        if (efficiency >= 85) return '#4caf50';
        if (efficiency >= 70) return '#ff9800';
        return '#f44336';
    };

    const renderOverviewTab = () => {
        if (!analytics) return null;

        return (
            <Grid container spacing={3}>
                {/* Key Metrics Cards */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {analytics.totalCases}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Total Active Cases
                                    </Typography>
                                </Box>
                                <DashboardIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                                        {analytics.completionRate}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Completion Rate
                                    </Typography>
                                </Box>
                                <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                                        {analytics.averageProcessingTime}d
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Avg Processing Time
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
                                    <Typography variant="h4" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                        {analytics.bottleneckStage}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Bottleneck Stage
                                    </Typography>
                                </Box>
                                <WarningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Stage Analytics */}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Workflow Stage Analysis
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Stage</TableCell>
                                            <TableCell align="right">Active Cases</TableCell>
                                            <TableCell align="right">Avg Duration</TableCell>
                                            <TableCell align="right">Efficiency</TableCell>
                                            <TableCell align="right">Performance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {analytics.stageAnalytics.map((stage) => {
                                            const stageConfig = workflowStates.find(s => s.key === stage.stage);
                                            return (
                                                <TableRow key={stage.stage}>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ mr: 1, fontSize: '1.2em' }}>
                                                                {stageConfig?.icon}
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={500}>
                                                                    {stageConfig?.label}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Chip 
                                                            label={stage.count} 
                                                            size="small" 
                                                            sx={{ 
                                                                backgroundColor: stageConfig?.color, 
                                                                color: 'white',
                                                                minWidth: 40
                                                            }} 
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {stage.avgDuration} days
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ color: getEfficiencyColor(stage.efficiency) }}
                                                            fontWeight={500}
                                                        >
                                                            {stage.efficiency}%
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={stage.efficiency}
                                                            sx={{
                                                                width: 60,
                                                                height: 6,
                                                                borderRadius: 3,
                                                                backgroundColor: '#f0f0f0',
                                                                '& .MuiLinearProgress-bar': {
                                                                    backgroundColor: getEfficiencyColor(stage.efficiency)
                                                                }
                                                            }}
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

                {/* Alerts Panel */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                System Alerts
                            </Typography>
                            {analytics.alerts.map((alert, index) => (
                                <Alert 
                                    key={index} 
                                    severity={alert.type} 
                                    sx={{ mb: 2 }}
                                    action={
                                        <Badge badgeContent={alert.count} color="error">
                                            <IconButton size="small">
                                                <ViewIcon />
                                            </IconButton>
                                        </Badge>
                                    }
                                >
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {alert.title}
                                    </Typography>
                                    <Typography variant="body2">
                                        {alert.description}
                                    </Typography>
                                </Alert>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderTrendsTab = () => {
        if (!analytics) return null;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <LineChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Monthly Case Trends
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Month</TableCell>
                                                <TableCell align="right">New Cases</TableCell>
                                                <TableCell align="right">Completed</TableCell>
                                                <TableCell align="right">Completion Rate</TableCell>
                                                <TableCell align="right">Avg Processing Time</TableCell>
                                                <TableCell align="right">Trend</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {analytics.monthlyTrends.map((trend, index) => {
                                                const completionRate = (trend.completed / trend.cases) * 100;
                                                const prevRate = index > 0 ? (analytics.monthlyTrends[index - 1].completed / analytics.monthlyTrends[index - 1].cases) * 100 : completionRate;
                                                const isImproving = completionRate >= prevRate;
                                                
                                                return (
                                                    <TableRow key={trend.month}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={500}>
                                                                {trend.month} 2024
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip label={trend.cases} color="primary" variant="outlined" size="small" />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip label={trend.completed} color="success" variant="outlined" size="small" />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" sx={{ color: completionRate >= 75 ? '#4caf50' : '#ff9800' }}>
                                                                {completionRate.toFixed(1)}%
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {trend.avgTime} days
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                                                                <TrendingUpIcon 
                                                                    sx={{ 
                                                                        color: isImproving ? '#4caf50' : '#f44336',
                                                                        transform: isImproving ? 'none' : 'rotate(180deg)',
                                                                        fontSize: 20
                                                                    }} 
                                                                />
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderPerformanceTab = () => {
        if (!analytics) return null;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Team Performance Analytics
                            </Typography>
                            
                            {analytics.assigneePerformance.map((assignee, index) => (
                                <Accordion key={assignee.name} sx={{ mb: 2 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box display="flex" alignItems="center" width="100%">
                                            <Avatar sx={{ mr: 2, bgcolor: getEfficiencyColor(assignee.efficiency) }}>
                                                {assignee.name.split(' ').map(n => n[0]).join('')}
                                            </Avatar>
                                            <Box flexGrow={1}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {assignee.name}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {assignee.role}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" gap={2} alignItems="center">
                                                <Box textAlign="center">
                                                    <Typography variant="h6" color="primary">
                                                        {assignee.activeCases}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Active
                                                    </Typography>
                                                </Box>
                                                <Box textAlign="center">
                                                    <Typography variant="h6" color="success.main">
                                                        {assignee.completedCases}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Completed
                                                    </Typography>
                                                </Box>
                                                <Box textAlign="center">
                                                    <Typography 
                                                        variant="h6" 
                                                        sx={{ color: getEfficiencyColor(assignee.efficiency) }}
                                                    >
                                                        {assignee.efficiency}%
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Efficiency
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={4}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="textSecondary">
                                                            Average Processing Time
                                                        </Typography>
                                                        <Typography variant="h4" color="primary">
                                                            {assignee.avgTime}d
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="textSecondary">
                                                            Total Workload
                                                        </Typography>
                                                        <Typography variant="h4" color="secondary">
                                                            {assignee.activeCases + assignee.completedCases}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="textSecondary">
                                                            Performance Rating
                                                        </Typography>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={assignee.efficiency}
                                                                sx={{
                                                                    flexGrow: 1,
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    '& .MuiLinearProgress-bar': {
                                                                        backgroundColor: getEfficiencyColor(assignee.efficiency)
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="body2" fontWeight={500}>
                                                                {assignee.efficiency >= 85 ? 'Excellent' : 
                                                                 assignee.efficiency >= 70 ? 'Good' : 'Needs Improvement'}
                                                            </Typography>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
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
                    <AnalyticsIcon sx={{ mr: 2, fontSize: 36 }} />
                    Enterprise Case Analytics
                </Typography>
                
                <Box display="flex" gap={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Date Range</InputLabel>
                        <Select
                            value={dateRange}
                            label="Date Range"
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <MenuItem value="7days">Last 7 Days</MenuItem>
                            <MenuItem value="30days">Last 30 Days</MenuItem>
                            <MenuItem value="90days">Last 3 Months</MenuItem>
                            <MenuItem value="1year">Last Year</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Filter</InputLabel>
                        <Select
                            value={filterBy}
                            label="Filter"
                            onChange={(e) => setFilterBy(e.target.value)}
                        >
                            <MenuItem value="all">All Cases</MenuItem>
                            <MenuItem value="active">Active Only</MenuItem>
                            <MenuItem value="delayed">Delayed Cases</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchAnalytics}
                    >
                        Refresh
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
                            icon={<DashboardIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="Trends" 
                            icon={<LineChartIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="Performance" 
                            icon={<AssessmentIcon />} 
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                    {renderOverviewTab()}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {renderTrendsTab()}
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    {renderPerformanceTab()}
                </TabPanel>
            </Card>
        </Box>
    );
};

export default EnterpriseCaseDashboard;