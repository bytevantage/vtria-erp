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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Alert,
  Tooltip,
  IconButton,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Balance as BalanceIcon,
} from '@mui/icons-material';

interface AllocationStrategy {
  id: number;
  strategy_name: string;
  strategy_code: string;
  strategy_type: 'cost_optimization' | 'warranty_optimization' | 'inventory_rotation' | 'custom';
  description: string;
  is_active: boolean;
  is_default: boolean;
  rules: AllocationRule[];
}

interface AllocationRule {
  id: number;
  criteria_type: string;
  sort_order: 'asc' | 'desc';
  weight: number;
  rule_priority: number;
  is_active: boolean;
}

interface ProductPreference {
  id: number;
  product_name: string;
  category_name: string;
  default_strategy_name: string;
  high_value_strategy_name?: string;
  high_value_threshold?: number;
  critical_project_strategy_name?: string;
  premium_customer_strategy_name?: string;
}

interface AllocationPreview {
  serial_number: string;
  unit_cost: number;
  warranty_days: number;
  performance_rating: string;
  failure_count: number;
  allocation_score: number;
  rank: number;
}

const AllocationStrategyManager: React.FC = () => {
  const [strategies, setStrategies] = useState<AllocationStrategy[]>([]);
  const [productPreferences, setProductPreferences] = useState<ProductPreference[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<AllocationStrategy | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<AllocationPreview[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStrategies();
    fetchProductPreferences();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/inventory/allocation-strategies', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setStrategies(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    }
  };

  const fetchProductPreferences = async () => {
    try {
      const response = await fetch('/api/inventory/product-preferences', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setProductPreferences(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch product preferences:', error);
    }
  };

  const previewAllocation = async (strategyId: number, productId: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inventory/allocation-preview?strategy_id=${strategyId}&product_id=${productId}&quantity=10`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );
      if (response.ok) {
        const result = await response.json();
        setPreviewData(result.data || []);
        setPreviewOpen(true);
      }
    } catch (error) {
      console.error('Failed to preview allocation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStrategyTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_optimization':
        return <TrendingDownIcon color="success" />;
      case 'warranty_optimization':
        return <TrendingUpIcon color="info" />;
      case 'inventory_rotation':
        return <BalanceIcon color="warning" />;
      default:
        return <SettingsIcon color="action" />;
    }
  };

  const getStrategyTypeColor = (type: string) => {
    switch (type) {
      case 'cost_optimization':
        return 'success';
      case 'warranty_optimization':
        return 'info';
      case 'inventory_rotation':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCriteriaDescription = (criteria: string) => {
    const descriptions = {
      purchase_price: 'Purchase Price (₹)',
      warranty_remaining: 'Warranty Days Remaining',
      purchase_date: 'Purchase Age (Days)',
      performance_rating: 'Performance Rating (0-100)',
      failure_count: 'Failure Count',
      expiry_date: 'Days to Expiry',
    };
    return descriptions[criteria as keyof typeof descriptions] || criteria;
  };

  const StrategyRulesDisplay: React.FC<{ strategy: AllocationStrategy }> = ({ strategy }) => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Priority</TableCell>
            <TableCell>Criteria</TableCell>
            <TableCell>Sort Order</TableCell>
            <TableCell>Weight</TableCell>
            <TableCell>Impact</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {strategy.rules
            .sort((a, b) => a.rule_priority - b.rule_priority)
            .map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Chip label={rule.rule_priority} size="small" color="primary" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {getCriteriaDescription(rule.criteria_type)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={rule.sort_order === 'asc' ? 'Low to High' : 'High to Low'}
                    color={rule.sort_order === 'asc' ? 'success' : 'warning'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{rule.weight}x</Typography>
                    <Box sx={{ width: 60 }}>
                      <Slider
                        value={rule.weight}
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        size="small"
                        disabled
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {rule.weight >= 4 ? 'Very High' :
                     rule.weight >= 3 ? 'High' :
                     rule.weight >= 2 ? 'Medium' : 'Low'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Inventory Allocation Strategy Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure how inventory is automatically allocated based on different business criteria
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Allocation Strategies" />
          <Tab label="Product Preferences" />
          <Tab label="Strategy Comparison" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {tabValue === 0 && (
        <Box>
          {/* Action Bar */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Available Strategies</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Create New Strategy
            </Button>
          </Box>

          {/* Strategies List */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {strategies.map((strategy) => (
              <Box key={strategy.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStrategyTypeIcon(strategy.strategy_type)}
                        <Typography variant="h6">{strategy.strategy_name}</Typography>
                        {strategy.is_default && (
                          <Chip label="DEFAULT" color="primary" size="small" />
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="Edit Strategy">
                          <IconButton onClick={() => setSelectedStrategy(strategy)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Preview Allocation">
                          <IconButton onClick={() => previewAllocation(strategy.id, 1)}>
                            <PreviewIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {strategy.description}
                    </Typography>

                    <Chip
                      label={strategy.strategy_type.replace('_', ' ').toUpperCase()}
                      color={getStrategyTypeColor(strategy.strategy_type) as any}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">
                          Strategy Rules ({strategy.rules?.length || 0})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <StrategyRulesDisplay strategy={strategy} />
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>Product-Specific Allocation Preferences</Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product / Category</TableCell>
                  <TableCell>Default Strategy</TableCell>
                  <TableCell>High Value Strategy</TableCell>
                  <TableCell>Critical Project</TableCell>
                  <TableCell>Premium Customer</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productPreferences.map((pref) => (
                  <TableRow key={pref.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {pref.product_name || pref.category_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pref.product_name ? 'Product' : 'Category'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={pref.default_strategy_name} 
                        size="small" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      {pref.high_value_strategy_name ? (
                        <Box>
                          <Chip 
                            label={pref.high_value_strategy_name} 
                            size="small" 
                            color="warning"
                          />
                          <Typography variant="caption" display="block">
                            Above ₹{pref.high_value_threshold?.toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not set
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {pref.critical_project_strategy_name ? (
                        <Chip 
                          label={pref.critical_project_strategy_name} 
                          size="small" 
                          color="error"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not set
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {pref.premium_customer_strategy_name ? (
                        <Chip 
                          label={pref.premium_customer_strategy_name} 
                          size="small" 
                          color="secondary"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not set
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Compare how different strategies would allocate the same inventory
          </Alert>
          
          {/* Strategy comparison interface would go here */}
          <Typography variant="h6" color="text.secondary" align="center" sx={{ py: 4 }}>
            Strategy Comparison Tool - Coming Soon
          </Typography>
        </Box>
      )}

      {/* Allocation Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Allocation Preview</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Warranty Days</TableCell>
                  <TableCell>Performance</TableCell>
                  <TableCell align="right">Failures</TableCell>
                  <TableCell align="right">Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((item, index) => (
                  <TableRow key={item.serial_number}>
                    <TableCell>
                      <Chip 
                        label={index + 1} 
                        color={index < 3 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.serial_number}</TableCell>
                    <TableCell align="right">₹{item.unit_cost.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">{item.warranty_days}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.performance_rating} 
                        size="small" 
                        color={
                          item.performance_rating === 'excellent' ? 'success' :
                          item.performance_rating === 'good' ? 'info' :
                          item.performance_rating === 'average' ? 'warning' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      {item.failure_count > 0 ? (
                        <Chip label={item.failure_count} color="error" size="small" />
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {item.allocation_score.toFixed(1)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllocationStrategyManager;