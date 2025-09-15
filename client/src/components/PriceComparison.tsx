import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface PriceComparisonItem {
  id: number;
  product_name: string;
  part_code?: string;
  estimated_price: number;
  supplier_price: number;
  quantity: number;
  supplier_name?: string;
  last_updated?: string;
}

interface PriceComparisonProps {
  items: PriceComparisonItem[];
  title?: string;
  showSummary?: boolean;
}

const PriceComparison: React.FC<PriceComparisonProps> = ({
  items,
  title = "Price Comparison: Estimation vs Supplier Quotes",
  showSummary = true,
}) => {
  const calculateVariance = (estimated: number, supplier: number) => {
    const variance = ((supplier - estimated) / estimated) * 100;
    return variance;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 15) return '#f44336'; // Red for high increase
    if (variance > 5) return '#ff9800'; // Orange for moderate increase
    if (variance > -5) return '#4caf50'; // Green for stable
    if (variance > -15) return '#2196f3'; // Blue for moderate decrease
    return '#9c27b0'; // Purple for significant decrease
  };

  const getVarianceIcon = (variance: number) => {
    return variance > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />;
  };

  const calculateTotals = () => {
    const totalEstimated = items.reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
    const totalSupplier = items.reduce((sum, item) => sum + (item.supplier_price * item.quantity), 0);
    const totalVariance = ((totalSupplier - totalEstimated) / totalEstimated) * 100;
    const savingsAmount = totalEstimated - totalSupplier;

    return {
      totalEstimated,
      totalSupplier,
      totalVariance,
      savingsAmount,
    };
  };

  const totals = calculateTotals();

  const getAlertSeverity = (variance: number) => {
    if (variance > 15) return 'error';
    if (variance > 5) return 'warning';
    if (variance < -10) return 'success';
    return 'info';
  };

  const getAlertMessage = (variance: number, savingsAmount: number) => {
    if (variance > 15) {
      return `Significant price increase: ₹${Math.abs(savingsAmount).toLocaleString('en-IN')} over budget`;
    }
    if (variance > 5) {
      return `Moderate price increase: ₹${Math.abs(savingsAmount).toLocaleString('en-IN')} over budget`;
    }
    if (variance < -10) {
      return `Good savings: ₹${Math.abs(savingsAmount).toLocaleString('en-IN')} under budget`;
    }
    return 'Prices are within expected range';
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
          <Tooltip title="This comparison shows the difference between estimated prices and actual supplier quotes">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        {showSummary && (
          <Alert 
            severity={getAlertSeverity(totals.totalVariance)}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Overall Impact: {totals.totalVariance >= 0 ? '+' : ''}{totals.totalVariance.toFixed(2)}%
            </Typography>
            <Typography variant="body2">
              {getAlertMessage(totals.totalVariance, totals.savingsAmount)}
            </Typography>
          </Alert>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Qty</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Estimated</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Supplier Price</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Est.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Supplier</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Variance</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const variance = calculateVariance(item.estimated_price, item.supplier_price);
                const totalEstimated = item.estimated_price * item.quantity;
                const totalSupplier = item.supplier_price * item.quantity;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {item.product_name}
                        </Typography>
                        {item.part_code && (
                          <Typography variant="caption" color="text.secondary">
                            {item.part_code}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="right">
                      ₹{item.estimated_price.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="right">
                      ₹{item.supplier_price.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="right">
                      ₹{totalEstimated.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="right">
                      ₹{totalSupplier.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={getVarianceIcon(variance)}
                        label={`${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`}
                        size="small"
                        sx={{
                          backgroundColor: getVarianceColor(variance),
                          color: 'white',
                          fontWeight: 'bold',
                          '& .MuiChip-icon': {
                            color: 'white',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {item.supplier_name || 'TBD'}
                        </Typography>
                        {item.last_updated && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.last_updated).toLocaleDateString('en-IN')}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Summary Row */}
              <TableRow sx={{ backgroundColor: 'grey.50', fontWeight: 'bold' }}>
                <TableCell colSpan={4} sx={{ fontWeight: 'bold' }}>
                  <Typography variant="subtitle2">TOTAL</Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ₹{totals.totalEstimated.toLocaleString('en-IN')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ₹{totals.totalSupplier.toLocaleString('en-IN')}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={getVarianceIcon(totals.totalVariance)}
                    label={`${totals.totalVariance >= 0 ? '+' : ''}${totals.totalVariance.toFixed(1)}%`}
                    size="small"
                    sx={{
                      backgroundColor: getVarianceColor(totals.totalVariance),
                      color: 'white',
                      fontWeight: 'bold',
                      '& .MuiChip-icon': {
                        color: 'white',
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {totals.savingsAmount >= 0 ? 'Savings' : 'Over Budget'}:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: totals.savingsAmount >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 'bold',
                    }}
                  >
                    ₹{Math.abs(totals.savingsAmount).toLocaleString('en-IN')}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Legend:</strong> 
            <span style={{ color: '#f44336' }}> Red: &gt;15% increase</span>,
            <span style={{ color: '#ff9800' }}> Orange: 5-15% increase</span>,
            <span style={{ color: '#4caf50' }}> Green: ±5%</span>,
            <span style={{ color: '#2196f3' }}> Blue: 5-15% decrease</span>,
            <span style={{ color: '#9c27b0' }}> Purple: &gt;15% decrease</span>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PriceComparison;