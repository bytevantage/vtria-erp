import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const AssigneeReport = () => {
  const [assigneeData, setAssigneeData] = useState([]);
  const [workloadSummary, setWorkloadSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const workflowStates = [
    { key: 'enquiry', label: 'Sales Enquiry', color: '#2196f3' },
    { key: 'estimation', label: 'Estimation', color: '#ff9800' },
    { key: 'quotation', label: 'Quotation', color: '#9c27b0' },
    { key: 'order', label: 'Sales Order', color: '#4caf50' },
    { key: 'production', label: 'Production', color: '#f44336' },
    { key: 'delivery', label: 'Delivery', color: '#607d8b' }
  ];

  useEffect(() => {
    fetchAssigneeReport();
  }, []);

  const fetchAssigneeReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data for each workflow state
      const statePromises = workflowStates.map(async (state) => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/case-management/state/${state.key}`);
          return {
            state: state.key,
            label: state.label,
            color: state.color,
            cases: response.data.success ? response.data.data : []
          };
        } catch (error) {
          console.error(`Error fetching ${state.key} cases:`, error);
          return {
            state: state.key,
            label: state.label,
            color: state.color,
            cases: []
          };
        }
      });

      const stateData = await Promise.all(statePromises);
      
      // Process assignee workload data
      const assigneeMap = new Map();
      const workloadMap = {};

      stateData.forEach(({ state, label, color, cases }) => {
        workloadMap[state] = { total: cases.length, assigned: 0, unassigned: 0 };
        
        cases.forEach(caseItem => {
          const assigneeName = caseItem.assigned_to_name || 'Unassigned';
          const assigneeRole = caseItem.assigned_to_role || 'Unknown';
          
          if (assigneeName === 'Unassigned') {
            workloadMap[state].unassigned++;
            return;
          }

          workloadMap[state].assigned++;
          
          if (!assigneeMap.has(assigneeName)) {
            assigneeMap.set(assigneeName, {
              name: assigneeName,
              role: assigneeRole,
              totalCases: 0,
              casesByState: {},
              cases: []
            });
          }

          const assigneeData = assigneeMap.get(assigneeName);
          assigneeData.totalCases++;
          assigneeData.casesByState[state] = (assigneeData.casesByState[state] || 0) + 1;
          assigneeData.cases.push({
            ...caseItem,
            currentState: state,
            stateLabel: label,
            stateColor: color
          });
        });
      });

      setAssigneeData(Array.from(assigneeMap.values()).sort((a, b) => b.totalCases - a.totalCases));
      setWorkloadSummary(workloadMap);

    } catch (error) {
      console.error('Error fetching assignee report:', error);
      setError('Failed to load assignee report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStateColor = (state) => {
    const stateObj = workflowStates.find(s => s.key === state);
    return stateObj ? stateObj.color : '#666';
  };

  const calculateWorkloadPercentage = (assigneeCases, totalCases) => {
    return totalCases > 0 ? Math.round((assigneeCases / totalCases) * 100) : 0;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <ReportIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Assignee Workload Report
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Workload Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {workflowStates.map((state) => {
          const workload = workloadSummary[state.key] || { total: 0, assigned: 0, unassigned: 0 };
          const assignedPercentage = workload.total > 0 ? Math.round((workload.assigned / workload.total) * 100) : 0;
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={2} key={state.key}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: state.color,
                        mr: 1
                      }} 
                    />
                    <Typography variant="subtitle2" sx={{ fontSize: '0.85rem' }}>
                      {state.label}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {workload.total}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                    Assigned: {workload.assigned} ({assignedPercentage}%)
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={assignedPercentage}
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: state.color
                      }
                    }}
                  />
                  {workload.unassigned > 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {workload.unassigned} unassigned
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Assignee Details */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Team Member Workload Distribution
          </Typography>
          
          {assigneeData.length === 0 ? (
            <Box textAlign="center" py={4}>
              <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No assigned cases found
              </Typography>
            </Box>
          ) : (
            assigneeData.map((assignee, index) => {
              const totalCasesAcrossSystem = Object.values(workloadSummary).reduce((sum, w) => sum + w.total, 0);
              const workloadPercentage = calculateWorkloadPercentage(assignee.totalCases, totalCasesAcrossSystem);
              
              return (
                <Accordion key={assignee.name} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Avatar sx={{ mr: 2, bgcolor: getStateColor('enquiry') }}>
                        {getInitials(assignee.name)}
                      </Avatar>
                      <Box flexGrow={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {assignee.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {assignee.role?.replace('-', ' ').toUpperCase()} • {assignee.totalCases} cases ({workloadPercentage}% of total)
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        {workflowStates.map(state => {
                          const count = assignee.casesByState[state.key] || 0;
                          return count > 0 ? (
                            <Chip
                              key={state.key}
                              label={`${state.label}: ${count}`}
                              size="small"
                              sx={{ 
                                backgroundColor: state.color, 
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          ) : null;
                        })}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Case Number</TableCell>
                            <TableCell>Client</TableCell>
                            <TableCell>Project</TableCell>
                            <TableCell>Current State</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {assignee.cases.map((caseItem) => (
                            <TableRow key={caseItem.case_number}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {caseItem.case_number}
                                </Typography>
                              </TableCell>
                              <TableCell>{caseItem.client_name}</TableCell>
                              <TableCell>{caseItem.project_name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={caseItem.stateLabel}
                                  size="small"
                                  sx={{ 
                                    backgroundColor: caseItem.stateColor,
                                    color: 'white'
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(caseItem.created_at).toLocaleDateString('en-IN')}
                              </TableCell>
                              <TableCell>
                                <Tooltip title="View Case Details">
                                  <IconButton size="small">
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AssigneeReport;
