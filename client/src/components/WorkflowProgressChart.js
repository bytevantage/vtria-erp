import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  Error,
  ExpandMore,
  ExpandLess,
  ArrowForward,
  Business,
  Engineering,
  ShoppingCart,
  Receipt,
  LocalShipping,
  Inventory,
  Description,
  Assessment
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

const WorkflowProgressChart = ({ caseId, compact = false }) => {
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  const [error, setError] = useState(null);

  // Define workflow stages with icons and descriptions
  const workflowStages = [
    {
      code: 'EQ',
      name: 'Enquiry',
      description: 'Customer enquiry received',
      icon: <Business />,
      color: '#2196F3'
    },
    {
      code: 'ET',
      name: 'Estimation',
      description: 'Technical estimation prepared',
      icon: <Assessment />,
      color: '#FF9800'
    },
    {
      code: 'Q',
      name: 'Quotation',
      description: 'Customer quotation generated',
      icon: <Description />,
      color: '#4CAF50'
    },
    {
      code: 'SO',
      name: 'Sales Order',
      description: 'Sales order confirmed',
      icon: <ShoppingCart />,
      color: '#9C27B0'
    },
    {
      code: 'PR',
      name: 'Purchase Request',
      description: 'Purchase request created',
      icon: <Receipt />,
      color: '#FF5722'
    },
    {
      code: 'PO',
      name: 'Purchase Order',
      description: 'Purchase order sent to supplier',
      icon: <Receipt />,
      color: '#795548'
    },
    {
      code: 'PI',
      name: 'Purchase Invoice',
      description: 'Purchase invoice received',
      icon: <Receipt />,
      color: '#607D8B'
    },
    {
      code: 'GRN',
      name: 'Goods Receipt Note',
      description: 'Goods received from supplier',
      icon: <Inventory />,
      color: '#3F51B5'
    },
    {
      code: 'I',
      name: 'Invoice',
      description: 'Customer invoice generated',
      icon: <Receipt />,
      color: '#E91E63'
    },
    {
      code: 'DC',
      name: 'Delivery Challan',
      description: 'Delivery challan created',
      icon: <LocalShipping />,
      color: '#009688'
    }
  ];

  useEffect(() => {
    if (caseId) {
      fetchWorkflowProgress();
    }
  }, [caseId]);

  const fetchWorkflowProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.caseManagement.getWorkflowProgress(caseId);
      if (response.success) {
        setWorkflowData(response.data);
      } else {
        setError(response.message || 'Failed to load workflow progress');
      }
    } catch (error) {
      console.error('Error fetching workflow progress:', error);
      setError('Failed to load workflow progress');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not started';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStageStatus = (stage) => {
    if (stage.completed) return 'completed';
    const currentStage = workflowData?.workflow?.current_stage;
    if (stage.code === currentStage) return 'active';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'active': return <Schedule color="primary" />;
      case 'pending': return <RadioButtonUnchecked color="disabled" />;
      default: return <RadioButtonUnchecked color="disabled" />;
    }
  };

  const renderCompactView = () => {
    if (!workflowData) return null;

    const { workflow } = workflowData;
    const completedStages = workflow.stages.filter(s => s.completed).length;

    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Workflow Progress
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary">
              {completedStages}/{workflow.stages.length} stages
            </Typography>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={workflow.progress_percentage}
          sx={{ mb: 1, height: 8, borderRadius: 4 }}
        />

        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {workflow.stages.map((stage, index) => {
            const status = getStageStatus(stage);
            return (
              <Tooltip key={stage.code} title={`${stage.name}: ${stage.completed ? 'Completed' : 'Pending'}`}>
                <Chip
                  size="small"
                  icon={getStatusIcon(status)}
                  label={stage.code}
                  color={getStatusColor(status)}
                  variant={status === 'active' ? "filled" : "outlined"}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Paper>
    );
  };

  const renderDetailedView = () => {
    if (!workflowData) return null;

    const { case: caseInfo, workflow } = workflowData;

    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Case Workflow Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Case: {caseInfo.case_number} - {caseInfo.title}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="h4" color="primary" fontWeight="bold">
              {workflow.progress_percentage}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Complete
            </Typography>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={workflow.progress_percentage}
          sx={{ mb: 3, height: 12, borderRadius: 6 }}
        />

        <Grid container spacing={2}>
          {workflow.stages.map((stage, index) => {
            const status = getStageStatus(stage);
            const stageInfo = workflowStages.find(s => s.code === stage.code);

            return (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={stage.code}>
                <Card
                  sx={{
                    height: '100%',
                    border: status === 'active' ? '2px solid' : '1px solid',
                    borderColor: status === 'active' ? 'primary.main' : 'divider',
                    bgcolor: status === 'completed' ? 'success.light' : 'background.paper'
                  }}
                >
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        mx: 'auto',
                        mb: 1,
                        bgcolor: status === 'completed' ? 'success.main' : status === 'active' ? 'primary.main' : 'grey.400',
                        width: 40,
                        height: 40
                      }}
                    >
                      {stageInfo?.icon}
                    </Avatar>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {stage.code}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      {stageInfo?.name}
                    </Typography>

                    {getStatusIcon(status)}

                    {stage.completed && stage.data && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDate(stage.data.date)}
                        </Typography>
                        {stage.data.amount && (
                          <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold">
                            {formatCurrency(stage.data.amount)}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Current Stage Details */}
        <Box mt={3}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Current Stage: {workflow.current_stage_name}
          </Typography>

          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Chip
              icon={<Schedule />}
              label={`Current: ${workflow.current_stage}`}
              color="primary"
              variant="filled"
            />
            <Chip
              icon={<CheckCircle />}
              label={`${workflow.stages.filter(s => s.completed).length} of ${workflow.stages.length} completed`}
              color="success"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading workflow progress...
        </Typography>
        <LinearProgress sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Paper>
    );
  }

  if (!workflowData) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No workflow data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {compact && !expanded ? renderCompactView() : renderDetailedView()}
    </Box>
  );
};

export default WorkflowProgressChart;