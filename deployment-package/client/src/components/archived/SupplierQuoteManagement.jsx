import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
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
    Divider,
    Checkbox,
    FormControlLabel,
    InputAdornment
} from '@mui/material';
import {
    Add as AddIcon,
    Send as SendIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Download as DownloadIcon,
    Email as EmailIcon,
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Business as EnterpriseIcon,
    Gavel as ComplianceIcon,
    Security as AuditIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SupplierQuoteManagement = () => {
    const [tabValue, setTabValue] = useState(0);
    const [quoteRequests, setQuoteRequests] = useState([]);
    const [supplierQuotes, setSupplierQuotes] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [estimations, setEstimations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Dialog states
    const [createRFQDialog, setCreateRFQDialog] = useState(false);
    const [recordQuoteDialog, setRecordQuoteDialog] = useState(false);
    const [selectedEstimation, setSelectedEstimation] = useState('');

    // Form states
    const [rfqForm, setRfqForm] = useState({
        estimation_id: '',
        supplier_ids: [],
        due_date: '',
        notes: '',
        terms_conditions: '',
        items: []
    });

    const [quoteForm, setQuoteForm] = useState({
        request_id: '',
        supplier_id: '',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: '',
        payment_terms: '',
        delivery_terms: '',
        warranty_terms: '',
        notes: '',
        items: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchQuoteRequests(),
                fetchSupplierQuotes(),
                fetchSuppliers(),
                fetchEstimations()
            ]);
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuoteRequests = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/purchase-price-comparison/quote-requests`);
            setQuoteRequests(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch quote requests:', err);
        }
    };

    const fetchSupplierQuotes = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/purchase-price-comparison/supplier-quotes`);
            setSupplierQuotes(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch supplier quotes:', err);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/vendors`);
            setSuppliers(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
        }
    };

    const fetchEstimations = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/estimations`);
            setEstimations(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch estimations:', err);
        }
    };

    const handleCreateRFQ = async () => {
        try {
            setLoading(true);
            const requestData = {
                ...rfqForm,
                due_date: new Date(rfqForm.due_date).toISOString().split('T')[0]
            };

            await axios.post(`${API_BASE_URL}/api/purchase-price-comparison/quote-requests`, requestData);

            setCreateRFQDialog(false);
            setRfqForm({
                estimation_id: '',
                supplier_ids: [],
                due_date: '',
                notes: '',
                terms_conditions: '',
                items: []
            });

            await fetchQuoteRequests();
            setError('');
        } catch (err) {
            setError('Failed to create quote request');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordQuote = async () => {
        try {
            setLoading(true);
            const quoteData = {
                ...quoteForm,
                quote_date: new Date(quoteForm.quote_date).toISOString().split('T')[0],
                valid_until: new Date(quoteForm.valid_until).toISOString().split('T')[0]
            };

            await axios.post(`${API_BASE_URL}/api/purchase-price-comparison/supplier-quotes`, quoteData);

            setRecordQuoteDialog(false);
            setQuoteForm({
                request_id: '',
                supplier_id: '',
                quote_date: new Date().toISOString().split('T')[0],
                valid_until: '',
                payment_terms: '',
                delivery_terms: '',
                warranty_terms: '',
                notes: '',
                items: []
            });

            await fetchSupplierQuotes();
            setError('');
        } catch (err) {
            setError('Failed to record supplier quote');
        } finally {
            setLoading(false);
        }
    };

    const loadEstimationItems = async (estimationId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/purchase-price-comparison/estimation/${estimationId}/comparison`);
            const items = response.data.data.items || [];

            setRfqForm(prev => ({
                ...prev,
                estimation_id: estimationId,
                items: items.map(item => ({
                    estimation_item_id: item.estimation_item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    estimated_price: item.estimated_price,
                    unit: 'NOS'
                }))
            }));
        } catch (err) {
            setError('Failed to load estimation items');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'draft': 'default',
            'sent': 'primary',
            'responded': 'success',
            'expired': 'error',
            'cancelled': 'error',
            'submitted': 'info',
            'under_review': 'warning',
            'approved': 'success',
            'rejected': 'error'
        };
        return colors[status] || 'default';
    };

    const TabPanel = ({ children, value, index }) => (
        <div hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );

    if (loading && tabValue === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Enterprise Header */}
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', color: 'white' }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                                <EnterpriseIcon sx={{ mr: 2, fontSize: '2rem' }} />
                                🏢 Enterprise Supplier Management
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.9 }}>
                                Formal RFQ process • Strategic sourcing • Compliance & audit trails
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip
                                icon={<ComplianceIcon />}
                                label="SOX Compliant"
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                            <Chip
                                icon={<AuditIcon />}
                                label="Audit Ready"
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* When to Use This System */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    <strong>🏢 Use Enterprise Supplier Management when:</strong>
                </Typography>
                <Typography variant="body2">
                    • High-value purchases (Rs.50K+) • Strategic sourcing • Long-term partnerships •
                    Compliance requirements • Audit trails needed • Regulated industries • Volume discounts
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    💡 For quick, competitive sourcing, try <strong>⚡ Agile Vendors</strong> instead
                </Typography>
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                        <Tab label="Quote Requests (RFQs)" />
                        <Tab label="Supplier Quotes" />
                        <Tab label="Analytics" />
                    </Tabs>

                    {/* Quote Requests Tab */}
                    <TabPanel value={tabValue} index={0}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Request for Quotations (RFQs)</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateRFQDialog(true)}
                            >
                                Create RFQ
                            </Button>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Request Number</TableCell>
                                        <TableCell>Estimation</TableCell>
                                        <TableCell>Supplier</TableCell>
                                        <TableCell>Due Date</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Items</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {quoteRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>{request.request_number}</TableCell>
                                            <TableCell>{request.estimation_number}</TableCell>
                                            <TableCell>{request.supplier_name}</TableCell>
                                            <TableCell>{new Date(request.due_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={request.status}
                                                    color={getStatusColor(request.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{request.item_count}</TableCell>
                                            <TableCell>
                                                <IconButton size="small">
                                                    <ViewIcon />
                                                </IconButton>
                                                <IconButton size="small">
                                                    <EmailIcon />
                                                </IconButton>
                                                <IconButton size="small">
                                                    <EditIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </TabPanel>

                    {/* Supplier Quotes Tab */}
                    <TabPanel value={tabValue} index={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Supplier Quote Responses</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setRecordQuoteDialog(true)}
                            >
                                Record Quote
                            </Button>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Quote Number</TableCell>
                                        <TableCell>Request Number</TableCell>
                                        <TableCell>Supplier</TableCell>
                                        <TableCell>Quote Date</TableCell>
                                        <TableCell>Valid Until</TableCell>
                                        <TableCell>Total Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {supplierQuotes.map((quote) => (
                                        <TableRow key={quote.id}>
                                            <TableCell>{quote.quote_number}</TableCell>
                                            <TableCell>{quote.request_number}</TableCell>
                                            <TableCell>{quote.supplier_name}</TableCell>
                                            <TableCell>{new Date(quote.quote_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{new Date(quote.valid_until).toLocaleDateString()}</TableCell>
                                            <TableCell>₹{parseFloat(quote.total_amount || 0).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={quote.status}
                                                    color={getStatusColor(quote.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small">
                                                    <ViewIcon />
                                                </IconButton>
                                                <IconButton size="small" color="success">
                                                    <ApproveIcon />
                                                </IconButton>
                                                <IconButton size="small" color="error">
                                                    <RejectIcon />
                                                </IconButton>
                                                <IconButton size="small">
                                                    <DownloadIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </TabPanel>

                    {/* Analytics Tab */}
                    <TabPanel value={tabValue} index={2}>
                        <Typography variant="h6" gutterBottom>
                            Quote Management Analytics
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Total RFQs
                                        </Typography>
                                        <Typography variant="h4">
                                            {quoteRequests.length}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Quotes Received
                                        </Typography>
                                        <Typography variant="h4">
                                            {supplierQuotes.length}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Response Rate
                                        </Typography>
                                        <Typography variant="h4">
                                            {quoteRequests.length > 0 ? Math.round((supplierQuotes.length / quoteRequests.length) * 100) : 0}%
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Avg. Quote Value
                                        </Typography>
                                        <Typography variant="h4">
                                            ₹{supplierQuotes.length > 0 ?
                                                Math.round(supplierQuotes.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0) / supplierQuotes.length).toLocaleString()
                                                : '0'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </TabPanel>
                </CardContent>
            </Card>

            {/* Create RFQ Dialog */}
            <Dialog open={createRFQDialog} onClose={() => setCreateRFQDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Request for Quotation (RFQ)</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Estimation</InputLabel>
                                <Select
                                    value={rfqForm.estimation_id}
                                    onChange={(e) => {
                                        const estimationId = e.target.value;
                                        setRfqForm(prev => ({ ...prev, estimation_id: estimationId }));
                                        if (estimationId) {
                                            loadEstimationItems(estimationId);
                                        }
                                    }}
                                >
                                    {estimations.map((est) => (
                                        <MenuItem key={est.id} value={est.id}>
                                            {est.estimation_number} - {est.client_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Suppliers</InputLabel>
                                <Select
                                    multiple
                                    value={rfqForm.supplier_ids}
                                    onChange={(e) => setRfqForm(prev => ({ ...prev, supplier_ids: e.target.value }))}
                                    label="Suppliers"
                                    renderValue={(selected) =>
                                        suppliers
                                            .filter(supplier => selected.includes(supplier.id))
                                            .map(supplier => supplier.vendor_name)
                                            .join(', ')
                                    }
                                >
                                    {suppliers.map((supplier) => (
                                        <MenuItem key={supplier.id} value={supplier.id}>
                                            {supplier.vendor_name}
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
                                value={rfqForm.due_date}
                                onChange={(e) => setRfqForm(prev => ({ ...prev, due_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notes"
                                multiline
                                rows={3}
                                value={rfqForm.notes}
                                onChange={(e) => setRfqForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Terms & Conditions"
                                multiline
                                rows={3}
                                value={rfqForm.terms_conditions}
                                onChange={(e) => setRfqForm(prev => ({ ...prev, terms_conditions: e.target.value }))}
                            />
                        </Grid>

                        {rfqForm.items.length > 0 && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Items to Quote ({rfqForm.items.length})
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Item Name</TableCell>
                                                <TableCell>Quantity</TableCell>
                                                <TableCell>Est. Price</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rfqForm.items.slice(0, 5).map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.item_name}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>₹{parseFloat(item.estimated_price || 0).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                            {rfqForm.items.length > 5 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center">
                                                        ... and {rfqForm.items.length - 5} more items
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateRFQDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleCreateRFQ}
                        variant="contained"
                        disabled={!rfqForm.estimation_id || rfqForm.supplier_ids.length === 0 || !rfqForm.due_date}
                    >
                        Create RFQ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Record Quote Dialog */}
            <Dialog open={recordQuoteDialog} onClose={() => setRecordQuoteDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Record Supplier Quote</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Quote Request</InputLabel>
                                <Select
                                    value={quoteForm.request_id}
                                    onChange={(e) => setQuoteForm(prev => ({ ...prev, request_id: e.target.value }))}
                                >
                                    {quoteRequests.filter(req => req.status === 'sent').map((request) => (
                                        <MenuItem key={request.id} value={request.id}>
                                            {request.request_number} - {request.supplier_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Quote Date"
                                type="date"
                                value={quoteForm.quote_date}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, quote_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Valid Until"
                                type="date"
                                value={quoteForm.valid_until}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, valid_until: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Payment Terms"
                                value={quoteForm.payment_terms}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                                placeholder="e.g., Net 30 days"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Delivery Terms"
                                value={quoteForm.delivery_terms}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, delivery_terms: e.target.value }))}
                                placeholder="e.g., 15-20 working days"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Warranty Terms"
                                value={quoteForm.warranty_terms}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, warranty_terms: e.target.value }))}
                                placeholder="e.g., 24 months"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notes"
                                multiline
                                rows={3}
                                value={quoteForm.notes}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRecordQuoteDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleRecordQuote}
                        variant="contained"
                        disabled={!quoteForm.request_id || !quoteForm.valid_until}
                    >
                        Record Quote
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SupplierQuoteManagement;