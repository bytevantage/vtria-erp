import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Note as NotesIcon,
  AttachFile as AttachIcon,
  Build as BuildIcon,
  Timeline as ProgressIcon,
  Warning as WarningIcon,
  Inventory as BOMIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  ExpandMore as ExpandMoreIcon,
  Upload as UploadIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config';

const EnhancedManufacturing = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [manufacturingCases, setManufacturingCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog states
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);

  // Form data
  const [caseNotes, setCaseNotes] = useState([]);
  const [caseDocuments, setCaseDocuments] = useState([]);
  const [bomData, setBomData] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    fetchManufacturingCases();
  }, []);

  const fetchManufacturingCases = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/manufacturing/cases`);
      setManufacturingCases(response.data.data || []);
    } catch (error) {
      console.error('Error fetching manufacturing cases:', error);
      setError('Failed to load manufacturing cases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCaseFromQuote = async (quotationId) => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.post(
        `${API_BASE_URL}/api/manufacturing/cases/create-from-quote`,
        { quotation_id: quotationId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await fetchManufacturingCases();
        setError('');
      }
    } catch (error) {
      console.error('Error creating manufacturing case:', error);
      setError('Failed to create manufacturing case from quote');
    }
  };

  const handleViewCaseDetails = async (caseId) => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';

      // Fetch case details, BOM, work orders, notes, and documents
      const [caseResponse, bomResponse, workOrdersResponse, allNotesResponse, documentsResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/manufacturing/cases/${caseId}`,
            { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/manufacturing/cases/${caseId}/bom`,
            { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/manufacturing/cases/${caseId}/work-orders`,
            { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/manufacturing/cases/${caseId}/with-notes`,
            { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/manufacturing/cases/${caseId}/documents`,
            { headers: { Authorization: `Bearer ${token}` } }),
        ]);

      setSelectedCase(allNotesResponse.data.data);
      setBomData(bomResponse.data.data);
      setWorkOrders(workOrdersResponse.data.data || []);
      setCaseNotes(allNotesResponse.data.data.all_notes || []);
      setCaseDocuments(documentsResponse.data.data || []);
      setCaseDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching case details:', error);
      setError('Failed to load case details');
    }
  };

  const handleApproveCase = async (caseId, approved, notes) => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.post(
        `${API_BASE_URL}/api/manufacturing/cases/${caseId}/approve`,
        { approved, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await fetchManufacturingCases();
        setApprovalDialogOpen(false);
        setError('');
      }
    } catch (error) {
      console.error('Error updating case approval:', error);
      setError('Failed to update case approval');
    }
  };

  const handleStatusUpdate = async (caseId, status, notes) => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.put(
        `${API_BASE_URL}/api/manufacturing/cases/${caseId}/status`,
        { status, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await fetchManufacturingCases();
        setError('');
      }
    } catch (error) {
      console.error('Error updating case status:', error);
      setError('Failed to update case status');
    }
  };

  const handleCreateSalesOrder = async (caseId, salesOrderData) => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.post(
        `${API_BASE_URL}/api/manufacturing/cases/${caseId}/create-sales-order`,
        salesOrderData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setError('');
        alert(`Sales order ${response.data.data.sales_order_number} created successfully!`);
        await fetchManufacturingCases();
      }
    } catch (error) {
      console.error('Error creating sales order:', error);
      setError('Failed to create sales order');
    }
  };

  const getCaseStatusColor = (status) => {
    const statusColors = {
      'draft': 'default',
      'pending_approval': 'warning',
      'approved': 'info',
      'in_progress': 'primary',
      'completed': 'success',
      'cancelled': 'error',
      'on_hold': 'warning'
    };
    return statusColors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': 'success',
      'medium': 'info',
      'high': 'warning',
      'urgent': 'error'
    };
    return priorityColors[priority] || 'info';
  };

  // Manufacturing Cases Dashboard
  const renderCasesDashboard = () => (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Cases
              </Typography>
              <Typography variant="h4">
                {manufacturingCases.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Approval
              </Typography>
              <Typography variant="h4" color="warning.main">
                {manufacturingCases.filter(c => c.status === 'pending_approval').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4" color="primary.main">
                {manufacturingCases.filter(c => c.status === 'in_progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {manufacturingCases.filter(c => c.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cases Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Manufacturing Cases</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {/* Open create case dialog */ }}
            >
              Create Case from Quote
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Case Number</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Planned Dates</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manufacturingCases.map((case_) => (
                  <TableRow key={case_.id}>
                    <TableCell>{case_.manufacturing_case_number}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{case_.project_name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {case_.case_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={case_.priority}
                        color={getPriorityColor(case_.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={case_.status}
                          color={getCaseStatusColor(case_.status)}
                          size="small"
                        />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={case_.status}
                            onChange={(e) => handleStatusUpdate(case_.id, e.target.value, `Status changed to ${e.target.value}`)}
                            displayEmpty
                            size="small"
                            sx={{ height: '32px' }}
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="pending_approval">Pending Approval</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="on_hold">On Hold</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={case_.progress_percentage || 0}
                          sx={{ width: 60, height: 6 }}
                        />
                        <Typography variant="caption">
                          {case_.progress_percentage || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {case_.planned_start_date ?
                          `${new Date(case_.planned_start_date).toLocaleDateString()} - ${new Date(case_.planned_end_date).toLocaleDateString()}`
                          : 'Not scheduled'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewCaseDetails(case_.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>

                        {case_.status === 'pending_approval' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setSelectedCase(case_);
                                  setApprovalDialogOpen(true);
                                }}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedCase(case_);
                                  setApprovalDialogOpen(true);
                                }}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        <Tooltip title="Notes">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCase(case_);
                              setNotesDialogOpen(true);
                            }}
                          >
                            <Badge badgeContent={case_.notes_count || 0} color="primary">
                              <NotesIcon />
                            </Badge>
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Documents">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCase(case_);
                              setDocumentsDialogOpen(true);
                            }}
                          >
                            <Badge badgeContent={case_.documents_count || 0} color="primary">
                              <AttachIcon />
                            </Badge>
                          </IconButton>
                        </Tooltip>

                        {case_.status === 'completed' && (
                          <Tooltip title="Create Sales Order">
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                const salesOrderData = {
                                  customer_po_number: '',
                                  customer_po_date: new Date().toISOString().split('T')[0],
                                  expected_delivery_date: '',
                                  advance_amount: 0,
                                  payment_terms: 'Net 30 days',
                                  delivery_terms: 'Ex-works',
                                  warranty_terms: '1 year manufacturing warranty',
                                  notes: `Sales order created from completed manufacturing case: ${case_.manufacturing_case_number}`
                                };
                                handleCreateSalesOrder(case_.id, salesOrderData);
                              }}
                              sx={{ ml: 1 }}
                            >
                              Create Sales Order
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // BOM Viewer Component
  const renderBOMViewer = () => {
    if (!bomData) return <Typography>No BOM data available</Typography>;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Bill of Materials</Typography>

        {/* BOM Summary */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Total Cost</Typography>
                <Typography variant="h6">₹{bomData.total_cost?.toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Labor Hours</Typography>
                <Typography variant="h6">{bomData.labor_hours}h</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Total Items</Typography>
                <Typography variant="h6">{bomData.items?.length || 0}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* BOM Items */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit Cost</TableCell>
                <TableCell>Total Cost</TableCell>
                <TableCell>Availability</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bomData.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.item_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.part_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.quantity_required} {item.unit}</TableCell>
                  <TableCell>₹{item.unit_cost?.toLocaleString()}</TableCell>
                  <TableCell>₹{(item.quantity_required * item.unit_cost)?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.availability_status || 'Unknown'}
                      color={item.availability_status === 'available' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      Select Product
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Case Details Dialog
  const renderCaseDetailsDialog = () => (
    <Dialog
      open={caseDetailsOpen}
      onClose={() => setCaseDetailsOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        Manufacturing Case Details - {selectedCase?.manufacturing_case_number}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab icon={<AssignmentIcon />} label="Overview" />
            <Tab icon={<BOMIcon />} label="BOM" />
            <Tab icon={<BuildIcon />} label="Work Orders" />
            <Tab icon={<NotesIcon />} label="Notes" />
            <Tab icon={<AttachIcon />} label="Documents" />
            <Tab icon={<ProgressIcon />} label="Progress" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Case Information</Typography>
                <Typography><strong>Status:</strong> {selectedCase?.status}</Typography>
                <Typography><strong>Priority:</strong> {selectedCase?.priority}</Typography>
                <Typography><strong>Progress:</strong> {selectedCase?.progress_percentage}%</Typography>
                <Typography><strong>Assigned To:</strong> {selectedCase?.assigned_to_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Timeline</Typography>
                <Typography><strong>Planned Start:</strong> {selectedCase?.planned_start_date}</Typography>
                <Typography><strong>Planned End:</strong> {selectedCase?.planned_end_date}</Typography>
                <Typography><strong>Actual Start:</strong> {selectedCase?.actual_start_date || 'Not started'}</Typography>
                <Typography><strong>Actual End:</strong> {selectedCase?.actual_end_date || 'Not completed'}</Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 1 && renderBOMViewer()}

        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Work Orders</Typography>
            {/* Work Orders list */}
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>Notes & Comments</Typography>
            {/* Notes list */}
          </Box>
        )}

        {activeTab === 4 && (
          <Box>
            <Typography variant="h6" gutterBottom>Documents</Typography>
            {/* Documents list */}
          </Box>
        )}

        {activeTab === 5 && (
          <Box>
            <Typography variant="h6" gutterBottom>Progress Tracking</Typography>
            {/* Progress timeline */}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCaseDetailsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) return <CircularProgress />;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Manufacturing Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderCasesDashboard()}
      {renderCaseDetailsDialog()}
    </Box>
  );
};

export default EnhancedManufacturing;