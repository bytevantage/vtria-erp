/**
 * Workflow Chart Component for VTRIA ERP Dashboard
 * Displays horizontal flowchart visualization of case/ticket progress using Chart.js
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, handleApiError, handleApiResponse } from '../../services/apiService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const WorkflowChart = () => {
  const { user, canViewAllItems } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [chartData, setChartData] = useState({
    cases: {
      workflow: null,
      timeline: null,
      status: null
    },
    tickets: {
      workflow: null,
      timeline: null,
      status: null
    }
  });

  useEffect(() => {
    fetchChartData();
  }, [timeRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        days: parseInt(timeRange),
        location_id: canViewAllItems() ? undefined : user?.location_id
      };

      // Fetch case workflow data
      const caseWorkflowResponse = await apiService.dashboard.getCaseWorkflow(params);
      const caseWorkflowData = handleApiResponse(caseWorkflowResponse);

      // Fetch case timeline data
      const caseTimelineResponse = await apiService.dashboard.getCaseTimeline(params);
      const caseTimelineData = handleApiResponse(caseTimelineResponse);

      // Fetch ticket workflow data
      const ticketWorkflowResponse = await apiService.dashboard.getTicketWorkflow(params);
      const ticketWorkflowData = handleApiResponse(ticketWorkflowResponse);

      // Fetch ticket timeline data
      const ticketTimelineResponse = await apiService.dashboard.getTicketTimeline(params);
      const ticketTimelineData = handleApiResponse(ticketTimelineResponse);

      // Process and set chart data
      setChartData({
        cases: {
          workflow: processCaseWorkflowData(caseWorkflowData.data),
          timeline: processCaseTimelineData(caseTimelineData.data),
          status: processCaseStatusData(caseWorkflowData.data)
        },
        tickets: {
          workflow: processTicketWorkflowData(ticketWorkflowData.data),
          timeline: processTicketTimelineData(ticketTimelineData.data),
          status: processTicketStatusData(ticketWorkflowData.data)
        }
      });

    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const processCaseWorkflowData = (data) => {
    if (!data || !data.workflow_progress) return null;

    const stages = [
      'Enquiry',
      'Estimation',
      'Quotation',
      'Purchase Enquiry',
      'PO/PI',
      'GRN',
      'Manufacturing',
      'Invoicing',
      'Closure'
    ];

    const progress = data.workflow_progress;
    const counts = stages.map(stage => {
      const key = stage.toLowerCase().replace(/[^a-z]/g, '_');
      return progress[key] || 0;
    });

    return {
      labels: stages,
      datasets: [
        {
          label: 'Cases in Stage',
          data: counts,
          backgroundColor: [
            '#2196f3', '#ff9800', '#9c27b0', '#607d8b',
            '#795548', '#3f51b5', '#e91e63', '#009688', '#4caf50'
          ],
          borderColor: [
            '#1976d2', '#f57c00', '#7b1fa2', '#455a64',
            '#5d4037', '#303f9f', '#c2185b', '#00796b', '#388e3c'
          ],
          borderWidth: 2,
          borderRadius: 4
        }
      ]
    };
  };

  const processTicketWorkflowData = (data) => {
    if (!data || !data.workflow_progress) return null;

    const stages = ['Support Ticket', 'Diagnosis', 'Resolution', 'Closure'];
    const progress = data.workflow_progress;
    const counts = stages.map(stage => {
      const key = stage.toLowerCase().replace(/[^a-z]/g, '_');
      return progress[key] || 0;
    });

    return {
      labels: stages,
      datasets: [
        {
          label: 'Tickets in Stage',
          data: counts,
          backgroundColor: ['#2196f3', '#ff9800', '#9c27b0', '#4caf50'],
          borderColor: ['#1976d2', '#f57c00', '#7b1fa2', '#388e3c'],
          borderWidth: 2,
          borderRadius: 4
        }
      ]
    };
  };

  const processCaseTimelineData = (data) => {
    if (!data || !data.daily_counts) return null;

    const dailyCounts = data.daily_counts;
    const labels = Object.keys(dailyCounts).sort();
    const createdData = labels.map(date => dailyCounts[date].created || 0);
    const closedData = labels.map(date => dailyCounts[date].closed || 0);

    return {
      labels: labels.map(date => new Date(date).toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      })),
      datasets: [
        {
          label: 'Cases Created',
          data: createdData,
          backgroundColor: '#2196f320',
          borderColor: '#2196f3',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'Cases Closed',
          data: closedData,
          backgroundColor: '#4caf5020',
          borderColor: '#4caf50',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    };
  };

  const processTicketTimelineData = (data) => {
    if (!data || !data.daily_counts) return null;

    const dailyCounts = data.daily_counts;
    const labels = Object.keys(dailyCounts).sort();
    const createdData = labels.map(date => dailyCounts[date].created || 0);
    const resolvedData = labels.map(date => dailyCounts[date].resolved || 0);

    return {
      labels: labels.map(date => new Date(date).toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      })),
      datasets: [
        {
          label: 'Tickets Created',
          data: createdData,
          backgroundColor: '#ff980020',
          borderColor: '#ff9800',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'Tickets Resolved',
          data: resolvedData,
          backgroundColor: '#4caf5020',
          borderColor: '#4caf50',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    };
  };

  const processCaseStatusData = (data) => {
    if (!data || !data.by_status) return null;

    const statusData = data.by_status;
    const labels = Object.keys(statusData).filter(key => key !== 'total');
    const values = labels.map(label => statusData[label]);

    return {
      labels: labels.map(label => label.replace('_', ' ').toUpperCase()),
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#2196f3', '#ff9800', '#9c27b0', '#607d8b',
            '#795548', '#3f51b5', '#e91e63', '#009688', '#4caf50'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const processTicketStatusData = (data) => {
    if (!data || !data.by_status) return null;

    const statusData = data.by_status;
    const labels = Object.keys(statusData).filter(key => key !== 'total');
    const values = labels.map(label => statusData[label]);

    return {
      labels: labels.map(label => label.replace('_', ' ').toUpperCase()),
      datasets: [
        {
          data: values,
          backgroundColor: ['#2196f3', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#607d8b'],
          borderWidth: 2
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white'
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={60} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error"
            action={
              <IconButton color="inherit" size="small" onClick={fetchChartData}>
                <RefreshIcon />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const currentData = activeTab === 0 ? chartData.cases : chartData.tickets;
  const currentType = activeTab === 0 ? 'Cases' : 'Tickets';

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Workflow Analytics
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchChartData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Cases" icon={<BarChartIcon />} />
          <Tab label="Tickets" icon={<TimelineIcon />} />
        </Tabs>

        {/* Charts Grid */}
        <Grid container spacing={3}>
          {/* Workflow Progress Chart */}
          <Grid item xs={12} lg={8}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {currentType} Workflow Progress
                </Typography>
                <Box height={300}>
                  {currentData.workflow ? (
                    <Bar data={currentData.workflow} options={chartOptions} />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">No workflow data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Status Distribution */}
          <Grid item xs={12} lg={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {currentType} Status Distribution
                </Typography>
                <Box height={300}>
                  {currentData.status ? (
                    <Doughnut data={currentData.status} options={doughnutOptions} />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">No status data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline Chart */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {currentType} Timeline - Created vs {activeTab === 0 ? 'Closed' : 'Resolved'}
                </Typography>
                <Box height={300}>
                  {currentData.timeline ? (
                    <Bar 
                      data={currentData.timeline} 
                      options={{
                        ...chartOptions,
                        scales: {
                          ...chartOptions.scales,
                          x: {
                            ...chartOptions.scales.x,
                            stacked: false
                          },
                          y: {
                            ...chartOptions.scales.y,
                            stacked: false
                          }
                        }
                      }} 
                    />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">No timeline data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default WorkflowChart;
