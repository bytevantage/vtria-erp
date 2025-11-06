import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
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
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    LinearProgress,
    Tooltip,
    Badge,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import {
    Engineering as EquipmentIcon,
    Build as MaintenanceIcon,
    Warning as WarningIcon,
    CheckCircle as HealthyIcon,
    Error as FaultIcon,
    Timeline as PerformanceIcon,
    Schedule as ScheduleIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Remove as TrendingFlatIcon
} from '@mui/icons-material';
import axios from 'axios';

interface EquipmentStatus {
    serial_number_id: number;
    serial_number: string;
    product_name: string;
    equipment_type: string;
    equipment_category: string;
    current_status: string;
    operating_hours_total: number;
    total_fault_count: number;
    health_score: number;
    risk_level: string;
    maintenance_status: string;
    warranty_status: string;
    location_name: string;
    next_maintenance_due: string;
}

interface MaintenanceDashboard {
    dashboard: Array<{
        status: string;
        equipment_count: number;
        avg_health_score: number;
    }>;
    upcomingMaintenance: Array<{
        serial_number: string;
        product_name: string;
        equipment_type: string;
        location_name: string;
        next_maintenance_due: string;
        maintenance_status: string;
    }>;
    recentFaults: Array<{
        serial_number: string;
        fault_datetime: string;
        fault_category: string;
        fault_severity: string;
        fault_description: string;
        fault_resolved: boolean;
        product_name: string;
        location_name: string;
    }>;
}

interface PerformanceTest {
    test_type: 'commissioning' | 'routine' | 'troubleshooting' | 'calibration' | 'upgrade';
    performance_score: number;
    response_time_ms: number;
    accuracy_percentage: number;
    precision_rating: 'excellent' | 'good' | 'acceptable' | 'poor';
    test_result: 'pass' | 'pass_with_notes' | 'fail' | 'inconclusive';
    test_notes: string;
}

const IndustrialEquipmentDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Equipment status state
    const [equipmentList, setEquipmentList] = useState<EquipmentStatus[]>([]);
    const [equipmentSummary, setEquipmentSummary] = useState<any>(null);
    const [filters, setFilters] = useState({
        equipment_type: 'all',
        location_id: '0',
        risk_level: 'all',
        maintenance_status: 'all'
    });

    // Maintenance dashboard state
    const [maintenanceDashboard, setMaintenanceDashboard] = useState<MaintenanceDashboard | null>(null);

    // Dialog states
    const [performanceTestDialog, setPerformanceTestDialog] = useState(false);
    const [faultRecordDialog, setFaultRecordDialog] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<EquipmentStatus | null>(null);

    // Form states
    const [performanceTest, setPerformanceTest] = useState<PerformanceTest>({
        test_type: 'routine',
        performance_score: 85,
        response_time_ms: 0,
        accuracy_percentage: 100,
        precision_rating: 'good',
        test_result: 'pass',
        test_notes: ''
    });

    const [faultRecord, setFaultRecord] = useState({
        fault_category: 'hardware',
        fault_severity: 'minor',
        fault_code: '',
        fault_description: '',
        fault_detected_by: 'automatic',
        temperature_at_fault: null,
        voltage_at_fault: null,
        root_cause_analysis: ''
    });

    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    const fetchEquipmentStatus = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/industrial-equipment/equipment-status`, {
                params: filters,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            setEquipmentList(response.data.data.equipment);
            setEquipmentSummary(response.data.data.summary);
        } catch (err) {
            setError('Failed to fetch equipment status');
        } finally {
            setLoading(false);
        }
    };

    const fetchMaintenanceDashboard = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/industrial-equipment/maintenance-dashboard`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            setMaintenanceDashboard(response.data.data);
        } catch (err) {
            setError('Failed to fetch maintenance dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 0) {
            fetchEquipmentStatus();
        } else if (activeTab === 1) {
            fetchMaintenanceDashboard();
        }
    }, [activeTab, filters]);

    const handleRecordPerformanceTest = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/industrial-equipment/performance-test`, {
                serial_number_id: selectedEquipment?.serial_number_id,
                ...performanceTest
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            setPerformanceTestDialog(false);
            fetchEquipmentStatus();
        } catch (err) {
            setError('Failed to record performance test');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordFault = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/industrial-equipment/fault`, {
                serial_number_id: selectedEquipment?.serial_number_id,
                ...faultRecord
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            setFaultRecordDialog(false);
            fetchEquipmentStatus();
        } catch (err) {
            setError('Failed to record equipment fault');
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'High Risk': return 'error';
            case 'Medium Risk': return 'warning';
            case 'Low Risk': return 'success';
            default: return 'default';
        }
    };

    const getMaintenanceStatusColor = (status: string) => {
        switch (status) {
            case 'Overdue': return 'error';
            case 'Due Soon': return 'warning';
            case 'Upcoming': return 'info';
            case 'Scheduled': return 'success';
            default: return 'default';
        }
    };

    const getEquipmentIcon = (equipmentType: string) => {
        switch (equipmentType) {
            case 'plc': return '🏭';
            case 'vfd': return '⚡';
            case 'hmi': return '💻';
            case 'sensor': return '🔍';
            case 'actuator': return '🔧';
            default: return '⚙️';
        }
    };

    const EquipmentStatusTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Equipment</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="center">Health Score</TableCell>
                        <TableCell align="center">Operating Hours</TableCell>
                        <TableCell align="center">Faults</TableCell>
                        <TableCell>Risk Level</TableCell>
                        <TableCell>Maintenance</TableCell>
                        <TableCell>Warranty</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {equipmentList.map((equipment) => (
                        <TableRow key={equipment.serial_number_id}>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">{getEquipmentIcon(equipment.equipment_type)}</Typography>
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {equipment.serial_number}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {equipment.product_name}
                                        </Typography>
                                    </Box>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={equipment.equipment_type.toUpperCase()} 
                                    size="small"
                                    variant="outlined"
                                />
                            </TableCell>
                            <TableCell>{equipment.location_name}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={equipment.health_score} 
                                        sx={{ width: 60, height: 6 }}
                                        color={equipment.health_score >= 80 ? 'success' : equipment.health_score >= 60 ? 'warning' : 'error'}
                                    />
                                    <Typography variant="caption">
                                        {equipment.health_score}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body2">
                                    {equipment.operating_hours_total?.toLocaleString()}h
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Badge badgeContent={equipment.total_fault_count} color="error">
                                    <FaultIcon color={equipment.total_fault_count > 0 ? 'error' : 'disabled'} />
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={equipment.risk_level}
                                    color={getRiskColor(equipment.risk_level)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={equipment.maintenance_status}
                                    color={getMaintenanceStatusColor(equipment.maintenance_status)}
                                    size="small"
                                />
                                {equipment.next_maintenance_due && (
                                    <Typography variant="caption" display="block">
                                        Due: {new Date(equipment.next_maintenance_due).toLocaleDateString()}
                                    </Typography>
                                )}
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={equipment.warranty_status}
                                    color={equipment.warranty_status === 'Active' ? 'success' : 
                                           equipment.warranty_status === 'Expiring Soon' ? 'warning' : 'error'}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Tooltip title="Record Performance Test">
                                    <IconButton 
                                        size="small"
                                        onClick={() => {
                                            setSelectedEquipment(equipment);
                                            setPerformanceTestDialog(true);
                                        }}
                                    >
                                        <PerformanceIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Record Fault">
                                    <IconButton 
                                        size="small"
                                        onClick={() => {
                                            setSelectedEquipment(equipment);
                                            setFaultRecordDialog(true);
                                        }}
                                    >
                                        <FaultIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Equipment Settings">
                                    <IconButton size="small">
                                        <SettingsIcon />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const MaintenanceOverview = () => (
        <Grid container spacing={3}>
            {maintenanceDashboard?.dashboard.map((item) => (
                <Grid item xs={12} md={3} key={item.status}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" color={
                                        item.status === 'overdue' ? 'error.main' :
                                        item.status === 'due_soon' ? 'warning.main' :
                                        item.status === 'high_risk' ? 'error.main' : 'info.main'
                                    }>
                                        {item.equipment_count}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {item.status.replace('_', ' ').toUpperCase()}
                                    </Typography>
                                </Box>
                                <Box>
                                    {item.status === 'overdue' && <WarningIcon color="error" />}
                                    {item.status === 'due_soon' && <ScheduleIcon color="warning" />}
                                    {item.status === 'high_risk' && <FaultIcon color="error" />}
                                    {item.status === 'warranty_expiring' && <WarningIcon color="warning" />}
                                </Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Avg Health: {item.avg_health_score?.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const PerformanceTestDialog = () => (
        <Dialog open={performanceTestDialog} onClose={() => setPerformanceTestDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Record Performance Test - {selectedEquipment?.serial_number}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Test Type</InputLabel>
                            <Select
                                value={performanceTest.test_type}
                                onChange={(e) => setPerformanceTest({...performanceTest, test_type: e.target.value as any})}
                            >
                                <MenuItem value="commissioning">Commissioning</MenuItem>
                                <MenuItem value="routine">Routine</MenuItem>
                                <MenuItem value="troubleshooting">Troubleshooting</MenuItem>
                                <MenuItem value="calibration">Calibration</MenuItem>
                                <MenuItem value="upgrade">Upgrade</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Performance Score (0-100)"
                            type="number"
                            value={performanceTest.performance_score}
                            onChange={(e) => setPerformanceTest({...performanceTest, performance_score: parseFloat(e.target.value)})}
                            inputProps={{ min: 0, max: 100 }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Response Time (ms)"
                            type="number"
                            value={performanceTest.response_time_ms}
                            onChange={(e) => setPerformanceTest({...performanceTest, response_time_ms: parseFloat(e.target.value)})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Accuracy Percentage"
                            type="number"
                            value={performanceTest.accuracy_percentage}
                            onChange={(e) => setPerformanceTest({...performanceTest, accuracy_percentage: parseFloat(e.target.value)})}
                            inputProps={{ min: 0, max: 100 }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Precision Rating</InputLabel>
                            <Select
                                value={performanceTest.precision_rating}
                                onChange={(e) => setPerformanceTest({...performanceTest, precision_rating: e.target.value as any})}
                            >
                                <MenuItem value="excellent">Excellent</MenuItem>
                                <MenuItem value="good">Good</MenuItem>
                                <MenuItem value="acceptable">Acceptable</MenuItem>
                                <MenuItem value="poor">Poor</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Test Result</InputLabel>
                            <Select
                                value={performanceTest.test_result}
                                onChange={(e) => setPerformanceTest({...performanceTest, test_result: e.target.value as any})}
                            >
                                <MenuItem value="pass">Pass</MenuItem>
                                <MenuItem value="pass_with_notes">Pass with Notes</MenuItem>
                                <MenuItem value="fail">Fail</MenuItem>
                                <MenuItem value="inconclusive">Inconclusive</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Test Notes"
                            multiline
                            rows={4}
                            value={performanceTest.test_notes}
                            onChange={(e) => setPerformanceTest({...performanceTest, test_notes: e.target.value})}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setPerformanceTestDialog(false)}>Cancel</Button>
                <Button onClick={handleRecordPerformanceTest} variant="contained">
                    Record Test
                </Button>
            </DialogActions>
        </Dialog>
    );

    const FaultRecordDialog = () => (
        <Dialog open={faultRecordDialog} onClose={() => setFaultRecordDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Record Equipment Fault - {selectedEquipment?.serial_number}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Fault Category</InputLabel>
                            <Select
                                value={faultRecord.fault_category}
                                onChange={(e) => setFaultRecord({...faultRecord, fault_category: e.target.value})}
                            >
                                <MenuItem value="hardware">Hardware</MenuItem>
                                <MenuItem value="software">Software</MenuItem>
                                <MenuItem value="configuration">Configuration</MenuItem>
                                <MenuItem value="environmental">Environmental</MenuItem>
                                <MenuItem value="communication">Communication</MenuItem>
                                <MenuItem value="power">Power</MenuItem>
                                <MenuItem value="mechanical">Mechanical</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Fault Severity</InputLabel>
                            <Select
                                value={faultRecord.fault_severity}
                                onChange={(e) => setFaultRecord({...faultRecord, fault_severity: e.target.value})}
                            >
                                <MenuItem value="critical">Critical</MenuItem>
                                <MenuItem value="major">Major</MenuItem>
                                <MenuItem value="minor">Minor</MenuItem>
                                <MenuItem value="warning">Warning</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Fault Code"
                            value={faultRecord.fault_code}
                            onChange={(e) => setFaultRecord({...faultRecord, fault_code: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Detected By</InputLabel>
                            <Select
                                value={faultRecord.fault_detected_by}
                                onChange={(e) => setFaultRecord({...faultRecord, fault_detected_by: e.target.value})}
                            >
                                <MenuItem value="automatic">Automatic</MenuItem>
                                <MenuItem value="operator">Operator</MenuItem>
                                <MenuItem value="maintenance">Maintenance</MenuItem>
                                <MenuItem value="inspection">Inspection</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Fault Description"
                            multiline
                            rows={3}
                            value={faultRecord.fault_description}
                            onChange={(e) => setFaultRecord({...faultRecord, fault_description: e.target.value})}
                            required
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Root Cause Analysis"
                            multiline
                            rows={3}
                            value={faultRecord.root_cause_analysis}
                            onChange={(e) => setFaultRecord({...faultRecord, root_cause_analysis: e.target.value})}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setFaultRecordDialog(false)}>Cancel</Button>
                <Button onClick={handleRecordFault} variant="contained">
                    Record Fault
                </Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Industrial Equipment Dashboard</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={activeTab === 0 ? fetchEquipmentStatus : fetchMaintenanceDashboard}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab 
                    label="Equipment Status" 
                    icon={<EquipmentIcon />}
                />
                <Tab 
                    label="Maintenance Dashboard" 
                    icon={<MaintenanceIcon />}
                />
            </Tabs>

            {activeTab === 0 && (
                <Box>
                    {/* Filters */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Filters</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Equipment Type</InputLabel>
                                        <Select
                                            value={filters.equipment_type}
                                            onChange={(e) => setFilters({...filters, equipment_type: e.target.value})}
                                        >
                                            <MenuItem value="all">All Types</MenuItem>
                                            <MenuItem value="plc">PLC</MenuItem>
                                            <MenuItem value="vfd">VFD</MenuItem>
                                            <MenuItem value="hmi">HMI</MenuItem>
                                            <MenuItem value="sensor">Sensor</MenuItem>
                                            <MenuItem value="actuator">Actuator</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Risk Level</InputLabel>
                                        <Select
                                            value={filters.risk_level}
                                            onChange={(e) => setFilters({...filters, risk_level: e.target.value})}
                                        >
                                            <MenuItem value="all">All Risk Levels</MenuItem>
                                            <MenuItem value="High Risk">High Risk</MenuItem>
                                            <MenuItem value="Medium Risk">Medium Risk</MenuItem>
                                            <MenuItem value="Low Risk">Low Risk</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Maintenance Status</InputLabel>
                                        <Select
                                            value={filters.maintenance_status}
                                            onChange={(e) => setFilters({...filters, maintenance_status: e.target.value})}
                                        >
                                            <MenuItem value="all">All Statuses</MenuItem>
                                            <MenuItem value="Overdue">Overdue</MenuItem>
                                            <MenuItem value="Due Soon">Due Soon</MenuItem>
                                            <MenuItem value="Upcoming">Upcoming</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Summary Cards */}
                    {equipmentSummary && (
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="primary">
                                            {equipmentSummary.total_equipment}
                                        </Typography>
                                        <Typography variant="body2">Total Equipment</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="success.main">
                                            {equipmentSummary.avg_health_score?.toFixed(1)}
                                        </Typography>
                                        <Typography variant="body2">Avg Health Score</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="error.main">
                                            {equipmentSummary.high_risk_count}
                                        </Typography>
                                        <Typography variant="body2">High Risk</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="warning.main">
                                            {equipmentSummary.overdue_maintenance}
                                        </Typography>
                                        <Typography variant="body2">Overdue Maint.</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="info.main">
                                            {equipmentSummary.warranty_expiring}
                                        </Typography>
                                        <Typography variant="body2">Warranty Expiring</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {loading ? <CircularProgress /> : <EquipmentStatusTable />}
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    {loading ? (
                        <CircularProgress />
                    ) : maintenanceDashboard ? (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <MaintenanceOverview />
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>Upcoming Maintenance</Typography>
                                        <List dense>
                                            {maintenanceDashboard.upcomingMaintenance.slice(0, 5).map((item, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <ScheduleIcon />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={`${item.serial_number} - ${item.product_name}`}
                                                        secondary={`${item.location_name} | Due: ${new Date(item.next_maintenance_due).toLocaleDateString()}`}
                                                    />
                                                    <Chip 
                                                        label={item.maintenance_status}
                                                        color={getMaintenanceStatusColor(item.maintenance_status)}
                                                        size="small"
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>Recent Faults</Typography>
                                        <List dense>
                                            {maintenanceDashboard.recentFaults.slice(0, 5).map((fault, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <FaultIcon color={fault.fault_resolved ? 'success' : 'error'} />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={`${fault.serial_number} - ${fault.fault_category}`}
                                                        secondary={`${fault.product_name} | ${new Date(fault.fault_datetime).toLocaleDateString()}`}
                                                    />
                                                    <Chip 
                                                        label={fault.fault_resolved ? 'Resolved' : 'Open'}
                                                        color={fault.fault_resolved ? 'success' : 'error'}
                                                        size="small"
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    ) : null}
                </Box>
            )}

            <PerformanceTestDialog />
            <FaultRecordDialog />
        </Box>
    );
};

export default IndustrialEquipmentDashboard;