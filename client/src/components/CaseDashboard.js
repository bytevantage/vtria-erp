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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CaseDashboard = () => {
    const [cases, setCases] = useState({});
    const [selectedState, setSelectedState] = useState('enquiry');
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState({});
    const [selectedCase, setSelectedCase] = useState(null);
    const [detailsDialog, setDetailsDialog] = useState(false);
    const [transitionDialog, setTransitionDialog] = useState(false);
    const [timelineDialog, setTimelineDialog] = useState(false);
    const [caseTimeline, setCaseTimeline] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [transitionNotes, setTransitionNotes] = useState('');

    const caseStates = [
        { value: 'enquiry', label: 'Enquiry', color: '#2196F3' },
        { value: 'estimation', label: 'Estimation', color: '#FF9800' },
        { value: 'quotation', label: 'Quotation', color: '#9C27B0' },
        { value: 'order', label: 'Order', color: '#4CAF50' },
        { value: 'production', label: 'Production', color: '#FF5722' },
        { value: 'delivery', label: 'Delivery', color: '#795548' },
        { value: 'closed', label: 'Closed', color: '#607D8B' }
    ];

    const nextStateMap = {
        'enquiry': 'estimation',
        'estimation': 'quotation',
        'quotation': 'order',
        'order': 'production',
        'production': 'delivery',
        'delivery': 'closed'
    };

    useEffect(() => {
        fetchStatistics();
        fetchCasesByState(selectedState);
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

    const fetchCaseDetails = async (caseNumber) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/${caseNumber}`);
            setSelectedCase(response.data.data);
            setDetailsDialog(true);
        } catch (error) {
            console.error('Error fetching case details:', error);
        }
    };

    const fetchCaseTimeline = async (caseNumber) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/${caseNumber}/timeline`);
            setCaseTimeline(response.data.data);
            setTimelineDialog(true);
        } catch (error) {
            console.error('Error fetching case timeline:', error);
        }
    };

    const handleStateTransition = async (caseNumber, newState, notes = '') => {
        try {
            await axios.put(`${API_BASE_URL}/api/case-management/${caseNumber}/transition`, {
                new_state: newState,
                notes
            });
            
            fetchCasesByState(selectedState);
            fetchStatistics();
            setTransitionDialog(false);
            setSelectedCase(null);
            setTransitionNotes('');
        } catch (error) {
            console.error('Error transitioning case state:', error);
        }
    };

    const searchCases = async () => {
        if (!searchQuery.trim()) return;
        
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/search/query`, {
                params: { q: searchQuery }
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
        const stateIndex = caseStates.findIndex(s => s.value === currentState);
        return ((stateIndex + 1) / caseStates.length) * 100;
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
                        fetchStatistics();
                        fetchCasesByState(selectedState);
                    }}
                >
                    Refresh
                </Button>
            </Box>

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
                                                onClick={() => fetchCaseDetails(caseItem.case_number)}
                                            >
                                                {caseItem.case_number}
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
                                                    {caseItem.case_owner_name || 'Unassigned'}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {caseItem.case_owner_role || ''}
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
                                                {nextStateMap[caseItem.current_state] && (
                                                    <Tooltip title={`Move to ${nextStateMap[caseItem.current_state]}`}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedCase(caseItem);
                                                                setTransitionDialog(true);
                                                            }}
                                                        >
                                                            <TransitionIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
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
            <Dialog open={transitionDialog} onClose={() => setTransitionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Advance Case State</DialogTitle>
                <DialogContent>
                    {selectedCase && (
                        <Box sx={{ pt: 1 }}>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                Move case <strong>{selectedCase.case_number}</strong> from{' '}
                                <Chip 
                                    label={selectedCase.current_state.toUpperCase()} 
                                    size="small" 
                                    sx={{ 
                                        backgroundColor: getStateColor(selectedCase.current_state),
                                        color: 'white',
                                        mx: 1
                                    }} 
                                /> to{' '}
                                <Chip 
                                    label={nextStateMap[selectedCase.current_state]?.toUpperCase()} 
                                    size="small" 
                                    sx={{ 
                                        backgroundColor: getStateColor(nextStateMap[selectedCase.current_state]),
                                        color: 'white',
                                        mx: 1
                                    }} 
                                />
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Transition Notes (Optional)"
                                placeholder="Add any notes about this state transition..."
                                value={transitionNotes}
                                onChange={(e) => setTransitionNotes(e.target.value)}
                                sx={{ mt: 2 }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransitionDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => selectedCase && handleStateTransition(
                            selectedCase.case_number,
                            nextStateMap[selectedCase.current_state],
                            transitionNotes
                        )}
                        sx={{ 
                            backgroundColor: selectedCase ? getStateColor(nextStateMap[selectedCase.current_state]) : undefined,
                            '&:hover': {
                                backgroundColor: selectedCase ? getStateColor(nextStateMap[selectedCase.current_state]) + 'dd' : undefined
                            }
                        }}
                    >
                        Confirm Transition
                    </Button>
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
