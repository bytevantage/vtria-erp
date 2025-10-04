import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Calculate as CalculateIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const ProfitCalculator = ({
  quotationData,
  onProfitCalculated,
  showBreakdown = false
}) => {
  const [profitAnalysis, setProfitAnalysis] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quotationData) {
      calculateProfit();
    }
  }, [quotationData]);

  const calculateProfit = () => {
    try {
      setLoading(true);

      const analysis = {
        totalCost: 0,
        totalSellingPrice: 0,
        totalProfit: 0,
        profitPercentage: 0,
        itemBreakdown: [],
        costBreakdown: {
          materialCost: 0,
          laborCost: 0,
          overheadCost: 0,
          otherCosts: 0
        }
      };

      // Calculate for each quotation item
      if (quotationData.items) {
        quotationData.items.forEach(item => {
          const sellingPrice = item.amount || 0;
          const estimatedCost = calculateItemCost(item);
          const itemProfit = sellingPrice - estimatedCost;
          const itemProfitPercentage = sellingPrice > 0 ? (itemProfit / sellingPrice) * 100 : 0;

          analysis.totalCost += estimatedCost;
          analysis.totalSellingPrice += sellingPrice;
          analysis.totalProfit += itemProfit;

          analysis.itemBreakdown.push({
            itemName: item.item_name,
            sellingPrice,
            estimatedCost,
            profit: itemProfit,
            profitPercentage: itemProfitPercentage,
            quantity: item.quantity
          });

          // Add to cost breakdown
          analysis.costBreakdown.materialCost += estimatedCost * 0.7; // Assume 70% material
          analysis.costBreakdown.laborCost += estimatedCost * 0.2;    // 20% labor
          analysis.costBreakdown.overheadCost += estimatedCost * 0.1; // 10% overhead
        });
      }

      // Calculate overall profit percentage
      analysis.profitPercentage = analysis.totalSellingPrice > 0
        ? (analysis.totalProfit / analysis.totalSellingPrice) * 100
        : 0;

      setProfitAnalysis(analysis);

      if (onProfitCalculated) {
        onProfitCalculated(analysis);
      }
    } catch (error) {
      console.error('Error calculating profit:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateItemCost = (item) => {
    // This would typically come from the estimation data
    // For now, we'll estimate based on selling price and typical margins
    const sellingPrice = item.amount || 0;
    const discountPercentage = item.discount_percentage || 0;

    // Estimate cost as 70% of discounted selling price (rough estimation)
    const discountedPrice = sellingPrice * (1 - discountPercentage / 100);
    return discountedPrice * 0.7;
  };

  const getProfitColor = (percentage) => {
    if (percentage < 10) return 'error';
    if (percentage < 20) return 'warning';
    return 'success';
  };

  const getProfitIcon = (percentage) => {
    if (percentage < 10) return <TrendingDownIcon />;
    return <TrendingUpIcon />;
  };

  const renderProfitAlert = () => {
    if (!profitAnalysis) return null;

    const { profitPercentage } = profitAnalysis;

    if (profitPercentage < 10) {
      return (
        <Alert
          severity="error"
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" fontWeight="bold">
            Low Profit Alert: {profitPercentage.toFixed(2)}%
          </Typography>
          <Typography variant="body2">
            Profit margin is below the recommended 10% threshold. Consider reviewing pricing or costs.
          </Typography>
        </Alert>
      );
    }

    if (profitPercentage < 20) {
      return (
        <Alert
          severity="warning"
          icon={<InfoIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            Moderate Profit: {profitPercentage.toFixed(2)}%
          </Typography>
          <Typography variant="body2">
            Profit margin is acceptable but could be optimized.
          </Typography>
        </Alert>
      );
    }

    return (
      <Alert
        severity="success"
        icon={<TrendingUpIcon />}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          Good Profit Margin: {profitPercentage.toFixed(2)}%
        </Typography>
      </Alert>
    );
  };

  const renderProfitSummary = () => {
    if (!profitAnalysis) return null;

    const { totalCost, totalSellingPrice, totalProfit, profitPercentage } = profitAnalysis;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Cost
              </Typography>
              <Typography variant="h6">
                ₹{totalCost.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Selling Price
              </Typography>
              <Typography variant="h6">
                ₹{totalSellingPrice.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Profit Amount
              </Typography>
              <Typography variant="h6" color={getProfitColor(profitPercentage)}>
                ₹{totalProfit.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Profit %
                  </Typography>
                  <Typography variant="h6" color={getProfitColor(profitPercentage)}>
                    {profitPercentage.toFixed(2)}%
                  </Typography>
                </Box>
                {getProfitIcon(profitPercentage)}
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(profitPercentage, 100)}
                color={getProfitColor(profitPercentage)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderItemBreakdown = () => {
    if (!profitAnalysis?.itemBreakdown) return null;

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Est. Cost</TableCell>
              <TableCell align="right">Selling Price</TableCell>
              <TableCell align="right">Profit</TableCell>
              <TableCell align="right">Profit %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profitAnalysis.itemBreakdown.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">₹{item.estimatedCost.toLocaleString()}</TableCell>
                <TableCell align="right">₹{item.sellingPrice.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ color: item.profit >= 0 ? 'success.main' : 'error.main' }}>
                  ₹{item.profit.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={`${item.profitPercentage.toFixed(1)}%`}
                    color={getProfitColor(item.profitPercentage)}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderCostBreakdown = () => {
    if (!profitAnalysis?.costBreakdown) return null;

    const { materialCost, laborCost, overheadCost, otherCosts } = profitAnalysis.costBreakdown;
    const totalCost = materialCost + laborCost + overheadCost + otherCosts;

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Material Cost
              </Typography>
              <Typography variant="h6">
                ₹{materialCost.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {totalCost > 0 ? ((materialCost / totalCost) * 100).toFixed(1) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Labor Cost
              </Typography>
              <Typography variant="h6">
                ₹{laborCost.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {totalCost > 0 ? ((laborCost / totalCost) * 100).toFixed(1) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Overhead Cost
              </Typography>
              <Typography variant="h6">
                ₹{overheadCost.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {totalCost > 0 ? ((overheadCost / totalCost) * 100).toFixed(1) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Other Costs
              </Typography>
              <Typography variant="h6">
                ₹{otherCosts.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {totalCost > 0 ? ((otherCosts / totalCost) * 100).toFixed(1) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Calculating profit analysis...
        </Typography>
        <LinearProgress sx={{ mt: 1 }} />
      </Paper>
    );
  }

  // If no quotation data is provided, show a message
  if (!quotationData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Profit Calculator
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body1">
            This profit calculator analyzes the profitability of quotations by comparing selling prices with estimated costs.
          </Typography>
        </Alert>
        <Alert severity="warning">
          <Typography variant="body1">
            No quotation data available. Please access this tool from within a quotation to calculate profit margins.
          </Typography>
        </Alert>
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Features:
          </Typography>
          <Typography component="div">
            • Item-wise profit calculation<br />
            • Cost breakdown analysis<br />
            • Profit margin alerts<br />
            • Visual profit indicators<br />
            • Detailed cost analysis
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          <CalculateIcon />
          Profit Analysis
        </Typography>
        {showBreakdown && (
          <Tooltip title="View detailed breakdown">
            <IconButton onClick={() => setShowDetails(true)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {renderProfitAlert()}
      {renderProfitSummary()}

      {/* Detailed Breakdown Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Detailed Profit Analysis</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Item-wise Breakdown
          </Typography>
          {renderItemBreakdown()}

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Cost Breakdown
          </Typography>
          {renderCostBreakdown()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfitCalculator;
