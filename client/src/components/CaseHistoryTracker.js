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
  Divider
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
  Notes
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
  const [expanded, setExpanded] = useState(!compact);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch(`/api/case-history/${caseType}/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching case history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    const steps = workflowSteps[caseType] || [];
    return steps.findIndex(step => step.key === currentStatus);
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

  return (
    <Box>
      {compact && !expanded ? renderCompactView() : renderDetailedView()}
    </Box>
  );
};

export default CaseHistoryTracker;
