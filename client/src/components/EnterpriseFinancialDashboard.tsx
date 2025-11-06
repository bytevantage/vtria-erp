import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Payment,
  Warning,
  Assessment,
  PieChart,
  BarChart,
  Timeline,
  CurrencyRupee,
  MonetizationOn,
  ShoppingCart,
  BusinessCenter,
  Schedule,
  Info,
  Refresh,
  Download,
  Print,
  FilterAlt,
  ExpandMore,
  Dashboard,
  Insights,
  Analytics,
  AttachMoney,
  ReceiptLong,
  TrendingFlat,
  Error,
  CheckCircle,
  HourglassEmpty,
  CalendarToday,
  LocalAtm,
  CreditCard,
  AccountBalanceWallet,
  Notifications,
} from '@mui/icons-material';

interface FinancialKPI {
  id: string;
  label: string;
  value: number;
  formatted_value: string;
  trend?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  subtitle?: string;
  target?: number;
  progress?: number;
}

interface CashFlowData {
  month: string;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  opening_balance: number;
  closing_balance: number;
}

interface ProfitLossData {
  category: string;
  current_month: number;
  previous_month: number;
  ytd_current: number;
  ytd_previous: number;
  variance_percentage: number;
}

interface CustomerOutstanding {
  customer_id: number;
  company_name: string;
  current_outstanding: number;
  credit_limit: number;
  available_credit: number;
  risk_category: 'low' | 'medium' | 'high' | 'blocked';
  current_amount: number;
  amount_1_30_days: number;
  amount_31_60_days: number;
  amount_61_90_days: number;
  amount_above_90_days: number;
  last_payment_date?: string;
  contact_person?: string;
  payment_terms?: string;
}

interface FinancialAlert {
  id: string;
  type: 'overdue' | 'credit_limit' | 'cash_flow' | 'compliance' | 'budget';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  amount?: number;
  due_date?: string;
  action_required: boolean;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const EnterpriseFinancialDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [kpiData, setKpiData] = useState<FinancialKPI[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  const [outstandingData, setOutstandingData] = useState<CustomerOutstanding[]>([]);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIData(),
        fetchCashFlowData(),
        fetchProfitLossData(),
        fetchOutstandingData(),
        fetchFinancialAlerts(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIData = async () => {
    try {
      const response = await fetch(`/api/financial/dashboard/kpis?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setKpiData(result.data || []);
      } else {
        console.error('Failed to fetch KPI data:', response.status);
        setKpiData([]);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      setKpiData([]);
    }
  };

  const fetchCashFlowData = async () => {
    try {
      const response = await fetch('/api/financial/cash-flow', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCashFlowData(result.data || []);
      } else {
        console.error('Failed to fetch cash flow data:', response.status);
        setCashFlowData([]);
      }
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      setCashFlowData([]);
    }
  };

  const fetchProfitLossData = async () => {
    try {
      // Mock P&L data
      setProfitLossData([
        {
          category: 'Revenue',
          current_month: 12500000,
          previous_month: 10800000,
          ytd_current: 125000000,
          ytd_previous: 98000000,
          variance_percentage: 15.74
        },
        {
          category: 'Cost of Goods Sold',
          current_month: 8750000,
          previous_month: 7560000,
          ytd_current: 87500000,
          ytd_previous: 68600000,
          variance_percentage: 15.74
        },
        {
          category: 'Gross Profit',
          current_month: 3750000,
          previous_month: 3240000,
          ytd_current: 37500000,
          ytd_previous: 29400000,
          variance_percentage: 15.74
        },
        {
          category: 'Operating Expenses',
          current_month: 2100000,
          previous_month: 1950000,
          ytd_current: 21000000,
          ytd_previous: 19500000,
          variance_percentage: 7.69
        },
        {
          category: 'EBITDA',
          current_month: 1650000,
          previous_month: 1290000,
          ytd_current: 16500000,
          ytd_previous: 9900000,
          variance_percentage: 27.91
        }
      ]);
    } catch (error) {
      console.error('Error fetching P&L data:', error);
    }
  };

  const fetchOutstandingData = async () => {
    try {
      // Mock outstanding data
      setOutstandingData([
        {
          customer_id: 1,
          company_name: 'ABC Industries Ltd',
          current_outstanding: 2500000,
          credit_limit: 5000000,
          available_credit: 2500000,
          risk_category: 'medium',
          current_amount: 800000,
          amount_1_30_days: 900000,
          amount_31_60_days: 500000,
          amount_61_90_days: 200000,
          amount_above_90_days: 100000,
          last_payment_date: '2024-02-15',
          contact_person: 'Rajesh Kumar',
          payment_terms: 'Net 30'
        },
        {
          customer_id: 2,
          company_name: 'XYZ Corporation',
          current_outstanding: 1800000,
          credit_limit: 3000000,
          available_credit: 1200000,
          risk_category: 'low',
          current_amount: 1200000,
          amount_1_30_days: 400000,
          amount_31_60_days: 200000,
          amount_61_90_days: 0,
          amount_above_90_days: 0,
          last_payment_date: '2024-03-01',
          contact_person: 'Priya Sharma',
          payment_terms: 'Net 45'
        }
      ]);
    } catch (error) {
      console.error('Error fetching outstanding data:', error);
    }
  };

  const fetchFinancialAlerts = async () => {
    try {
      // Mock financial alerts
      setAlerts([
        {
          id: '1',
          type: 'overdue',
          severity: 'high',
          title: 'Overdue Invoices Alert',
          description: '15 invoices totaling ₹18.5L are overdue by more than 30 days',
          amount: 1850000,
          due_date: '2024-02-15',
          action_required: true,
          created_at: '2024-03-15T10:30:00Z'
        },
        {
          id: '2',
          type: 'credit_limit',
          severity: 'critical',
          title: 'Credit Limit Exceeded',
          description: '2 customers have exceeded their approved credit limits',
          action_required: true,
          created_at: '2024-03-15T09:45:00Z'
        },
        {
          id: '3',
          type: 'compliance',
          severity: 'medium',
          title: 'GST Return Due',
          description: 'GSTR-3B return due in 3 days',
          due_date: '2024-03-20',
          action_required: true,
          created_at: '2024-03-15T08:00:00Z'
        },
        {
          id: '4',
          type: 'cash_flow',
          severity: 'medium',
          title: 'Cash Flow Warning',
          description: 'Projected cash shortage in next 30 days',
          action_required: false,
          created_at: '2024-03-14T16:20:00Z'
        }
      ]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const getRiskCategoryColor = (category: string) => {
    switch (category) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'blocked': return 'error';
      default: return 'default';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <Schedule />;
      case 'credit_limit': return <Error />;
      case 'cash_flow': return <TrendingDown />;
      case 'compliance': return <Warning />;
      case 'budget': return <Assessment />;
      default: return <Info />;
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    } else {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  };

  const getTrendIcon = (direction?: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp fontSize="small" />;
      case 'down':
        return <TrendingDown fontSize="small" />;
      default:
        return <TrendingFlat fontSize="small" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Dashboard sx={{ fontSize: 40, color: 'primary.main' }} />
            Enterprise Financial Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time financial analytics and insights
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="current_month">This Month</MenuItem>
              <MenuItem value="last_month">Last Month</MenuItem>
              <MenuItem value="current_quarter">This Quarter</MenuItem>
              <MenuItem value="last_quarter">Last Quarter</MenuItem>
              <MenuItem value="current_year">This Year</MenuItem>
              <MenuItem value="last_year">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<FilterAlt />}
            onClick={() => setOpenFilterDialog(true)}
          >
            Filters
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchDashboardData}>
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<Download />}>
            Export
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" icon={<Dashboard />} iconPosition="start" />
          <Tab label="Cash Flow" icon={<Timeline />} iconPosition="start" />
          <Tab label="P&L Analysis" icon={<Assessment />} iconPosition="start" />
          <Tab label="Receivables" icon={<ReceiptLong />} iconPosition="start" />
          <Tab label="Alerts" icon={<Badge badgeContent={alerts.length} color="error"><Notifications /></Badge>} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* KPI Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {kpiData.map((kpi) => (
            <Grid item xs={12} sm={6} md={3} key={kpi.id}>
              <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        {kpi.label}
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {kpi.formatted_value}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {kpi.subtitle}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: `${kpi.color}.light`, color: `${kpi.color}.main` }}>
                      {kpi.icon}
                    </Avatar>
                  </Box>

                  {kpi.trend !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getTrendIcon(kpi.trend_direction)}
                      <Typography
                        variant="body2"
                        color={kpi.trend_direction === 'up' ? 'success.main' : 'error.main'}
                        sx={{ ml: 0.5, fontWeight: 'medium' }}
                      >
                        {Math.abs(kpi.trend)}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                        vs last month
                      </Typography>
                    </Box>
                  )}

                  {kpi.progress !== undefined && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Target Progress
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {kpi.progress.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(kpi.progress, 100)}
                        color={kpi.progress >= 100 ? 'error' : kpi.progress >= 80 ? 'success' : 'primary'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions and Recent Activity */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="outlined" startIcon={<Receipt />} fullWidth>
                    Create Invoice
                  </Button>
                  <Button variant="outlined" startIcon={<Payment />} fullWidth>
                    Record Payment
                  </Button>
                  <Button variant="outlined" startIcon={<AccountBalance />} fullWidth>
                    Bank Reconciliation
                  </Button>
                  <Button variant="outlined" startIcon={<Assessment />} fullWidth>
                    Financial Reports
                  </Button>
                  <Button variant="outlined" startIcon={<PieChart />} fullWidth>
                    Budget Analysis
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Financial Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="success.dark">₹1.25 Cr</Typography>
                      <Typography variant="body2" color="success.dark">Revenue</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.dark">₹37.5 L</Typography>
                      <Typography variant="body2" color="primary.dark">Profit</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="warning.dark">₹85 L</Typography>
                      <Typography variant="body2" color="warning.dark">Receivables</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="info.dark">87.5%</Typography>
                      <Typography variant="body2" color="info.dark">Collection</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Financial Alerts */}
        {outstandingData.filter(customer =>
          customer.risk_category === 'high' || customer.risk_category === 'blocked'
        ).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {outstandingData.filter(customer =>
                  customer.risk_category === 'high' || customer.risk_category === 'blocked'
                ).length} customers have high-risk outstanding amounts requiring immediate attention.
              </Typography>
            </Alert>
          )}

        {outstandingData.filter(customer =>
          customer.current_outstanding > customer.credit_limit * 0.8
        ).length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {outstandingData.filter(customer =>
                  customer.current_outstanding > customer.credit_limit * 0.8
                ).length} customers are approaching their credit limits.
              </Typography>
            </Alert>
          )}

        {/* Collection Performance Alert */}
        {salesSummary.length > 0 && salesSummary[0]?.collection_percentage < 70 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Current month collection rate: {salesSummary[0]?.collection_percentage.toFixed(1)}% (Target: 70%+)
            </Typography>
          </Alert>
        )}

        {/* Success Alert */}
        {outstandingData.length > 0 &&
          (outstandingData.filter(customer =>
            customer.risk_category === 'high' || customer.risk_category === 'blocked'
          ).length === 0) &&
          (outstandingData.filter(customer =>
            customer.current_outstanding > customer.credit_limit * 0.8
          ).length === 0) &&
          (salesSummary.length === 0 || salesSummary[0]?.collection_percentage >= 70) && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                All financial metrics within acceptable limits
              </Typography>
            </Alert>
          )}
      </TabPanel>

      {/* Cash Flow Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cash Flow Analysis
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Period</TableCell>
                        <TableCell align="right">Cash Inflow</TableCell>
                        <TableCell align="right">Cash Outflow</TableCell>
                        <TableCell align="right">Net Cash Flow</TableCell>
                        <TableCell align="right">Opening Balance</TableCell>
                        <TableCell align="right">Closing Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cashFlowData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            {row.month}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                            {formatCurrency(row.cash_in)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'medium' }}>
                            {formatCurrency(row.cash_out)}
                          </TableCell>
                          <TableCell align="right" sx={{
                            color: row.net_cash_flow >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}>
                            {formatCurrency(row.net_cash_flow)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.opening_balance)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(row.closing_balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* P&L Analysis Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Profit & Loss Analysis
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Current Month</TableCell>
                        <TableCell align="right">Previous Month</TableCell>
                        <TableCell align="right">YTD Current</TableCell>
                        <TableCell align="right">YTD Previous</TableCell>
                        <TableCell align="right">Variance %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitLossData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                            {row.category}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.current_month)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.previous_month)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(row.ytd_current)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.ytd_previous)}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${row.variance_percentage >= 0 ? '+' : ''}${row.variance_percentage.toFixed(1)}%`}
                              color={row.variance_percentage >= 0 ? 'success' : 'error'}
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
        </Grid>
      </TabPanel>

      {/* Receivables Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Customer Outstanding Analysis
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Total Outstanding</TableCell>
                        <TableCell align="right">Credit Limit</TableCell>
                        <TableCell>Risk Category</TableCell>
                        <TableCell align="right">0-30 Days</TableCell>
                        <TableCell align="right">31-60 Days</TableCell>
                        <TableCell align="right">60+ Days</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {outstandingData.map((customer) => (
                        <TableRow key={customer.customer_id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium" component="div">
                                {customer.company_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" component="div">
                                Terms: {customer.payment_terms}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(customer.current_outstanding)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(customer.credit_limit)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={customer.risk_category.toUpperCase()}
                              color={getRiskCategoryColor(customer.risk_category) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(customer.current_amount + customer.amount_1_30_days)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(customer.amount_31_60_days)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(customer.amount_61_90_days + customer.amount_above_90_days)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" component="div">
                              {customer.contact_person}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" component="div">
                              Last Payment: {customer.last_payment_date}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined">
                              Follow Up
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Alerts Tab */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Financial Alerts & Notifications
                </Typography>
                <List>
                  {alerts.map((alert) => (
                    <ListItem key={alert.id} divider>
                      <ListItemIcon>
                        <Avatar sx={{
                          bgcolor: `${getAlertSeverityColor(alert.severity)}.light`,
                          color: `${getAlertSeverityColor(alert.severity)}.main`,
                          width: 40,
                          height: 40
                        }}>
                          {getAlertIcon(alert.type)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {alert.title}
                            </Typography>
                            <Chip
                              label={alert.severity.toUpperCase()}
                              color={getAlertSeverityColor(alert.severity) as any}
                              size="small"
                            />
                            {alert.action_required && (
                              <Chip label="ACTION REQUIRED" color="error" size="small" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {alert.description}
                            </Typography>
                            {alert.amount && (
                              <Typography variant="body2" color="textSecondary">
                                Amount: {formatCurrency(alert.amount)}
                              </Typography>
                            )}
                            {alert.due_date && (
                              <Typography variant="body2" color="textSecondary">
                                Due: {new Date(alert.due_date).toLocaleDateString()}
                              </Typography>
                            )}
                            <Typography variant="caption" color="textSecondary">
                              Created: {new Date(alert.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      {alert.action_required && (
                        <Button variant="contained" size="small" color="primary">
                          Take Action
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Filter Dialog */}
      <Dialog open={openFilterDialog} onClose={() => setOpenFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Advanced Filters</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Currency</InputLabel>
                <Select defaultValue="INR">
                  <MenuItem value="INR">Indian Rupee (₹)</MenuItem>
                  <MenuItem value="USD">US Dollar ($)</MenuItem>
                  <MenuItem value="EUR">Euro (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Business Unit</InputLabel>
                <Select defaultValue="all">
                  <MenuItem value="all">All Units</MenuItem>
                  <MenuItem value="unit1">Manufacturing</MenuItem>
                  <MenuItem value="unit2">Services</MenuItem>
                  <MenuItem value="unit3">Trading</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFilterDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenFilterDialog(false)}>
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnterpriseFinancialDashboard;