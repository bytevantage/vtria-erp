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
    Tabs,
    Tab,
    Avatar,
    Badge,
    LinearProgress,
    Alert,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    IconButton,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemAvatar
} from '@mui/material';
import {
    Engineering as EngineeringIcon,
    Person as PersonIcon,
    Assignment as AssignmentIcon,
    Speed as SpeedIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Schedule as ScheduleIcon,
    Star as StarIcon,
    ExpandMore as ExpandMoreIcon,
    Assessment as AssessmentIcon,
    Timeline as TimelineIcon,
    Work as WorkIcon,
    AccessTime as AccessTimeIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as LocationIcon,
    Build as BuildIcon,
    School as SchoolIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    PieChart as PieChartIcon,
    BarChart as BarChartIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

interface TechnicianProfile {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    department: string;
    location: string;
    specializations: string[];
    certifications: string[];
    experience_years: number;
    avatar_url?: string;
    status: 'active' | 'busy' | 'offline';
    current_workload: number;
}

interface TechnicianMetrics {
    technician_id: number;
    total_cases_assigned: number;
    cases_completed: number;
    cases_in_progress: number;
    cases_overdue: number;
    avg_completion_time: number;
    avg_response_time: number;
    efficiency_score: number;
    customer_rating: number;
    skill_utilization: number;
    monthly_performance: Array<{
        month: string;
        completed: number;
        avg_time: number;
        rating: number;
    }>;
    skill_performance: Array<{
        skill: string;
        proficiency: number;
        usage_frequency: number;
        improvement_needed: boolean;
    }>;
    recent_activities: Array<{
        case_number: string;
        activity: string;
        timestamp: string;
        status: 'completed' | 'in_progress' | 'delayed';
    }>;
}

interface TeamAnalytics {
    total_technicians: number;
    active_technicians: number;
    team_efficiency: number;
    total_workload: number;
    skill_gaps: string[];
    top_performers: Array<{
        name: string;
        efficiency: number;
        cases_completed: number;
    }>;
    workload_distribution: Array<{
        department: string;
        technicians: number;
        avg_workload: number;
        efficiency: number;
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
            id={`tech-tabpanel-${index}`}
            aria-labelledby={`tech-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const EnterpriseTechnicianDashboard: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
    const [technicianMetrics, setTechnicianMetrics] = useState<Map<number, TechnicianMetrics>>(new Map());
    const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTechnician, setSelectedTechnician] = useState<number | null>(null);
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchTechnicianData();
    }, [filterDepartment, filterStatus]);

    const fetchTechnicianData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(`${API_BASE_URL}/api/analytics/technicians`, {
                params: { department: filterDepartment, status: filterStatus }
            });

            if (response.data.success) {
                setTechnicians(response.data.data.technicians);
                setTechnicianMetrics(new Map(response.data.data.metrics.map((m: TechnicianMetrics) => [m.technician_id, m])));
                setTeamAnalytics(response.data.data.analytics);
            } else {
                // Fallback to mock data
                const mockData = generateMockTechnicianData();
                setTechnicians(mockData.technicians);
                setTechnicianMetrics(new Map(mockData.metrics.map(m => [m.technician_id, m])));
                setTeamAnalytics(mockData.analytics);
            }
        } catch (error) {
            console.error('Error fetching technician data:', error);
            // Use mock data as fallback
            const mockData = generateMockTechnicianData();
            setTechnicians(mockData.technicians);
            setTechnicianMetrics(new Map(mockData.metrics.map(m => [m.technician_id, m])));
            setTeamAnalytics(mockData.analytics);
        } finally {
            setLoading(false);
        }
    };

    const generateMockTechnicianData = () => {
        const technicians: TechnicianProfile[] = [
            {
                id: 1,
                name: 'Rajesh Kumar',
                email: 'rajesh.kumar@vtria.com',
                phone: '+91 98765 43210',
                role: 'Senior Automation Engineer',
                department: 'Engineering',
                location: 'Chennai',
                specializations: ['PLC Programming', 'SCADA Systems', 'Industrial Networks'],
                certifications: ['Siemens Certified', 'Rockwell Automation Expert', 'CISSP'],
                experience_years: 8,
                status: 'active',
                current_workload: 75
            },
            {
                id: 2,
                name: 'Priya Sharma',
                email: 'priya.sharma@vtria.com',
                phone: '+91 98765 43211',
                role: 'Robotics Specialist',
                department: 'Engineering',
                location: 'Bangalore',
                specializations: ['Industrial Robotics', 'Vision Systems', 'Safety Systems'],
                certifications: ['FANUC Certified', 'KUKA Expert', 'ISO 26262'],
                experience_years: 6,
                status: 'busy',
                current_workload: 90
            },
            {
                id: 3,
                name: 'Amit Patel',
                email: 'amit.patel@vtria.com',
                phone: '+91 98765 43212',
                role: 'Field Service Engineer',
                department: 'Field Service',
                location: 'Mumbai',
                specializations: ['Mechanical Systems', 'Hydraulics', 'Pneumatics'],
                certifications: ['Bosch Rexroth Certified', 'Parker Hannifin Expert'],
                experience_years: 5,
                status: 'active',
                current_workload: 60
            },
            {
                id: 4,
                name: 'Sneha Reddy',
                email: 'sneha.reddy@vtria.com',
                phone: '+91 98765 43213',
                role: 'Process Engineer',
                department: 'Engineering',
                location: 'Hyderabad',
                specializations: ['Process Control', 'Instrumentation', 'DCS Systems'],
                certifications: ['Honeywell Certified', 'Emerson DeltaV Expert'],
                experience_years: 7,
                status: 'active',
                current_workload: 65
            }
        ];

        const metrics: TechnicianMetrics[] = [
            {
                technician_id: 1,
                total_cases_assigned: 24,
                cases_completed: 20,
                cases_in_progress: 3,
                cases_overdue: 1,
                avg_completion_time: 4.2,
                avg_response_time: 1.5,
                efficiency_score: 92,
                customer_rating: 4.8,
                skill_utilization: 88,
                monthly_performance: [
                    { month: 'Jan', completed: 8, avg_time: 4.5, rating: 4.7 },
                    { month: 'Feb', completed: 7, avg_time: 4.0, rating: 4.8 },
                    { month: 'Mar', completed: 5, avg_time: 3.8, rating: 4.9 }
                ],
                skill_performance: [
                    { skill: 'PLC Programming', proficiency: 95, usage_frequency: 80, improvement_needed: false },
                    { skill: 'SCADA Systems', proficiency: 90, usage_frequency: 60, improvement_needed: false },
                    { skill: 'Industrial Networks', proficiency: 85, usage_frequency: 40, improvement_needed: true }
                ],
                recent_activities: [
                    { case_number: 'CASE-2024-001', activity: 'PLC Configuration Completed', timestamp: '2024-03-20T14:30:00Z', status: 'completed' },
                    { case_number: 'CASE-2024-005', activity: 'SCADA Interface Testing', timestamp: '2024-03-20T10:15:00Z', status: 'in_progress' },
                    { case_number: 'CASE-2024-008', activity: 'Network Configuration', timestamp: '2024-03-19T16:45:00Z', status: 'completed' }
                ]
            },
            {
                technician_id: 2,
                total_cases_assigned: 18,
                cases_completed: 15,
                cases_in_progress: 2,
                cases_overdue: 1,
                avg_completion_time: 5.1,
                avg_response_time: 2.0,
                efficiency_score: 85,
                customer_rating: 4.6,
                skill_utilization: 92,
                monthly_performance: [
                    { month: 'Jan', completed: 6, avg_time: 5.5, rating: 4.5 },
                    { month: 'Feb', completed: 5, avg_time: 5.0, rating: 4.6 },
                    { month: 'Mar', completed: 4, avg_time: 4.8, rating: 4.7 }
                ],
                skill_performance: [
                    { skill: 'Industrial Robotics', proficiency: 93, usage_frequency: 85, improvement_needed: false },
                    { skill: 'Vision Systems', proficiency: 88, usage_frequency: 70, improvement_needed: false },
                    { skill: 'Safety Systems', proficiency: 80, usage_frequency: 50, improvement_needed: true }
                ],
                recent_activities: [
                    { case_number: 'CASE-2024-003', activity: 'Robot Calibration', timestamp: '2024-03-20T11:00:00Z', status: 'in_progress' },
                    { case_number: 'CASE-2024-007', activity: 'Vision System Setup', timestamp: '2024-03-19T14:20:00Z', status: 'completed' }
                ]
            },
            {
                technician_id: 3,
                total_cases_assigned: 22,
                cases_completed: 18,
                cases_in_progress: 4,
                cases_overdue: 0,
                avg_completion_time: 3.8,
                avg_response_time: 1.2,
                efficiency_score: 88,
                customer_rating: 4.7,
                skill_utilization: 82,
                monthly_performance: [
                    { month: 'Jan', completed: 7, avg_time: 4.0, rating: 4.6 },
                    { month: 'Feb', completed: 6, avg_time: 3.8, rating: 4.7 },
                    { month: 'Mar', completed: 5, avg_time: 3.5, rating: 4.8 }
                ],
                skill_performance: [
                    { skill: 'Mechanical Systems', proficiency: 92, usage_frequency: 90, improvement_needed: false },
                    { skill: 'Hydraulics', proficiency: 85, usage_frequency: 70, improvement_needed: false },
                    { skill: 'Pneumatics', proficiency: 88, usage_frequency: 60, improvement_needed: false }
                ],
                recent_activities: [
                    { case_number: 'CASE-2024-004', activity: 'Hydraulic System Maintenance', timestamp: '2024-03-20T09:30:00Z', status: 'in_progress' },
                    { case_number: 'CASE-2024-009', activity: 'Pneumatic Actuator Repair', timestamp: '2024-03-19T13:15:00Z', status: 'completed' }
                ]
            },
            {
                technician_id: 4,
                total_cases_assigned: 20,
                cases_completed: 17,
                cases_in_progress: 3,
                cases_overdue: 0,
                avg_completion_time: 4.5,
                avg_response_time: 1.8,
                efficiency_score: 90,
                customer_rating: 4.9,
                skill_utilization: 85,
                monthly_performance: [
                    { month: 'Jan', completed: 6, avg_time: 4.8, rating: 4.8 },
                    { month: 'Feb', completed: 6, avg_time: 4.5, rating: 4.9 },
                    { month: 'Mar', completed: 5, avg_time: 4.2, rating: 5.0 }
                ],
                skill_performance: [
                    { skill: 'Process Control', proficiency: 94, usage_frequency: 85, improvement_needed: false },
                    { skill: 'Instrumentation', proficiency: 91, usage_frequency: 80, improvement_needed: false },
                    { skill: 'DCS Systems', proficiency: 87, usage_frequency: 60, improvement_needed: false }
                ],
                recent_activities: [
                    { case_number: 'CASE-2024-006', activity: 'DCS Configuration', timestamp: '2024-03-20T15:45:00Z', status: 'in_progress' },
                    { case_number: 'CASE-2024-010', activity: 'Process Optimization', timestamp: '2024-03-19T11:30:00Z', status: 'completed' }
                ]
            }
        ];

        const analytics: TeamAnalytics = {
            total_technicians: technicians.length,
            active_technicians: technicians.filter(t => t.status === 'active').length,
            team_efficiency: 88.8,
            total_workload: technicians.reduce((sum, t) => sum + t.current_workload, 0) / technicians.length,
            skill_gaps: ['AI/ML Integration', 'Cloud Computing', 'Cybersecurity'],
            top_performers: [
                { name: 'Rajesh Kumar', efficiency: 92, cases_completed: 20 },
                { name: 'Sneha Reddy', efficiency: 90, cases_completed: 17 },
                { name: 'Amit Patel', efficiency: 88, cases_completed: 18 }
            ],
            workload_distribution: [
                { department: 'Engineering', technicians: 3, avg_workload: 76.7, efficiency: 89 },
                { department: 'Field Service', technicians: 1, avg_workload: 60, efficiency: 88 }
            ]
        };

        return { technicians, metrics, analytics };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#4caf50';
            case 'busy': return '#ff9800';
            case 'offline': return '#9e9e9e';
            default: return '#9e9e9e';
        }
    };

    const getEfficiencyColor = (score: number) => {
        if (score >= 90) return '#4caf50';
        if (score >= 80) return '#ff9800';
        return '#f44336';
    };

    const getWorkloadColor = (workload: number) => {
        if (workload >= 85) return '#f44336';
        if (workload >= 70) return '#ff9800';
        return '#4caf50';
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const renderOverviewTab = () => {
        if (!teamAnalytics) return null;

        return (
            <Grid container spacing={3}>
                {/* Team Metrics Cards */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {teamAnalytics.total_technicians}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Total Technicians
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
                                        {teamAnalytics.active_technicians}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Active Now
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
                                        {teamAnalytics.team_efficiency}%
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
                                        {Math.round(teamAnalytics.total_workload)}%
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

                {/* Top Performers */}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Team Performance Overview
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Technician</TableCell>
                                            <TableCell align="right">Cases Completed</TableCell>
                                            <TableCell align="right">Efficiency</TableCell>
                                            <TableCell align="right">Workload</TableCell>
                                            <TableCell align="right">Rating</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {technicians.map((tech) => {
                                            const metrics = technicianMetrics.get(tech.id);
                                            return (
                                                <TableRow key={tech.id} hover>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center">
                                                            <Avatar sx={{ mr: 2, bgcolor: getStatusColor(tech.status) }}>
                                                                {getInitials(tech.name)}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={500}>
                                                                    {tech.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {tech.role}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Chip 
                                                            label={metrics?.cases_completed || 0} 
                                                            color="success" 
                                                            variant="outlined" 
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ color: getEfficiencyColor(metrics?.efficiency_score || 0) }}
                                                            fontWeight={500}
                                                        >
                                                            {metrics?.efficiency_score || 0}%
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={tech.current_workload}
                                                            sx={{
                                                                width: 60,
                                                                height: 6,
                                                                borderRadius: 3,
                                                                '& .MuiLinearProgress-bar': {
                                                                    backgroundColor: getWorkloadColor(tech.current_workload)
                                                                }
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Box display="flex" alignItems="center" justifyContent="flex-end">
                                                            <StarIcon sx={{ color: '#ffc107', fontSize: 16, mr: 0.5 }} />
                                                            <Typography variant="body2">
                                                                {metrics?.customer_rating?.toFixed(1) || 'N/A'}
                                                            </Typography>
                                                        </Box>
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

                {/* Skill Gaps & Workload */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Team Insights
                            </Typography>
                            
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                Identified Skill Gaps
                            </Typography>
                            {teamAnalytics.skill_gaps.map((skill, index) => (
                                <Chip
                                    key={index}
                                    label={skill}
                                    color="warning"
                                    variant="outlined"
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                />
                            ))}

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="subtitle2" gutterBottom>
                                Department Distribution
                            </Typography>
                            {teamAnalytics.workload_distribution.map((dept, index) => (
                                <Box key={index} sx={{ mb: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" fontWeight={500}>
                                            {dept.department}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {dept.technicians} techs
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" mt={0.5}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={dept.avg_workload}
                                            sx={{
                                                flexGrow: 1,
                                                height: 6,
                                                borderRadius: 3,
                                                mr: 1,
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: getWorkloadColor(dept.avg_workload)
                                                }
                                            }}
                                        />
                                        <Typography variant="caption">
                                            {Math.round(dept.avg_workload)}%
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderTechnicianProfiles = () => {
        return (
            <Grid container spacing={3}>
                {technicians.map((tech) => {
                    const metrics = technicianMetrics.get(tech.id);
                    return (
                        <Grid item xs={12} key={tech.id}>
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
                                                                backgroundColor: getStatusColor(tech.status),
                                                                border: '2px solid white'
                                                            }}
                                                        />
                                                    }
                                                >
                                                    <Avatar sx={{ mr: 2, width: 56, height: 56 }}>
                                                        {getInitials(tech.name)}
                                                    </Avatar>
                                                </Badge>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={600}>
                                                        {tech.name}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {tech.role}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Typography variant="body2" color="text.secondary">
                                                Department
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {tech.department}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Typography variant="body2" color="text.secondary">
                                                Efficiency
                                            </Typography>
                                            <Typography 
                                                variant="h6" 
                                                sx={{ color: getEfficiencyColor(metrics?.efficiency_score || 0) }}
                                            >
                                                {metrics?.efficiency_score || 0}%
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Typography variant="body2" color="text.secondary">
                                                Active Cases
                                            </Typography>
                                            <Typography variant="h6" color="primary">
                                                {metrics?.cases_in_progress || 0}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Typography variant="body2" color="text.secondary">
                                                Rating
                                            </Typography>
                                            <Box display="flex" alignItems="center">
                                                <StarIcon sx={{ color: '#ffc107', fontSize: 20, mr: 0.5 }} />
                                                <Typography variant="h6">
                                                    {metrics?.customer_rating?.toFixed(1) || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={1}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={tech.current_workload}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: getWorkloadColor(tech.current_workload)
                                                    }
                                                }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {tech.current_workload}% workload
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={3}>
                                        {/* Contact Info */}
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom>
                                                Contact Information
                                            </Typography>
                                            <List dense>
                                                <ListItem>
                                                    <ListItemIcon>
                                                        <EmailIcon />
                                                    </ListItemIcon>
                                                    <ListItemText primary={tech.email} />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemIcon>
                                                        <PhoneIcon />
                                                    </ListItemIcon>
                                                    <ListItemText primary={tech.phone} />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemIcon>
                                                        <LocationIcon />
                                                    </ListItemIcon>
                                                    <ListItemText primary={tech.location} />
                                                </ListItem>
                                                <ListItem>
                                                    <ListItemIcon>
                                                        <AccessTimeIcon />
                                                    </ListItemIcon>
                                                    <ListItemText primary={`${tech.experience_years} years experience`} />
                                                </ListItem>
                                            </List>
                                        </Grid>

                                        {/* Skills & Certifications */}
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom>
                                                Skills & Certifications
                                            </Typography>
                                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                                Specializations
                                            </Typography>
                                            <Box sx={{ mb: 2 }}>
                                                {tech.specializations.map((skill, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={skill}
                                                        icon={<BuildIcon />}
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ mr: 1, mb: 1 }}
                                                    />
                                                ))}
                                            </Box>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Certifications
                                            </Typography>
                                            <Box>
                                                {tech.certifications.map((cert, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={cert}
                                                        icon={<SchoolIcon />}
                                                        color="success"
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ mr: 1, mb: 1 }}
                                                    />
                                                ))}
                                            </Box>
                                        </Grid>

                                        {/* Performance Metrics */}
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom>
                                                Performance Metrics
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Card variant="outlined">
                                                        <CardContent>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Completed
                                                            </Typography>
                                                            <Typography variant="h6" color="success.main">
                                                                {metrics?.cases_completed || 0}
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
                                                                {metrics?.avg_completion_time?.toFixed(1) || 0}d
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Card variant="outlined">
                                                        <CardContent>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Response Time
                                                            </Typography>
                                                            <Typography variant="h6">
                                                                {metrics?.avg_response_time?.toFixed(1) || 0}h
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Card variant="outlined">
                                                        <CardContent>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Overdue
                                                            </Typography>
                                                            <Typography variant="h6" color={metrics?.cases_overdue ? 'error' : 'success'}>
                                                                {metrics?.cases_overdue || 0}
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            </Grid>
                                        </Grid>

                                        {/* Recent Activities */}
                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                Recent Activities
                                            </Typography>
                                            <List>
                                                {metrics?.recent_activities.slice(0, 3).map((activity, index) => (
                                                    <ListItem key={index}>
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: getStatusColor(activity.status) }}>
                                                                <AssignmentIcon />
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={activity.activity}
                                                            secondary={`${activity.case_number} • ${new Date(activity.timestamp).toLocaleDateString()}`}
                                                        />
                                                        <Chip
                                                            label={activity.status.replace('_', ' ')}
                                                            size="small"
                                                            color={activity.status === 'completed' ? 'success' : 
                                                                   activity.status === 'delayed' ? 'error' : 'warning'}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>
                    );
                })}
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
                    <EngineeringIcon sx={{ mr: 2, fontSize: 36 }} />
                    Technician Performance Dashboard
                </Typography>
                
                <Box display="flex" gap={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Department</InputLabel>
                        <Select
                            value={filterDepartment}
                            label="Department"
                            onChange={(e) => setFilterDepartment(e.target.value)}
                        >
                            <MenuItem value="all">All Departments</MenuItem>
                            <MenuItem value="Engineering">Engineering</MenuItem>
                            <MenuItem value="Field Service">Field Service</MenuItem>
                            <MenuItem value="Support">Support</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Status"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="busy">Busy</MenuItem>
                            <MenuItem value="offline">Offline</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchTechnicianData}
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
                            label="Team Overview" 
                            icon={<AssessmentIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="Technician Profiles" 
                            icon={<PersonIcon />} 
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                    {renderOverviewTab()}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {renderTechnicianProfiles()}
                </TabPanel>
            </Card>
        </Box>
    );
};

export default EnterpriseTechnicianDashboard;