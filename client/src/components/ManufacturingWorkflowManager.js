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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Visibility as ViewIcon,
    Assignment as TaskIcon,
    Build as WorkIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CompleteIcon,
    Warning as WarningIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import axios from 'axios';

const ManufacturingWorkflowManager = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dialog states
    const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
    const [jobDetailsDialogOpen, setJobDetailsDialogOpen] = useState(false);

    // Form data
    const [jobForm, setJobForm] = useState({
        sales_order_id: '',
        job_title: '',
        description: '',
        assigned_technician_id: '',
        priority: 'normal',
        estimated_hours: '',
        start_date: '',
        due_date: '',
        tasks: [],
        materials: []
    });

    const API_BASE_URL = '';

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/manufacturing-workflow/jobs`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setJobs(response.data.data);
        } catch (err) {
            setError('Failed to fetch manufacturing jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleEditJob = (job) => {
        console.log('Editing job:', job);
        // Add edit functionality here
    };

    const fetchJobDetails = async (jobId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/manufacturing-workflow/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setSelectedJob(response.data.data);
            setJobDetailsDialogOpen(true);
        } catch (err) {
            setError('Failed to fetch job details');
        }
    };

    const handleCreateJob = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/manufacturing-workflow/jobs`, jobForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setCreateJobDialogOpen(false);
            setJobForm({
                sales_order_id: '',
                job_title: '',
                description: '',
                assigned_technician_id: '',
                priority: 'normal',
                estimated_hours: '',
                start_date: '',
                due_date: '',
                tasks: [],
                materials: []
            });

            fetchJobs();
        } catch (err) {
            setError('Failed to create manufacturing job');
        }
    };

    const addTask = () => {
        setJobForm({
            ...jobForm,
            tasks: [...jobForm.tasks, {
                task_name: '',
                description: '',
                estimated_hours: '',
                assigned_to: jobForm.assigned_technician_id
            }]
        });
    };

    const updateTask = (index, field, value) => {
        const updatedTasks = [...jobForm.tasks];
        updatedTasks[index][field] = value;
        setJobForm({ ...jobForm, tasks: updatedTasks });
    };

    const removeTask = (index) => {
        const updatedTasks = jobForm.tasks.filter((_, i) => i !== index);
        setJobForm({ ...jobForm, tasks: updatedTasks });
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
                        <Typography variant="body2" color="text.secondary">
                            Technician: {job.technician_name}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
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
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Progress: {job.completed_tasks || 0} / {job.total_tasks || 0} tasks ({job.progress_percentage || 0}%)
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={job.progress_percentage || 0}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Due: {new Date(job.due_date).toLocaleDateString('en-IN')}
                    </Typography>
                    <Box>
                        <IconButton
                            size="small"
                            title="View Details"
                            onClick={() => fetchJobDetails(job.id)}
                        >
                            <ViewIcon />
                        </IconButton>
                        <IconButton size="small" title="Edit" onClick={() => handleEditJob(job)}>
                            <EditIcon />
                        </IconButton>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    const CreateJobDialog = () => (
        <Dialog open={createJobDialogOpen} onClose={() => setCreateJobDialogOpen(false)} maxWidth="lg" fullWidth>
            <DialogTitle>Create Manufacturing Job</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Job Title"
                            value={jobForm.job_title}
                            onChange={(e) => setJobForm({ ...jobForm, job_title: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Sales Order ID"
                            value={jobForm.sales_order_id}
                            onChange={(e) => setJobForm({ ...jobForm, sales_order_id: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={jobForm.priority}
                                onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="normal">Normal</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Estimated Hours"
                            type="number"
                            value={jobForm.estimated_hours}
                            onChange={(e) => setJobForm({ ...jobForm, estimated_hours: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Start Date"
                            type="date"
                            value={jobForm.start_date}
                            onChange={(e) => setJobForm({ ...jobForm, start_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Due Date"
                            type="date"
                            value={jobForm.due_date}
                            onChange={(e) => setJobForm({ ...jobForm, due_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={3}
                            value={jobForm.description}
                            onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                        />
                    </Grid>

                    {/* Tasks Section */}
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Tasks</Typography>
                            <Button startIcon={<AddIcon />} onClick={addTask}>
                                Add Task
                            </Button>
                        </Box>

                        {jobForm.tasks.map((task, index) => (
                            <Card key={index} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Task Name"
                                                value={task.task_name}
                                                onChange={(e) => updateTask(index, 'task_name', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <TextField
                                                fullWidth
                                                label="Estimated Hours"
                                                type="number"
                                                value={task.estimated_hours}
                                                onChange={(e) => updateTask(index, 'estimated_hours', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Button
                                                color="error"
                                                onClick={() => removeTask(index)}
                                                fullWidth
                                            >
                                                Remove
                                            </Button>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Task Description"
                                                multiline
                                                rows={2}
                                                value={task.description}
                                                onChange={(e) => updateTask(index, 'description', e.target.value)}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        ))}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setCreateJobDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateJob} variant="contained">
                    Create Job
                </Button>
            </DialogActions>
        </Dialog>
    );

    const JobDetailsDialog = () => (
        <Dialog open={jobDetailsDialogOpen} onClose={() => setJobDetailsDialogOpen(false)} maxWidth="lg" fullWidth>
            <DialogTitle>
                {selectedJob?.job.job_title} ({selectedJob?.job.job_number})
            </DialogTitle>
            <DialogContent>
                {selectedJob && (
                    <Box>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.secondary">Client</Typography>
                                <Typography variant="body1">{selectedJob.job.client_name}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.secondary">Technician</Typography>
                                <Typography variant="body1">{selectedJob.job.technician_name}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.secondary">Status</Typography>
                                <Chip
                                    label={selectedJob.job.status}
                                    color={getStatusColor(selectedJob.job.status)}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.secondary">Priority</Typography>
                                <Chip
                                    label={selectedJob.job.priority}
                                    color={getPriorityColor(selectedJob.job.priority)}
                                    size="small"
                                />
                            </Grid>
                        </Grid>

                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">Tasks ({selectedJob.tasks.length})</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Task</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Est. Hours</TableCell>
                                                <TableCell>Actual Hours</TableCell>
                                                <TableCell>Assigned To</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedJob.tasks.map((task) => (
                                                <TableRow key={task.id}>
                                                    <TableCell>{task.task_name}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={task.status}
                                                            color={getStatusColor(task.status)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{task.estimated_hours}h</TableCell>
                                                    <TableCell>{task.actual_hours || 0}h</TableCell>
                                                    <TableCell>{task.assigned_to_name}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">Materials ({selectedJob.materials.length})</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Material</TableCell>
                                                <TableCell>Required</TableCell>
                                                <TableCell>Available</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedJob.materials.map((material) => (
                                                <TableRow key={material.id}>
                                                    <TableCell>{material.material_name}</TableCell>
                                                    <TableCell>{material.required_quantity}</TableCell>
                                                    <TableCell>{material.available_stock || 0}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={material.availability_status}
                                                            color={material.availability_status === 'available' ? 'success' : 'warning'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">Work Logs ({selectedJob.workLogs.length})</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <List>
                                    {selectedJob.workLogs.map((log, index) => (
                                        <React.Fragment key={log.id}>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <WorkIcon />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={log.work_description}
                                                    secondary={
                                                        <Box>
                                                            <Typography variant="caption">
                                                                {log.technician_name} • {log.hours_worked}h • {new Date(log.log_date).toLocaleString('en-IN')}
                                                            </Typography>
                                                            {log.issues_encountered && (
                                                                <Typography variant="body2" color="warning.main">
                                                                    Issues: {log.issues_encountered}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < selectedJob.workLogs.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setJobDetailsDialogOpen(false)}>Close</Button>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Manufacturing Workflow
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateJobDialogOpen(true)}
                >
                    Create Job
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="All Jobs" />
                <Tab label="In Progress" />
                <Tab label="Completed" />
            </Tabs>

            <Grid container spacing={3}>
                {jobs
                    .filter(job => {
                        if (activeTab === 1) return job.status === 'in_progress';
                        if (activeTab === 2) return job.status === 'completed';
                        return true;
                    })
                    .map((job) => (
                        <Grid item xs={12} md={6} lg={4} key={job.id}>
                            <JobCard job={job} />
                        </Grid>
                    ))}
            </Grid>

            <CreateJobDialog />
            <JobDetailsDialog />
        </Box>
    );
};

export default ManufacturingWorkflowManager;
