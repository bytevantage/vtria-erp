import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    totalEstimations: 0,
    totalQuotations: 0,
    totalManufacturing: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for VTRIA Engineering Solutions
      setStats({
        totalEnquiries: 45,
        totalEstimations: 23,
        totalQuotations: 18,
        totalManufacturing: 8,
      });

      setRecentActivity([
        { id: 1, action: 'New enquiry: Control Panel for Rolling Mill', time: '2 hours ago', user: 'Rajesh Kumar' },
        { id: 2, action: 'Estimation completed for HVAC System', time: '4 hours ago', user: 'Design Team A' },
        { id: 3, action: 'Quotation approved for Ceiling Fans', time: '6 hours ago', user: 'Admin Sales' },
        { id: 4, action: 'Manufacturing started for Auto Plant Project', time: '1 day ago', user: 'Production Team' },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Enquiries',
        data: [12, 19, 15, 8, 12, 10],
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Quotations',
        data: [8, 15, 12, 6, 9, 7],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Manufacturing',
        data: [3, 8, 6, 4, 5, 3],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
          display: true,
          text: 'VTRIA Business Activity - Monthly Trends',
        },
    },
  };

  const StatCard = ({ title, value, color }) => (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" style={{ color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        VTRIA Engineering Solutions - Dashboard
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Industrial Automation | Electrical Control Panels | HVAC | Refrigeration | Ceiling Fans
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Enquiries" value={stats.totalEnquiries} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Estimations" value={stats.totalEstimations} color="#388e3c" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Quotations" value={stats.totalQuotations} color="#f57c00" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="In Manufacturing" value={stats.totalManufacturing} color="#7b1fa2" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity Chart
              </Typography>
              <Bar data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>User</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell>{activity.time}</TableCell>
                        <TableCell>{activity.user}</TableCell>
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

export default Dashboard;
