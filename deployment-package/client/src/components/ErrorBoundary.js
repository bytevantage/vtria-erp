import React, { Component } from 'react';
import { Box, Button, Typography, Alert, Paper } from '@mui/material';
import { Refresh as RefreshIcon, ErrorOutline as ErrorIcon } from '@mui/icons-material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // Call the onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error, errorInfo, timestamp } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback({ error, errorInfo, onRetry: this.handleReset }) 
          : fallback;
      }

      // Default error UI
      return (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            maxWidth: 600, 
            mx: 'auto', 
            my: 4,
            border: '1px solid',
            borderColor: 'error.light',
            borderRadius: 2
          }}
        >
          <Box textAlign="center" mb={3}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We're sorry, but an unexpected error occurred. Our team has been notified.
            </Typography>
            
            {showDetails && error && (
              <Box 
                component="details" 
                sx={{ 
                  textAlign: 'left', 
                  mt: 3, 
                  p: 2, 
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: 1 }}>
                  Error Details
                </summary>
                <Typography variant="caption" component="div">
                  <strong>Error:</strong> {error.toString()}
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  <strong>Component Stack:</strong> {errorInfo?.componentStack}
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  <strong>Time:</strong> {new Date(timestamp).toLocaleString()}
                </Typography>
              </Box>
            )}
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={this.handleReset}
              sx={{ mt: 3 }}
            >
              Try Again
            </Button>
          </Box>
        </Paper>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
