import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Alert,
  Snackbar,
  LinearProgress,
  Backdrop,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import EnterpriseButton from './EnterpriseButton';

const EnterpriseForm = ({
  title,
  children,
  onSubmit,
  onCancel,
  loading = false,
  initialData = {},
  validationSchema = {},
  enableAutoSave = false,
  autoSaveInterval = 30000, // 30 seconds
  enableVersionControl = false,
  enableAuditLog = true,
  requireApproval = false,
  approverRoles = ['admin', 'manager'],
  currentUserRole = 'user',
  enableFieldLocking = false,
  lockedFields = [],
  enableProgressSaving = true,
  enableValidationOnChange = true,
  enableConfirmationOnExit = true,
  showFormProgress = true,
  maxFileSize = 5242880, // 5MB
  allowedFileTypes = ['image/*', '.pdf', '.doc', '.docx'],
  enableRealTimeValidation = true,
  enableDataRecovery = true,
  formId,
  sx = {},
  ...props
}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [formVersion, setFormVersion] = useState(1);
  const [formHistory, setFormHistory] = useState([]);
  const [validationProgress, setValidationProgress] = useState(0);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [recoveredData, setRecoveredData] = useState(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    if (!enableAutoSave || !isDirty) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        await saveFormProgress();
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        setAutoSaveStatus('error');
        console.error('Auto-save failed:', error);
      }
    }, autoSaveInterval);

    return () => clearTimeout(autoSaveTimer);
  }, [formData, isDirty, enableAutoSave, autoSaveInterval]);

  // Data recovery check on component mount
  useEffect(() => {
    if (enableDataRecovery && formId) {
      checkForRecoveredData();
    }
  }, [enableDataRecovery, formId]);

  // Form validation progress calculation
  useEffect(() => {
    if (showFormProgress) {
      calculateValidationProgress();
    }
  }, [formData, validationSchema, showFormProgress]);

  const checkForRecoveredData = async () => {
    try {
      const recovered = localStorage.getItem(`form_recovery_${formId}`);
      if (recovered) {
        const parsedData = JSON.parse(recovered);
        if (parsedData.timestamp && Date.now() - parsedData.timestamp < 86400000) { // 24 hours
          setRecoveredData(parsedData.data);
          setShowRecoveryDialog(true);
        } else {
          localStorage.removeItem(`form_recovery_${formId}`);
        }
      }
    } catch (error) {
      console.error('Failed to check recovered data:', error);
    }
  };

  const saveFormProgress = async () => {
    if (!enableProgressSaving) return;

    try {
      if (formId) {
        localStorage.setItem(`form_recovery_${formId}`, JSON.stringify({
          data: formData,
          timestamp: Date.now(),
          version: formVersion
        }));
      }

      // Optional: Save to server
      // await fetch('/api/forms/progress', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ formId, data: formData, version: formVersion })
      // });
    } catch (error) {
      throw new Error('Failed to save form progress');
    }
  };

  const validateField = (fieldName, value) => {
    const fieldSchema = validationSchema[fieldName];
    if (!fieldSchema) return null;

    // Required field validation
    if (fieldSchema.required && (!value || value.toString().trim() === '')) {
      return `${fieldSchema.label || fieldName} is required`;
    }

    // Type validation
    if (value && fieldSchema.type) {
      switch (fieldSchema.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'phone':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            return 'Please enter a valid phone number';
          }
          break;
        case 'number':
          if (isNaN(value)) {
            return 'Please enter a valid number';
          }
          break;
      }
    }

    // Custom validation
    if (fieldSchema.validate && typeof fieldSchema.validate === 'function') {
      return fieldSchema.validate(value, formData);
    }

    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    let validFieldsCount = 0;
    const totalFields = Object.keys(validationSchema).length;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      } else {
        validFieldsCount++;
      }
    });

    setErrors(newErrors);
    setValidationProgress(totalFields > 0 ? (validFieldsCount / totalFields) * 100 : 100);
    return Object.keys(newErrors).length === 0;
  };

  const calculateValidationProgress = () => {
    if (!validationSchema || Object.keys(validationSchema).length === 0) {
      setValidationProgress(100);
      return;
    }

    let validFieldsCount = 0;
    const totalFields = Object.keys(validationSchema).length;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (!error) {
        validFieldsCount++;
      }
    });

    setValidationProgress((validFieldsCount / totalFields) * 100);
  };

  const logFormAction = async (action, details = {}) => {
    if (!enableAuditLog) return;

    const auditData = {
      action,
      form_id: formId,
      user_role: currentUserRole,
      timestamp: new Date().toISOString(),
      form_version: formVersion,
      details: {
        ...details,
        form_title: title,
        fields_changed: Object.keys(formData).length
      }
    };

    console.log('Form Audit Log:', auditData);
    
    // Optional: Send to audit service
    // await fetch('/api/audit/form-actions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(auditData)
    // });
  };

  const handleFieldChange = (fieldName, value) => {
    const isLocked = enableFieldLocking && lockedFields.includes(fieldName);
    if (isLocked) return;

    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);

    // Real-time validation
    if (enableValidationOnChange) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if approval is required
    if (requireApproval && !approverRoles.includes(currentUserRole)) {
      setShowApprovalDialog(true);
      return;
    }

    await submitForm();
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    
    try {
      await logFormAction('form_submitted', { validation_progress: validationProgress });
      
      if (enableVersionControl) {
        setFormHistory(prev => [...prev, { version: formVersion, data: { ...formData }, timestamp: new Date() }]);
        setFormVersion(prev => prev + 1);
      }

      await onSubmit(formData);
      
      // Clear recovery data on successful submit
      if (formId) {
        localStorage.removeItem(`form_recovery_${formId}`);
      }
      
      setIsDirty(false);
      await logFormAction('form_submitted_success');
      
    } catch (error) {
      await logFormAction('form_submitted_error', { error: error.message });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && enableConfirmationOnExit) {
      setShowExitConfirmation(true);
    } else {
      onCancel && onCancel();
    }
  };

  const handleRecoverData = () => {
    setFormData(recoveredData);
    setIsDirty(true);
    setShowRecoveryDialog(false);
    localStorage.removeItem(`form_recovery_${formId}`);
  };

  const getAutoSaveStatusColor = () => {
    switch (autoSaveStatus) {
      case 'saving': return 'warning';
      case 'saved': return 'success';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getAutoSaveStatusText = () => {
    switch (autoSaveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Save failed';
      default: return '';
    }
  };

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          position: 'relative',
          overflow: 'hidden',
          ...sx 
        }}
        {...props}
      >
        {/* Loading Backdrop */}
        <Backdrop
          open={loading || isSubmitting}
          sx={{ 
            position: 'absolute', 
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          <Box textAlign="center">
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              {isSubmitting ? 'Submitting form...' : 'Loading...'}
            </Typography>
          </Box>
        </Backdrop>

        {/* Form Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2" fontWeight="600">
            {title}
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            {/* Form Status Indicators */}
            {enableAutoSave && autoSaveStatus !== 'idle' && (
              <Chip
                label={getAutoSaveStatusText()}
                color={getAutoSaveStatusColor()}
                size="small"
                variant="outlined"
              />
            )}
            
            {enableVersionControl && formVersion > 1 && (
              <Chip
                label={`v${formVersion}`}
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
            
            {isDirty && (
              <Chip
                label="Unsaved changes"
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {/* Form Progress */}
        {showFormProgress && (
          <Box mb={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Form Completion
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(validationProgress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={validationProgress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {children}
          
          <Divider sx={{ my: 3 }} />
          
          {/* Form Actions */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={2}>
              <EnterpriseButton
                variant="outlined"
                onClick={handleCancel}
                startIcon={<CancelIcon />}
                disabled={loading || isSubmitting}
              >
                Cancel
              </EnterpriseButton>
              
              {enableVersionControl && formHistory.length > 0 && (
                <Tooltip title="View form history">
                  <IconButton size="small">
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            
            <Box display="flex" gap={2}>
              {enableAutoSave && (
                <EnterpriseButton
                  variant="outlined"
                  onClick={saveFormProgress}
                  startIcon={<SaveIcon />}
                  disabled={!isDirty || loading || isSubmitting}
                  showSuccessMessage
                  successMessage="Progress saved successfully"
                >
                  Save Progress
                </EnterpriseButton>
              )}
              
              <EnterpriseButton
                type="submit"
                variant="contained"
                color="primary"
                loading={isSubmitting}
                disabled={loading || validationProgress < 100}
                startIcon={<SuccessIcon />}
                requireConfirmation={requireApproval && !approverRoles.includes(currentUserRole)}
                confirmationTitle="Submit for Approval"
                confirmationMessage="This form will be submitted for approval. You may not be able to edit it once submitted."
                enableAuditLog
                auditAction="form_submission"
                enableThrottling
              >
                {requireApproval && !approverRoles.includes(currentUserRole) 
                  ? 'Submit for Approval' 
                  : 'Submit Form'
                }
              </EnterpriseButton>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* Data Recovery Dialog */}
      <Dialog
        open={showRecoveryDialog}
        onClose={() => setShowRecoveryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="info" />
          Recover Previous Data
        </DialogTitle>
        <DialogContent>
          <Typography>
            We found previously saved data for this form. Would you like to recover it?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            This will replace any current form data with the recovered version.
          </Alert>
        </DialogContent>
        <DialogActions>
          <EnterpriseButton
            onClick={() => setShowRecoveryDialog(false)}
            variant="outlined"
          >
            Discard
          </EnterpriseButton>
          <EnterpriseButton
            onClick={handleRecoverData}
            variant="contained"
            startIcon={<RefreshIcon />}
          >
            Recover Data
          </EnterpriseButton>
        </DialogActions>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog
        open={showExitConfirmation}
        onClose={() => setShowExitConfirmation(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to leave without saving?
          </Typography>
        </DialogContent>
        <DialogActions>
          <EnterpriseButton
            onClick={() => setShowExitConfirmation(false)}
            variant="outlined"
          >
            Stay
          </EnterpriseButton>
          <EnterpriseButton
            onClick={() => {
              setShowExitConfirmation(false);
              onCancel && onCancel();
            }}
            variant="contained"
            color="error"
          >
            Leave Without Saving
          </EnterpriseButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnterpriseForm;