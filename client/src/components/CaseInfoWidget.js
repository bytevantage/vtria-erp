import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
    Divider,
    Grid,
    Alert
} from '@mui/material';
import {
    Timeline as TimelineIcon,
    ArrowForward as TransitionIcon,
    Visibility as ViewIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const CaseInfoWidget = ({ enquiryId, onCaseUpdate }) => {
    const [caseInfo, setCaseInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timelineDialog, setTimelineDialog] = useState(false);
    const [transitionDialog, setTransitionDialog] = useState(false);
    const [timeline, setTimeline] = useState([]);
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
        if (enquiryId) {
            fetchCaseInfo();
        }
    }, [enquiryId]);

    const fetchCaseInfo = async () => {
        if (!enquiryId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/search/query?q=${enquiryId}`);
            
            if (response.data.success && response.data.data.length > 0) {
                setCaseInfo(response.data.data[0]);
            } else {
                setCaseInfo(null);
            }
        } catch (error) {
            console.error('Error fetching case info:', error);
            setError('Failed to load case information');
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async () => {
        if (!caseInfo) return;
        
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-management/${caseInfo.case_number}/timeline`);
            if (response.data.success) {
                setTimeline(response.data.data);
                setTimelineDialog(true);
            }
        } catch (error) {
            console.error('Error fetching timeline:', error);
        }
    };

    const handleStateTransition = async () => {
        if (!caseInfo || !nextStateMap[caseInfo.current_state]) return;
        
        try {
            await axios.put(`${API_BASE_URL}/api/case-management/${caseInfo.case_number}/transition`, {
                new_state: nextStateMap[caseInfo.current_state],
                notes: transitionNotes
            });
            
            await fetchCaseInfo();
            setTransitionDialog(false);
            setTransitionNotes('');
            
            if (onCaseUpdate) {
                onCaseUpdate(caseInfo.case_number, nextStateMap[caseInfo.current_state]);
            }
        } catch (error) {
            console.error('Error transitioning case state:', error);
            setError('Failed to transition case state');
        }
    };

    const getStateColor = (state) => {
        const stateConfig = caseStates.find(s => s.value === state);
        return stateConfig ? stateConfig.color : '#666';
    };

    const calculateProgress = (currentState) => {
        const stateIndex = caseStates.findIndex(s => s.value === currentState);
        return ((stateIndex + 1) / caseStates.length) * 100;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!enquiryId) {
        return null;
    }

    if (loading) {
        return (
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6">Loading Case Information...</Typography>
                        <LinearProgress sx={{ flexGrow: 1 }} />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Alert severity="error" action={
                        <IconButton size="small" onClick={fetchCaseInfo}>
                            <RefreshIcon />
                        </IconButton>
                    }>
                        {error}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!caseInfo) {
        return (
            <Card sx={{ mb: 2, border: '2px dashed #e0e0e0' }}>
                <CardContent>
                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                        No case tracking information available for this enquiry
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card sx={{ mb: 2, border: `2px solid ${getStateColor(caseInfo.current_state)}20` }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                📋 Case Tracking
                                <Chip
                                    label={caseInfo.case_number}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: getStateColor(caseInfo.current_state),
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                End-to-end project tracking
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Timeline">
                                <IconButton size="small" onClick={fetchTimeline}>
                                    <TimelineIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Refresh">
                                <IconButton size="small" onClick={fetchCaseInfo}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" sx={{ minWidth: 80 }}>
                                    Current State:
                                </Typography>
                                <Chip
                                    label={caseInfo.current_state.toUpperCase()}
                                    sx={{ 
                                        backgroundColor: getStateColor(caseInfo.current_state),
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" sx={{ minWidth: 60 }}>
                                    Progress:
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={calculateProgress(caseInfo.current_state)}
                                    sx={{ 
                                        flexGrow: 1, 
                                        height: 8, 
                                        borderRadius: 4,
                                        backgroundColor: '#f0f0f0',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: getStateColor(caseInfo.current_state)
                                        }
                                    }}
                                />
                                <Typography variant="caption" sx={{ minWidth: 35 }}>
                                    {Math.round(calculateProgress(caseInfo.current_state))}%
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    {nextStateMap[caseInfo.current_state] && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="textSecondary">
                                    Ready to move to: <strong>{nextStateMap[caseInfo.current_state].toUpperCase()}</strong>
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<TransitionIcon />}
                                    onClick={() => setTransitionDialog(true)}
                                    sx={{ 
                                        borderColor: getStateColor(nextStateMap[caseInfo.current_state]),
                                        color: getStateColor(nextStateMap[caseInfo.current_state])
                                    }}
                                >
                                    Advance State
                                </Button>
                            </Box>
                        </>
                    )}

                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f0f0f0' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">
                                    Created: {formatDate(caseInfo.created_at)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">
                                    Updated: {formatDate(caseInfo.updated_at)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                </CardContent>
            </Card>

            {/* Timeline Dialog */}
            <Dialog open={timelineDialog} onClose={() => setTimelineDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Case Timeline - {caseInfo.case_number}</DialogTitle>
                <DialogContent>
                    {timeline.map((event, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                                <Typography variant="body2" sx={{ mt: 1, ml: 2 }}>
                                    {event.notes}
                                </Typography>
                            )}
                            {index < timeline.length - 1 && <Divider sx={{ mt: 2 }} />}
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTimelineDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* State Transition Dialog */}
            <Dialog open={transitionDialog} onClose={() => setTransitionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Advance Case State</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Move case <strong>{caseInfo.case_number}</strong> from{' '}
                            <Chip 
                                label={caseInfo.current_state.toUpperCase()} 
                                size="small" 
                                sx={{ 
                                    backgroundColor: getStateColor(caseInfo.current_state),
                                    color: 'white',
                                    mx: 1
                                }} 
                            /> to{' '}
                            <Chip 
                                label={nextStateMap[caseInfo.current_state]?.toUpperCase()} 
                                size="small" 
                                sx={{ 
                                    backgroundColor: getStateColor(nextStateMap[caseInfo.current_state]),
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransitionDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleStateTransition}
                        sx={{ 
                            backgroundColor: getStateColor(nextStateMap[caseInfo.current_state]),
                            '&:hover': {
                                backgroundColor: getStateColor(nextStateMap[caseInfo.current_state]) + 'dd'
                            }
                        }}
                    >
                        Confirm Transition
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default CaseInfoWidget;
