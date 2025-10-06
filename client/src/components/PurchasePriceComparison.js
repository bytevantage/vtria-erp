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
    List,
    ListItem,
    ListItemText,
    Divider,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import {
    Compare as CompareIcon,
    Send as SendIcon,
    Add as AddIcon,
    TrendingDown as SavingsIcon,
    Assessment as AnalysisIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../config';
import axios from 'axios';

const PurchasePriceComparison = ({ estimationId }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [comparisonData, setComparisonData] = useState([]);
    const [quoteRequests, setQuoteRequests] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [analysisReport, setAnalysisReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dialog states
    const [quoteRequestDialogOpen, setQuoteRequestDialogOpen] = useState(false);
    const [recordQuoteDialogOpen, setRecordQuoteDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Form data
    const [quoteRequestForm, setQuoteRequestForm] = useState({
        supplier_ids: [],
        items: [],
        due_date: '',
        notes: ''
    });

    const [supplierQuoteForm, setSupplierQuoteForm] = useState({
        request_id: '',
        supplier_id: '',
        quote_number: '',
        quote_date: '',
        valid_until: '',
        payment_terms: '',
        delivery_terms: '',
        items: [],
        notes: ''
    });

    // Using centralized config for API_BASE_URL

    useEffect(() => {
        if (estimationId) {
            fetchComparisonData();
            fetchQuoteRequests();
            fetchAnalysisReport();
        }
        fetchSuppliers();
    }, [estimationId]);

    const fetchComparisonData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/purchase-price-comparison/estimation/${estimationId}/comparison`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setComparisonData(response.data.data);
        } catch (err) {
            setError('Failed to fetch price comparison data');
        }
    };

    const fetchQuoteRequests = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/purchase-price-comparison/quote-requests?estimation_id=${estimationId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setQuoteRequests(response.data.data);
        } catch (err) {
            setError('Failed to fetch quote requests');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalysisReport = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/purchase-price-comparison/estimation/${estimationId}/analysis`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setAnalysisReport(response.data.data);
        } catch (err) {
            console.error('Failed to fetch analysis report:', err);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/vendors`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setSuppliers(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
        }
    };

    const handleCreateQuoteRequest = async () => {
        try {
            const requestData = {
                estimation_id: estimationId,
                supplier_ids: quoteRequestForm.supplier_ids,
                items: comparisonData.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    estimated_price: item.estimated_price,
                    specifications: item.item_name
                })),
                due_date: quoteRequestForm.due_date,
                notes: quoteRequestForm.notes
            };

            await axios.post(`${API_BASE_URL}/api/purchase-price-comparison/quote-requests`, requestData, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setQuoteRequestDialogOpen(false);
            setQuoteRequestForm({ supplier_ids: [], items: [], due_date: '', notes: '' });
            fetchQuoteRequests();
        } catch (err) {
            setError('Failed to create quote request');
        }
    };

    const handleRecordSupplierQuote = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/purchase-price-comparison/supplier-quotes`, supplierQuoteForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setRecordQuoteDialogOpen(false);
            setSupplierQuoteForm({
                request_id: '',
                supplier_id: '',
                quote_number: '',
                quote_date: '',
                valid_until: '',
                payment_terms: '',
                delivery_terms: '',
                items: [],
                notes: ''
            });

            fetchComparisonData();
            fetchQuoteRequests();
            fetchAnalysisReport();
        } catch (err) {
            setError('Failed to record supplier quote');
        }
    };

    const getVarianceColor = (variance) => {
        if (variance > 10) return 'error';
        if (variance > 0) return 'warning';
        return 'success';
    };

    const ComparisonTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Estimated Price</TableCell>
                        <TableCell>Best Quote</TableCell>
                        <TableCell>Supplier</TableCell>
                        <TableCell>Variance</TableCell>
                        <TableCell>Potential Savings</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {comparisonData.map((item) => (
                        <TableRow key={item.estimation_item_id}>
                            <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                    {item.item_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.sku}
                                </Typography>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.estimated_price.toLocaleString()}</TableCell>
                            <TableCell>
                                {item.best_quote ? (
                                    <Box>
                                        <Typography variant="body2">
                                            ₹{item.best_quote.quoted_price.toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Valid until: {new Date(item.best_quote.valid_until).toLocaleDateString('en-IN')}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No quotes
                                    </Typography>
                                )}
                            </TableCell>
                            <TableCell>
                                {item.best_quote ? item.best_quote.supplier_name : '-'}
                            </TableCell>
                            <TableCell>
                                {item.best_quote && (
                                    <Chip
                                        label={`${item.best_quote.price_variance_percent}%`}
                                        color={getVarianceColor(Math.abs(item.best_quote.price_variance_percent))}
                                        size="small"
                                    />
                                )}
                            </TableCell>
                            <TableCell>
                                <Typography
                                    variant="body2"
                                    color={item.potential_savings > 0 ? 'success.main' : 'text.secondary'}
                                >
                                    {item.potential_savings > 0 ?
                                        `₹${item.potential_savings.toLocaleString()}` :
                                        '-'
                                    }
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={item.has_quotes ? 'Quoted' : 'Pending'}
                                    color={item.has_quotes ? 'success' : 'warning'}
                                    size="small"
                                    icon={item.has_quotes ? <CheckIcon /> : <WarningIcon />}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const QuoteRequestDialog = () => (
        <Dialog open={quoteRequestDialogOpen} onClose={() => setQuoteRequestDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Request Supplier Quotes</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Select Suppliers</InputLabel>
                            <Select
                                multiple
                                value={quoteRequestForm.supplier_ids}
                                onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, supplier_ids: e.target.value })}
                                renderValue={(selected) => selected.join(', ')}
                            >
                                {suppliers.map((supplier) => (
                                    <MenuItem key={supplier.id} value={supplier.id}>
                                        <Checkbox checked={quoteRequestForm.supplier_ids.indexOf(supplier.id) > -1} />
                                        <ListItemText primary={supplier.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Due Date"
                            type="date"
                            value={quoteRequestForm.due_date}
                            onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, due_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Notes"
                            multiline
                            rows={3}
                            value={quoteRequestForm.notes}
                            onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, notes: e.target.value })}
                            placeholder="Additional requirements or specifications..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setQuoteRequestDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateQuoteRequest} variant="contained">
                    Send Quote Requests
                </Button>
            </DialogActions>
        </Dialog>
    );

    const RecordQuoteDialog = () => (
        <Dialog open={recordQuoteDialogOpen} onClose={() => setRecordQuoteDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Record Supplier Quote</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Quote Number"
                            value={supplierQuoteForm.quote_number}
                            onChange={(e) => setSupplierQuoteForm({ ...supplierQuoteForm, quote_number: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Quote Date"
                            type="date"
                            value={supplierQuoteForm.quote_date}
                            onChange={(e) => setSupplierQuoteForm({ ...supplierQuoteForm, quote_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Valid Until"
                            type="date"
                            value={supplierQuoteForm.valid_until}
                            onChange={(e) => setSupplierQuoteForm({ ...supplierQuoteForm, valid_until: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Payment Terms"
                            value={supplierQuoteForm.payment_terms}
                            onChange={(e) => setSupplierQuoteForm({ ...supplierQuoteForm, payment_terms: e.target.value })}
                            placeholder="e.g., 30 days"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Delivery Terms"
                            value={supplierQuoteForm.delivery_terms}
                            onChange={(e) => setSupplierQuoteForm({ ...supplierQuoteForm, delivery_terms: e.target.value })}
                            placeholder="e.g., FOB, CIF, etc."
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Notes"
                            multiline
                            rows={3}
                            value={supplierQuoteForm.notes}
                            onChange={(e) => setSupplierQuoteForm({ ...supplierQuoteForm, notes: e.target.value })}
                            placeholder="Additional notes about the quote..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setRecordQuoteDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleRecordSupplierQuote} variant="contained">
                    Record Quote
                </Button>
            </DialogActions>
        </Dialog>
    );

    const AnalysisSummary = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                            ₹{analysisReport?.summary.total_estimated_cost.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Estimated Cost
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                            ₹{analysisReport?.summary.total_best_quoted_cost.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Best Quoted Cost
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                            ₹{analysisReport?.summary.potential_savings.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Potential Savings ({analysisReport?.summary.savings_percentage || 0}%)
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                            {analysisReport?.summary.items_with_quotes || 0}/{analysisReport?.summary.total_items || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Items with Quotes
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h1">
                    Purchase Price Comparison
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<SendIcon />}
                        onClick={() => setQuoteRequestDialogOpen(true)}
                    >
                        Request Quotes
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setRecordQuoteDialogOpen(true)}
                    >
                        Record Quote
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Price Comparison" />
                <Tab label="Quote Requests" />
                <Tab label="Analysis Report" />
            </Tabs>

            {activeTab === 0 && (
                <Box>
                    {analysisReport && <AnalysisSummary />}
                    <Box sx={{ mt: 3 }}>
                        <ComparisonTable />
                    </Box>
                </Box>
            )}

            {activeTab === 1 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Request #</TableCell>
                                <TableCell>Supplier</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Items</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell>Requested</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {quoteRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell>{request.request_number}</TableCell>
                                    <TableCell>{request.supplier_name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={request.status}
                                            color={request.status === 'received' ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{request.item_count}</TableCell>
                                    <TableCell>
                                        {new Date(request.due_date).toLocaleDateString('en-IN')}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(request.requested_at).toLocaleDateString('en-IN')}
                                    </TableCell>
                                    <TableCell>
                                        {request.status === 'sent' && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setSupplierQuoteForm({
                                                        ...supplierQuoteForm,
                                                        request_id: request.id,
                                                        supplier_id: request.supplier_id
                                                    });
                                                    setRecordQuoteDialogOpen(true);
                                                }}
                                            >
                                                Record Quote
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {activeTab === 2 && analysisReport && (
                <Box>
                    <AnalysisSummary />
                    <Box sx={{ mt: 3 }}>
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">Items Comparison</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Item</TableCell>
                                                <TableCell>Estimated</TableCell>
                                                <TableCell>Best Quote</TableCell>
                                                <TableCell>Supplier</TableCell>
                                                <TableCell>Savings</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {analysisReport.items_comparison.map((item) => (
                                                <TableRow key={item.estimation_item_id}>
                                                    <TableCell>{item.item_name}</TableCell>
                                                    <TableCell>₹{item.estimated_total.toLocaleString()}</TableCell>
                                                    <TableCell>₹{item.best_quoted_total.toLocaleString()}</TableCell>
                                                    <TableCell>{item.best_supplier_name}</TableCell>
                                                    <TableCell>
                                                        <Typography color="success.main">
                                                            ₹{(item.estimated_total - item.best_quoted_total).toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                </Box>
            )}

            <QuoteRequestDialog />
            <RecordQuoteDialog />
        </Box>
    );
};

export default PurchasePriceComparison;
