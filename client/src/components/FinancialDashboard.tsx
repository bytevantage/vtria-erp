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
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Payment,
  Warning,
  Assessment,
} from '@mui/icons-material';

interface FinancialKPI {
  label: string;
  value: number;
  formatted_value: string;
  trend?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error';
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
}

interface SalesSummary {
  year: number;
  month: number;
  year_month: string;
  total_invoices: number;
  total_subtotal: number;
  total_tax: number;
  total_amount: number;
  total_collected: number;
  total_outstanding: number;
  collection_percentage: number;
}

interface GSTSummary {
  year: number;
  month: number;
  year_month: string;
  taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_cess: number;
  total_gst: number;
  total_invoices: number;
}

const FinancialDashboard: React.FC = () => {
  const [kpiData, setKpiData] = useState<FinancialKPI[]>([]);
  const [outstandingData, setOutstandingData] = useState<CustomerOutstanding[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [gstSummary, setGstSummary] = useState<GSTSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIData(),
        fetchOutstandingData(),
        fetchSalesSummary(),
        fetchGSTSummary(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIData = async () => {
    // In a real implementation, you would fetch this from your backend
    // For now, we'll use mock data
    setKpiData([
      {
        label: 'Total Revenue (This Month)',
        value: 2500000,
        formatted_value: '₹25,00,000',
        trend: 12.5,
        trend_direction: 'up',
        color: 'success'
      },
      {
        label: 'Outstanding Amount',
        value: 1200000,
        formatted_value: '₹12,00,000',
        trend: -8.2,
        trend_direction: 'down',
        color: 'warning'
      },
      {
        label: 'Collection Efficiency',
        value: 87.5,
        formatted_value: '87.5%',
        trend: 3.1,
        trend_direction: 'up',
        color: 'primary'
      },
      {
        label: 'Overdue Amount',
        value: 350000,
        formatted_value: '₹3,50,000',
        trend: 15.8,
        trend_direction: 'up',
        color: 'error'
      }
    ]);
  };

  const fetchOutstandingData = async () => {
    try {
      const response = await fetch('/api/financial/reports/outstanding', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setOutstandingData(result.data.slice(0, 10)); // Top 10
      }
    } catch (error) {
      console.error('Error fetching outstanding data:', error);
    }
  };

  const fetchSalesSummary = async () => {
    try {
      const response = await fetch('/api/financial/reports/sales-summary?month_count=6', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSalesSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching sales summary:', error);
    }
  };

  const fetchGSTSummary = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/financial/reports/gst-summary?year=${currentYear}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setGstSummary(result.data.slice(0, 3)); // Last 3 months
      }
    } catch (error) {
      console.error('Error fetching GST summary:', error);
    }
  };

  const getRiskCategoryColor = (category: string) => {
    switch (category) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'blocked':
        return 'error';
      default:
        return 'default';
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const getTrendIcon = (direction?: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp fontSize="small" />;
      case 'down':
        return <TrendingDown fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Financial Dashboard
        </Typography>
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
          </Select>
        </FormControl>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpiData.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {kpi.label}
                    </Typography>
                    <Typography variant="h5" component="div">
                      {kpi.formatted_value}
                    </Typography>
                    {kpi.trend && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {getTrendIcon(kpi.trend_direction)}
                        <Typography
                          variant="body2"
                          color={kpi.trend_direction === 'up' ? 'success.main' : 'error.main'}
                          sx={{ ml: 0.5 }}
                        >
                          {Math.abs(kpi.trend)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: `${kpi.color}.light` }}>
                    <Assessment sx={{ color: `${kpi.color}.main` }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Customer Outstanding */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Outstanding Analysis
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                      <TableCell align="right">Credit Limit</TableCell>
                      <TableCell>Risk</TableCell>
                      <TableCell align="right">0-30 Days</TableCell>
                      <TableCell align="right">31-60 Days</TableCell>
                      <TableCell align="right">60+ Days</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outstandingData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No outstanding data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      outstandingData.map((customer) => (
                        <TableRow key={customer.customer_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {customer.company_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              ₹{customer.current_outstanding.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ₹{customer.credit_limit.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={customer.risk_category.toUpperCase()}
                              color={getRiskCategoryColor(customer.risk_category) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            ₹{(customer.current_amount + customer.amount_1_30_days).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell align="right">
                            ₹{customer.amount_31_60_days.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell align="right">
                            ₹{(customer.amount_61_90_days + customer.amount_above_90_days).toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Receipt />}
                  fullWidth
                  onClick={() => window.location.href = '/financial/invoices'}
                >
                  Create Invoice
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Payment />}
                  fullWidth
                  onClick={() => window.location.href = '/financial/payments'}
                >
                  Record Payment
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AccountBalance />}
                  fullWidth
                >
                  Bank Reconciliation
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assessment />}
                  fullWidth
                >
                  Generate Reports
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financial Alerts
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Alert severity="warning" size="small">
                  <Typography variant="body2">
                    15 invoices are overdue (₹5,45,000)
                  </Typography>
                </Alert>
                <Alert severity="info" size="small">
                  <Typography variant="body2">
                    GST return due in 3 days
                  </Typography>
                </Alert>
                <Alert severity="error" size="small">
                  <Typography variant="body2">
                    2 customers exceeded credit limit
                  </Typography>
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Sales Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Invoices</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Collected</TableCell>
                      <TableCell align="right">Collection %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesSummary.map((summary) => (
                      <TableRow key={summary.year_month}>
                        <TableCell>
                          {getMonthName(summary.month)} {summary.year}
                        </TableCell>
                        <TableCell align="right">{summary.total_invoices}</TableCell>
                        <TableCell align="right">
                          ₹{summary.total_amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right">
                          ₹{summary.total_collected.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${summary.collection_percentage}%`}
                            color={summary.collection_percentage >= 80 ? 'success' : 
                                   summary.collection_percentage >= 60 ? 'warning' : 'error'}
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

        {/* GST Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                GST Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Taxable Value</TableCell>
                      <TableCell align="right">CGST</TableCell>
                      <TableCell align="right">SGST</TableCell>
                      <TableCell align="right">IGST</TableCell>
                      <TableCell align="right">Total GST</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gstSummary.map((summary) => (
                      <TableRow key={summary.year_month}>
                        <TableCell>
                          {getMonthName(summary.month)} {summary.year}
                        </TableCell>
                        <TableCell align="right">
                          ₹{summary.taxable_value.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right">
                          ₹{summary.total_cgst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right">
                          ₹{summary.total_sgst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right">
                          ₹{summary.total_igst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          ₹{summary.total_gst.toLocaleString('en-IN')}
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
    </Box>
  );
};

export default FinancialDashboard;