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
    LinearProgress,
    Rating,
    Tooltip,
    Badge,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import {
    Business as VendorIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CompareArrows as CompareIcon,
    Assessment as EvaluationIcon,
    LocalShipping as DeliveryIcon,
    AttachMoney as PriceIcon,
    Star as RatingIcon,
    Warning as RiskIcon,
    CheckCircle as QualityIcon,
    Schedule as TimeIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Supplier {
    supplier_id: number;
    company_name: string;
    contact_person: string;
    overall_rating: number;
    partnership_level: string;
    on_time_delivery_percentage: number;
    defect_rate_percentage: number;
    average_delivery_days: number;
    total_purchases_ytd: number;
    products_supplied: number;
    supply_chain_risk_level: string;
    financial_stability_rating: string;
    performance_category: string;
    review_status: string;
    performance_trend: string;
}

interface VendorComparison {
    supplier_id: number;
    company_name: string;
    overall_rating: number;
    quoted_price: number;
    total_landed_cost: number;
    delivery_lead_time_days: number;
    on_time_delivery_percentage: number;
    defect_rate_percentage: number;
    composite_score: number;
    cost_rank: number;
    quality_rank: number;
    speed_rank: number;
    recommendation_score: number;
    supply_chain_risk_level: string;
    partnership_level: string;
}

const VendorPerformanceDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Supplier dashboard state
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierSummary, setSupplierSummary] = useState<any>(null);
    const [supplierFilters, setSupplierFilters] = useState({
        performance_category: 'all',
        partnership_level: 'all',
        risk_level: 'all'
    });

    // Vendor comparison state
    const [vendorComparison, setVendorComparison] = useState<VendorComparison[]>([]);
    const [comparisonProduct, setComparisonProduct] = useState('');
    const [comparisonSummary, setComparisonSummary] = useState<any>(null);

    // Dialog states
    const [evaluationDialog, setEvaluationDialog] = useState(false);
    const [priceQuoteDialog, setPriceQuoteDialog] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Form states
    const [evaluation, setEvaluation] = useState({
        quality_score: 4,
        delivery_score: 4,
        communication_score: 4,
        pricing_score: 4,
        service_score: 4,
        innovation_score: 3,
        evaluation_period_start: '',
        evaluation_period_end: '',
        improvements_noted: '',
        areas_for_improvement: '',
        recommended_actions: 'continue_partnership'
    });

    const [priceQuote, setPriceQuote] = useState({
        product_id: '',
        supplier_id: '',
        quoted_price: 0,
        delivery_lead_time_days: 7,
        minimum_order_quantity: 1,
        payment_terms: '30 days',
        validity_period_days: 30,
        market_price_position: 'at_market',
        quote_reference: '',
        notes: ''
    });

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const fetchSupplierDashboard = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/vendor-performance/supplier-dashboard`, {
                params: supplierFilters,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            setSuppliers(response.data.data.suppliers);
            setSupplierSummary(response.data.data.summary);
        } catch (err) {
            setError('Failed to fetch supplier dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorComparison = async () => {
        if (!comparisonProduct) return;
        
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/vendor-performance/vendor-comparison`, {
                params: { product_id: comparisonProduct },
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            setVendorComparison(response.data.data.vendors);
            setComparisonSummary(response.data.data.summary);
        } catch (err) {
            setError('Failed to fetch vendor comparison');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 0) {
            fetchSupplierDashboard();
        }
    }, [activeTab, supplierFilters]);

    const handleConductEvaluation = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/vendor-performance/supplier/${selectedSupplier?.supplier_id}/evaluation`, 
                evaluation, 
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                }
            );

            setEvaluationDialog(false);
            fetchSupplierDashboard();
        } catch (err) {
            setError('Failed to conduct evaluation');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPriceQuote = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/vendor-performance/price-quote`, 
                priceQuote,
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                }
            );

            setPriceQuoteDialog(false);
            setPriceQuote({
                product_id: '',
                supplier_id: '',
                quoted_price: 0,
                delivery_lead_time_days: 7,
                minimum_order_quantity: 1,
                payment_terms: '30 days',
                validity_period_days: 30,
                market_price_position: 'at_market',
                quote_reference: '',
                notes: ''
            });
        } catch (err) {
            setError('Failed to record price quote');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceColor = (category: string) => {
        switch (category) {
            case 'EXCELLENT': return 'success';
            case 'GOOD': return 'info';
            case 'ACCEPTABLE': return 'warning';
            case 'NEEDS_IMPROVEMENT': return 'error';
            default: return 'default';
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return 'success';
            case 'medium': return 'warning';
            case 'high': return 'error';
            case 'critical': return 'error';
            default: return 'default';
        }
    };

    const getPartnershipColor = (level: string) => {
        switch (level) {
            case 'exclusive': return 'success';
            case 'strategic': return 'info';
            case 'preferred': return 'warning';
            case 'transactional': return 'default';
            default: return 'default';
        }
    };

    const SupplierDashboardTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Supplier</TableCell>
                        <TableCell align="center">Overall Rating</TableCell>
                        <TableCell>Partnership Level</TableCell>
                        <TableCell align="center">On-Time Delivery</TableCell>
                        <TableCell align="center">Defect Rate</TableCell>
                        <TableCell align="right">YTD Purchases</TableCell>
                        <TableCell align="center">Products</TableCell>
                        <TableCell>Risk Level</TableCell>
                        <TableCell>Performance</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {suppliers.map((supplier) => (
                        <TableRow key={supplier.supplier_id}>
                            <TableCell>
                                <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        {supplier.company_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {supplier.contact_person}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <Rating value={supplier.overall_rating} precision={0.1} size="small" readOnly />
                                    <Typography variant="caption">
                                        {supplier.overall_rating.toFixed(1)}
                                    </Typography>
                                    {supplier.performance_trend === 'improving' && <TrendingUpIcon color="success" fontSize="small" />}
                                    {supplier.performance_trend === 'declining' && <TrendingDownIcon color="error" fontSize="small" />}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={supplier.partnership_level.toUpperCase()}
                                    color={getPartnershipColor(supplier.partnership_level)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell align="center">
                                <Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={supplier.on_time_delivery_percentage} 
                                        sx={{ width: 60, mb: 1 }}
                                        color={supplier.on_time_delivery_percentage >= 95 ? 'success' : 
                                               supplier.on_time_delivery_percentage >= 85 ? 'warning' : 'error'}
                                    />
                                    <Typography variant="caption">
                                        {supplier.on_time_delivery_percentage.toFixed(1)}%
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <Typography 
                                    variant="body2" 
                                    color={supplier.defect_rate_percentage <= 1 ? 'success.main' : 
                                           supplier.defect_rate_percentage <= 3 ? 'warning.main' : 'error.main'}
                                >
                                    {supplier.defect_rate_percentage.toFixed(2)}%
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2">
                                    ₹{supplier.total_purchases_ytd.toLocaleString('en-IN')}
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Badge badgeContent={supplier.products_supplied} color="primary">
                                    <VendorIcon />
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={supplier.supply_chain_risk_level.toUpperCase()}
                                    color={getRiskColor(supplier.supply_chain_risk_level)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={supplier.performance_category.replace('_', ' ')}
                                    color={getPerformanceColor(supplier.performance_category)}
                                    size="small"
                                />
                                {supplier.review_status === 'OVERDUE' && (
                                    <Chip 
                                        label="Review Overdue"
                                        color="error"
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </TableCell>
                            <TableCell>
                                <Tooltip title="Conduct Evaluation">
                                    <IconButton 
                                        size="small"
                                        onClick={() => {
                                            setSelectedSupplier(supplier);
                                            setEvaluationDialog(true);
                                        }}
                                    >
                                        <EvaluationIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Record Price Quote">
                                    <IconButton 
                                        size="small"
                                        onClick={() => {
                                            setPriceQuote(prev => ({...prev, supplier_id: supplier.supplier_id.toString()}));
                                            setPriceQuoteDialog(true);
                                        }}
                                    >
                                        <PriceIcon />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const VendorComparisonTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Supplier</TableCell>
                        <TableCell align="center">Overall Rating</TableCell>
                        <TableCell align="right">Quoted Price</TableCell>
                        <TableCell align="right">Landed Cost</TableCell>
                        <TableCell align="center">Lead Time</TableCell>
                        <TableCell align="center">Composite Score</TableCell>
                        <TableCell>Rankings</TableCell>
                        <TableCell>Risk Level</TableCell>
                        <TableCell>Recommendation</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {vendorComparison.map((vendor, index) => (
                        <TableRow key={vendor.supplier_id}>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {index === 0 && <RatingIcon color="warning" />}
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {vendor.company_name}
                                        </Typography>
                                        <Chip 
                                            label={vendor.partnership_level}
                                            color={getPartnershipColor(vendor.partnership_level)}
                                            size="small"
                                        />
                                    </Box>
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <Rating value={vendor.overall_rating} precision={0.1} size="small" readOnly />
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2">
                                    ₹{vendor.quoted_price.toLocaleString('en-IN')}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                    ₹{vendor.total_landed_cost.toLocaleString('en-IN')}
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TimeIcon fontSize="small" />
                                    <Typography variant="body2">
                                        {vendor.delivery_lead_time_days}d
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={vendor.composite_score} 
                                        sx={{ width: 60, mb: 1 }}
                                        color={vendor.composite_score >= 80 ? 'success' : 
                                               vendor.composite_score >= 60 ? 'info' : 'warning'}
                                    />
                                    <Typography variant="caption">
                                        {vendor.composite_score.toFixed(0)}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Chip label={`C:${vendor.cost_rank}`} size="small" color="success" />
                                    <Chip label={`Q:${vendor.quality_rank}`} size="small" color="info" />
                                    <Chip label={`S:${vendor.speed_rank}`} size="small" color="warning" />
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={vendor.supply_chain_risk_level.toUpperCase()}
                                    color={getRiskColor(vendor.supply_chain_risk_level)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">
                                        Score: {vendor.recommendation_score}
                                    </Typography>
                                    {index === 0 && (
                                        <Chip label="RECOMMENDED" color="success" size="small" />
                                    )}
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const EvaluationDialog = () => (
        <Dialog open={evaluationDialog} onClose={() => setEvaluationDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Conduct Supplier Evaluation - {selectedSupplier?.company_name}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Evaluation Period Start"
                            type="date"
                            value={evaluation.evaluation_period_start}
                            onChange={(e) => setEvaluation({...evaluation, evaluation_period_start: e.target.value})}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Evaluation Period End"
                            type="date"
                            value={evaluation.evaluation_period_end}
                            onChange={(e) => setEvaluation({...evaluation, evaluation_period_end: e.target.value})}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    
                    {/* Performance Scores */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>Performance Scores (1-5 scale)</Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <Box>
                            <Typography variant="body2">Quality Score</Typography>
                            <Rating 
                                value={evaluation.quality_score} 
                                onChange={(_, value) => setEvaluation({...evaluation, quality_score: value || 3})}
                                precision={0.5}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box>
                            <Typography variant="body2">Delivery Score</Typography>
                            <Rating 
                                value={evaluation.delivery_score} 
                                onChange={(_, value) => setEvaluation({...evaluation, delivery_score: value || 3})}
                                precision={0.5}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box>
                            <Typography variant="body2">Communication Score</Typography>
                            <Rating 
                                value={evaluation.communication_score} 
                                onChange={(_, value) => setEvaluation({...evaluation, communication_score: value || 3})}
                                precision={0.5}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box>
                            <Typography variant="body2">Pricing Score</Typography>
                            <Rating 
                                value={evaluation.pricing_score} 
                                onChange={(_, value) => setEvaluation({...evaluation, pricing_score: value || 3})}
                                precision={0.5}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box>
                            <Typography variant="body2">Service Score</Typography>
                            <Rating 
                                value={evaluation.service_score} 
                                onChange={(_, value) => setEvaluation({...evaluation, service_score: value || 3})}
                                precision={0.5}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box>
                            <Typography variant="body2">Innovation Score</Typography>
                            <Rating 
                                value={evaluation.innovation_score} 
                                onChange={(_, value) => setEvaluation({...evaluation, innovation_score: value || 3})}
                                precision={0.5}
                            />
                        </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Improvements Noted"
                            multiline
                            rows={3}
                            value={evaluation.improvements_noted}
                            onChange={(e) => setEvaluation({...evaluation, improvements_noted: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Areas for Improvement"
                            multiline
                            rows={3}
                            value={evaluation.areas_for_improvement}
                            onChange={(e) => setEvaluation({...evaluation, areas_for_improvement: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Recommended Actions</InputLabel>
                            <Select
                                value={evaluation.recommended_actions}
                                onChange={(e) => setEvaluation({...evaluation, recommended_actions: e.target.value})}
                            >
                                <MenuItem value="continue_partnership">Continue Partnership</MenuItem>
                                <MenuItem value="improve_performance">Improve Performance</MenuItem>
                                <MenuItem value="reduce_volume">Reduce Volume</MenuItem>
                                <MenuItem value="terminate">Terminate</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEvaluationDialog(false)}>Cancel</Button>
                <Button onClick={handleConductEvaluation} variant="contained">
                    Complete Evaluation
                </Button>
            </DialogActions>
        </Dialog>
    );

    const PriceQuoteDialog = () => (
        <Dialog open={priceQuoteDialog} onClose={() => setPriceQuoteDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Record Price Quote</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Product ID"
                            value={priceQuote.product_id}
                            onChange={(e) => setPriceQuote({...priceQuote, product_id: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Supplier ID"
                            value={priceQuote.supplier_id}
                            onChange={(e) => setPriceQuote({...priceQuote, supplier_id: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Quoted Price"
                            type="number"
                            value={priceQuote.quoted_price}
                            onChange={(e) => setPriceQuote({...priceQuote, quoted_price: parseFloat(e.target.value)})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Lead Time (days)"
                            type="number"
                            value={priceQuote.delivery_lead_time_days}
                            onChange={(e) => setPriceQuote({...priceQuote, delivery_lead_time_days: parseInt(e.target.value)})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Minimum Order Quantity"
                            type="number"
                            value={priceQuote.minimum_order_quantity}
                            onChange={(e) => setPriceQuote({...priceQuote, minimum_order_quantity: parseInt(e.target.value)})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Market Position</InputLabel>
                            <Select
                                value={priceQuote.market_price_position}
                                onChange={(e) => setPriceQuote({...priceQuote, market_price_position: e.target.value})}
                            >
                                <MenuItem value="below_market">Below Market</MenuItem>
                                <MenuItem value="at_market">At Market</MenuItem>
                                <MenuItem value="above_market">Above Market</MenuItem>
                                <MenuItem value="premium">Premium</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Payment Terms"
                            value={priceQuote.payment_terms}
                            onChange={(e) => setPriceQuote({...priceQuote, payment_terms: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Quote Reference"
                            value={priceQuote.quote_reference}
                            onChange={(e) => setPriceQuote({...priceQuote, quote_reference: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Notes"
                            multiline
                            rows={3}
                            value={priceQuote.notes}
                            onChange={(e) => setPriceQuote({...priceQuote, notes: e.target.value})}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setPriceQuoteDialog(false)}>Cancel</Button>
                <Button onClick={handleRecordPriceQuote} variant="contained">
                    Record Quote
                </Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Vendor Performance Dashboard</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setPriceQuoteDialog(true)}
                    >
                        Add Quote
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={activeTab === 0 ? fetchSupplierDashboard : fetchVendorComparison}
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
                <Tab label="Supplier Dashboard" icon={<VendorIcon />} />
                <Tab label="Vendor Comparison" icon={<CompareIcon />} />
            </Tabs>

            {activeTab === 0 && (
                <Box>
                    {/* Filters */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Filters</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Performance Category</InputLabel>
                                        <Select
                                            value={supplierFilters.performance_category}
                                            onChange={(e) => setSupplierFilters({...supplierFilters, performance_category: e.target.value})}
                                        >
                                            <MenuItem value="all">All Categories</MenuItem>
                                            <MenuItem value="EXCELLENT">Excellent</MenuItem>
                                            <MenuItem value="GOOD">Good</MenuItem>
                                            <MenuItem value="ACCEPTABLE">Acceptable</MenuItem>
                                            <MenuItem value="NEEDS_IMPROVEMENT">Needs Improvement</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Partnership Level</InputLabel>
                                        <Select
                                            value={supplierFilters.partnership_level}
                                            onChange={(e) => setSupplierFilters({...supplierFilters, partnership_level: e.target.value})}
                                        >
                                            <MenuItem value="all">All Levels</MenuItem>
                                            <MenuItem value="exclusive">Exclusive</MenuItem>
                                            <MenuItem value="strategic">Strategic</MenuItem>
                                            <MenuItem value="preferred">Preferred</MenuItem>
                                            <MenuItem value="transactional">Transactional</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Risk Level</InputLabel>
                                        <Select
                                            value={supplierFilters.risk_level}
                                            onChange={(e) => setSupplierFilters({...supplierFilters, risk_level: e.target.value})}
                                        >
                                            <MenuItem value="all">All Risk Levels</MenuItem>
                                            <MenuItem value="low">Low Risk</MenuItem>
                                            <MenuItem value="medium">Medium Risk</MenuItem>
                                            <MenuItem value="high">High Risk</MenuItem>
                                            <MenuItem value="critical">Critical Risk</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Summary Cards */}
                    {supplierSummary && (
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="primary">
                                            {supplierSummary.total_suppliers}
                                        </Typography>
                                        <Typography variant="body2">Total Suppliers</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="success.main">
                                            {supplierSummary.excellent_suppliers}
                                        </Typography>
                                        <Typography variant="body2">Excellent</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="error.main">
                                            {supplierSummary.improvement_needed}
                                        </Typography>
                                        <Typography variant="body2">Need Improvement</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="warning.main">
                                            {supplierSummary.overdue_reviews}
                                        </Typography>
                                        <Typography variant="body2">Overdue Reviews</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" color="error.main">
                                            {supplierSummary.high_risk_suppliers}
                                        </Typography>
                                        <Typography variant="body2">High Risk</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {loading ? <CircularProgress /> : <SupplierDashboardTable />}
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Product Comparison</Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={8}>
                                    <TextField
                                        fullWidth
                                        label="Product ID"
                                        value={comparisonProduct}
                                        onChange={(e) => setComparisonProduct(e.target.value)}
                                        placeholder="Enter product ID to compare vendors"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<SearchIcon />}
                                        onClick={fetchVendorComparison}
                                        disabled={!comparisonProduct || loading}
                                    >
                                        Compare Vendors
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {comparisonSummary && (
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Best Value</Typography>
                                        <Typography variant="body2" color="primary">
                                            {comparisonSummary.best_value?.company_name}
                                        </Typography>
                                        <Typography variant="caption">
                                            Score: {comparisonSummary.best_value?.composite_score?.toFixed(1)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Lowest Cost</Typography>
                                        <Typography variant="body2" color="success.main">
                                            {comparisonSummary.lowest_cost?.company_name}
                                        </Typography>
                                        <Typography variant="caption">
                                            ₹{comparisonSummary.lowest_cost?.total_landed_cost?.toLocaleString('en-IN')}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Highest Quality</Typography>
                                        <Typography variant="body2" color="info.main">
                                            {comparisonSummary.highest_quality?.company_name}
                                        </Typography>
                                        <Rating 
                                            value={comparisonSummary.highest_quality?.overall_rating} 
                                            size="small" 
                                            readOnly 
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Fastest Delivery</Typography>
                                        <Typography variant="body2" color="warning.main">
                                            {comparisonSummary.fastest_delivery?.company_name}
                                        </Typography>
                                        <Typography variant="caption">
                                            {comparisonSummary.fastest_delivery?.delivery_lead_time_days} days
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {loading ? <CircularProgress /> : <VendorComparisonTable />}
                </Box>
            )}

            <EvaluationDialog />
            <PriceQuoteDialog />
        </Box>
    );
};

export default VendorPerformanceDashboard;