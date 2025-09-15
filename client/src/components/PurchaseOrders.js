import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ShoppingCart,
  Assignment,
  LocalShipping,
  Inventory2,
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  GetApp,
  CheckCircle,
  Send,
  Cancel,
  ExpandMore,
  TrendingUp,
  Warning,
  Schedule
} from '@mui/icons-material';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`purchase-tabpanel-${index}`}
      aria-labelledby={`purchase-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Purchase Dashboard Component
const PurchaseDashboard = ({ dashboardData }) => {
  const mockData = {
    totalPOs: 45,
    pendingApprovals: 8,
    overdueDeliveries: 3,
    monthlyValue: 875000,
    recentPOs: [
      { id: 1, po_number: 'VESPL/PO/2526/001', supplier: 'Steel India Ltd', amount: 126850, status: 'approved' },
      { id: 2, po_number: 'VESPL/PO/2526/002', supplier: 'Automation Parts Co', amount: 59000, status: 'sent_to_supplier' },
      { id: 3, po_number: 'VESPL/PO/2526/003', supplier: 'Electronics Hub', amount: 45000, status: 'pending_approval' }
    ],
    pendingReceipts: [
      { po_number: 'VESPL/PO/2526/001', supplier: 'Steel India Ltd', expectedDate: '2025-09-12', daysOverdue: 0 },
      { po_number: 'VESPL/PO/2526/004', supplier: 'Hardware Solutions', expectedDate: '2025-09-08', daysOverdue: 2 }
    ]
  };

  const data = dashboardData || mockData;

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <ShoppingCart color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total POs
                </Typography>
                <Typography variant="h4">
                  {data.totalPOs}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Schedule color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Pending Approvals
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {data.pendingApprovals}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Warning color="error" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Overdue Deliveries
                </Typography>
                <Typography variant="h4" color="error.main">
                  {data.overdueDeliveries}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <TrendingUp color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Monthly Value
                </Typography>
                <Typography variant="h4" color="success.main">
                  ₹{(data.monthlyValue / 100000).toFixed(1)}L
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent POs */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Purchase Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>{po.po_number}</TableCell>
                      <TableCell>{po.supplier}</TableCell>
                      <TableCell align="right">₹{po.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={po.status.replace('_', ' ')} 
                          color={po.status === 'approved' ? 'success' : po.status === 'sent_to_supplier' ? 'info' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Pending Receipts */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Receipts
            </Typography>
            {data.pendingReceipts.map((receipt, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">{receipt.po_number}</Typography>
                <Typography variant="caption" color="textSecondary">{receipt.supplier}</Typography>
                <Box display="flex" justifyContent="between" alignItems="center">
                  <Typography variant="caption">Expected: {receipt.expectedDate}</Typography>
                  {receipt.daysOverdue > 0 && (
                    <Chip 
                      label={`${receipt.daysOverdue} days overdue`} 
                      color="error" 
                      size="small" 
                    />
                  )}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Purchase Orders List Component
const PurchaseOrdersList = ({ orders = [], onAdd, onEdit, onView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const mockOrders = [
    {
      id: 1,
      po_number: 'VESPL/PO/2526/001',
      supplier_name: 'Steel India Ltd',
      po_date: '2025-09-09',
      expected_delivery_date: '2025-09-19',
      grand_total: 126850,
      status: 'approved',
      total_items: 2,
      receipt_status: 'Pending Receipt'
    },
    {
      id: 2,
      po_number: 'VESPL/PO/2526/002',
      supplier_name: 'Automation Parts Co',
      po_date: '2025-09-09',
      expected_delivery_date: '2025-09-23',
      grand_total: 59000,
      status: 'sent_to_supplier',
      total_items: 1,
      receipt_status: 'Pending Receipt'
    },
    {
      id: 3,
      po_number: 'VESPL/PO/2526/003',
      supplier_name: 'Electronics Hub',
      po_date: '2025-09-08',
      expected_delivery_date: '2025-09-18',
      grand_total: 45000,
      status: 'pending_approval',
      total_items: 3,
      receipt_status: 'Pending Approval'
    }
  ];

  const data = orders.length > 0 ? orders : mockOrders;

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'sent_to_supplier': return 'info';
      case 'pending_approval': return 'warning';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
      case 'received': return 'success';
      case 'partially_received': return 'warning';
      default: return 'default';
    }
  };

  const filteredOrders = data.filter(order => {
    const matchesSearch = order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = [...new Set(data.map(order => order.status))];

  return (
    <Box>
      {/* Controls */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder="Search POs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
          }}
          sx={{ minWidth: 250 }}
        />
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statuses.map(status => (
              <MenuItem key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
        >
          Create PO
        </Button>
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PO Number</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>PO Date</TableCell>
              <TableCell>Expected Delivery</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Receipt Status</TableCell>
              <TableCell align="center">Items</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.po_number}</TableCell>
                <TableCell>{order.supplier_name}</TableCell>
                <TableCell>{order.po_date}</TableCell>
                <TableCell>{order.expected_delivery_date}</TableCell>
                <TableCell align="right">₹{order.grand_total.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={order.status.replace('_', ' ')} 
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{order.receipt_status}</TableCell>
                <TableCell align="center">{order.total_items}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View">
                    <IconButton onClick={() => onView(order)} size="small">
                      <GetApp />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit(order)} size="small">
                      <Edit />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Purchase Requisitions Component
const PurchaseRequisitions = ({ requisitions = [], onAdd, onApprove }) => {
  const mockRequisitions = [
    {
      id: 1,
      pr_number: 'VESPL/PR/2526/001',
      requested_by_name: 'John Smith',
      department: 'Manufacturing',
      request_date: '2025-09-08',
      required_date: '2025-09-23',
      priority: 'high',
      status: 'approved',
      total_estimated_cost: 125000,
      total_items: 2
    },
    {
      id: 2,
      pr_number: 'VESPL/PR/2526/002',
      requested_by_name: 'Sarah Johnson',
      department: 'Maintenance',
      request_date: '2025-09-09',
      required_date: '2025-09-16',
      priority: 'medium',
      status: 'submitted',
      total_estimated_cost: 45000,
      total_items: 1
    }
  ];

  const data = requisitions.length > 0 ? requisitions : mockRequisitions;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'submitted': return 'info';
      case 'draft': return 'default';
      case 'rejected': return 'error';
      case 'converted_to_po': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Purchase Requisitions</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
        >
          Create PR
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PR Number</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Request Date</TableCell>
              <TableCell>Required Date</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Estimated Cost</TableCell>
              <TableCell align="center">Items</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell>{pr.pr_number}</TableCell>
                <TableCell>{pr.requested_by_name}</TableCell>
                <TableCell>{pr.department}</TableCell>
                <TableCell>{pr.request_date}</TableCell>
                <TableCell>{pr.required_date}</TableCell>
                <TableCell>
                  <Chip 
                    label={pr.priority.toUpperCase()} 
                    color={getPriorityColor(pr.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={pr.status.replace('_', ' ')} 
                    color={getStatusColor(pr.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">₹{pr.total_estimated_cost.toLocaleString()}</TableCell>
                <TableCell align="center">{pr.total_items}</TableCell>
                <TableCell align="center">
                  {pr.status === 'submitted' && (
                    <Tooltip title="Approve">
                      <IconButton onClick={() => onApprove(pr)} size="small" color="success">
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View">
                    <IconButton size="small">
                      <GetApp />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Goods Receipt Component
const GoodsReceipt = ({ receipts = [], onCreateGRN }) => {
  const mockReceipts = [
    {
      id: 1,
      grn_number: 'VESPL/GRN/2526/001',
      po_number: 'VESPL/PO/2526/001',
      supplier_name: 'Steel India Ltd',
      received_date: '2025-09-09',
      invoice_number: 'SI-2025-1205',
      total_received_amount: 85000,
      status: 'verified'
    }
  ];

  const data = receipts.length > 0 ? receipts : mockReceipts;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Goods Receipt Notes</Typography>
        <Button
          variant="contained"
          startIcon={<LocalShipping />}
          onClick={onCreateGRN}
        >
          Create GRN
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>GRN Number</TableCell>
              <TableCell>PO Number</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Received Date</TableCell>
              <TableCell>Invoice Number</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((grn) => (
              <TableRow key={grn.id}>
                <TableCell>{grn.grn_number}</TableCell>
                <TableCell>{grn.po_number}</TableCell>
                <TableCell>{grn.supplier_name}</TableCell>
                <TableCell>{grn.received_date}</TableCell>
                <TableCell>{grn.invoice_number}</TableCell>
                <TableCell align="right">₹{grn.total_received_amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={grn.status} 
                    color={grn.status === 'verified' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View">
                    <IconButton size="small">
                      <GetApp />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Main Purchase Orders Component
const PurchaseOrders = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [receipts, setReceipts] = useState([]);

  // Dialog states
  const [createPODialog, setCreatePODialog] = useState(false);
  const [createPRDialog, setCreatePRDialog] = useState(false);
  const [createGRNDialog, setCreateGRNDialog] = useState(false);

  useEffect(() => {
    // Load initial data
    loadDashboardData();
    loadPurchaseOrders();
    loadRequisitions();
    loadReceipts();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // API call would go here
      // const response = await fetch('/api/purchase/dashboard');
      // const data = await response.json();
      // setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      // API call would go here
      // const response = await fetch('/api/purchase/orders');
      // const data = await response.json();
      // setPurchaseOrders(data);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setError('Failed to load purchase orders');
    }
  };

  const loadRequisitions = async () => {
    try {
      // API call would go here
      // const response = await fetch('/api/purchase/requisitions');
      // const data = await response.json();
      // setRequisitions(data);
    } catch (error) {
      console.error('Error loading requisitions:', error);
      setError('Failed to load requisitions');
    }
  };

  const loadReceipts = async () => {
    try {
      // API call would go here
      // const response = await fetch('/api/purchase/receipts');
      // const data = await response.json();
      // setReceipts(data);
    } catch (error) {
      console.error('Error loading receipts:', error);
      setError('Failed to load receipts');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCreatePO = () => {
    setCreatePODialog(true);
  };

  const handleCreatePR = () => {
    setCreatePRDialog(true);
  };

  const handleCreateGRN = () => {
    setCreateGRNDialog(true);
  };

  const handleViewPO = (po) => {
    console.log('Viewing PO:', po);
  };

  const handleEditPO = (po) => {
    console.log('Editing PO:', po);
  };

  const handleApprovePR = (pr) => {
    console.log('Approving PR:', pr);
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Purchase Management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<TrendingUp />} label="Dashboard" />
          <Tab icon={<ShoppingCart />} label="Purchase Orders" />
          <Tab icon={<Assignment />} label="Requisitions" />
          <Tab icon={<LocalShipping />} label="Goods Receipt" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <PurchaseDashboard dashboardData={dashboardData} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <PurchaseOrdersList 
          orders={purchaseOrders}
          onAdd={handleCreatePO}
          onEdit={handleEditPO}
          onView={handleViewPO}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <PurchaseRequisitions 
          requisitions={requisitions}
          onAdd={handleCreatePR}
          onApprove={handleApprovePR}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <GoodsReceipt 
          receipts={receipts}
          onCreateGRN={handleCreateGRN}
        />
      </TabPanel>

      {/* Create PO Dialog */}
      <Dialog open={createPODialog} onClose={() => setCreatePODialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Supplier</InputLabel>
                  <Select label="Supplier">
                    <MenuItem value={1}>Steel India Ltd</MenuItem>
                    <MenuItem value={2}>Automation Parts Co</MenuItem>
                    <MenuItem value={3}>Electronics Hub</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Expected Delivery Date" type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Terms and Conditions" multiline rows={3} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Delivery Address" multiline rows={2} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePODialog(false)}>Cancel</Button>
          <Button variant="contained">Create PO</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PurchaseOrders;
