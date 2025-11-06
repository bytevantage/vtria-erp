import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    LinearProgress
} from '@mui/material';
import {
    TrendingUp as CostIcon,
    LocalShipping as FreightIcon,
    Security as InsuranceIcon,
    AccountBalance as DutyIcon,
    Assignment as AllocationIcon,
    Analytics as AnalyticsIcon,
    ExpandMore as ExpandMoreIcon,
    Settings as SettingsIcon,
    Refresh as RefreshIcon,
    PieChart as PieChartIcon
} from '@mui/icons-material';
import axios from 'axios';

interface BatchCostingDetails {
    id: number;
    batch_number: string;
    product_name: string;
    supplier_name: string;
    location_name: string;
    received_quantity: number;
    available_quantity: number;
    purchase_price: number;
    landed_cost_per_unit: number;
    total_additional_costs: number;
    freight_cost: number;
    insurance_cost: number;
    customs_duty: number;
    handling_charges: number;
    other_charges: number;
    cost_overhead_percentage: number;
    freight_percentage: number;
    duty_percentage: number;
}

interface AllocationOption {
    batch_id: number;
    location_name: string;
    available_quantity: number;
    landed_cost_per_unit: number;
    cost_savings_per_unit: number;
    risk_level: string;
    weighted_allocation_score: number;
    days_to_expiry: number;
}

interface PurchaseOrderCosts {
    purchase_order_id: number;
    purchase_order_number: string;
    total_freight_cost: number;
    total_insurance_cost: number;
    total_customs_duty: number;
    total_handling_charges: number;
    total_other_charges: number;
    allocation_method: 'by_value' | 'by_weight' | 'by_quantity';
    total_po_value: number;
    po_currency: string;
    exchange_rate: number;
}

const EnhancedCostingManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Batch costing state
    const [selectedBatch, setSelectedBatch] = useState<BatchCostingDetails | null>(null);
    const [batchCostingDialog, setBatchCostingDialog] = useState(false);

    // Allocation state
    const [allocationOptions, setAllocationOptions] = useState<AllocationOption[]>([]);
    const [allocationDialog, setAllocationDialog] = useState(false);
    const [allocationParams, setAllocationParams] = useState({
        product_id: '',
        location_id: '',
        quantity: 1,
        strategy: 'balanced'
    });

    // PO Cost allocation state
    const [poCostsDialog, setPoCostsDialog] = useState(false);
    const [poCosts, setPoCosts] = useState<PurchaseOrderCosts>({
        purchase_order_id: 0,
        purchase_order_number: '',
        total_freight_cost: 0,
        total_insurance_cost: 0,
        total_customs_duty: 0,
        total_handling_charges: 0,
        total_other_charges: 0,
        allocation_method: 'by_value',
        total_po_value: 0,
        po_currency: 'INR',
        exchange_rate: 1.0
    });

    // Cost analysis state
    const [costAnalysis, setCostAnalysis] = useState<any>(null);

    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    const fetchBatchCostingDetails = async (batchId: number) => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${API_BASE_URL}/api/enhanced-costing/batch/${batchId}/costing-details`,
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                }
            );
            
            setSelectedBatch(response.data.data.batchInfo);
            setBatchCostingDialog(true);
        } catch (err) {
            setError('Failed to fetch batch costing details');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptimalAllocation = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/enhanced-costing/optimal-allocation`, {
                params: allocationParams,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            setAllocationOptions(response.data.data.availableOptions || []);
            setAllocationDialog(true);
        } catch (err) {
            setError('Failed to fetch allocation options');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePoCosts = async () => {
        try {
            setLoading(true);
            await axios.post(
                `${API_BASE_URL}/api/enhanced-costing/purchase-order-costs`,
                poCosts,
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                }
            );
            
            setPoCostsDialog(false);
            // Reset form
            setPoCosts({
                purchase_order_id: 0,
                purchase_order_number: '',
                total_freight_cost: 0,
                total_insurance_cost: 0,
                total_customs_duty: 0,
                total_handling_charges: 0,
                total_other_charges: 0,
                allocation_method: 'by_value',
                total_po_value: 0,
                po_currency: 'INR',
                exchange_rate: 1.0
            });
            
        } catch (err) {
            setError('Failed to create purchase order costs');
        } finally {
            setLoading(false);
        }
    };

    const handleAllocatePoCosts = async (purchaseOrderId: number) => {
        try {
            setLoading(true);
            await axios.post(
                `${API_BASE_URL}/api/enhanced-costing/purchase-order/${purchaseOrderId}/allocate-costs`,
                { allocation_method: 'by_value' },
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                }
            );
            
        } catch (err) {
            setError('Failed to allocate purchase order costs');
        } finally {
            setLoading(false);
        }
    };

    const fetchCostAnalysisReport = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/enhanced-costing/cost-analysis-report`, {
                params: {
                    group_by: 'product',
                    date_from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                },
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            setCostAnalysis(response.data.data);
        } catch (err) {
            setError('Failed to fetch cost analysis report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 2) {
            fetchCostAnalysisReport();
        }
    }, [activeTab]);

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'HIGH_EXPIRY_RISK': return 'error';
            case 'MEDIUM_EXPIRY_RISK': return 'warning';
            case 'HIGH_COST': return 'warning';
            case 'LOW_RISK': return 'success';
            default: return 'default';
        }
    };

    const BatchCostingDialog = () => (
        <Dialog open={batchCostingDialog} onClose={() => setBatchCostingDialog(false)} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CostIcon />
                    Enhanced Batch Costing Details
                </Box>
            </DialogTitle>
            <DialogContent>
                {selectedBatch && (
                    <Grid container spacing={3}>
                        {/* Basic Information */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Batch Information</Typography>
                                    <Typography><strong>Batch Number:</strong> {selectedBatch.batch_number}</Typography>
                                    <Typography><strong>Product:</strong> {selectedBatch.product_name}</Typography>
                                    <Typography><strong>Supplier:</strong> {selectedBatch.supplier_name}</Typography>
                                    <Typography><strong>Location:</strong> {selectedBatch.location_name}</Typography>
                                    <Typography><strong>Received Qty:</strong> {selectedBatch.received_quantity}</Typography>
                                    <Typography><strong>Available Qty:</strong> {selectedBatch.available_quantity}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Cost Breakdown */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>Purchase Price:</Typography>
                                        <Typography fontWeight="medium">₹{selectedBatch.purchase_price?.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography color="text.secondary">Freight Cost:</Typography>
                                        <Typography>₹{(selectedBatch.freight_cost / selectedBatch.received_quantity)?.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography color="text.secondary">Insurance:</Typography>
                                        <Typography>₹{(selectedBatch.insurance_cost / selectedBatch.received_quantity)?.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography color="text.secondary">Customs Duty:</Typography>
                                        <Typography>₹{(selectedBatch.customs_duty / selectedBatch.received_quantity)?.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography color="text.secondary">Other Charges:</Typography>
                                        <Typography>₹{((selectedBatch.handling_charges + selectedBatch.other_charges) / selectedBatch.received_quantity)?.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 1 }}>
                                        <Typography variant="h6">Landed Cost:</Typography>
                                        <Typography variant="h6" color="primary">₹{selectedBatch.landed_cost_per_unit?.toFixed(2)}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Cost Analysis */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Cost Analysis</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="primary">
                                                    {selectedBatch.cost_overhead_percentage?.toFixed(1)}%
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Total Cost Overhead
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="warning.main">
                                                    {selectedBatch.freight_percentage?.toFixed(1)}%
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Freight Impact
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="error.main">
                                                    {selectedBatch.duty_percentage?.toFixed(1)}%
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Duty Impact
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setBatchCostingDialog(false)}>Close</Button>
            </DialogActions>
        </Dialog>
    );

    const AllocationDialog = () => (
        <Dialog open={allocationDialog} onClose={() => setAllocationDialog(false)} maxWidth="lg" fullWidth>
            <DialogTitle>Optimal Allocation Options</DialogTitle>
            <DialogContent>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Location</TableCell>
                                <TableCell align="right">Available Qty</TableCell>
                                <TableCell align="right">Landed Cost</TableCell>
                                <TableCell align="right">Cost Savings</TableCell>
                                <TableCell align="right">Score</TableCell>
                                <TableCell>Risk Level</TableCell>
                                <TableCell align="right">Days to Expiry</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {allocationOptions.map((option, index) => (
                                <TableRow key={option.batch_id}>
                                    <TableCell>{option.location_name}</TableCell>
                                    <TableCell align="right">{option.available_quantity}</TableCell>
                                    <TableCell align="right">₹{option.landed_cost_per_unit.toFixed(2)}</TableCell>
                                    <TableCell align="right">
                                        <Typography color={option.cost_savings_per_unit > 0 ? 'success.main' : 'text.primary'}>
                                            ₹{option.cost_savings_per_unit.toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={option.weighted_allocation_score} 
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="caption">
                                                {option.weighted_allocation_score.toFixed(0)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={option.risk_level.replace('_', ' ')}
                                            color={getRiskColor(option.risk_level)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {option.days_to_expiry ? `${option.days_to_expiry} days` : 'No expiry'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setAllocationDialog(false)}>Close</Button>
                <Button variant="contained">Apply Allocation</Button>
            </DialogActions>
        </Dialog>
    );

    const PoCostsDialog = () => (
        <Dialog open={poCostsDialog} onClose={() => setPoCostsDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Purchase Order Cost Allocation</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Purchase Order Number"
                            value={poCosts.purchase_order_number}
                            onChange={(e) => setPoCosts({...poCosts, purchase_order_number: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Total PO Value"
                            type="number"
                            value={poCosts.total_po_value}
                            onChange={(e) => setPoCosts({...poCosts, total_po_value: parseFloat(e.target.value)})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Freight Cost"
                            type="number"
                            value={poCosts.total_freight_cost}
                            onChange={(e) => setPoCosts({...poCosts, total_freight_cost: parseFloat(e.target.value)})}
                            InputProps={{
                                startAdornment: <FreightIcon sx={{ mr: 1, color: 'action.active' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Insurance Cost"
                            type="number"
                            value={poCosts.total_insurance_cost}
                            onChange={(e) => setPoCosts({...poCosts, total_insurance_cost: parseFloat(e.target.value)})}
                            InputProps={{
                                startAdornment: <InsuranceIcon sx={{ mr: 1, color: 'action.active' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Customs Duty"
                            type="number"
                            value={poCosts.total_customs_duty}
                            onChange={(e) => setPoCosts({...poCosts, total_customs_duty: parseFloat(e.target.value)})}
                            InputProps={{
                                startAdornment: <DutyIcon sx={{ mr: 1, color: 'action.active' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Handling Charges"
                            type="number"
                            value={poCosts.total_handling_charges}
                            onChange={(e) => setPoCosts({...poCosts, total_handling_charges: parseFloat(e.target.value)})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Allocation Method</InputLabel>
                            <Select
                                value={poCosts.allocation_method}
                                onChange={(e) => setPoCosts({...poCosts, allocation_method: e.target.value as any})}
                            >
                                <MenuItem value="by_value">By Value</MenuItem>
                                <MenuItem value="by_weight">By Weight</MenuItem>
                                <MenuItem value="by_quantity">By Quantity</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Exchange Rate"
                            type="number"
                            value={poCosts.exchange_rate}
                            onChange={(e) => setPoCosts({...poCosts, exchange_rate: parseFloat(e.target.value)})}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setPoCostsDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePoCosts} variant="contained">
                    Create & Allocate Costs
                </Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Enhanced Costing Manager</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<AllocationIcon />}
                        onClick={() => setPoCostsDialog(true)}
                    >
                        PO Cost Allocation
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => window.location.reload()}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Batch Costing" icon={<CostIcon />} />
                <Tab label="Allocation Engine" icon={<AllocationIcon />} />
                <Tab label="Cost Analytics" icon={<AnalyticsIcon />} />
            </Tabs>

            {activeTab === 0 && (
                <Box>
                    <Typography variant="h6" gutterBottom>Batch Costing Details</Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Select a batch to view detailed cost breakdown including landed costs, freight, insurance, and duties.
                    </Alert>
                    {/* Add batch selection interface here */}
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Optimal Allocation Parameters</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Product ID"
                                        value={allocationParams.product_id}
                                        onChange={(e) => setAllocationParams({...allocationParams, product_id: e.target.value})}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Quantity"
                                        type="number"
                                        value={allocationParams.quantity}
                                        onChange={(e) => setAllocationParams({...allocationParams, quantity: parseInt(e.target.value)})}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Strategy</InputLabel>
                                        <Select
                                            value={allocationParams.strategy}
                                            onChange={(e) => setAllocationParams({...allocationParams, strategy: e.target.value})}
                                        >
                                            <MenuItem value="balanced">Balanced</MenuItem>
                                            <MenuItem value="cost_optimization">Cost Optimization</MenuItem>
                                            <MenuItem value="fifo_strict">FIFO Strict</MenuItem>
                                            <MenuItem value="expiry_management">Expiry Management</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={fetchOptimalAllocation}
                                        disabled={!allocationParams.product_id || loading}
                                        sx={{ height: 56 }}
                                    >
                                        Get Allocation Options
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {activeTab === 2 && (
                <Box>
                    {loading && <CircularProgress />}
                    {costAnalysis && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Total Batches</Typography>
                                        <Typography variant="h4" color="primary">
                                            {costAnalysis.summary.total_batches}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Total Value</Typography>
                                        <Typography variant="h4" color="success.main">
                                            ₹{costAnalysis.summary.total_inventory_value?.toLocaleString('en-IN')}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Avg Landed Cost</Typography>
                                        <Typography variant="h4" color="warning.main">
                                            ₹{costAnalysis.summary.avg_landed_cost?.toFixed(2)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Avg Overhead</Typography>
                                        <Typography variant="h4" color="error.main">
                                            {costAnalysis.summary.avg_cost_overhead?.toFixed(1)}%
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}

            <BatchCostingDialog />
            <AllocationDialog />
            <PoCostsDialog />
        </Box>
    );
};

export default EnhancedCostingManager;