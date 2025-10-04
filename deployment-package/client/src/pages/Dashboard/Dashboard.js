/**
 * Dashboard Page for VTRIA ERP
 * Main overview with charts and key metrics
 */

import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip
} from '@mui/material';
import {
  Assignment,
  Inventory,
  People,
  TrendingUp,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import SystemStatus from '../../components/SystemStatus/SystemStatus';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Sample data - replace with real API calls
const dashboardData = {
  metrics: {
    totalCases: 156,
    openCases: 42,
    stockItems: 1247,
    lowStockItems: 23,
    activeUsers: 18,
    resolvedCases: 114
  },
  casesByStatus: {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{
      data: [42, 28, 114, 86],
      backgroundColor: ['#ff6384', '#36a2eb', '#4bc0c0', '#9966ff']
    }]
  },
  stockByLocation: {
    labels: ['Mangalore', 'Bangalore', 'Pune'],
    datasets: [{
      label: 'Stock Items',
      data: [456, 523, 268],
      backgroundColor: '#36a2eb'
    }]
  },
  monthlyTrends: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Cases Resolved',
      data: [12, 19, 15, 25, 22, 18],
      borderColor: '#4bc0c0',
      backgroundColor: 'rgba(75, 192, 192, 0.2)'
    }]
  }
};

const MetricCard = ({ title, value, icon, color, trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
              <Typography variant="body2" color="success.main">
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ color: color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Welcome to VTRIA ERP - Engineering Solutions Management
      </Typography>

      {/* System Status */}
      <Box sx={{ mb: 3 }}>
        <SystemStatus />
      </Box>
      
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Cases"
            value={dashboardData.metrics.totalCases}
            icon={<Assignment sx={{ fontSize: 40 }} />}
            color="primary.main"
            trend="+12% this month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Open Cases"
            value={dashboardData.metrics.openCases}
            icon={<Warning sx={{ fontSize: 40 }} />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Stock Items"
            value={dashboardData.metrics.stockItems}
            icon={<Inventory sx={{ fontSize: 40 }} />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Users"
            value={dashboardData.metrics.activeUsers}
            icon={<People sx={{ fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Cases by Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Cases by Status
            </Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut data={dashboardData.casesByStatus} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Stock by Location */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Stock Distribution by Location
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={dashboardData.stockByLocation} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Monthly Trends */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Case Resolution Trends
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line data={dashboardData.monthlyTrends} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<Assignment />}
                label="Create New Case"
                clickable
                color="primary"
              />
              <Chip
                icon={<Inventory />}
                label="Update Stock"
                clickable
                color="secondary"
              />
              <Chip
                icon={<CheckCircle />}
                label="Mark Cases Complete"
                clickable
                color="success"
              />
              <Chip
                icon={<Warning />}
                label={`${dashboardData.metrics.lowStockItems} Low Stock Items`}
                clickable
                color="warning"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
