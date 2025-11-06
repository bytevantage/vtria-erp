import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapIcon,
  Store as StoreIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Lightbulb as LightbulbIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = '';

const CostOptimizationDashboard = ({ 
  open, 
  onClose, 
  estimationId,
  onApplyOptimization 
}) => {
  const [optimizationData, setOptimizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);

  useEffect(() => {
    if (open && estimationId) {
      fetchOptimizationData();
    }
  }, [open, estimationId]);

  const fetchOptimizationData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/inventory-aware-estimation/cost-optimization/${estimationId}`);
      if (response.data.success) {
        setOptimizationData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionToggle = (suggestionIndex) => {
    setSelectedSuggestions(prev => {
      if (prev.includes(suggestionIndex)) {
        return prev.filter(i => i !== suggestionIndex);
      } else {
        return [...prev, suggestionIndex];
      }
    });
  };

  const calculateSelectedSavings = () => {
    if (!optimizationData?.suggestions) return 0;
    return selectedSuggestions.reduce((total, index) => {
      return total + parseFloat(optimizationData.suggestions[index]?.potential_savings || 0);
    }, 0);
  };

  const getSuggestionTypeIcon = (type) => {
    switch (type) {
      case 'vendor_optimization':
        return <SwapIcon color="primary" />;
      case 'product_alternative':
        return <CompareIcon color="secondary" />;
      default:
        return <LightbulbIcon color="info" />;
    }
  };

  const getSuggestionTypeColor = (type) => {
    switch (type) {
      case 'vendor_optimization':
        return 'primary';
      case 'product_alternative':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const renderSummaryCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  ₹{optimizationData?.summary?.total_potential_savings || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Potential Savings
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {optimizationData?.summary?.suggestions_count || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Optimization Suggestions
                </Typography>
              </Box>
              <LightbulbIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {optimizationData?.summary?.potential_savings_percentage || 0}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Potential Savings %
                </Typography>
              </Box>
              <TrendingDownIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  ₹{calculateSelectedSavings().toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Selected Savings
                </Typography>
              </Box>
              <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSuggestionsList = () => (
    <Box>
      {optimizationData?.suggestions?.map((suggestion, index) => (
        <Accordion key={index} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                {getSuggestionTypeIcon(suggestion.suggestion_type)}
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6">
                    {suggestion.product_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {suggestion.part_code}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={`Save ₹${suggestion.potential_savings}`}
                  color="success"
                  variant="filled"
                />
                <Chip
                  label={`${suggestion.savings_percentage}%`}
                  color={getSuggestionTypeColor(suggestion.suggestion_type)}
                  variant="outlined"
                />
                <Button
                  variant={selectedSuggestions.includes(index) ? "contained" : "outlined"}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSuggestionToggle(index);
                  }}
                >
                  {selectedSuggestions.includes(index) ? 'Selected' : 'Select'}
                </Button>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Current Configuration
                    </Typography>
                    <Typography variant="body2">
                      Price: ₹{suggestion.current_price}
                    </Typography>
                    <Typography variant="body2">
                      Quantity: {suggestion.quantity}
                    </Typography>
                    <Typography variant="body2">
                      Total: ₹{suggestion.current_total || (suggestion.current_price * suggestion.quantity).toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Optimized Configuration
                    </Typography>
                    {suggestion.suggestion_type === 'vendor_optimization' ? (
                      <>
                        <Typography variant="body2">
                          Vendor: {suggestion.recommended_vendor}
                        </Typography>
                        <Typography variant="body2">
                          Price: ₹{suggestion.optimized_price}
                        </Typography>
                        <Typography variant="body2">
                          Total: ₹{suggestion.optimized_total}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2">
                          Alternative: {suggestion.alternative_name}
                        </Typography>
                        <Typography variant="body2">
                          Part Code: {suggestion.alternative_part_code}
                        </Typography>
                        <Typography variant="body2">
                          Price: ₹{suggestion.alternative_price}
                        </Typography>
                        <Typography variant="body2">
                          Vendor: {suggestion.recommended_vendor}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderComparisonTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Current Price</TableCell>
            <TableCell>Optimized Price</TableCell>
            <TableCell align="right">Savings</TableCell>
            <TableCell align="right">Savings %</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {optimizationData?.suggestions?.map((suggestion, index) => (
            <TableRow key={index}>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {suggestion.product_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {suggestion.part_code}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>₹{suggestion.current_price}</TableCell>
              <TableCell>
                ₹{suggestion.optimized_price || suggestion.alternative_price}
              </TableCell>
              <TableCell align="right">
                <Typography color="success.main" sx={{ fontWeight: 600 }}>
                  ₹{suggestion.potential_savings}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={`${suggestion.savings_percentage}%`}
                  color="success"
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={suggestion.suggestion_type === 'vendor_optimization' ? 'Vendor' : 'Alternative'}
                  color={getSuggestionTypeColor(suggestion.suggestion_type)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Button
                  variant={selectedSuggestions.includes(index) ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleSuggestionToggle(index)}
                >
                  {selectedSuggestions.includes(index) ? 'Selected' : 'Select'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const handleApplyOptimizations = () => {
    const selectedOptimizations = selectedSuggestions.map(index => optimizationData.suggestions[index]);
    if (onApplyOptimization) {
      onApplyOptimization(selectedOptimizations);
    }
    onClose();
  };

  if (!optimizationData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Cost Optimization Dashboard
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <LinearProgress />
            <Typography sx={{ mt: 2, textAlign: 'center' }}>
              Analyzing cost optimization opportunities...
            </Typography>
          </Box>
        ) : (
          <Box>
            {renderSummaryCards()}

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
              <Tab label="Detailed Suggestions" />
              <Tab label="Comparison Table" />
            </Tabs>

            {activeTab === 0 && renderSuggestionsList()}
            {activeTab === 1 && renderComparisonTable()}

            {selectedSuggestions.length > 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  You have selected {selectedSuggestions.length} optimization suggestions 
                  with a total potential savings of ₹{calculateSelectedSavings().toFixed(2)}.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleApplyOptimizations}
          variant="contained"
          disabled={selectedSuggestions.length === 0}
          startIcon={<CheckCircleIcon />}
        >
          Apply Selected Optimizations ({selectedSuggestions.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CostOptimizationDashboard;
