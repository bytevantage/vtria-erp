import React, { useState, useEffect } from 'react';
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
    IconButton,
    Button,
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
    LinearProgress,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    PlayArrow as StartIcon,
    Pause as PauseIcon,
    CheckCircle as CompleteIcon,
    Assignment as TaskIcon,
    Build as WorkIcon,
    Schedule as TimeIcon,
    Warning as IssueIcon,
    Add as AddIcon,
    Camera as PhotoIcon
} from '@mui/icons-material';
import axios from 'axios';

const TechnicianDashboard = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [dashboardData, setDashboardData] = useState({
        assignedJobs: [],
        pendingTasks: [],
        todayWorkLogs: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dialog states
    const [workLogDialogOpen, setWorkLogDialogOpen] = useState(false);
    const [taskUpdateDialogOpen, setTaskUpdateDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Form data
    const [workLogForm, setWorkLogForm] = useState({
        job_id: '',
        task_id: '',
        work_description: '',
        hours_worked: '',
        issues_encountered: '',
        materials_used: []
    });

    const [taskUpdateForm, setTaskUpdateForm] = useState({
        status: '',
        notes: '',
        actual_hours: ''
    });

    const API_BASE_URL = '';

    useEffect(() => {
        fetchDashboardData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/manufacturing-workflow/technician/dashboard`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setDashboardData(response.data.data);
        } catch (err) {
            setError('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleTaskStatusUpdate = async () => {
        try {
            await axios.put(`${API_BASE_URL}/api/manufacturing-workflow/tasks/${selectedTask.id}/status`,
                taskUpdateForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setTaskUpdateDialogOpen(false);
            setSelectedTask(null);
            setTaskUpdateForm({ status: '', notes: '', actual_hours: '' });
            fetchDashboardData();
        } catch (err) {
            setError('Failed to update task status');
        }
    };

    const handleAddWorkLog = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/manufacturing-workflow/jobs/${workLogForm.job_id}/work-logs`,
                workLogForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setWorkLogDialogOpen(false);
            setWorkLogForm({
                job_id: '',
                task_id: '',
                work_description: '',
                hours_worked: '',
                issues_encountered: '',
                materials_used: []
            });
            fetchDashboardData();
        } catch (err) {
            setError('Failed to add work log');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'in_progress': return 'info';
            case 'completed': return 'success';
            case 'on_hold': return 'default';
            case 'cancelled': return 'error';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'error';
            case 'high': return 'warning';
            case 'normal': return 'info';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    const JobCard = ({ job }) => (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" component="div">
                            {job.job_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {job.job_number} • {job.client_name}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={job.status}
                            color={getStatusColor(job.status)}
                            size="small"
                        />
                        <Chip
                            label={job.priority}
                            color={getPriorityColor(job.priority)}
                            size="small"
                        />
                    </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Progress: {job.completed_tasks || 0} / {job.total_tasks || 0} tasks
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={job.total_tasks ? (job.completed_tasks / job.total_tasks) * 100 : 0}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Due: {new Date(job.due_date).toLocaleDateString('en-IN')}
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setWorkLogForm({ ...workLogForm, job_id: job.id });
                            setWorkLogDialogOpen(true);
                        }}
                    >
                        Log Work
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );

    const TaskUpdateDialog = () => (
        <Dialog open={taskUpdateDialogOpen} onClose={() => setTaskUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Update Task Status</DialogTitle>
            <DialogContent>
                {selectedTask && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            {selectedTask.task_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {selectedTask.job_title} ({selectedTask.job_number})
                        </Typography>

                        <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={taskUpdateForm.status}
                                        onChange={(e) => setTaskUpdateForm({ ...taskUpdateForm, status: e.target.value })}
                                    >
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="in_progress">In Progress</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                        <MenuItem value="on_hold">On Hold</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Actual Hours"
                                    type="number"
                                    value={taskUpdateForm.actual_hours}
                                    onChange={(e) => setTaskUpdateForm({ ...taskUpdateForm, actual_hours: e.target.value })}
                                    inputProps={{ step: 0.5, min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Notes"
                                    multiline
                                    rows={3}
                                    value={taskUpdateForm.notes}
                                    onChange={(e) => setTaskUpdateForm({ ...taskUpdateForm, notes: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setTaskUpdateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleTaskStatusUpdate} variant="contained">
                    Update Task
                </Button>
            </DialogActions>
        </Dialog>
    );

    const WorkLogDialog = () => (
        <Dialog open={workLogDialogOpen} onClose={() => setWorkLogDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Add Work Log</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Hours Worked"
                            type="number"
                            value={workLogForm.hours_worked}
                            onChange={(e) => setWorkLogForm({ ...workLogForm, hours_worked: e.target.value })}
                            inputProps={{ step: 0.5, min: 0 }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Work Description"
                            multiline
                            rows={4}
                            value={workLogForm.work_description}
                            onChange={(e) => setWorkLogForm({ ...workLogForm, work_description: e.target.value })}
                            placeholder="Describe the work performed..."
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Issues Encountered"
                            multiline
                            rows={3}
                            value={workLogForm.issues_encountered}
                            onChange={(e) => setWorkLogForm({ ...workLogForm, issues_encountered: e.target.value })}
                            placeholder="Any problems or issues faced (optional)..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setWorkLogDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddWorkLog} variant="contained">
                    Add Work Log
                </Button>
            </DialogActions>
        </Dialog>
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Technician Dashboard
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="My Jobs" />
                <Tab label="Pending Tasks" />
                <Tab label="Today's Work" />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Typography variant="h6" gutterBottom>
                            Assigned Jobs ({dashboardData.assignedJobs.length})
                        </Typography>
                        {dashboardData.assignedJobs.length === 0 ? (
                            <Card>
                                <CardContent>
                                    <Typography variant="body1" color="text.secondary" align="center">
                                        No jobs assigned currently
                                    </Typography>
                                </CardContent>
                            </Card>
                        ) : (
                            dashboardData.assignedJobs.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))
                        )}
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Quick Stats
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <TaskIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography variant="body1">
                                        {dashboardData.assignedJobs.length} Active Jobs
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <WorkIcon sx={{ mr: 1, color: 'warning.main' }} />
                                    <Typography variant="body1">
                                        {dashboardData.pendingTasks.length} Pending Tasks
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <TimeIcon sx={{ mr: 1, color: 'info.main' }} />
                                    <Typography variant="body1">
                                        {dashboardData.todayWorkLogs.length} Work Logs Today
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {activeTab === 1 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Task</TableCell>
                                <TableCell>Job</TableCell>
                                <TableCell>Client</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Est. Hours</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dashboardData.pendingTasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {task.task_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {task.job_title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {task.job_number}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{task.client_name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={task.status}
                                            color={getStatusColor(task.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{task.estimated_hours}h</TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            title="Update Status"
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setTaskUpdateForm({
                                                    status: task.status,
                                                    notes: task.notes || '',
                                                    actual_hours: task.actual_hours || ''
                                                });
                                                setTaskUpdateDialogOpen(true);
                                            }}
                                        >
                                            <CompleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {activeTab === 2 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Today's Work Logs
                        </Typography>
                        {dashboardData.todayWorkLogs.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" align="center">
                                No work logs recorded today
                            </Typography>
                        ) : (
                            <List>
                                {dashboardData.todayWorkLogs.map((log, index) => (
                                    <React.Fragment key={log.id}>
                                        <ListItem>
                                            <ListItemIcon>
                                                <WorkIcon />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={`${log.job_title} (${log.job_number})`}
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {log.work_description}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {log.hours_worked}h • {new Date(log.log_date).toLocaleTimeString('en-IN')}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < dashboardData.todayWorkLogs.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </CardContent>
                </Card>
            )}

            <TaskUpdateDialog />
            <WorkLogDialog />
        </Box>
    );
};

export default TechnicianDashboard;
