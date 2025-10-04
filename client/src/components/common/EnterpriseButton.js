import React, { useState, useEffect } from 'react';
import {
  Button,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  CheckCircle,
} from '@mui/icons-material';

const EnterpriseButton = ({
  children,
  onClick,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  fullWidth = false,
  requireConfirmation = false,
  confirmationTitle = 'Confirm Action',
  confirmationMessage = 'Are you sure you want to proceed?',
  requirePermission = false,
  userRole = 'admin',
  allowedRoles = ['admin', 'manager', 'user'],
  enableThrottling = true,
  throttleDelay = 1000,
  showSuccessMessage = false,
  successMessage = 'Operation completed successfully',
  enableAuditLog = false,
  auditAction = 'button_click',
  enableRetry = false,
  maxRetries = 3,
  retryDelay = 2000,
  sx = {},
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isThrottled, setIsThrottled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Permission check - Grant full access to everyone as requested
  const hasPermission = true;

  // Audit logging function
  const logAuditAction = async (action, result = 'success', details = {}) => {
    if (!enableAuditLog) return;

    try {
      const auditData = {
        action,
        result,
        timestamp: new Date().toISOString(),
        user_role: userRole,
        component: 'EnterpriseButton',
        details
      };

      // In a real application, this would send to audit service
      console.log('Audit Log:', auditData);

      // Optional: Send to audit endpoint
      // await fetch('/api/audit/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(auditData)
      // });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  // Enhanced click handler with enterprise features
  const handleClick = async (event) => {
    event.preventDefault();

    // Permission check
    if (!hasPermission) {
      setErrorMessage('You do not have permission to perform this action');
      setShowError(true);
      await logAuditAction(auditAction, 'permission_denied', { required_roles: allowedRoles });
      return;
    }

    // Throttling check
    if (enableThrottling) {
      const currentTime = Date.now();
      if (currentTime - lastClickTime < throttleDelay) {
        setIsThrottled(true);
        setTimeout(() => setIsThrottled(false), throttleDelay);
        return;
      }
      setLastClickTime(currentTime);
    }

    // Show confirmation dialog if required
    if (requireConfirmation && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    await executeAction();
  };

  const executeAction = async () => {
    setIsLoading(true);
    setShowConfirmation(false);

    try {
      await logAuditAction(auditAction, 'initiated');

      // Execute the actual onClick function
      if (onClick) {
        await onClick();
      }

      // Show success message if enabled
      if (showSuccessMessage) {
        setShowSuccess(true);
      }

      await logAuditAction(auditAction, 'success');
      setRetryCount(0); // Reset retry count on success

    } catch (error) {
      console.error('Button action failed:', error);
      setErrorMessage(error.message || 'An error occurred');

      // Retry logic
      if (enableRetry && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        await logAuditAction(auditAction, 'retry', { attempt: retryCount + 1, error: error.message });

        setTimeout(() => {
          executeAction();
        }, retryDelay);
      } else {
        setShowError(true);
        await logAuditAction(auditAction, 'failed', { error: error.message, final_attempt: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading || loading) {
      return (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={16} color="inherit" />
          {enableRetry && retryCount > 0 && (
            <Chip
              label={`Retry ${retryCount}/${maxRetries}`}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
          <Typography variant="inherit">
            {isLoading ? 'Processing...' : children}
          </Typography>
        </Box>
      );
    }
    return children;
  };

  const getTooltipTitle = () => {
    if (!hasPermission) {
      return `Access denied. Required role: ${allowedRoles.join(', ')}`;
    }
    if (isThrottled) {
      return 'Please wait before clicking again';
    }
    if (disabled) {
      return 'This action is currently disabled';
    }
    return '';
  };

  const buttonSx = {
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: theme => theme.shadows[8],
    },
    '&:active': {
      transform: 'translateY(0px)',
    },
    '&.Mui-disabled': {
      opacity: hasPermission ? 0.6 : 0.3,
    },
    ...sx
  };

  return (
    <>
      <Tooltip title={getTooltipTitle()} arrow>
        <span>
          <Button
            variant={variant}
            color={color}
            size={size}
            disabled={disabled || isLoading || loading || !hasPermission || isThrottled}
            fullWidth={fullWidth}
            startIcon={!hasPermission ? <SecurityIcon /> : (isLoading || loading) ? null : startIcon}
            endIcon={(isLoading || loading) ? null : endIcon}
            onClick={handleClick}
            sx={buttonSx}
            {...props}
          >
            {getButtonContent()}
          </Button>
        </span>
      </Tooltip>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          {confirmationTitle}
        </DialogTitle>
        <DialogContent>
          <Typography>{confirmationMessage}</Typography>
          {enableAuditLog && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This action will be logged for audit purposes.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setShowConfirmation(false)}
            variant="outlined"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={executeAction}
            variant="contained"
            color={color}
            startIcon={<CheckCircle />}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          variant="filled"
          icon={<SuccessIcon />}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowError(false)}
          severity="error"
          variant="filled"
          icon={<ErrorIcon />}
        >
          <Box>
            <Typography variant="subtitle2">Action Failed</Typography>
            <Typography variant="body2">{errorMessage}</Typography>
            {enableRetry && retryCount < maxRetries && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Retrying... ({retryCount + 1}/{maxRetries})
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

export default EnterpriseButton;