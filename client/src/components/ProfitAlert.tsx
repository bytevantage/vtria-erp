import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface ProfitAlertProps {
  profitPercentage: number;
  totalAmount: number;
  profitAmount: number;
  showDetails?: boolean;
  minProfitThreshold?: number;
}

const ProfitAlert: React.FC<ProfitAlertProps> = ({
  profitPercentage,
  totalAmount,
  profitAmount,
  showDetails = true,
  minProfitThreshold = 10,
}) => {
  const getSeverity = () => {
    if (profitPercentage < 0) return 'error';
    if (profitPercentage < minProfitThreshold) return 'warning';
    if (profitPercentage < 20) return 'info';
    return 'success';
  };

  const getIcon = () => {
    if (profitPercentage < 0) return <TrendingDownIcon />;
    if (profitPercentage < minProfitThreshold) return <WarningIcon />;
    return <CheckCircleIcon />;
  };

  const getMessage = () => {
    if (profitPercentage < 0) {
      return 'Loss Alert: This quotation will result in a loss!';
    }
    if (profitPercentage < minProfitThreshold) {
      return `Low Profit Alert: Profit margin is below ${minProfitThreshold}% threshold`;
    }
    if (profitPercentage < 20) {
      return 'Moderate Profit: Consider optimizing costs or pricing';
    }
    return 'Good Profit Margin: This quotation meets profit expectations';
  };

  const getColor = () => {
    if (profitPercentage < 0) return '#f44336';
    if (profitPercentage < minProfitThreshold) return '#ff9800';
    if (profitPercentage < 20) return '#2196f3';
    return '#4caf50';
  };

  return (
    <Alert 
      severity={getSeverity()} 
      icon={getIcon()}
      sx={{ 
        mb: 2,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <AlertTitle sx={{ fontWeight: 'bold' }}>
        Profit Analysis - {profitPercentage.toFixed(2)}%
      </AlertTitle>
      
      <Typography variant="body2" sx={{ mb: showDetails ? 1 : 0 }}>
        {getMessage()}
      </Typography>

      {showDetails && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <Chip
            label={`Profit: ₹${profitAmount.toLocaleString('en-IN')}`}
            size="small"
            sx={{ 
              backgroundColor: getColor(),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label={`Total: ₹${totalAmount.toLocaleString('en-IN')}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Margin: ${profitPercentage.toFixed(2)}%`}
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {profitPercentage < minProfitThreshold && (
        <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#e65100' }}>
            Recommendations:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2 }}>
            <li>Review material costs and supplier quotes</li>
            <li>Consider alternative products or suppliers</li>
            <li>Negotiate better pricing with vendors</li>
            <li>Evaluate project scope and requirements</li>
            {profitPercentage < 0 && (
              <li style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                Director approval required for negative margin quotes
              </li>
            )}
          </Typography>
        </Box>
      )}
    </Alert>
  );
};

export default ProfitAlert;