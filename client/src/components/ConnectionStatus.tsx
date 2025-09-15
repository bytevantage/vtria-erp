import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useApiConnection } from '../hooks/useApiConnection';

interface ConnectionStatusProps {
  showLabel?: boolean;
  variant?: 'chip' | 'icon' | 'full';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showLabel = true, 
  variant = 'chip' 
}) => {
  const {
    connected,
    url,
    error,
    loading,
    lastCheck,
    checkConnection,
    retryConnection,
    isRetrying,
  } = useApiConnection();

  const [detailsOpen, setDetailsOpen] = useState(false);

  const getStatusColor = () => {
    if (loading) return 'default';
    return connected ? 'success' : 'error';
  };

  const getStatusIcon = () => {
    if (loading || isRetrying) return <CircularProgress size={16} />;
    return connected ? <CheckCircleIcon /> : <ErrorIcon />;
  };

  const getStatusText = () => {
    if (loading) return 'Connecting...';
    if (isRetrying) return 'Retrying...';
    return connected ? 'API Connected' : 'API Disconnected';
  };

  const handleRetry = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await retryConnection();
  };

  const renderChip = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={getStatusIcon()}
        label={showLabel ? getStatusText() : ''}
        color={getStatusColor()}
        variant="outlined"
        size="small"
        onClick={() => setDetailsOpen(true)}
        sx={{ 
          cursor: 'pointer',
          '& .MuiChip-icon': {
            fontSize: 16,
          }
        }}
      />
      
      {!connected && (
        <Tooltip title="Retry Connection">
          <IconButton 
            size="small" 
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? <CircularProgress size={16} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  const renderIcon = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title={getStatusText()}>
        <IconButton 
          size="small" 
          color={connected ? 'success' : 'error'}
          onClick={() => setDetailsOpen(true)}
        >
          {loading ? <CircularProgress size={16} /> : connected ? <WifiIcon /> : <WifiOffIcon />}
        </IconButton>
      </Tooltip>
      
      {!connected && (
        <Tooltip title="Retry Connection">
          <IconButton 
            size="small" 
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? <CircularProgress size={16} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  const renderFull = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getStatusIcon()}
        <Typography variant="body2" color={connected ? 'success.main' : 'error.main'}>
          {getStatusText()}
        </Typography>
      </Box>
      
      {url && (
        <Typography variant="caption" color="text.secondary">
          {url}
        </Typography>
      )}
      
      <Box sx={{ ml: 'auto' }}>
        <Tooltip title="Connection Details">
          <IconButton size="small" onClick={() => setDetailsOpen(true)}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Retry Connection">
          <IconButton 
            size="small" 
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? <CircularProgress size={16} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const renderComponent = () => {
    switch (variant) {
      case 'icon':
        return renderIcon();
      case 'full':
        return renderFull();
      default:
        return renderChip();
    }
  };

  return (
    <>
      {renderComponent()}
      
      {/* Connection Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon()}
            API Connection Status
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Connection Error:</strong> {error}
              </Typography>
            </Alert>
          )}
          
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell>
                  <Chip 
                    icon={getStatusIcon()} 
                    label={getStatusText()} 
                    color={getStatusColor()} 
                    size="small" 
                  />
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell><strong>API URL</strong></TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {url || 'Not connected'}
                  </Typography>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell><strong>Last Check</strong></TableCell>
                <TableCell>
                  {lastCheck ? new Date(lastCheck).toLocaleString() : 'Never'}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell><strong>Environment</strong></TableCell>
                <TableCell>{process.env.NODE_ENV || 'development'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {!connected && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Troubleshooting Tips:</strong>
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Ensure the API server is running</li>
                <li>Check if the server port has changed</li>
                <li>Verify firewall and network settings</li>
                <li>Try refreshing the browser</li>
              </ul>
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleRetry} 
            disabled={isRetrying}
            startIcon={isRetrying ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Retry Connection
          </Button>
          
          <Button onClick={checkConnection}>
            Check Status
          </Button>
          
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConnectionStatus;