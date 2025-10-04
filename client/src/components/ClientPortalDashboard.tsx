import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Tabs,
  Tab,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  CheckCircle,
  Schedule,
  Warning,
  Refresh,
  Comment,
  Approval,
  Notifications,
  Assessment,
  Assignment
} from '@mui/icons-material';

interface ClientPortalDashboardProps {
  clientId: number;
  clientPortalUserId: number;
}

interface Milestone {
  id: number;
  milestone_name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progress_percentage: number;
  planned_end_date: string;
  actual_end_date?: string;
  is_critical_path: boolean;
  is_overdue: boolean;
  requires_client_approval: boolean;
  client_approval_received: boolean;
  latest_update?: string;
  latest_update_time?: string;
}

interface CaseData {
  id: number;
  case_number: string;
  project_name: string;
  status: string;
  overall_progress: number;
  total_milestones: number;
  completed_milestones: number;
}

interface DashboardData {
  cases_summary: {
    total_cases: number;
    active_cases: number;
    completed_cases: number;
  };
  milestones_summary: {
    total_milestones: number;
    completed_milestones: number;
    avg_progress: number;
  };
  recent_activities: any[];
  upcoming_milestones: Milestone[];
  pending_approvals: Milestone[];
}

const ClientPortalDashboard: React.FC<ClientPortalDashboardProps> = ({
  clientId,
  clientPortalUserId
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [liveData, setLiveData] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    milestone: Milestone | null;
  }>({ open: false, milestone: null });
  const [approvalNotes, setApprovalNotes] = useState('');

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    fetchCases();
  }, [clientId]);

  // Auto-refresh live data every 2 minutes (optimized for performance)
  useEffect(() => {
    if (selectedCase) {
      fetchLiveProgress();
      const interval = setInterval(fetchLiveProgress, 120000);
      return () => clearInterval(interval);
    }
  }, [selectedCase]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/client-portal/dashboard/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await fetch(`/api/client-portal/cases/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setCases(data.data);
        if (data.data.length > 0 && !selectedCase) {
          setSelectedCase(data.data[0].case_number);
        }
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveProgress = async () => {
    if (!selectedCase) return;

    try {
      const response = await fetch(`/api/client-portal/progress/${encodeURIComponent(selectedCase)}/live`);
      const data = await response.json();
      if (data.success) {
        setLiveData(data.data);
        setMilestones(data.data.milestones);
      }
    } catch (error) {
      console.error('Error fetching live progress:', error);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!approvalDialog.milestone) return;

    try {
      const response = await fetch(`/api/client-portal/milestones/${approvalDialog.milestone.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_notes: approvalNotes,
          client_portal_user_id: clientPortalUserId
        })
      });

      const data = await response.json();
      if (data.success) {
        setApprovalDialog({ open: false, milestone: null });
        setApprovalNotes('');
        fetchLiveProgress(); // Refresh data
      }
    } catch (error) {
      console.error('Error approving milestone:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'blocked': return 'error';
      case 'not_started': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (milestone: Milestone) => {
    if (milestone.status === 'completed') return <CheckCircle color="success" />;
    if (milestone.is_overdue) return <Warning color="error" />;
    if (milestone.status === 'in_progress') return <Schedule color="primary" />;
    return <Schedule color="disabled" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading client portal...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Project Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchLiveProgress}
          >
            Refresh
          </Button>
          <Badge badgeContent={dashboardData?.pending_approvals?.length || 0} color="error">
            <IconButton>
              <Notifications />
            </IconButton>
          </Badge>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Projects
              </Typography>
              <Typography variant="h4">
                {dashboardData?.cases_summary?.active_cases || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Milestones
              </Typography>
              <Typography variant="h4">
                {dashboardData?.milestones_summary?.total_milestones || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed Milestones
              </Typography>
              <Typography variant="h4">
                {dashboardData?.milestones_summary?.completed_milestones || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Approvals
              </Typography>
              <Typography variant="h4" color="error">
                {dashboardData?.pending_approvals?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="Live Progress" icon={<Assessment />} />
          <Tab label="Project Timeline" icon={<Timeline />} />
          <Tab label="Pending Approvals" icon={<Approval />} />
          <Tab label="Communications" icon={<Comment />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          {/* Case Selection */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select Project
                </Typography>
                <List>
                  {cases.map((caseItem) => (
                    <ListItem
                      key={caseItem.case_number}
                      button
                      selected={selectedCase === caseItem.case_number}
                      onClick={() => setSelectedCase(caseItem.case_number)}
                    >
                      <ListItemText
                        primary={caseItem.project_name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {caseItem.case_number}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={caseItem.overall_progress || 0}
                              sx={{ mt: 1 }}
                            />
                            <Typography variant="caption">
                              {Math.round(caseItem.overall_progress || 0)}% Complete
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Live Progress */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Live Progress - {selectedCase}
                  </Typography>
                  <Typography variant="caption">
                    Last updated: {liveData?.last_updated ? new Date(liveData.last_updated).toLocaleTimeString() : 'Never'}
                  </Typography>
                </Box>

                {liveData && (
                  <Box mb={3}>
                    <Typography variant="body2" gutterBottom>
                      Overall Progress: {liveData.live_stats.completion_percentage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={liveData.live_stats.completion_percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                {/* Milestones List */}
                <List>
                  {milestones.map((milestone) => (
                    <ListItem key={milestone.id} divider>
                      <Avatar sx={{ mr: 2 }}>
                        {getStatusIcon(milestone)}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {milestone.milestone_name}
                            </Typography>
                            {milestone.is_critical_path && (
                              <Chip label="Critical" size="small" color="warning" />
                            )}
                            {milestone.requires_client_approval && !milestone.client_approval_received && (
                              <Chip label="Needs Approval" size="small" color="error" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Status: <Chip
                                label={milestone.status.replace('_', ' ')}
                                size="small"
                                color={getStatusColor(milestone.status)}
                              />
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={milestone.progress_percentage}
                              sx={{ mt: 1, mb: 1 }}
                            />
                            <Typography variant="caption">
                              Progress: {milestone.progress_percentage}% |
                              Due: {new Date(milestone.planned_end_date).toLocaleDateString()}
                            </Typography>
                            {milestone.latest_update && (
                              <Typography variant="caption" display="block" color="textSecondary">
                                Latest: {milestone.latest_update}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      {milestone.requires_client_approval && !milestone.client_approval_received && milestone.status === 'completed' && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<Approval />}
                          onClick={() => setApprovalDialog({ open: true, milestone })}
                        >
                          Approve
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Approvals
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Milestone</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.pending_approvals?.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell>{milestone.milestone_name}</TableCell>
                      <TableCell>{selectedCase}</TableCell>
                      <TableCell>{new Date(milestone.planned_end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => setApprovalDialog({ open: true, milestone })}
                        >
                          Review & Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialog.open}
        onClose={() => setApprovalDialog({ open: false, milestone: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Approve Milestone: {approvalDialog.milestone?.milestone_name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Please review the milestone deliverables and provide your approval.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Approval Notes"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Add any comments or feedback..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false, milestone: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleApprovalSubmit}
            variant="contained"
            color="primary"
            disabled={!approvalNotes.trim()}
          >
            Approve Milestone
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientPortalDashboard;