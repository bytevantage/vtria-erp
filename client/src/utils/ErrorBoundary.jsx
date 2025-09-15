import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * 
 * @description Production-ready error boundary for VTRIA ERP
 * Catches and displays user-friendly error messages
 * Logs errors for debugging purposes
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // Log to external error tracking service
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Send to your error tracking service
      fetch('/api/v1/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(err => {
        console.error('Failed to log error to service:', err);
      });
    } catch (err) {
      console.error('Error logging failed:', err);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>
              We're sorry, but something unexpected happened. 
              Our team has been notified and is working on a fix.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="btn btn-primary"
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReload}
                className="btn btn-secondary"
              >
                Reload Page
              </button>
            </div>
          </div>
          
          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 20px;
              background: #f8f9fa;
              border: 1px solid #e1e5e9;
              border-radius: 8px;
            }
            
            .error-boundary-content {
              text-align: center;
              max-width: 500px;
            }
            
            .error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
            
            .error-boundary h2 {
              color: #dc3545;
              margin-bottom: 16px;
              font-size: 24px;
            }
            
            .error-boundary p {
              color: #6c757d;
              margin-bottom: 24px;
              line-height: 1.5;
            }
            
            .error-details {
              margin: 20px 0;
              text-align: left;
              background: #f1f3f4;
              border: 1px solid #e1e5e9;
              border-radius: 4px;
              padding: 16px;
            }
            
            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 12px;
            }
            
            .error-stack {
              background: #ffffff;
              border: 1px solid #e1e5e9;
              border-radius: 4px;
              padding: 12px;
              font-family: monospace;
              font-size: 12px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
            }
            
            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
            }
            
            .btn {
              padding: 12px 24px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
            }
            
            .btn-primary {
              background: #007bff;
              color: white;
            }
            
            .btn-primary:hover {
              background: #0056b3;
            }
            
            .btn-secondary {
              background: #6c757d;
              color: white;
            }
            
            .btn-secondary:hover {
              background: #545b62;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

export default ErrorBoundary;