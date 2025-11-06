import React, { useState, useEffect } from 'react';
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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Grid,
  Tabs,
  Tab,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon,
  AccountBalance as AccountBalanceIcon,
  Calculate as CalculateIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

interface CostAnalysisItem {
  product_id: number;
  product_name: string;
  product_code: string;
  location_name: string;
  current_stock: number;
  
  // FIFO Costing
  fifo_cost: number;
  fifo_total_value: number;
  fifo_margin_percentage: number;
  
  // LIFO Costing
  lifo_cost: number;
  lifo_total_value: number;
  lifo_margin_percentage: number;
  
  // Weighted Average Costing
  weighted_avg_cost: number;
  weighted_avg_total_value: number;
  weighted_avg_margin_percentage: number;
  
  // Standard Costing
  standard_cost: number;
  standard_total_value: number;
  standard_variance: number;
  
  // Latest Purchase
  latest_purchase_cost: number;
  latest_purchase_date: string;
  
  // Historical Data
  avg_monthly_consumption: number;
  total_purchases_ytd: number;
  total_sales_ytd: number;
  inventory_turnover_ratio: number;
  carrying_cost_annual: number;
}

interface BatchCostBreakdown {
  batch_id: number;
  batch_number: string;
  purchase_date: string;
  unit_cost: number;
  available_quantity: number;
  batch_value: number;
  supplier_name: string;
  days_in_inventory: number;
  used_in_calculation: boolean;
  cost_method_order: number;
}

interface CostImpactAnalysis {
  product_id: number;
  product_name: string;
  method_comparison: {
    fifo_vs_weighted_avg: {
      cost_difference: number;
      percentage_difference: number;
      value_impact: number;
    };
    lifo_vs_weighted_avg: {
      cost_difference: number;
      percentage_difference: number;
      value_impact: number;
    };
    fifo_vs_lifo: {
      cost_difference: number;
      percentage_difference: number;
      value_impact: number;
    };
  };
  recommended_method: string;
  rationale: string;
}

interface CostManagementAnalyzerProps {
  locationId?: number;
  productId?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cost-tabpanel-${index}`}
      aria-labelledby={`cost-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CostManagementAnalyzer: React.FC<CostManagementAnalyzerProps> = ({
  locationId,
  productId,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisItem[]>([]);
  const [batchBreakdowns, setBatchBreakdowns] = useState<Record<number, BatchCostBreakdown[]>>({});
  const [impactAnalysis, setImpactAnalysis] = useState<CostImpactAnalysis[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<number>(locationId || 0);
  const [selectedProduct, setSelectedProduct] = useState<number>(productId || 0);
  const [selectedCostMethod, setSelectedCostMethod] = useState<string>('weighted_avg');
  const [expandedProduct, setExpandedProduct] = useState<string | false>(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    fetchProducts();
    fetchLocations();
    fetchCostAnalysis();
    fetchBatchBreakdowns();
    fetchImpactAnalysis();
  }, [selectedLocation, selectedProduct]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      setLocations([
        { id: 1, name: 'Main Warehouse' },
        { id: 2, name: 'Production Floor' },
        { id: 3, name: 'Quality Control' },
      ]);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchCostAnalysis = async () => {
    setLoading(true);
    try {
      // Generate mock cost analysis data
      const mockAnalysis: CostAnalysisItem[] = products.slice(0, 5).map((product, index) => {
        const basePrice = 100 + Math.random() * 500;
        const fifoPrice = basePrice + (Math.random() - 0.5) * 20;
        const lifoPrice = basePrice + (Math.random() - 0.5) * 30;
        const weightedAvgPrice = (fifoPrice + lifoPrice + basePrice) / 3;
        const currentStock = 100 + Math.floor(Math.random() * 500);
        
        return {
          product_id: product.id,
          product_name: product.name || product.product_name || '',
          product_code: product.product_code || product.part_code || '',
          location_name: 'Main Warehouse',
          current_stock: currentStock,
          
          fifo_cost: fifoPrice,
          fifo_total_value: fifoPrice * currentStock,
          fifo_margin_percentage: 20 + Math.random() * 15,
          
          lifo_cost: lifoPrice,
          lifo_total_value: lifoPrice * currentStock,
          lifo_margin_percentage: 18 + Math.random() * 17,
          
          weighted_avg_cost: weightedAvgPrice,
          weighted_avg_total_value: weightedAvgPrice * currentStock,
          weighted_avg_margin_percentage: 19 + Math.random() * 16,
          
          standard_cost: basePrice,
          standard_total_value: basePrice * currentStock,
          standard_variance: (weightedAvgPrice - basePrice) / basePrice * 100,
          
          latest_purchase_cost: basePrice + (Math.random() - 0.5) * 40,
          latest_purchase_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          
          avg_monthly_consumption: 50 + Math.floor(Math.random() * 200),
          total_purchases_ytd: (basePrice * (1000 + Math.random() * 5000)),
          total_sales_ytd: (basePrice * 1.3 * (800 + Math.random() * 4000)),
          inventory_turnover_ratio: 4 + Math.random() * 8,
          carrying_cost_annual: (weightedAvgPrice * currentStock * 0.15),
        };
      });

      setCostAnalysis(mockAnalysis);
    } catch (error) {
      console.error('Failed to fetch cost analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchBreakdowns = async () => {
    try {
      // Generate mock batch breakdown data
      const mockBreakdowns: Record<number, BatchCostBreakdown[]> = {};
      
      costAnalysis.forEach((item) => {
        const batches: BatchCostBreakdown[] = Array.from({ length: 3 }, (_, index) => ({
          batch_id: item.product_id * 10 + index + 1,
          batch_number: `BTH-${item.product_code}-${String(index + 1).padStart(3, '0')}`,
          purchase_date: new Date(Date.now() - (index + 1) * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          unit_cost: item.weighted_avg_cost + (Math.random() - 0.5) * 20,
          available_quantity: 30 + Math.floor(Math.random() * 100),
          batch_value: 0, // Will be calculated
          supplier_name: ['ABC Suppliers', 'XYZ Corporation', 'Premium Parts Ltd'][index],
          days_in_inventory: (index + 1) * 15 + Math.floor(Math.random() * 10),
          used_in_calculation: true,
          cost_method_order: index + 1,
        }));

        // Calculate batch values
        batches.forEach(batch => {
          batch.batch_value = batch.unit_cost * batch.available_quantity;
        });

        mockBreakdowns[item.product_id] = batches;
      });

      setBatchBreakdowns(mockBreakdowns);
    } catch (error) {
      console.error('Failed to fetch batch breakdowns:', error);
    }
  };

  const fetchImpactAnalysis = async () => {
    try {
      // Generate mock impact analysis
      const mockImpact: CostImpactAnalysis[] = costAnalysis.map((item) => {
        const fifoVsWeighted = {
          cost_difference: item.fifo_cost - item.weighted_avg_cost,
          percentage_difference: ((item.fifo_cost - item.weighted_avg_cost) / item.weighted_avg_cost) * 100,
          value_impact: (item.fifo_cost - item.weighted_avg_cost) * item.current_stock,
        };

        const lifoVsWeighted = {
          cost_difference: item.lifo_cost - item.weighted_avg_cost,
          percentage_difference: ((item.lifo_cost - item.weighted_avg_cost) / item.weighted_avg_cost) * 100,
          value_impact: (item.lifo_cost - item.weighted_avg_cost) * item.current_stock,
        };

        const fifoVsLifo = {
          cost_difference: item.fifo_cost - item.lifo_cost,
          percentage_difference: ((item.fifo_cost - item.lifo_cost) / item.lifo_cost) * 100,
          value_impact: (item.fifo_cost - item.lifo_cost) * item.current_stock,
        };

        // Determine recommended method based on turnover and margin
        let recommendedMethod = 'Weighted Average';
        let rationale = 'Balanced approach suitable for moderate inventory turnover';

        if (item.inventory_turnover_ratio > 8) {
          recommendedMethod = 'FIFO';
          rationale = 'High turnover rate makes FIFO most accurate for current costs';
        } else if (item.inventory_turnover_ratio < 3) {
          recommendedMethod = 'LIFO';
          rationale = 'Low turnover rate benefits from LIFO for tax advantages';
        }

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          method_comparison: {
            fifo_vs_weighted_avg: fifoVsWeighted,
            lifo_vs_weighted_avg: lifoVsWeighted,
            fifo_vs_lifo: fifoVsLifo,
          },
          recommended_method: recommendedMethod,
          rationale: rationale,
        };
      });

      setImpactAnalysis(mockImpact);
    } catch (error) {
      console.error('Failed to fetch impact analysis:', error);
    }
  };

  const getCostVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 2) return 'success';
    if (Math.abs(variance) < 5) return 'warning';
    return 'error';
  };

  const getVarianceIcon = (value: number) => {
    return value > 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />;
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab 
                label="Cost Comparison" 
                icon={<AnalyticsIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Batch Analysis" 
                icon={<CalculateIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Impact Analysis" 
                icon={<AssessmentIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      <TabPanel value={tabValue} index={0}>
        {/* Cost Comparison */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AnalyticsIcon />
              Cost Method Comparison
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocation}
                  label="Location"
                  onChange={(e) => setSelectedLocation(e.target.value as number)}
                >
                  <MenuItem value={0}>All Locations</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Product</InputLabel>
                <Select
                  value={selectedProduct}
                  label="Product"
                  onChange={(e) => setSelectedProduct(e.target.value as number)}
                >
                  <MenuItem value={0}>All Products</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.product_code || product.part_code} - {product.name || product.product_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Primary Method</InputLabel>
                <Select
                  value={selectedCostMethod}
                  label="Primary Method"
                  onChange={(e) => setSelectedCostMethod(e.target.value)}
                >
                  <MenuItem value="fifo">FIFO</MenuItem>
                  <MenuItem value="lifo">LIFO</MenuItem>
                  <MenuItem value="weighted_avg">Weighted Average</MenuItem>
                  <MenuItem value="standard">Standard Cost</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Current Stock</TableCell>
                    <TableCell align="right">FIFO Cost</TableCell>
                    <TableCell align="right">LIFO Cost</TableCell>
                    <TableCell align="right">Weighted Avg</TableCell>
                    <TableCell align="right">Standard Cost</TableCell>
                    <TableCell align="right">Latest Purchase</TableCell>
                    <TableCell align="right">Turnover Ratio</TableCell>
                    <TableCell align="right">Annual Carrying Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costAnalysis.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.product_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.product_code} • {item.location_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {item.current_stock.toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {formatCurrency(item.fifo_cost)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(item.fifo_total_value)} total
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {formatCurrency(item.lifo_cost)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(item.lifo_total_value)} total
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(item.weighted_avg_cost)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(item.weighted_avg_total_value)} total
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {formatCurrency(item.standard_cost)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getVarianceIcon(item.standard_variance)}
                            <Typography 
                              variant="caption" 
                              color={item.standard_variance > 0 ? 'error.main' : 'success.main'}
                            >
                              {formatPercentage(Math.abs(item.standard_variance))}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {formatCurrency(item.latest_purchase_cost)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.latest_purchase_date).toLocaleDateString('en-IN')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={item.inventory_turnover_ratio.toFixed(1)}
                          color={
                            item.inventory_turnover_ratio > 6 ? 'success' :
                            item.inventory_turnover_ratio > 3 ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(item.carrying_cost_annual)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Batch Analysis */}
        <Box>
          {costAnalysis.map((product) => {
            const batches = batchBreakdowns[product.product_id] || [];
            const productKey = `${product.product_id}-${product.product_name}`;
            
            return (
              <Accordion
                key={productKey}
                expanded={expandedProduct === productKey}
                onChange={(_, isExpanded) => setExpandedProduct(isExpanded ? productKey : false)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {product.product_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.product_code} • {batches.length} batches • Stock: {product.current_stock}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Weighted Avg Cost
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(product.weighted_avg_cost)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Value
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(product.weighted_avg_total_value)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Batch Number</TableCell>
                          <TableCell>Purchase Date</TableCell>
                          <TableCell>Supplier</TableCell>
                          <TableCell align="right">Unit Cost</TableCell>
                          <TableCell align="right">Available Qty</TableCell>
                          <TableCell align="right">Batch Value</TableCell>
                          <TableCell align="center">Days in Stock</TableCell>
                          <TableCell align="center">FIFO Order</TableCell>
                          <TableCell align="center">LIFO Order</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {batches.map((batch, index) => (
                          <TableRow key={batch.batch_id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {batch.batch_number}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(batch.purchase_date).toLocaleDateString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {batch.supplier_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(batch.unit_cost)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {batch.available_quantity.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(batch.batch_value)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={batch.days_in_inventory}
                                color={
                                  batch.days_in_inventory > 60 ? 'error' :
                                  batch.days_in_inventory > 30 ? 'warning' : 'success'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {index + 1}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {batches.length - index}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Impact Analysis */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon />
              Costing Method Impact Analysis
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">FIFO vs Weighted Avg</TableCell>
                    <TableCell align="center">LIFO vs Weighted Avg</TableCell>
                    <TableCell align="center">FIFO vs LIFO</TableCell>
                    <TableCell>Recommended Method</TableCell>
                    <TableCell>Rationale</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {impactAnalysis.map((analysis) => (
                    <TableRow key={analysis.product_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {analysis.product_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            {getVarianceIcon(analysis.method_comparison.fifo_vs_weighted_avg.cost_difference)}
                            <Typography variant="body2">
                              {formatCurrency(Math.abs(analysis.method_comparison.fifo_vs_weighted_avg.cost_difference))}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatPercentage(Math.abs(analysis.method_comparison.fifo_vs_weighted_avg.percentage_difference))}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            {getVarianceIcon(analysis.method_comparison.lifo_vs_weighted_avg.cost_difference)}
                            <Typography variant="body2">
                              {formatCurrency(Math.abs(analysis.method_comparison.lifo_vs_weighted_avg.cost_difference))}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatPercentage(Math.abs(analysis.method_comparison.lifo_vs_weighted_avg.percentage_difference))}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            {getVarianceIcon(analysis.method_comparison.fifo_vs_lifo.cost_difference)}
                            <Typography variant="body2">
                              {formatCurrency(Math.abs(analysis.method_comparison.fifo_vs_lifo.cost_difference))}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatPercentage(Math.abs(analysis.method_comparison.fifo_vs_lifo.percentage_difference))}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={analysis.recommended_method}
                          color={
                            analysis.recommended_method === 'FIFO' ? 'success' :
                            analysis.recommended_method === 'LIFO' ? 'warning' : 'info'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {analysis.rationale}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {costAnalysis.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No cost analysis data available for the selected criteria.
        </Alert>
      )}
    </Box>
  );
};

export default CostManagementAnalyzer;