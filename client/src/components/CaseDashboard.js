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
    CircularProgress,
    Divider
} from '@mui/material';
import {
    Visibility as ViewIcon,
    ArrowForward as TransitionIcon,
    Timeline as TimelineIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => {
    const token = localStorage.getItem('vtria_token') || 'demo-token';
    return { Authorization: `Bearer ${token}` };
};

const CaseDashboard = () => {
    console.log('CaseDashboard component loading...');
    const navigate = useNavigate();

    // Define case states and their display names
    const CASE_STATES = {
        ENQUIRY: 'enquiry',
        ESTIMATION: 'estimation',
        QUOTATION: 'quotation',
        ORDER: 'order',
        PRODUCTION: 'production',
        DELIVERY: 'delivery',
        CLOSED: 'closed'
    };

    // Map states to their display names and next states
    const stateMap = {
        [CASE_STATES.ENQUIRY]: {
            label: 'Enquiry',
            nextState: CASE_STATES.ESTIMATION,
            color: '#2196f3' // Blue
        },
        [CASE_STATES.ESTIMATION]: {
            label: 'Estimation',
            nextState: CASE_STATES.QUOTATION,
            color: '#9c27b0' // Purple
        },
        [CASE_STATES.QUOTATION]: {
            label: 'Quotation',
            nextState: CASE_STATES.ORDER,
            color: '#ff9800' // Orange
        },
        [CASE_STATES.ORDER]: {
            label: 'Order',
            nextState: CASE_STATES.PRODUCTION,
            color: '#4caf50' // Green
        },
        [CASE_STATES.PRODUCTION]: {
            label: 'Production',
            nextState: CASE_STATES.DELIVERY,
            color: '#f44336' // Red
        },
        [CASE_STATES.DELIVERY]: {
            label: 'Delivery',
            nextState: CASE_STATES.CLOSED,
            color: '#607d8b' // Blue Grey
        },
        [CASE_STATES.CLOSED]: {
            label: 'Closed',
            nextState: null,
            color: '#9e9e9e' // Grey
        }
    };

    const [cases, setCases] = useState({
        [CASE_STATES.ENQUIRY]: [],
        [CASE_STATES.ESTIMATION]: [],
        [CASE_STATES.QUOTATION]: [],
        [CASE_STATES.ORDER]: [],
        [CASE_STATES.PRODUCTION]: [],
        [CASE_STATES.DELIVERY]: []
    });

    const [selectedState, setSelectedState] = useState(CASE_STATES.ENQUIRY);
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState({});
    const [selectedCase, setSelectedCase] = useState(null);
    const [detailsDialog, setDetailsDialog] = useState(false);
    const [transitionDialog, setTransitionDialog] = useState(false);
    const [timelineDialog, setTimelineDialog] = useState(false);
    const [caseTimeline, setCaseTimeline] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [transitionNotes, setTransitionNotes] = useState('');
    // State for error handling and debugging
    const [apiError, setApiError] = useState(null);
    const [debugInfo, setDebugInfo] = useState('');

    // Case states for UI rendering (excluding closed cases - they appear in reports)
    const caseStates = Object.entries(stateMap)
        .filter(([key]) => key !== CASE_STATES.CLOSED)
        .map(([key, value]) => ({
            value: key.toLowerCase(),
            label: value.label,
            color: value.color,
            count: statistics[key.toLowerCase()] || 0
        }));

    // Next state mapping for transitions
    const nextStateMap = Object.fromEntries(
        Object.entries(stateMap)
            .filter(([_, value]) => value.nextState)
            .map(([key, value]) => [key.toLowerCase(), value.nextState])
    );

    // Health check function to test API connectivity
    const checkApiHealth = async () => {
        try {
            const response = await axios.get('/health', { timeout: 5000 });
            console.log('API Health Check:', response.data);
            setDebugInfo('API server is reachable');
            return true;
        } catch (error) {
            console.error('API Health Check Failed:', error);
            setApiError('Cannot connect to API server. Please check if the server is running.');
            setDebugInfo(`Health check failed: ${error.message}`);
            return false;
        }
    }; useEffect(() => {
        // First check if API is reachable
        checkApiHealth().then(isHealthy => {
            if (isHealthy) {
                fetchStatistics();
                // Load cases for all states except closed
                const activeStates = ['enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery'];
                activeStates.forEach(state => {
                    fetchCasesByState(state);
                });
            }
        });
    }, []);

    useEffect(() => {
        // Only fetch when selectedState changes and we don't already have data
        if (!cases[selectedState] || cases[selectedState].length === 0) {
            fetchCasesByState(selectedState);
        }
    }, [selectedState]);

    // Navigate to appropriate workflow module based on case state
    const navigateToWorkflowModule = (caseItem) => {
        try {
            const { current_state, case_number, enquiry_id, id } = caseItem;

            // Prepare case data with all necessary fields
            const caseData = {
                caseNumber: case_number,
                caseId: id,
                enquiryId: enquiry_id,
                currentState: current_state,
                ...caseItem
            };

            // Store in sessionStorage as fallback
            sessionStorage.setItem('selectedCase', JSON.stringify(caseData));

            // Map case states to their corresponding routes
            const routeMap = {
                'enquiry': '/sales-enquiry',
                'estimation': '/estimation',
                'quotation': '/quotations',
                'order': '/sales-orders',
                'production': '/manufacturing',
                'delivery': '/manufacturing/delivery',
                'closed': '/reports/cases'
            };

            const targetRoute = routeMap[current_state];

            if (!targetRoute) {
                console.warn(`Unknown case state: ${current_state}. Falling back to case details.`);
                fetchCaseDetails(case_number);
                return;
            }

            // Clear any previous navigation state to prevent stale data
            window.history.replaceState({}, '');

            // Navigate with case data in state (preferred method)
            navigate(targetRoute, {
                state: {
                    caseData,
                    fromDashboard: true,
                    timestamp: Date.now() // Add timestamp to force re-render
                }
            });

        } catch (error) {
            console.error('Error navigating to workflow module:', error);
            // Fallback to case details if navigation fails
            if (caseItem?.case_number) {
                fetchCaseDetails(caseItem.case_number);
            } else {
                setError('Failed to navigate to case. Please try again.');
            }
        }
    };

    const fetchStatistics = async () => {
        try {
            setDebugInfo('Fetching statistics from /api/case-management/stats/overview...');
            const response = await axios.get(`${API_BASE_URL}/api/case-management/stats/overview`, {
                headers: getAuthHeaders()
            });

            if (response.data.success) {
                // Convert the array of state objects to a key-value map
                const statsMap = {};
                if (response.data.data.by_state) {
                    response.data.data.by_state.forEach(state => {
                        statsMap[state.current_state] = state.count;
                    });
                }

                // Ensure all case states are present in the stats, defaulting to 0
                const completeStats = {};
                caseStates.forEach(state => {
                    completeStats[state.value] = statsMap[state.value] || 0;
                });

                setStatistics(completeStats);
                setDebugInfo('Statistics loaded successfully');
                setApiError(null);

                // Debug info
                console.log('API Response:', response.data);
                console.log('Processed Statistics:', completeStats);

            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
            setApiError('Failed to load case statistics. Please try again later.');
            setDebugInfo(`Error: ${error.message}`);

            // Initialize with zeros if the API call fails
            const zeroStats = {};
            caseStates.forEach(state => {
                zeroStats[state.value] = 0;
            });
            setStatistics(zeroStats);
        }
    };

    const fetchCasesByState = async (state, page = 1, pageSize = 10, retryCount = 0) => {
        setLoading(true);
        const maxRetries = 2;

        try {
            setDebugInfo(`Fetching ${state} cases from /api/case-management/state/${state}... (attempt ${retryCount + 1})`);
            const offset = (page - 1) * pageSize;

            // Add timeout and better error handling
            const response = await axios.get(
                `${API_BASE_URL}/api/case-management/state/${state}`,
                {
                    params: { limit: pageSize, offset },
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    }
                }
            );

            if (response.data.success) {
                // Debug logging to track data
                console.log(`Fetched ${state} cases:`, response.data.data);
                response.data.data?.forEach(caseItem => {
                    console.log(`Case ${caseItem.case_number}: current_state=${caseItem.current_state}, status=${caseItem.status}`);
                });

                // Update cases with proper state management
                setCases(prev => ({
                    ...prev,
                    [state]: response.data.data || [],
                    pagination: response.data.meta
                }));

                setDebugInfo(`Loaded ${response.data.data?.length || 0} of ${response.data.meta?.total || 0} ${state} cases`);
                setApiError(null);
            } else {
                throw new Error(response.data.message || 'Failed to load cases');
            }
        } catch (error) {
            console.error(`Error fetching ${state} cases:`, error);

            // Enhanced error handling with network error detection
            let errorMessage = `Failed to load ${state} cases.`;
            let shouldRetry = false;

            if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
                errorMessage = `Network Error: Cannot connect to API server. Please check if the server is running on ${API_BASE_URL}`;
                shouldRetry = retryCount < maxRetries;
            } else if (error.response) {
                // Server responded with error
                errorMessage = `Server Error (${error.response.status}): ${error.response.data?.message || error.message}`;
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = `Network Error: No response from server. Check your connection and server status.`;
                shouldRetry = retryCount < maxRetries;
            } else {
                // Something else happened
                errorMessage = `Request Error: ${error.message}`;
            }

            // Retry logic for network errors
            if (shouldRetry) {
                console.log(`Retrying request for ${state} cases (attempt ${retryCount + 2}/${maxRetries + 1})`);
                setTimeout(() => {
                    fetchCasesByState(state, page, pageSize, retryCount + 1);
                }, 2000); // Wait 2 seconds before retry
                return;
            }

            setApiError(errorMessage);
            setDebugInfo(`Error details: ${error.response?.data?.message || error.message}`);

            // Set empty state on error
            setCases(prev => ({
                ...prev,
                [state]: []
            }));

            console.error('Cases API failed after retries:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCaseDetails = async (caseNumber) => {
        try {
            setLoading(true);
            setError(null);

            // First try to fetch from API
            const response = await axios.get(`${API_BASE_URL}/api/case-management/${caseNumber}`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    ...getAuthHeaders()
                }
            });

            if (response.data?.success) {
                setSelectedCase(response.data.data);
                setDetailsDialog(true);
                return response.data.data;
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error fetching case details:', error);

            // Fallback: find case in current data
            const allStates = Object.keys(cases);
            let foundCase = null;

            for (const state of allStates) {
                const caseData = cases[state]?.find(c => c.case_number === caseNumber);
                if (caseData) {
                    foundCase = caseData;
                    break;
                }
            }

            if (foundCase) {
                setSelectedCase(foundCase);
                setDetailsDialog(true);
                return foundCase;
            } else {
                setError(`Could not find details for case ${caseNumber}. It may have been archived or deleted.`);
                return null;
            }
        }
    };

    const fetchCaseTimeline = async (caseNumber) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(`${API_BASE_URL}/api/case-management/${caseNumber}/timeline`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    ...getAuthHeaders()
                }
            });

            if (response.data?.success) {
                setCaseTimeline(response.data.data);
                setTimelineDialog(true);
                return response.data.data;
            } else {
                throw new Error('Invalid timeline data format');
            }
        } catch (error) {
            console.error('Error fetching case timeline:', error);

            // Fallback: show basic timeline with current state
            const allStates = Object.keys(cases);
            let foundCase = null;

            for (const state of allStates) {
                const caseData = cases[state]?.find(c => c.case_number === caseNumber);
                if (caseData) {
                    foundCase = caseData;
                    break;
                }
            }

            const fallbackTimeline = [{
                state: foundCase?.current_state || 'unknown',
                created_at: foundCase?.created_at || new Date().toISOString(),
                notes: 'Timeline data not available. Showing current state only.'
            }];
            setCaseTimeline(fallbackTimeline);
            setTimelineDialog(true);
            return fallbackTimeline;
        }
    };

    const handleStateTransition = async (caseNumber, newState, notes = '') => {
        try {
            setLoading(true);
            setApiError(null);
            setDebugInfo(`Initiating state transition for ${caseNumber} to ${newState}...`);

            // Get the current state from the selected case or the current view
            const currentState = selectedCase?.current_state || selectedState;

            // Validate the transition
            if (!stateMap[currentState]?.nextState || stateMap[currentState].nextState !== newState) {
                throw new Error(`Invalid state transition from ${currentState} to ${newState}`);
            }

            // Prepare the transition data
            const transitionData = {
                to_state: newState,
                notes,
                transitioned_by: 'system', // TODO: Replace with actual user from auth context
                reference_id: null // Add reference if needed (e.g., estimation_id, quotation_id)
            };

            // Call the API to transition the case
            const response = await axios.put(
                `${API_BASE_URL}/api/case-management/${caseNumber}/transition`,
                transitionData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...getAuthHeaders()
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            );

            if (response.data?.success) {
                // Update the UI optimistically
                setCases(prev => {
                    const updatedCases = { ...prev };

                    // Remove from current state
                    if (currentState && updatedCases[currentState]) {
                        updatedCases[currentState] = updatedCases[currentState].filter(
                            c => c.case_number !== caseNumber
                        );
                    }

                    // Add to new state if it exists in our state
                    if (newState && updatedCases[newState]) {
                        const updatedCase = { ...selectedCase, current_state: newState };
                        updatedCases[newState] = [updatedCase, ...updatedCases[newState]];
                    }

                    return updatedCases;
                });

                // Update statistics immediately
                setStatistics(prevStats => ({
                    ...prevStats,
                    [selectedState]: Math.max(0, (prevStats[selectedState] || 0) - 1),
                    [newState]: (prevStats[newState] || 0) + 1
                }));

                // Refresh data from server to ensure consistency
                setTimeout(() => {
                    fetchStatistics();
                    fetchCasesByState(selectedState);
                    // Also fetch the new state if it's different
                    if (newState !== selectedState) {
                        fetchCasesByState(newState);
                    }
                }, 500);

                // Close the dialog
                setTransitionDialog(false);
                setTransitionNotes('');
                setSelectedCase(null);
            } else {
                throw new Error(response.data.message || 'Transition failed');
            }
        } catch (error) {
            console.error('Error transitioning case:', error);
            const errorMessage = error.response?.data?.message || error.message;
            setApiError(`Failed to transition case: ${errorMessage}`);
            setDebugInfo(`Transition failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const searchCases = async () => {
        if (!searchQuery.trim()) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/search/query`, {
                params: { q: searchQuery },
                headers: getAuthHeaders()
            });
        } catch (error) {
            console.error('Error searching cases:', error);
        }
    };

    const getStateColor = (state) => {
        const stateConfig = caseStates.find(s => s.value === state);
        return stateConfig ? stateConfig.color : '#666';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const calculateProgress = (currentState) => {
        // Define the complete workflow order including closed for accurate percentage
        const workflowOrder = ['enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed'];
        const stateIndex = workflowOrder.findIndex(s => s === currentState);
        if (stateIndex === -1) return 0;
        return ((stateIndex + 1) / workflowOrder.length) * 100;
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    Case Management Dashboard
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                        setApiError(null);
                        setDebugInfo('Refreshing data...');
                        fetchStatistics();
                        fetchCasesByState(selectedState);
                    }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Error Display */}
            {apiError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {apiError}
                </Alert>
            )}

            {/* Debug Info */}
            {debugInfo && (
                <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
                    Debug: {debugInfo}
                </Alert>
            )}

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {caseStates.map(state => (
                    <Grid item xs={12} sm={6} md={3} lg={1.7} key={state.value}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                border: selectedState === state.value ? `2px solid ${state.color}` : '1px solid #e0e0e0',
                                '&:hover': { boxShadow: 3 }
                            }}
                            onClick={() => setSelectedState(state.value)}
                        >
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="h6" sx={{ color: state.color, fontWeight: 'bold' }}>
                                    {statistics[state.value] || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {state.label}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Search Bar */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            fullWidth
                            placeholder="Search cases by case number, client name, or project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && searchCases()}
                        />
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={searchCases}
                        >
                            Search
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Cases Table */}
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Cases in {caseStates.find(s => s.value === selectedState)?.label} State
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Selected State: {selectedState} | API Endpoint: /api/case-management/state/{selectedState}
                        </Typography>
                        <Chip
                            label={`${cases[selectedState]?.length || 0} cases`}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Case ID</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Project</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Case Owner</TableCell>
                                    <TableCell>Date Opened</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(cases[selectedState] || []).map((caseItem) => (
                                    <TableRow key={caseItem.case_number} hover>
                                        <TableCell>
                                            <Button
                                                variant="text"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    color: 'primary.main',
                                                    textDecoration: 'underline',
                                                    '&:hover': {
                                                        backgroundColor: 'primary.light',
                                                        color: 'white'
                                                    }
                                                }}
                                                onClick={() => navigateToWorkflowModule(caseItem)}
                                            >
                                                {caseItem.case_number || 'N/A'}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {caseItem.client_name}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {caseItem.client_email}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {caseItem.project_name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={caseItem.current_state.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getStateColor(caseItem.current_state),
                                                    color: 'white',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {caseItem.assigned_to_name || 'Unassigned'}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {caseItem.assigned_to_role || ''}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatDate(caseItem.created_at)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={calculateProgress(caseItem.current_state)}
                                                    sx={{
                                                        width: 80,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: '#f0f0f0',
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: getStateColor(caseItem.current_state)
                                                        }
                                                    }}
                                                />
                                                <Typography variant="caption" sx={{ minWidth: 35 }}>
                                                    {Math.round(calculateProgress(caseItem.current_state))}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => fetchCaseDetails(caseItem.case_number)}
                                                    >
                                                        <ViewIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="View Timeline">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => fetchCaseTimeline(caseItem.case_number)}
                                                    >
                                                        <TimelineIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {cases[selectedState]?.length === 0 && !loading && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            No cases found in {caseStates.find(s => s.value === selectedState)?.label} state.
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Case Details Dialog */}
            <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        📋
                    </Box>
                    <Box>
                        <Typography variant="h6">Case Details</Typography>
                        {selectedCase && (
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {selectedCase.case_number} - {selectedCase.project_name}
                            </Typography>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {selectedCase && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2">Case Number</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{selectedCase.case_number}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2">Current State</Typography>
                                <Chip
                                    label={selectedCase.current_state.toUpperCase()}
                                    sx={{
                                        backgroundColor: getStateColor(selectedCase.current_state),
                                        color: 'white',
                                        mb: 2
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2">Client</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{selectedCase.client_name}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2">Project</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{selectedCase.project_name}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Description</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{selectedCase.description}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Progress</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={calculateProgress(selectedCase.current_state)}
                                    sx={{ height: 8, mb: 1 }}
                                />
                                <Typography variant="caption">
                                    {Math.round(calculateProgress(selectedCase.current_state))}% Complete
                                </Typography>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => fetchCaseTimeline(selectedCase?.case_number)} startIcon={<TimelineIcon />}>
                        View Timeline
                    </Button>
                    <Button onClick={() => setDetailsDialog(false)} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* State Transition Dialog */}
            <Dialog
                open={transitionDialog}
                onClose={() => !loading && setTransitionDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {selectedCase?.current_state === 'closed'
                        ? 'Case Already Closed'
                        : `Transition Case to ${nextStateMap[selectedCase?.current_state] || 'Next State'}`}
                </DialogTitle>
                <DialogContent>
                    {selectedCase && selectedCase.current_state !== 'closed' ? (
                        <Box sx={{ mt: 2 }}>
                            <Box display="flex" alignItems="center" mb={3}>
                                <Box flexGrow={1}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={calculateProgress(selectedCase.current_state)}
                                    />
                                </Box>
                                <Box ml={2}>
                                    <Typography variant="caption">
                                        {Math.round(calculateProgress(selectedCase.current_state))}% Complete
                                    </Typography>
                                </Box>
                            </Box>

                            <Box mb={3}>
                                <Typography variant="subtitle2" color="textSecondary">Current State:</Typography>
                                <Chip
                                    label={selectedCase.current_state.toUpperCase()}
                                    size="medium"
                                    sx={{
                                        backgroundColor: getStateColor(selectedCase.current_state),
                                        color: 'white',
                                        my: 1,
                                        fontSize: '0.9rem',
                                        height: '32px'
                                    }}
                                />

                                <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2, mb: 1 }}>
                                    Next State:
                                </Typography>
                                <Chip
                                    label={(nextStateMap[selectedCase.current_state] || 'COMPLETED').toUpperCase()}
                                    size="medium"
                                    sx={{
                                        backgroundColor: getStateColor(nextStateMap[selectedCase.current_state] || 'closed'),
                                        color: 'white',
                                        my: 1,
                                        fontSize: '0.9rem',
                                        height: '32px'
                                    }}
                                />
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Transition Notes"
                                variant="outlined"
                                margin="normal"
                                value={transitionNotes}
                                onChange={(e) => setTransitionNotes(e.target.value)}
                                placeholder="Add any notes about this transition..."
                                disabled={loading}
                            />

                            {apiError && (
                                <Box mt={2}>
                                    <Alert severity="error">{apiError}</Alert>
                                </Box>
                            )}
                        </Box>
                    ) : selectedCase?.current_state === 'closed' ? (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                This case is already closed.
                            </Typography>
                            <Typography variant="body2">
                                No further transitions are possible for closed cases.
                            </Typography>
                        </Alert>
                    ) : (
                        <Typography>Loading case details...</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setTransitionDialog(false)}
                        color="primary"
                        disabled={loading}
                    >
                        {selectedCase?.current_state === 'closed' ? 'Close' : 'Cancel'}
                    </Button>
                    {selectedCase?.current_state !== 'closed' && (
                        <Button
                            onClick={() => handleStateTransition(
                                selectedCase.case_number,
                                nextStateMap[selectedCase.current_state],
                                transitionNotes
                            )}
                            color="primary"
                            variant="contained"
                            disabled={loading || !selectedCase}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'Transitioning...' : `Move to ${nextStateMap[selectedCase?.current_state] || 'Next'}`}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Timeline Dialog */}
            <Dialog open={timelineDialog} onClose={() => setTimelineDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Case Timeline</DialogTitle>
                <DialogContent>
                    {caseTimeline.map((event, index) => (
                        <Box key={index} sx={{ mb: 3, pb: 2, borderBottom: index < caseTimeline.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Chip
                                    label={event.state.toUpperCase()}
                                    size="small"
                                    sx={{
                                        backgroundColor: getStateColor(event.state),
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Typography variant="body2" color="textSecondary">
                                    {formatDate(event.created_at)}
                                </Typography>
                            </Box>
                            {event.notes && (
                                <Typography variant="body2" sx={{ ml: 2, fontStyle: 'italic' }}>
                                    "{event.notes}"
                                </Typography>
                            )}
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTimelineDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CaseDashboard;
