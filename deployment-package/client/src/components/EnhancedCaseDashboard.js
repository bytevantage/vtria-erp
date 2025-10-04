import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
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
    Divider,
    Badge,
    Tabs,
    Tab,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    Visibility as ViewIcon,
    ArrowForward as TransitionIcon,
    Timeline as TimelineIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Approval as ApprovalIcon,
    ExpandMore as ExpandMoreIcon,
    Notifications as NotificationsIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const EnhancedCaseDashboard = () => {
    const [cases, setCases] = useState({});
    const [selectedState, setSelectedState] = useState('enquiry');
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState({});
    const [selectedCase, setSelectedCase] = useState(null);
    const [workflowStatus, setWorkflowStatus] = useState(null);
    const [workflowDefinitions, setWorkflowDefinitions] = useState({});
    const [slaAlerts, setSlaAlerts] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    
    // Dialog states
    const [detailsDialog, setDetailsDialog] = useState(false);
    const [workflowDialog, setWorkflowDialog] = useState(false);
    const [transitionDialog, setTransitionDialog] = useState(false);
    const [approvalDialog, setApprovalDialog] = useState(false);
    const [alertsDialog, setAlertsDialog] = useState(false);
    
    // Form states
    const [searchQuery, setSearchQuery] = useState('');
    const [transitionNotes, setTransitionNotes] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const caseStates = [
        { value: 'enquiry', label: 'Enquiry', color: '#2196F3' },
        { value: 'estimation', label: 'Estimation', color: '#FF9800' },
        { value: 'quotation', label: 'Quotation', color: '#9C27B0' },
        { value: 'order', label: 'Order', color: '#4CAF50' },
        { value: 'production', label: 'Production', color: '#FF5722' },
        { value: 'delivery', label: 'Delivery', color: '#795548' },
        { value: 'closed', label: 'Closed', color: '#607D8B' }
    ];

    const getSLAColor = (slaStatus) => {
        switch (slaStatus) {
            case 'Breached': return 'error';
            case 'Critical': return 'error';
            case 'Warning': return 'warning';
            case 'On Track': return 'success';
            default: return 'default';
        }
    };

    useEffect(() => {
        fetchStatistics();
        fetchCasesByState(selectedState);
        fetchWorkflowDefinitions();
        fetchSLAAlerts();
        fetchPendingApprovals();
    }, [selectedState]);

    const fetchStatistics = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/stats/overview`);
            setStatistics(response.data.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchCasesByState = async (state) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/state/${state}`);
            setCases(prev => ({
                ...prev,
                [state]: response.data.data
            }));
        } catch (error) {
            console.error('Error fetching cases:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkflowDefinitions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/workflow/definitions`);
            setWorkflowDefinitions(response.data.data.definitions);
        } catch (error) {
            console.error('Error fetching workflow definitions:', error);
        }
    };

    const fetchWorkflowStatus = async (caseNumber) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/workflow/status/${caseNumber}`);
            setWorkflowStatus(response.data.data);
        } catch (error) {
            console.error('Error fetching workflow status:', error);
        }
    };

    const fetchSLAAlerts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/workflow/sla-alerts`);
            setSlaAlerts(response.data.data);
        } catch (error) {
            console.error('Error fetching SLA alerts:', error);
        }
    };

    const fetchPendingApprovals = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/workflow/pending-approvals`);
            setPendingApprovals(response.data.data);
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
        }
    };

    const handleViewWorkflow = async (caseData) => {
        setSelectedCase(caseData);
        await fetchWorkflowStatus(caseData.case_number);
        setWorkflowDialog(true);
    };

    const handleTransitionWorkflow = async () => {
        try {
            await axios.put(`${API_BASE_URL}/api/case-management/workflow/transition/${selectedCase.case_number}`, {
                notes: transitionNotes,
                created_by: 1 // Replace with actual user ID
            });
            
            setTransitionDialog(false);
            setTransitionNotes('');
            await fetchCasesByState(selectedState);
            await fetchWorkflowStatus(selectedCase.case_number);
            
            // Show success message
        } catch (error) {
            console.error('Error transitioning workflow:', error);
        }
    };

    const handleApproveWorkflow = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/case-management/workflow/approve/${selectedCase.case_number}`, {
                approved_by: 1, // Replace with actual user ID
                approval_notes: approvalNotes
            });
            
            setApprovalDialog(false);
            setApprovalNotes('');
            await fetchCasesByState(selectedState);
            await fetchPendingApprovals();
            
            // Show success message
        } catch (error) {
            console.error('Error approving workflow:', error);
        }
    };

    const renderWorkflowStepper = (stateName, currentSubState) => {
        const definitions = workflowDefinitions[stateName] || [];
        const currentStepIndex = definitions.findIndex(def => def.sub_state_name === currentSubState);

        return (
            <Stepper activeStep={currentStepIndex} orientation="vertical">
                {definitions.map((step, index) => (
                    <Step key={step.sub_state_name}>
                        <StepLabel 
                            icon={
                                index < currentStepIndex ? <CheckCircleIcon color="success" /> :
                                index === currentStepIndex ? <ScheduleIcon color="primary" /> :
                                <ScheduleIcon color="disabled" />
                            }
                        >
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle2">
                                    {step.display_name}
                                </Typography>
                                {step.requires_approval && (
                                    <ApprovalIcon color="warning" fontSize="small" />
                                )}
                                <Chip 
                                    label={`${step.sla_hours}h SLA`} 
                                    size="small" 
                                    variant="outlined"
                                />
                            </Box>
                        </StepLabel>
                        <StepContent>
                            <Typography variant="body2" color="textSecondary">
                                {step.description}
                            </Typography>
                            {step.resource_type && (
                                <Typography variant="caption" color="textSecondary">
                                    Resource: {step.resource_type}
                                </Typography>
                            )}
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
        );
    };

    const renderCaseTable = (stateData) => {
        if (!stateData || stateData.length === 0) {
            return (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                    No cases in this state
                </Typography>
            );
        }

        return (
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Case #</TableCell>
                            <TableCell>Project</TableCell>
                            <TableCell>Client</TableCell>
                            <TableCell>Sub-State</TableCell>
                            <TableCell>SLA Status</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stateData.map((caseData) => (
                            <TableRow key={caseData.case_id} hover>
                                <TableCell>{caseData.case_number}</TableCell>
                                <TableCell>{caseData.project_name}</TableCell>
                                <TableCell>{caseData.client_name}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={caseData.sub_state || 'N/A'} 
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={caseData.sla_status || 'On Track'} 
                                        size="small"
                                        color={getSLAColor(caseData.sla_status)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={caseData.priority} 
                                        size="small"
                                        color={caseData.priority === 'high' ? 'error' : 
                                               caseData.priority === 'medium' ? 'warning' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Tooltip title="View Workflow">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => handleViewWorkflow(caseData)}
                                        >
                                            <TimelineIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Transition">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => {
                                                setSelectedCase(caseData);
                                                setTransitionDialog(true);
                                            }}
                                        >
                                            <TransitionIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Enhanced Case Management Dashboard
            </Typography>

            {/* Alert Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Badge badgeContent={slaAlerts.length} color="error">
                                    <NotificationsIcon color="error" />
                                </Badge>
                                <Typography variant="h6">
                                    SLA Alerts
                                </Typography>
                            </Box>
                            <Button 
                                size="small" 
                                onClick={() => setAlertsDialog(true)}
                                disabled={slaAlerts.length === 0}
                            >
                                View All
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Badge badgeContent={pendingApprovals.length} color="warning">
                                    <ApprovalIcon color="warning" />
                                </Badge>
                                <Typography variant="h6">
                                    Pending Approvals
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                {pendingApprovals.length} items need approval
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quick Actions
                            </Typography>
                            <Box gap={1} display="flex">
                                <Button 
                                    variant="outlined" 
                                    startIcon={<RefreshIcon />}
                                    onClick={() => {
                                        fetchStatistics();
                                        fetchCasesByState(selectedState);
                                        fetchSLAAlerts();
                                        fetchPendingApprovals();
                                    }}
                                >
                                    Refresh All
                                </Button>
                                <Button 
                                    variant="outlined"
                                    startIcon={<WarningIcon />}
                                    onClick={() => setAlertsDialog(true)}
                                    color="error"
                                    disabled={slaAlerts.length === 0}
                                >
                                    View Alerts ({slaAlerts.length})
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* State Tabs */}
            <Card sx={{ mb: 3 }}>
                <Tabs 
                    value={selectedState} 
                    onChange={(e, newValue) => setSelectedState(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {caseStates.map((state) => (
                        <Tab 
                            key={state.value}
                            value={state.value}
                            label={
                                <Badge 
                                    badgeContent={cases[state.value]?.length || 0} 
                                    color="primary"
                                    showZero
                                >
                                    {state.label}
                                </Badge>
                            }
                        />
                    ))}
                </Tabs>
            </Card>

            {/* Cases Table */}
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            {caseStates.find(s => s.value === selectedState)?.label} Cases
                        </Typography>
                        {loading && <LinearProgress />}
                    </Box>
                    {renderCaseTable(cases[selectedState])}
                </CardContent>
            </Card>

            {/* Workflow Status Dialog */}
            <Dialog 
                open={workflowDialog} 
                onClose={() => setWorkflowDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Workflow Status - {selectedCase?.case_number}
                </DialogTitle>
                <DialogContent>
                    {workflowStatus && (
                        <Box>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2">Current State:</Typography>
                                    <Chip label={workflowStatus.current_status?.current_step_name} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2">SLA Status:</Typography>
                                    <Chip 
                                        label={workflowStatus.current_status?.sla_status} 
                                        color={getSLAColor(workflowStatus.current_status?.sla_status)}
                                    />
                                </Grid>
                            </Grid>
                            
                            {renderWorkflowStepper(
                                workflowStatus.current_status?.current_state,
                                workflowStatus.current_status?.sub_state
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWorkflowDialog(false)}>Close</Button>
                    <Button 
                        variant="contained" 
                        onClick={() => setTransitionDialog(true)}
                    >
                        Transition Next Step
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Transition Dialog */}
            <Dialog open={transitionDialog} onClose={() => setTransitionDialog(false)}>
                <DialogTitle>Transition Workflow Step</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Transition Notes"
                        value={transitionNotes}
                        onChange={(e) => setTransitionNotes(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransitionDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleTransitionWorkflow}>
                        Confirm Transition
                    </Button>
                </DialogActions>
            </Dialog>

            {/* SLA Alerts Dialog */}
            <Dialog 
                open={alertsDialog} 
                onClose={() => setAlertsDialog(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>SLA Breach Alerts</DialogTitle>
                <DialogContent>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Case #</TableCell>
                                    <TableCell>Project</TableCell>
                                    <TableCell>Client</TableCell>
                                    <TableCell>Current Step</TableCell>
                                    <TableCell>Alert Level</TableCell>
                                    <TableCell>Hours Until Breach</TableCell>
                                    <TableCell>Assigned To</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {slaAlerts.map((alert) => (
                                    <TableRow key={alert.id}>
                                        <TableCell>{alert.case_number}</TableCell>
                                        <TableCell>{alert.project_name}</TableCell>
                                        <TableCell>{alert.client_name}</TableCell>
                                        <TableCell>{alert.display_name}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={alert.alert_level} 
                                                color={
                                                    alert.alert_level === 'BREACHED' ? 'error' :
                                                    alert.alert_level === 'CRITICAL' ? 'error' :
                                                    alert.alert_level === 'WARNING' ? 'warning' : 'default'
                                                }
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {alert.hours_until_breach > 0 
                                                ? `${alert.hours_until_breach}h` 
                                                : 'OVERDUE'
                                            }
                                        </TableCell>
                                        <TableCell>{alert.assigned_to_name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAlertsDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnhancedCaseDashboard;