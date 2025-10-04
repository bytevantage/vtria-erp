import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Avatar,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  Error,
  ExpandMore,
  ExpandLess,
  Person,
  CalendarToday,
  Notes,
  Search,
  FilterList,
  GetApp,
  Visibility,
  Assignment,
  Business,
  Timeline as TimelineIcon,
  TrendingUp,
  Warning,
  AccountCircle,
  AttachMoney,
  AccessTime,
  Build,
  LocalShipping,
  CheckCircleOutline,
  Clear
} from '@mui/icons-material';

// Temporary workaround - using basic date formatting
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return dateString;
  }
};

const CaseHistoryTracker = ({ 
  caseId, 
  caseType, 
  currentStatus, 
  onStatusUpdate,
  compact = false 
}) => {
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [expanded, setExpanded] = useState(!compact);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCase, setSelectedCase] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Define workflow steps for different case types
  const workflowSteps = {
    sales_enquiry: [
      { key: 'new', label: 'New Enquiry', icon: 'create' },
      { key: 'assigned', label: 'Assigned to Designer', icon: 'assignment' },
      { key: 'estimation', label: 'Estimation in Progress', icon: 'calculate' },
      { key: 'quotation', label: 'Quotation Generated', icon: 'request_quote' },
      { key: 'approved', label: 'Quotation Approved', icon: 'check_circle' },
      { key: 'sales_order', label: 'Sales Order Created', icon: 'shopping_cart' },
      { key: 'manufacturing', label: 'In Manufacturing', icon: 'engineering' },
      { key: 'dispatch', label: 'Ready for Dispatch', icon: 'local_shipping' },
      { key: 'completed', label: 'Completed', icon: 'done_all' }
    ],
    purchase_order: [
      { key: 'draft', label: 'Draft Created', icon: 'create' },
      { key: 'pending_approval', label: 'Pending Approval', icon: 'schedule' },
      { key: 'approved', label: 'Approved', icon: 'check_circle' },
      { key: 'sent_to_supplier', label: 'Sent to Supplier', icon: 'send' },
      { key: 'partially_received', label: 'Partially Received', icon: 'inventory' },
      { key: 'received', label: 'Fully Received', icon: 'done_all' }
    ],
    manufacturing: [
      { key: 'pending', label: 'Pending Assignment', icon: 'schedule' },
      { key: 'assigned', label: 'Assigned to Technician', icon: 'assignment' },
      { key: 'in_progress', label: 'Work in Progress', icon: 'engineering' },
      { key: 'quality_check', label: 'Quality Check', icon: 'verified' },
      { key: 'completed', label: 'Manufacturing Complete', icon: 'done_all' }
    ]
  };

  const getStatusColor = (status, isActive, isCompleted) => {
    if (isCompleted) return 'success';
    if (isActive) return 'primary';
    if (status === 'rejected' || status === 'cancelled') return 'error';
    if (status === 'pending' || status === 'draft') return 'warning';
    return 'default';
  };

  const getStatusIcon = (status, isActive, isCompleted) => {
    if (isCompleted) return <CheckCircle color="success" />;
    if (isActive) return <Schedule color="primary" />;
    if (status === 'rejected' || status === 'cancelled') return <Error color="error" />;
    return <RadioButtonUnchecked color="disabled" />;
  };

  useEffect(() => {
    fetchCaseHistory();
  }, [caseId, caseType]);

  const fetchCaseHistory = async () => {
    try {
      setLoading(true);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      // If no caseId provided, use the analytics endpoint for the full case history tracker
      if (!caseId) {
        const response = await fetch(`${API_BASE_URL}/api/analytics/case-history`);
        if (response.ok) {
          const data = await response.json();
          const cases = data.data.cases || [];
          setHistoryData(cases);
          setFilteredData(cases);
        }
      } else {
        // Original functionality for specific case tracking
        const response = await fetch(`${API_BASE_URL}/api/case-history/${caseType}/${caseId}`);
        if (response.ok) {
          const data = await response.json();
          setHistoryData(data.history || []);
          setFilteredData(data.history || []);
        }
      }
    } catch (error) {
      console.error('Error fetching case history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...historyData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(caseItem => 
        caseItem.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.current_state === statusFilter);
    }

    // Apply client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.client_name === clientFilter);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (dateRange) {
        case '7days':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter(caseItem => {
        const caseDate = new Date(caseItem.created_at);
        return caseDate >= cutoffDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'created_at' || sortBy === 'closed_at') {
        aValue = new Date(aValue || '1970-01-01');
        bValue = new Date(bValue || '1970-01-01');
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredData(filtered);
    setPage(0); // Reset to first page when filtering
  }, [historyData, searchTerm, statusFilter, clientFilter, dateRange, sortBy, sortOrder]);

  // Get unique clients for filter dropdown
  const uniqueClients = [...new Set(historyData.map(item => item.client_name))].filter(Boolean);
  
  // Get unique statuses for filter dropdown
  const uniqueStatuses = [...new Set(historyData.map(item => item.current_state))].filter(Boolean);

  const getCurrentStepIndex = () => {
    const steps = workflowSteps[caseType] || [];
    return steps.findIndex(step => step.key === currentStatus);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCaseClick = (caseItem) => {
    setSelectedCase(caseItem);
  };

  const handleExport = (format) => {
    if (format === 'csv') {
      const csvContent = convertToCSV(filteredData);
      downloadFile(csvContent, 'case-history.csv', 'text/csv');
    } else if (format === 'pdf') {
      generatePDFReport(filteredData);
    }
  };

  const convertToCSV = (data) => {
    const headers = ['Case Number', 'Project Name', 'Client', 'Status', 'Created Date', 'Closed Date', 'Duration (days)'];
    const csvData = [
      headers.join(','),
      ...data.map(item => [
        item.case_number,
        `"${item.project_name}"`,
        `"${item.client_name}"`,
        item.current_state,
        formatDate(item.created_at),
        item.closed_at ? formatDate(item.closed_at) : '',
        item.total_duration || 0
      ].join(','))
    ];
    return csvData.join('\\n');
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = (data) => {
    // Basic PDF export using window.print for now
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
        <head>
          <title>Case History Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Case History Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Total Cases: ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>Case Number</th>
                <th>Project Name</th>
                <th>Client</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.case_number}</td>
                  <td>${item.project_name}</td>
                  <td>${item.client_name}</td>
                  <td>${item.current_state}</td>
                  <td>${formatDate(item.created_at)}</td>
                  <td>${item.total_duration || 0} days</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusIconForType = (status) => {
    switch (status) {
      case 'enquiry': return <Assignment color="info" />;
      case 'estimation': return <Build color="warning" />;
      case 'quotation': return <AttachMoney color="primary" />;
      case 'order': return <CheckCircleOutline color="success" />;
      case 'production': return <Build color="secondary" />;
      case 'delivery': return <LocalShipping color="success" />;
      case 'completed': return <CheckCircle color="success" />;
      case 'cancelled': return <Clear color="error" />;
      default: return <RadioButtonUnchecked color="disabled" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDuration = (days) => {
    if (!days || days === 0) return 'Just started';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const getProgressPercentage = (status) => {
    const statusOrder = ['enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'completed'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const renderCompactView = () => {
    const steps = workflowSteps[caseType] || [];
    const currentIndex = getCurrentStepIndex();

    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Case Progress
          </Typography>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            
            return (
              <Tooltip key={step.key} title={step.label}>
                <Chip
                  size="small"
                  icon={getStatusIcon(step.key, isActive, isCompleted)}
                  label={step.label}
                  color={getStatusColor(step.key, isActive, isCompleted)}
                  variant={isActive ? "filled" : "outlined"}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Paper>
    );
  };

  const renderDetailedView = () => {
    const steps = workflowSteps[caseType] || [];
    const currentIndex = getCurrentStepIndex();

    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Case History & Progress</Typography>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            <ExpandLess />
          </IconButton>
        </Box>

        <Stepper activeStep={currentIndex} orientation="horizontal" alternativeLabel>
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            const historyEntry = historyData.find(h => h.status === step.key);

            return (
              <Step key={step.key} completed={isCompleted}>
                <StepLabel
                  StepIconComponent={() => getStatusIcon(step.key, isActive, isCompleted)}
                >
                  <Typography variant="caption" display="block">
                    {step.label}
                  </Typography>
                  {historyEntry && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDate(historyEntry.created_at)}
                    </Typography>
                  )}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {/* Detailed History */}
        {historyData.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Detailed History
            </Typography>
            {historyData.map((entry, index) => (
              <Box key={index} display="flex" alignItems="start" gap={2} mb={2}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <Person fontSize="small" />
                </Avatar>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="body2" fontWeight="medium">
                      {entry.status_label || entry.status}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={entry.status} 
                      color={getStatusColor(entry.status)}
                      variant="outlined"
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {entry.created_by_name || 'System'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <CalendarToday fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(entry.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                  {entry.notes && (
                    <Box display="flex" alignItems="start" gap={0.5}>
                      <Notes fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {entry.notes}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading case history...
        </Typography>
      </Paper>
    );
  }

  // Render enterprise case history view when no specific caseId is provided
  const renderEnterpriseCaseHistory = () => {
    // Summary statistics
    const totalCases = filteredData.length;
    const activeCases = filteredData.filter(c => !['completed', 'cancelled', 'rejected'].includes(c.current_state)).length;
    const completedCases = filteredData.filter(c => c.current_state === 'completed').length;
    const avgDuration = totalCases > 0 ? Math.round(filteredData.reduce((sum, c) => sum + (c.total_duration || 0), 0) / totalCases) : 0;

    return (
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Case History Tracker
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Enterprise-grade case management and tracking system
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="primary">
                  {totalCases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Assignment color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {activeCases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {completedCases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccessTime color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="info.main">
                  {avgDuration}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Duration (days)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Controls */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search cases"
                placeholder="Case number, project, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {uniqueStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Client</InputLabel>
                <Select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  label="Client"
                >
                  <MenuItem value="all">All Clients</MenuItem>
                  {uniqueClients.map(client => (
                    <MenuItem key={client} value={client}>{client}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  label="Date Range"
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="7days">Last 7 days</MenuItem>
                  <MenuItem value="30days">Last 30 days</MenuItem>
                  <MenuItem value="90days">Last 90 days</MenuItem>
                  <MenuItem value="1year">Last year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('timeline')}
                >
                  Timeline
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Data Display */}
        {viewMode === 'table' ? renderTableView() : viewMode === 'cards' ? renderCardsView() : renderTimelineView()}
      </Box>
    );
  };

  // Table view for case data
  const renderTableView = () => {
    const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Case Number</TableCell>
                <TableCell>Project Name</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.map((caseItem) => (
                <TableRow key={caseItem.case_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {caseItem.case_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {caseItem.project_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Business fontSize="small" color="action" />
                      <Typography variant="body2">
                        {caseItem.client_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={caseItem.current_state}
                      color={getStatusColor(caseItem.current_state)}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(caseItem.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDuration(caseItem.total_duration)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleCaseClick(caseItem)}
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    );
  };

  // Cards view for case data
  const renderCardsView = () => {
    const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <Box>
        <Grid container spacing={3}>
          {paginatedData.map((caseItem) => (
            <Grid item xs={12} sm={6} md={4} key={caseItem.case_id}>
              <Card
                elevation={2}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCaseClick(caseItem)}
              >
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getStatusIconForType(caseItem.current_state)}
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" noWrap>
                      {caseItem.case_number}
                    </Typography>
                  }
                  subheader={
                    <Chip
                      size="small"
                      label={caseItem.current_state}
                      color={getStatusColor(caseItem.current_state)}
                    />
                  }
                />
                <CardContent>
                  <Typography variant="body1" gutterBottom noWrap>
                    {caseItem.project_name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Business fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {caseItem.client_name}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(caseItem.created_at)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Duration: {formatDuration(caseItem.total_duration)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage(caseItem.current_state)}
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box display="flex" justifyContent="center" mt={3}>
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[6, 12, 24]}
          />
        </Box>
      </Box>
    );
  };

  // Timeline view for case data
  const renderTimelineView = () => {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Case Timeline
        </Typography>
        <Box>
          {filteredData.map((caseItem, index) => (
            <Box key={caseItem.case_id} display="flex" mb={3}>
              <Box sx={{ mr: 2, minWidth: '120px' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(caseItem.created_at)}
                </Typography>
              </Box>
              <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: `${getStatusColor(caseItem.current_state)}.main` 
                  }}
                >
                  {getStatusIconForType(caseItem.current_state)}
                </Avatar>
                {index < filteredData.length - 1 && (
                  <Box sx={{ width: 2, height: 60, bgcolor: 'divider', mt: 1 }} />
                )}
              </Box>
              <Box flex={1}>
                <Paper elevation={1} sx={{ p: 2, cursor: 'pointer' }} onClick={() => handleCaseClick(caseItem)}>
                  <Typography variant="h6" component="h3">
                    {caseItem.case_number}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {caseItem.project_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Client: {caseItem.client_name}
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      size="small"
                      label={caseItem.current_state}
                      color={getStatusColor(caseItem.current_state)}
                    />
                  </Box>
                </Paper>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  // Case detail modal
  const renderCaseDetailModal = () => {
    if (!selectedCase) return null;

    return (
      <Dialog
        open={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Case Details: {selectedCase.case_number}
            </Typography>
            <Chip
              label={selectedCase.current_state}
              color={getStatusColor(selectedCase.current_state)}
              variant="filled"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Project Information
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Project Name</Typography>
                <Typography variant="body1">{selectedCase.project_name}</Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Client</Typography>
                <Typography variant="body1">{selectedCase.client_name}</Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Case Type</Typography>
                <Typography variant="body1">{selectedCase.case_type}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Timeline Information
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Created Date</Typography>
                <Typography variant="body1">{formatDate(selectedCase.created_at)}</Typography>
              </Box>
              {selectedCase.closed_at && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Closed Date</Typography>
                  <Typography variant="body1">{formatDate(selectedCase.closed_at)}</Typography>
                </Box>
              )}
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Total Duration</Typography>
                <Typography variant="body1">{formatDuration(selectedCase.total_duration)}</Typography>
              </Box>
            </Grid>
            {selectedCase.state_transitions && selectedCase.state_transitions.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  State Transition History
                </Typography>
                <Box>
                  {selectedCase.state_transitions.map((transition, index) => (
                    <Box key={index} display="flex" mb={2}>
                      <Box sx={{ mr: 2, minWidth: '120px' }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(transition.created_at)}
                        </Typography>
                      </Box>
                      <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {getStatusIconForType(transition.to_state)}
                        </Avatar>
                        {index < selectedCase.state_transitions.length - 1 && (
                          <Box sx={{ width: 2, height: 40, bgcolor: 'divider', mt: 1 }} />
                        )}
                      </Box>
                      <Box flex={1}>
                        <Typography variant="body1">
                          {transition.from_state || 'Start'} → {transition.to_state}
                        </Typography>
                        {transition.notes && (
                          <Typography variant="body2" color="text.secondary">
                            {transition.notes}
                          </Typography>
                        )}
                        {transition.created_by_name && (
                          <Typography variant="caption" color="text.secondary">
                            by {transition.created_by_name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}\n                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCase(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      {!caseId ? renderEnterpriseCaseHistory() : (compact && !expanded ? renderCompactView() : renderDetailedView())}
      {renderCaseDetailModal()}
    </Box>
  );
};

export default CaseHistoryTracker;
