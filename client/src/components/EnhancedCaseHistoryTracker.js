import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
// Removed Timeline import to avoid @mui/lab dependency issues
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedCaseHistoryTracker = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedCase, setSelectedCase] = useState('');
  const [caseAuditTrail, setCaseAuditTrail] = useState([]);
  const [caseScopeChanges, setCaseScopeChanges] = useState([]);
  const [auditDashboard, setAuditDashboard] = useState({
    activity_counts: [],
    scope_summary: [],
    pending_approvals: 0,
    top_users: []
  });
  const [highValueChanges, setHighValueChanges] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, auditId: null, action: '' });

  useEffect(() => {
    fetchAuditDashboard();
    fetchHighValueChanges();
    fetchPendingApprovals();
  }, [days]);

  const fetchAuditDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/audit/dashboard?days=${days}`);
      if (response.data.success) {
        setAuditDashboard(response.data.data);
      }
    } catch (error) {
      setError('Error fetching audit dashboard: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchHighValueChanges = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/audit/high-value-changes?days=${days}&threshold=50000`);
      if (response.data.success) {
        setHighValueChanges(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching high value changes:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/audit/pending-approvals`);
      if (response.data.success) {
        setPendingApprovals(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  const fetchCaseAuditTrail = async (caseId) => {
    try {
      setLoading(true);
      const [auditResponse, scopeResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/audit/case/${caseId}`),
        axios.get(`${API_BASE_URL}/api/audit/scope-changes/${caseId}`)
      ]);

      if (auditResponse.data.success) {
        setCaseAuditTrail(auditResponse.data.data);
      }
      if (scopeResponse.data.success) {
        setCaseScopeChanges(scopeResponse.data.data);
      }
    } catch (error) {
      setError('Error fetching case details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (auditId, action, notes) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/audit/approve/${auditId}`, {
        action,
        notes
      });
      if (response.data.success) {
        alert(`Successfully ${action}ed the request`);
        fetchPendingApprovals();
        fetchAuditDashboard();
      }
    } catch (error) {
      alert('Error processing approval: ' + (error.response?.data?.message || error.message));
    }
    setApprovalDialog({ open: false, auditId: null, action: '' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'error',
      APPROVE: 'primary',
      REJECT: 'warning'
    };
    return colors[action] || 'default';
  };

  const ApprovalDialog = () => (
    <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ open: false, auditId: null, action: '' })}>
      <DialogTitle>
        {approvalDialog.action === 'approve' ? 'Approve Request' : 'Reject Request'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={approvalDialog.action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason'}
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          id="approval-notes"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setApprovalDialog({ open: false, auditId: null, action: '' })}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            const notes = document.getElementById('approval-notes').value;
            if (approvalDialog.action === 'reject' && !notes.trim()) {
              alert('Rejection reason is required');
              return;
            }
            handleApproval(approvalDialog.auditId, approvalDialog.action, notes);
          }}
          variant="contained"
          color={approvalDialog.action === 'approve' ? 'success' : 'error'}
        >
          {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Case History & Audit Tracker
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Comprehensive tracking of case progress, system changes, and audit trails
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Audit Dashboard" />
          <Tab label="Case Audit Trail" />
          <Tab label="Pending Approvals" />
          <Tab label="High Value Changes" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Dashboard Overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    {auditDashboard.activity_counts.reduce((sum, item) => sum + item.count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Activities ({days} days)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">
                    {auditDashboard.pending_approvals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approvals
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="error.main">
                    {highValueChanges.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Value Changes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {auditDashboard.top_users.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Activity Summary</Typography>
                  {auditDashboard.activity_counts.length === 0 ? (
                    <Typography color="text.secondary">No activity in selected period</Typography>
                  ) : (
                    auditDashboard.activity_counts.map((activity, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{activity.action}</Typography>
                        <Chip label={activity.count} size="small" />
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Top Active Users</Typography>
                  {auditDashboard.top_users.length === 0 ? (
                    <Typography color="text.secondary">No user activity in selected period</Typography>
                  ) : (
                    auditDashboard.top_users.map((user, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{user.user_name}</Typography>
                        <Chip label={user.activity_count} size="small" color="primary" />
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Case Audit Trail */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Case ID"
                  placeholder="Enter Case ID (e.g., 15)"
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => selectedCase && fetchCaseAuditTrail(selectedCase)}
                  disabled={!selectedCase || loading}
                >
                  {loading ? 'Loading...' : 'Search'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {caseAuditTrail.length > 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Audit Trail for Case {selectedCase}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {caseAuditTrail.map((entry, index) => (
                        <Box key={entry.id} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                          {/* Timeline-like visual indicator */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: `${getActionColor(entry.action)}.main`,
                                border: 2,
                                borderColor: 'background.paper',
                                boxShadow: 1
                              }}
                            />
                            {index < caseAuditTrail.length - 1 && (
                              <Box sx={{ width: 2, height: 40, bgcolor: 'divider', mt: 1 }} />
                            )}
                          </Box>

                          {/* Content */}
                          <Box sx={{ flex: 1, pb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip label={entry.action} color={getActionColor(entry.action)} size="small" />
                              <Typography variant="body2" fontWeight="bold">
                                {entry.table_name} #{entry.record_id}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(entry.created_at)} by {entry.user_name || 'System'}
                            </Typography>
                            {entry.business_reason && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                {entry.business_reason}
                              </Typography>
                            )}
                            {entry.changed_fields && entry.changed_fields.length > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Changed: {entry.changed_fields.join(', ')}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Scope Changes</Typography>
                    {caseScopeChanges.length === 0 ? (
                      <Typography color="text.secondary">No scope changes found</Typography>
                    ) : (
                      caseScopeChanges.map((change) => (
                        <Box key={change.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {change.entity_type} - {change.change_type}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {change.entity_number}
                          </Typography>
                          {change.value_difference && (
                            <Typography variant="body2" color={change.value_difference > 0 ? 'error.main' : 'success.main'}>
                              {change.value_difference > 0 ? '+' : ''}{formatCurrency(change.value_difference)}
                            </Typography>
                          )}
                          <Chip
                            label={change.approval_status}
                            size="small"
                            color={
                              change.approval_status === 'approved' ? 'success' :
                                change.approval_status === 'rejected' ? 'error' : 'warning'
                            }
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      ))
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Pending Approvals */}
          <Typography variant="h6" gutterBottom>Pending Approvals</Typography>
          {pendingApprovals.length === 0 ? (
            <Alert severity="info">No pending approvals</Alert>
          ) : (
            <Grid container spacing={2}>
              {pendingApprovals.map((approval) => (
                <Grid item xs={12} key={approval.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip label={approval.action} color={getActionColor(approval.action)} size="small" />
                            <Typography variant="body1" fontWeight="bold">
                              {approval.table_name} #{approval.record_id}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Case: {approval.case_number || 'N/A'} | Requested by: {approval.requested_by}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(approval.created_at)}
                          </Typography>
                          {approval.business_reason && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Reason:</strong> {approval.business_reason}
                            </Typography>
                          )}
                        </Box>
                        {approval.value_difference && (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" color="warning.main">
                              {formatCurrency(Math.abs(approval.value_difference))}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Value Change
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => setApprovalDialog({ open: true, auditId: approval.id, action: 'approve' })}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => setApprovalDialog({ open: true, auditId: approval.id, action: 'reject' })}
                        >
                          Reject
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* High Value Changes */}
          <Typography variant="h6" gutterBottom>High Value Changes (&gt;{formatCurrency(50000)})</Typography>
          {highValueChanges.length === 0 ? (
            <Alert severity="info">No high value changes in the selected period</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Entity</TableCell>
                    <TableCell>Case</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Value Change</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {highValueChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {change.entity_type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {change.entity_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{change.case_number}</TableCell>
                      <TableCell>{change.client_name}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={change.value_difference > 0 ? 'error.main' : 'success.main'}
                        >
                          {change.value_difference > 0 ? '+' : ''}{formatCurrency(change.value_difference)}
                        </Typography>
                        {change.percentage_change && (
                          <Typography variant="caption" color="text.secondary">
                            ({change.percentage_change.toFixed(1)}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={change.approval_status}
                          size="small"
                          color={
                            change.approval_status === 'approved' ? 'success' :
                              change.approval_status === 'rejected' ? 'error' : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>{formatDate(change.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      <ApprovalDialog />
    </Box>
  );
};

export default EnhancedCaseHistoryTracker;