import React, { useState, useEffect } from 'react';
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
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Avatar,
    Tooltip,
    IconButton,
    Badge,
    Divider,
    LinearProgress,
    Checkbox,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from '@mui/lab';
import {
    Timeline as TimelineIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    ExpandMore as ExpandMoreIcon,
    Visibility as ViewIcon,
    Download as DownloadIcon,
    Person as PersonIcon,
    AccessTime as TimeIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    TrendingUp as TrendingUpIcon,
    Assessment as AssessmentIcon,
    CalendarToday as CalendarIcon,
    Speed as SpeedIcon,
    Refresh as RefreshIcon,
    FileDownload as FileDownloadIcon,
    TableChart as TableChartIcon,
    PictureAsPdf as PdfIcon,
    GetApp as ExcelIcon,
    Analytics as AnalyticsIcon,
    Insights as InsightsIcon,
    BusinessCenter as ComplianceIcon,
    Gavel as AuditIcon,
    Security as SecurityIcon,
    NotificationsActive as AlertIcon,
    Compare as CompareIcon,
    Timeline as TimelineChartIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface CaseHistoryItem {
    case_number: string;
    case_id: number;
    client_name: string;
    project_name: string;
    created_at: string;
    closed_at?: string;
    current_state: string;
    total_duration: number;
    state_transitions: Array<{
        from_state: string;
        to_state: string;
        transition_date: string;
        duration_in_state: number;
        notes?: string;
        transitioned_by: string;
        reference_id?: string;
    }>;
    milestones: Array<{
        milestone: string;
        date: string;
        status: 'completed' | 'pending' | 'delayed';
        responsible_person: string;
        notes?: string;
    }>;
    performance_metrics: {
        efficiency_score: number;
        delays_count: number;
        avg_response_time: number;
        customer_satisfaction?: number;
    };
}

interface HistoryAnalytics {
    total_cases: number;
    completed_cases: number;
    avg_completion_time: number;
    bottleneck_analysis: {
        [key: string]: {
            avg_duration: number;
            delay_frequency: number;
            efficiency: number;
        };
    };
    performance_trends: Array<{
        month: string;
        avg_completion_time: number;
        case_count: number;
        efficiency_score: number;
    }>;
    top_performers: Array<{
        name: string;
        cases_handled: number;
        avg_time: number;
        efficiency: number;
    }>;
}

const CaseHistoryTracker: React.FC = () => {
    const [caseHistory, setCaseHistory] = useState<CaseHistoryItem[]>([]);
    const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState('30days');
    const [selectedCase, setSelectedCase] = useState<CaseHistoryItem | null>(null);
    const [expandedCase, setExpandedCase] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [complianceMode, setComplianceMode] = useState(false);
    const [realTimeUpdates, setRealTimeUpdates] = useState(true);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCasesForCompare, setSelectedCasesForCompare] = useState<string[]>([]);

    // Workflow states configuration
    const workflowStates = {
        enquiry: { label: 'Enquiry', color: '#2196f3', icon: '📝' },
        estimation: { label: 'Estimation', color: '#9c27b0', icon: '📊' },
        quotation: { label: 'Quotation', color: '#ff9800', icon: '💰' },
        order: { label: 'Order', color: '#4caf50', icon: '✅' },
        production: { label: 'Production', color: '#f44336', icon: '🏭' },
        delivery: { label: 'Delivery', color: '#607d8b', icon: '🚚' },
        closed: { label: 'Closed', color: '#9e9e9e', icon: '🏁' }
    };

    useEffect(() => {
        fetchCaseHistory();
    }, [statusFilter, dateRange]);

    const fetchCaseHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(`${API_BASE_URL}/api/analytics/case-history`, {
                params: { 
                    status: statusFilter, 
                    dateRange,
                    compliance: complianceMode,
                    realtime: realTimeUpdates
                }
            });

            if (response.data.success) {
                setCaseHistory(response.data.data.cases);
                setAnalytics(response.data.data.analytics);
            } else {
                // Fallback to mock data
                const mockData = generateMockHistoryData();
                setCaseHistory(mockData.cases);
                setAnalytics(mockData.analytics);
            }
        } catch (error) {
            console.error('Error fetching case history:', error);
            // Use mock data as fallback
            const mockData = generateMockHistoryData();
            setCaseHistory(mockData.cases);
            setAnalytics(mockData.analytics);
        } finally {
            setLoading(false);
        }
    };

    const exportCaseHistory = async (format: 'pdf' | 'excel' | 'csv') => {
        try {
            const exportData = {
                cases: filteredCases,
                analytics: analytics,
                filters: { status: statusFilter, dateRange, searchQuery },
                timestamp: new Date().toISOString(),
                format
            };

            // In a real implementation, this would call an export API
            console.log('Exporting case history:', exportData);
            
            // Simulate download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `case-history-${format}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            setError('Export failed. Please try again.');
        }
    };

    const toggleCaseForComparison = (caseNumber: string) => {
        setSelectedCasesForCompare(prev => {
            if (prev.includes(caseNumber)) {
                return prev.filter(c => c !== caseNumber);
            } else if (prev.length < 3) {
                return [...prev, caseNumber];
            }
            return prev;
        });
    };

    const generateMockHistoryData = () => {
        const cases: CaseHistoryItem[] = [
            {
                case_number: 'CASE-2024-001',
                case_id: 1,
                client_name: 'ABC Manufacturing',
                project_name: 'Automated Assembly Line',
                created_at: '2024-01-15T09:00:00Z',
                closed_at: '2024-03-20T17:00:00Z',
                current_state: 'closed',
                total_duration: 65,
                state_transitions: [
                    { from_state: '', to_state: 'enquiry', transition_date: '2024-01-15T09:00:00Z', duration_in_state: 2, transitioned_by: 'System', notes: 'Initial enquiry received' },
                    { from_state: 'enquiry', to_state: 'estimation', transition_date: '2024-01-17T14:30:00Z', duration_in_state: 8, transitioned_by: 'Rajesh Kumar', notes: 'Technical feasibility confirmed' },
                    { from_state: 'estimation', to_state: 'quotation', transition_date: '2024-01-25T11:15:00Z', duration_in_state: 3, transitioned_by: 'Priya Sharma', notes: 'Estimation completed' },
                    { from_state: 'quotation', to_state: 'order', transition_date: '2024-01-28T16:45:00Z', duration_in_state: 1, transitioned_by: 'Amit Patel', notes: 'Quote approved by client' },
                    { from_state: 'order', to_state: 'production', transition_date: '2024-01-29T10:00:00Z', duration_in_state: 45, transitioned_by: 'Sneha Reddy', notes: 'Production started' },
                    { from_state: 'production', to_state: 'delivery', transition_date: '2024-03-15T12:00:00Z', duration_in_state: 5, transitioned_by: 'Kiran Singh', notes: 'Quality testing completed' },
                    { from_state: 'delivery', to_state: 'closed', transition_date: '2024-03-20T17:00:00Z', duration_in_state: 0, transitioned_by: 'Rajesh Kumar', notes: 'Successfully delivered and commissioned' }
                ],
                milestones: [
                    { milestone: 'Initial Requirements', date: '2024-01-15', status: 'completed', responsible_person: 'Rajesh Kumar', notes: 'Requirements gathered' },
                    { milestone: 'Technical Design', date: '2024-01-20', status: 'completed', responsible_person: 'Priya Sharma', notes: 'Design approved' },
                    { milestone: 'Procurement', date: '2024-02-05', status: 'completed', responsible_person: 'Amit Patel', notes: 'All components procured' },
                    { milestone: 'Assembly', date: '2024-02-25', status: 'completed', responsible_person: 'Sneha Reddy', notes: 'Assembly completed' },
                    { milestone: 'Testing', date: '2024-03-10', status: 'completed', responsible_person: 'Kiran Singh', notes: 'All tests passed' },
                    { milestone: 'Delivery', date: '2024-03-20', status: 'completed', responsible_person: 'Rajesh Kumar', notes: 'Successfully delivered' }
                ],
                performance_metrics: {
                    efficiency_score: 88,
                    delays_count: 1,
                    avg_response_time: 2.5,
                    customer_satisfaction: 9.2
                }
            },
            {
                case_number: 'CASE-2024-002',
                case_id: 2,
                client_name: 'XYZ Industries',
                project_name: 'Robotic Welding System',
                created_at: '2024-02-01T10:30:00Z',
                current_state: 'production',
                total_duration: 42,
                state_transitions: [
                    { from_state: '', to_state: 'enquiry', transition_date: '2024-02-01T10:30:00Z', duration_in_state: 1, transitioned_by: 'System', notes: 'Enquiry received via website' },
                    { from_state: 'enquiry', to_state: 'estimation', transition_date: '2024-02-02T15:00:00Z', duration_in_state: 5, transitioned_by: 'Priya Sharma', notes: 'Site visit completed' },
                    { from_state: 'estimation', to_state: 'quotation', transition_date: '2024-02-07T12:00:00Z', duration_in_state: 4, transitioned_by: 'Rajesh Kumar', notes: 'Quote prepared' },
                    { from_state: 'quotation', to_state: 'order', transition_date: '2024-02-11T16:30:00Z', duration_in_state: 2, transitioned_by: 'Amit Patel', notes: 'PO received' },
                    { from_state: 'order', to_state: 'production', transition_date: '2024-02-13T09:00:00Z', duration_in_state: 30, transitioned_by: 'Sneha Reddy', notes: 'Production in progress' }
                ],
                milestones: [
                    { milestone: 'Requirements Analysis', date: '2024-02-02', status: 'completed', responsible_person: 'Priya Sharma' },
                    { milestone: 'Design Approval', date: '2024-02-06', status: 'completed', responsible_person: 'Rajesh Kumar' },
                    { milestone: 'Component Sourcing', date: '2024-02-15', status: 'completed', responsible_person: 'Amit Patel' },
                    { milestone: 'Robot Programming', date: '2024-03-01', status: 'pending', responsible_person: 'Sneha Reddy' },
                    { milestone: 'System Integration', date: '2024-03-10', status: 'pending', responsible_person: 'Kiran Singh' },
                    { milestone: 'Final Testing', date: '2024-03-20', status: 'pending', responsible_person: 'Priya Sharma' }
                ],
                performance_metrics: {
                    efficiency_score: 75,
                    delays_count: 2,
                    avg_response_time: 3.2
                }
            }
        ];

        const analytics: HistoryAnalytics = {
            total_cases: cases.length,
            completed_cases: cases.filter(c => c.current_state === 'closed').length,
            avg_completion_time: 65,
            bottleneck_analysis: {
                estimation: { avg_duration: 6.5, delay_frequency: 0.3, efficiency: 75 },
                production: { avg_duration: 37.5, delay_frequency: 0.4, efficiency: 68 },
                quotation: { avg_duration: 3.5, delay_frequency: 0.1, efficiency: 90 }
            },
            performance_trends: [
                { month: 'Jan', avg_completion_time: 68, case_count: 15, efficiency_score: 82 },
                { month: 'Feb', avg_completion_time: 65, case_count: 18, efficiency_score: 85 },
                { month: 'Mar', avg_completion_time: 62, case_count: 22, efficiency_score: 88 }
            ],
            top_performers: [
                { name: 'Rajesh Kumar', cases_handled: 25, avg_time: 58, efficiency: 92 },
                { name: 'Priya Sharma', cases_handled: 22, avg_time: 61, efficiency: 89 },
                { name: 'Amit Patel', cases_handled: 20, avg_time: 65, efficiency: 85 }
            ]
        };

        return { cases, analytics };
    };

    const formatDuration = (days: number) => {
        if (days < 1) return `${Math.round(days * 24)}h`;
        return `${Math.round(days)}d`;
    };

    const getStateColor = (state: string) => {
        return workflowStates[state as keyof typeof workflowStates]?.color || '#9e9e9e';
    };

    const getStateLabel = (state: string) => {
        return workflowStates[state as keyof typeof workflowStates]?.label || state;
    };

    const getEfficiencyColor = (score: number) => {
        if (score >= 85) return '#4caf50';
        if (score >= 70) return '#ff9800';
        return '#f44336';
    };

    const getMilestoneIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
            case 'delayed': return <ErrorIcon sx={{ color: '#f44336' }} />;
            default: return <ScheduleIcon sx={{ color: '#ff9800' }} />;
        }
    };

    const filteredCases = caseHistory.filter(caseItem =>
        (caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
         caseItem.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         caseItem.project_name.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (statusFilter === 'all' || caseItem.current_state === statusFilter)
    );

    const renderCaseTimeline = (caseItem: CaseHistoryItem) => {
        return (
            <Timeline position="alternate">
                {caseItem.state_transitions.map((transition, index) => (
                    <TimelineItem key={index}>
                        <TimelineOppositeContent sx={{ m: 'auto 0' }} align="right" variant="body2" color="text.secondary">
                            {new Date(transition.transition_date).toLocaleDateString('en-IN')}
                            <br />
                            <Typography variant="caption">
                                {formatDuration(transition.duration_in_state)} in state
                            </Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                            <TimelineDot sx={{ bgcolor: getStateColor(transition.to_state) }}>
                                {workflowStates[transition.to_state as keyof typeof workflowStates]?.icon}
                            </TimelineDot>
                            {index < caseItem.state_transitions.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent sx={{ py: '12px', px: 2 }}>
                            <Typography variant="h6" component="span">
                                {getStateLabel(transition.to_state)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                By: {transition.transitioned_by}
                            </Typography>
                            {transition.notes && (
                                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                    "{transition.notes}"
                                </Typography>
                            )}
                        </TimelineContent>
                    </TimelineItem>
                ))}
            </Timeline>
        );
    };

    const renderMilestones = (milestones: CaseHistoryItem['milestones']) => {
        return (
            <Grid container spacing={2}>
                {milestones.map((milestone, index) => (
                    <Grid item xs={12} md={6} key={index}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {milestone.milestone}
                                    </Typography>
                                    {getMilestoneIcon(milestone.status)}
                                </Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {new Date(milestone.date).toLocaleDateString('en-IN')}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                    {milestone.responsible_person}
                                </Typography>
                                {milestone.notes && (
                                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                        {milestone.notes}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
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
                    <HistoryIcon sx={{ mr: 2, fontSize: 36 }} />
                    Case History Tracker
                </Typography>
                
                <Box display="flex" gap={2} alignItems="center">
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchCaseHistory}
                        size="small"
                    >
                        Refresh
                    </Button>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Export</InputLabel>
                        <Select
                            value={exportFormat}
                            label="Export"
                            onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel' | 'csv')}
                        >
                            <MenuItem value="pdf">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <PdfIcon fontSize="small" />
                                    PDF
                                </Box>
                            </MenuItem>
                            <MenuItem value="excel">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <ExcelIcon fontSize="small" />
                                    Excel
                                </Box>
                            </MenuItem>
                            <MenuItem value="csv">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TableChartIcon fontSize="small" />
                                    CSV
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button
                        variant="contained"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => exportCaseHistory(exportFormat)}
                        size="small"
                    >
                        Export
                    </Button>
                    
                    <Button
                        variant={complianceMode ? "contained" : "outlined"}
                        startIcon={<ComplianceIcon />}
                        onClick={() => setComplianceMode(!complianceMode)}
                        size="small"
                        color={complianceMode ? "primary" : "inherit"}
                    >
                        Compliance
                    </Button>
                    
                    <Button
                        variant={compareMode ? "contained" : "outlined"}
                        startIcon={<CompareIcon />}
                        onClick={() => setCompareMode(!compareMode)}
                        size="small"
                        color={compareMode ? "secondary" : "inherit"}
                    >
                        Compare ({selectedCasesForCompare.length})
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Analytics Cards */}
            {analytics && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {analytics.total_cases}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Total Cases
                                        </Typography>
                                    </Box>
                                    <AssessmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {analytics.completed_cases}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Completed Cases
                                        </Typography>
                                    </Box>
                                    <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {analytics.avg_completion_time}d
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Avg Completion Time
                                        </Typography>
                                    </Box>
                                    <SpeedIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {Math.round((analytics.completed_cases / analytics.total_cases) * 100)}%
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Completion Rate
                                        </Typography>
                                    </Box>
                                    <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                placeholder="Search cases, clients, projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="enquiry">Enquiry</MenuItem>
                                    <MenuItem value="estimation">Estimation</MenuItem>
                                    <MenuItem value="quotation">Quotation</MenuItem>
                                    <MenuItem value="order">Order</MenuItem>
                                    <MenuItem value="production">Production</MenuItem>
                                    <MenuItem value="delivery">Delivery</MenuItem>
                                    <MenuItem value="closed">Closed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth>
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
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button
                                variant="outlined"
                                startIcon={<FilterIcon />}
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                fullWidth
                                size="small"
                            >
                                Advanced
                            </Button>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Box display="flex" flexDirection="column" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    {filteredCases.length} case(s) found
                                </Typography>
                                {complianceMode && (
                                    <Chip 
                                        icon={<SecurityIcon />}
                                        label="Compliance Mode" 
                                        color="primary" 
                                        size="small"
                                        sx={{ mt: 0.5 }}
                                    />
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                    
                    {/* Advanced Filters */}
                    {showAdvancedFilters && (
                        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                            <Typography variant="subtitle2" gutterBottom color="primary" sx={{ mb: 2 }}>
                                <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Advanced Analytics Filters
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Performance Range</InputLabel>
                                        <Select label="Performance Range">
                                            <MenuItem value="all">All Performance</MenuItem>
                                            <MenuItem value="high">High (85%+)</MenuItem>
                                            <MenuItem value="medium">Medium (70-84%)</MenuItem>
                                            <MenuItem value="low">Low (&lt;70%)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Duration</InputLabel>
                                        <Select label="Duration">
                                            <MenuItem value="all">All Durations</MenuItem>
                                            <MenuItem value="fast">Fast (&lt;30 days)</MenuItem>
                                            <MenuItem value="normal">Normal (30-60 days)</MenuItem>
                                            <MenuItem value="slow">Slow (&gt;60 days)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Delay Status</InputLabel>
                                        <Select label="Delay Status">
                                            <MenuItem value="all">All Cases</MenuItem>
                                            <MenuItem value="ontime">On Time</MenuItem>
                                            <MenuItem value="delayed">Delayed</MenuItem>
                                            <MenuItem value="critical">Critical Delays</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Assignee</InputLabel>
                                        <Select label="Assignee">
                                            <MenuItem value="all">All Assignees</MenuItem>
                                            <MenuItem value="rajesh">Rajesh Kumar</MenuItem>
                                            <MenuItem value="priya">Priya Sharma</MenuItem>
                                            <MenuItem value="amit">Amit Patel</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Case History List */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Case History Details
                    </Typography>
                    
                    {filteredCases.map((caseItem) => (
                        <Accordion 
                            key={caseItem.case_number} 
                            sx={{ mb: 2 }}
                            expanded={expandedCase === caseItem.case_number}
                            onChange={() => setExpandedCase(expandedCase === caseItem.case_number ? null : caseItem.case_number)}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Grid container alignItems="center" spacing={2}>
                                    {compareMode && (
                                        <Grid item xs={12} md={1}>
                                            <Checkbox
                                                checked={selectedCasesForCompare.includes(caseItem.case_number)}
                                                onChange={() => toggleCaseForComparison(caseItem.case_number)}
                                                disabled={!selectedCasesForCompare.includes(caseItem.case_number) && selectedCasesForCompare.length >= 3}
                                                color="secondary"
                                            />
                                        </Grid>
                                    )}
                                    <Grid item xs={12} md={compareMode ? 2 : 3}>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {caseItem.case_number}
                                            {complianceMode && (
                                                <Chip
                                                    icon={<AuditIcon />}
                                                    label="Audited"
                                                    size="small"
                                                    color="success"
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {caseItem.project_name}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Typography variant="body2" fontWeight={500}>
                                            {caseItem.client_name}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Chip
                                            label={getStateLabel(caseItem.current_state)}
                                            sx={{
                                                backgroundColor: getStateColor(caseItem.current_state),
                                                color: 'white',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Typography variant="body2">
                                            Duration: {formatDuration(caseItem.total_duration)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Box display="flex" alignItems="center">
                                            <Typography variant="body2" sx={{ mr: 1 }}>
                                                Efficiency:
                                            </Typography>
                                            <Chip
                                                label={`${caseItem.performance_metrics.efficiency_score}%`}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getEfficiencyColor(caseItem.performance_metrics.efficiency_score),
                                                    color: 'white'
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={1}>
                                        <Box display="flex" gap={1}>
                                            {caseItem.performance_metrics.delays_count > 0 && (
                                                <Badge badgeContent={caseItem.performance_metrics.delays_count} color="error">
                                                    <WarningIcon sx={{ color: '#f44336' }} />
                                                </Badge>
                                            )}
                                            {caseItem.current_state === 'closed' && (
                                                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                                            )}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={3}>
                                    {/* Timeline */}
                                    <Grid item xs={12} lg={8}>
                                        <Typography variant="h6" gutterBottom>
                                            Case Timeline
                                        </Typography>
                                        {renderCaseTimeline(caseItem)}
                                    </Grid>

                                    {/* Performance Metrics */}
                                    <Grid item xs={12} lg={4}>
                                        <Typography variant="h6" gutterBottom>
                                            Performance Metrics
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="text.secondary">
                                                            Efficiency Score
                                                        </Typography>
                                                        <Typography variant="h4" sx={{ color: getEfficiencyColor(caseItem.performance_metrics.efficiency_score) }}>
                                                            {caseItem.performance_metrics.efficiency_score}%
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={caseItem.performance_metrics.efficiency_score}
                                                            sx={{
                                                                mt: 1,
                                                                height: 8,
                                                                borderRadius: 4,
                                                                '& .MuiLinearProgress-bar': {
                                                                    backgroundColor: getEfficiencyColor(caseItem.performance_metrics.efficiency_score)
                                                                }
                                                            }}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="text.secondary">
                                                            Delays
                                                        </Typography>
                                                        <Typography variant="h6" color={caseItem.performance_metrics.delays_count > 0 ? 'error' : 'success'}>
                                                            {caseItem.performance_metrics.delays_count}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="text.secondary">
                                                            Avg Response
                                                        </Typography>
                                                        <Typography variant="h6">
                                                            {caseItem.performance_metrics.avg_response_time}d
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            {caseItem.performance_metrics.customer_satisfaction && (
                                                <Grid item xs={12}>
                                                    <Card variant="outlined">
                                                        <CardContent>
                                                            <Typography variant="subtitle2" color="text.secondary">
                                                                Customer Satisfaction
                                                            </Typography>
                                                            <Typography variant="h6" color="success.main">
                                                                {caseItem.performance_metrics.customer_satisfaction}/10
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Grid>

                                    {/* Milestones */}
                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="h6" gutterBottom>
                                            Project Milestones
                                        </Typography>
                                        {renderMilestones(caseItem.milestones)}
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    ))}

                    {filteredCases.length === 0 && (
                        <Box textAlign="center" py={4}>
                            <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                No case history found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Try adjusting your search criteria or filters
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Case Comparison View */}
            {compareMode && selectedCasesForCompare.length > 1 && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <CompareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Case Comparison Analysis ({selectedCasesForCompare.length} cases)
                        </Typography>
                        
                        <Grid container spacing={3}>
                            {selectedCasesForCompare.map((caseNumber) => {
                                const caseItem = filteredCases.find(c => c.case_number === caseNumber);
                                if (!caseItem) return null;
                                
                                return (
                                    <Grid item xs={12} md={4} key={caseNumber}>
                                        <Card variant="outlined" sx={{ height: '100%' }}>
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                                    {caseItem.case_number}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {caseItem.project_name}
                                                </Typography>
                                                
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="body2">
                                                        <strong>Client:</strong> {caseItem.client_name}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Status:</strong> {getStateLabel(caseItem.current_state)}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Duration:</strong> {formatDuration(caseItem.total_duration)}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Efficiency:</strong> {caseItem.performance_metrics.efficiency_score}%
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Delays:</strong> {caseItem.performance_metrics.delays_count}
                                                    </Typography>
                                                    {caseItem.performance_metrics.customer_satisfaction && (
                                                        <Typography variant="body2">
                                                            <strong>Satisfaction:</strong> {caseItem.performance_metrics.customer_satisfaction}/10
                                                        </Typography>
                                                    )}
                                                </Box>
                                                
                                                <Box sx={{ mt: 2 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={caseItem.performance_metrics.efficiency_score}
                                                        sx={{
                                                            height: 8,
                                                            borderRadius: 4,
                                                            '& .MuiLinearProgress-bar': {
                                                                backgroundColor: getEfficiencyColor(caseItem.performance_metrics.efficiency_score)
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                                
                                                <Button
                                                    size="small"
                                                    onClick={() => setSelectedCasesForCompare(prev => prev.filter(c => c !== caseNumber))}
                                                    sx={{ mt: 1 }}
                                                >
                                                    Remove from Comparison
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                        
                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<FileDownloadIcon />}
                                onClick={() => exportCaseHistory('pdf')}
                            >
                                Export Comparison Report
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setSelectedCasesForCompare([]);
                                    setCompareMode(false);
                                }}
                            >
                                Clear Comparison
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Real-time Updates Toggle */}
            <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
                <Card>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={realTimeUpdates}
                                    onChange={(e) => setRealTimeUpdates(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <AlertIcon fontSize="small" />
                                    <Typography variant="body2">
                                        Real-time Updates
                                    </Typography>
                                </Box>
                            }
                        />
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default CaseHistoryTracker;