import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActionArea,
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
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Drawer,
  AppBar,
  Toolbar,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
  Breadcrumbs,
  Link,
  Snackbar
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  GetApp as GetAppIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
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

const EnterpriseAuditDashboard = () => {
  // Core state
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    activity_counts: [],
    scope_summary: [],
    pending_approvals: 0,
    top_users: []
  });
  const [allCases, setAllCases] = useState([]);
  const [highValueChanges, setHighValueChanges] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [userActivity, setUserActivity] = useState([]);

  // UI state
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetailDialog, setCaseDetailDialog] = useState(false);
  const [caseAuditTrail, setCaseAuditTrail] = useState([]);
  const [caseScopeChanges, setCaseScopeChanges] = useState([]);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, item: null });
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [notificationDialog, setNotificationDialog] = useState(false);

  // Filters and settings
  const [days, setDays] = useState(7);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Real-time updates
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashboardRes,
        casesRes,
        highValueRes,
        pendingRes
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/audit/dashboard?days=${days}`),
        axios.get(`${API_BASE_URL}/api/case-management`),
        axios.get(`${API_BASE_URL}/api/audit/high-value-changes?days=${days}&threshold=50000`),
        axios.get(`${API_BASE_URL}/api/audit/pending-approvals`)
      ]);

      if (dashboardRes.data.success) setDashboardData(dashboardRes.data.data);
      if (casesRes.data.success) setAllCases(casesRes.data.data.all_cases || []);
      if (highValueRes.data.success) setHighValueChanges(highValueRes.data.data);
      if (pendingRes.data.success) setPendingApprovals(pendingRes.data.data);

      setLastUpdate(new Date());
    } catch (error) {
      setError('Error fetching dashboard data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshKey]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData();
      }, 120000); // Optimized to 2 minutes for better performance
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  const handleCaseClick = async (caseItem) => {
    setSelectedCase(caseItem);
    setLoading(true);
    try {
      const [auditRes, scopeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/audit/case/${caseItem.case_id}`),
        axios.get(`${API_BASE_URL}/api/audit/scope-changes/${caseItem.case_id}`)
      ]);

      if (auditRes.data.success) setCaseAuditTrail(auditRes.data.data);
      if (scopeRes.data.success) setCaseScopeChanges(scopeRes.data.data);

      setCaseDetailDialog(true);
    } catch (error) {
      setError('Error fetching case details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (item, action, notes) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/audit/approve/${item.id}`, {
        action,
        notes
      });
      if (response.data.success) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: `Successfully ${action}ed approval request`,
          type: 'success'
        }]);
        fetchAllData(); // Refresh data
      }
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        message: 'Error processing approval: ' + (error.response?.data?.message || error.message),
        type: 'error'
      }]);
    }
    setApprovalDialog({ open: false, item: null });
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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      active: 'primary',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    };
    return colors[priority] || 'default';
  };

  const filteredCases = allCases.filter(case_ => {
    const matchesSearch = searchTerm === '' ||
      case_.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || case_.current_state === statusFilter;
    const matchesPriority = priorityFilter === 'all' || case_.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Enhanced Statistics Cards Component
  const StatisticsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Total Activity Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-4px)' }
          }}
          onClick={() => setTabValue(1)}
        >
          <CardActionArea>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {dashboardData.activity_counts.reduce((sum, item) => sum + item.count, 0)}
                  </Typography>
                  <Typography variant="body1">Total Activities</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Last {days} days
                  </Typography>
                </Box>
                <TimelineIcon sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>

      {/* Pending Approvals Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-4px)' }
          }}
          onClick={() => setTabValue(2)}
        >
          <CardActionArea>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {dashboardData.pending_approvals}
                  </Typography>
                  <Typography variant="body1">Pending Approvals</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Requires attention
                  </Typography>
                </Box>
                <Badge badgeContent={dashboardData.pending_approvals} color="error">
                  <ScheduleIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                </Badge>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>

      {/* High Value Changes Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-4px)' }
          }}
          onClick={() => setTabValue(3)}
        >
          <CardActionArea>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {highValueChanges.length}
                  </Typography>
                  <Typography variant="body1">High Value Changes</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    > ₹50,000
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>

      {/* Active Cases Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-4px)' }
          }}
          onClick={() => setTabValue(4)}
        >
          <CardActionArea>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {allCases.filter(c => c.status === 'active').length}
                  </Typography>
                  <Typography variant="body1">Active Cases</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    In progress
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    </Grid>
  );

  // Enhanced Case Management Component
  const CaseManagementTab = () => (
    <Box>
      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search cases, clients, projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="enquiry">Enquiry</MenuItem>
                <MenuItem value="estimation">Estimation</MenuItem>
                <MenuItem value="quotation">Quotation</MenuItem>
                <MenuItem value="order">Order</MenuItem>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="delivery">Delivery</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <MenuItem value="all">All Priority</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFilterDrawer(true)}
              >
                Advanced Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={() => window.open('/api/audit/export/cases', '_blank')}
              >
                Export
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Cases Grid */}
      <Grid container spacing={3}>
        {filteredCases.map((caseItem) => (
          <Grid item xs={12} md={6} lg={4} key={caseItem.case_id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleCaseClick(caseItem)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" noWrap>
                    {caseItem.case_number}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={caseItem.current_state}
                      color={getStatusColor(caseItem.current_state)}
                      size="small"
                    />
                    {caseItem.priority && (
                      <Chip
                        label={caseItem.priority}
                        color={getPriorityColor(caseItem.priority)}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Client:</strong> {caseItem.client_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Project:</strong> {caseItem.project_name}
                </Typography>

                {caseItem.estimation_value && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Value:</strong> {formatCurrency(caseItem.estimation_value)}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary">
                  Created: {formatDate(caseItem.case_created)}
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <LinearProgress
                    variant="determinate"
                    value={
                      caseItem.current_state === 'closed' ? 100 :
                        caseItem.current_state === 'delivery' ? 90 :
                          caseItem.current_state === 'production' ? 70 :
                            caseItem.current_state === 'order' ? 50 :
                              caseItem.current_state === 'quotation' ? 30 :
                                caseItem.current_state === 'estimation' ? 20 : 10
                    }
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleCaseClick(caseItem);
                  }}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Enhanced Pending Approvals Component
  const PendingApprovalsTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Pending Approvals ({pendingApprovals.length})
      </Typography>

      {pendingApprovals.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="h6">No Pending Approvals</Typography>
          <Typography>All approval requests have been processed.</Typography>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {pendingApprovals.map((approval) => (
            <Grid item xs={12} key={approval.id}>
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={8}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AssignmentIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {approval.table_name} #{approval.record_id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {approval.action} • Case: {approval.case_number}
                          </Typography>
                        </Box>
                        <Chip label={approval.action} color="warning" />
                      </Box>

                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Requested by:</strong> {approval.requested_by}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Date:</strong> {formatDate(approval.created_at)}
                      </Typography>
                      {approval.business_reason && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          <strong>Reason:</strong> {approval.business_reason}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      {approval.value_difference && (
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <Typography variant="h5" color="warning.main" fontWeight="bold">
                            {formatCurrency(Math.abs(approval.value_difference))}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Value Impact
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => setApprovalDialog({ open: true, item: approval, action: 'approve' })}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => setApprovalDialog({ open: true, item: approval, action: 'reject' })}
                        >
                          Reject
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // Case Detail Dialog Component
  const CaseDetailDialog = () => (
    <Dialog
      open={caseDetailDialog}
      onClose={() => setCaseDetailDialog(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Case Details: {selectedCase?.case_number}
          </Typography>
          <Box>
            <IconButton onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
            <IconButton onClick={() => setCaseDetailDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedCase && (
          <Grid container spacing={3}>
            {/* Case Overview */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Case Overview</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Client"
                        secondary={selectedCase.client_name}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Project"
                        secondary={selectedCase.project_name}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip
                            label={selectedCase.current_state}
                            color={getStatusColor(selectedCase.current_state)}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Value"
                        secondary={selectedCase.estimation_value ? formatCurrency(selectedCase.estimation_value) : 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Audit Trail */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Audit Trail</Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {caseAuditTrail.map((entry, index) => (
                      <Box key={entry.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: `${getStatusColor(entry.action)}.main`,
                              border: 2,
                              borderColor: 'background.paper',
                              boxShadow: 1
                            }}
                          />
                          {index < caseAuditTrail.length - 1 && (
                            <Box sx={{ width: 2, height: 40, bgcolor: 'divider', mt: 1 }} />
                          )}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip label={entry.action} color={getStatusColor(entry.action)} size="small" />
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
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Scope Changes */}
            {caseScopeChanges.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Scope Changes</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Entity</TableCell>
                            <TableCell align="right">Original Value</TableCell>
                            <TableCell align="right">New Value</TableCell>
                            <TableCell align="right">Difference</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {caseScopeChanges.map((change) => (
                            <TableRow key={change.id}>
                              <TableCell>{change.change_type}</TableCell>
                              <TableCell>{change.entity_number}</TableCell>
                              <TableCell align="right">
                                {change.original_value ? formatCurrency(change.original_value) : '-'}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(change.new_value)}
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  color={change.value_difference > 0 ? 'error' : 'success'}
                                  fontWeight="bold"
                                >
                                  {change.value_difference > 0 ? '+' : ''}{formatCurrency(change.value_difference)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={change.approval_status}
                                  color={getStatusColor(change.approval_status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{formatDate(change.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );

  // Approval Dialog Component
  const ApprovalDialog = () => (
    <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ open: false, item: null })}>
      <DialogTitle>
        {approvalDialog.action === 'approve' ? 'Approve Request' : 'Reject Request'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to {approvalDialog.action} this request?
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label={approvalDialog.action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          id="approval-notes"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setApprovalDialog({ open: false, item: null })}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            const notes = document.getElementById('approval-notes')?.value;
            if (approvalDialog.action === 'reject' && !notes?.trim()) {
              alert('Rejection reason is required');
              return;
            }
            handleApproval(approvalDialog.item, approvalDialog.action, notes);
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Enhanced Header */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            Enterprise Audit Dashboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Auto Refresh">
              <IconButton
                color="inherit"
                onClick={() => setAutoRefresh(!autoRefresh)}
                sx={{ color: autoRefresh ? 'success.main' : 'inherit' }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={() => setNotificationDialog(true)}>
                <Badge badgeContent={notifications.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Last updated: {formatDate(lastUpdate)}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Enhanced Statistics Cards */}
        <StatisticsCards />

        {/* Navigation Tabs */}
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Dashboard Overview" icon={<DashboardIcon />} />
            <Tab label="Activity Timeline" icon={<TimelineIcon />} />
            <Tab label="Pending Approvals" icon={<ScheduleIcon />} />
            <Tab label="High Value Changes" icon={<TrendingUpIcon />} />
            <Tab label="Case Management" icon={<BusinessIcon />} />
            <Tab label="Analytics" icon={<AssessmentIcon />} />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {/* Dashboard Overview with Quick Actions */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                    {dashboardData.activity_counts.map((activity, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{activity.action}</Typography>
                        <Chip label={activity.count} size="small" color="primary" />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<SearchIcon />}
                          onClick={() => setTabValue(4)}
                        >
                          Search Cases
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<AssessmentIcon />}
                          onClick={() => setTabValue(5)}
                        >
                          View Reports
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<ScheduleIcon />}
                          onClick={() => setTabValue(2)}
                        >
                          Pending Items
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<GetAppIcon />}
                          onClick={() => setRefreshKey(prev => prev + 1)}
                        >
                          Refresh Data
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom>Activity Timeline</Typography>
            <Typography variant="body1" color="text.secondary">
              Detailed activity timeline will be implemented here with real-time updates.
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <PendingApprovalsTab />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h5" gutterBottom>High Value Changes</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Entity</TableCell>
                    <TableCell>Case</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Value Change</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={change.approval_status}
                          color={getStatusColor(change.approval_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(change.created_at)}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => {
                          const caseItem = allCases.find(c => c.case_number === change.case_number);
                          if (caseItem) handleCaseClick(caseItem);
                        }}>
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <CaseManagementTab />
          </TabPanel>

          <TabPanel value={tabValue} index={5}>
            <Typography variant="h5" gutterBottom>Analytics & Reports</Typography>
            <Typography variant="body1" color="text.secondary">
              Advanced analytics and reporting features will be implemented here.
            </Typography>
          </TabPanel>
        </Paper>
      </Box>

      {/* Dialogs */}
      <CaseDetailDialog />
      <ApprovalDialog />

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<RefreshIcon />}
          tooltipTitle="Refresh Data"
          onClick={() => setRefreshKey(prev => prev + 1)}
        />
        <SpeedDialAction
          icon={<GetAppIcon />}
          tooltipTitle="Export Report"
          onClick={() => window.open('/api/audit/export', '_blank')}
        />
        <SpeedDialAction
          icon={<SettingsIcon />}
          tooltipTitle="Settings"
          onClick={() => setFilterDrawer(true)}
        />
      </SpeedDial>

      {/* Notifications Snackbar */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={6000}
          onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          message={notification.message}
        />
      ))}
    </Box>
  );
};

export default EnterpriseAuditDashboard;