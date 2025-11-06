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
    Badge
} from '@mui/material';
import {
    QrCode as SerialIcon,
    Security as WarrantyIcon,
    Add as AddIcon,
    Search as SearchIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    Schedule as ScheduleIcon,
    ExpandMore as ExpandMoreIcon,
    Print as PrintIcon,
    Assignment as ClaimIcon
} from '@mui/icons-material';
import axios from 'axios';

const SerialWarrantyTracker = ({ productId }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [serialNumbers, setSerialNumbers] = useState([]);
    const [warrantyClaims, setWarrantyClaims] = useState([]);
    const [warrantyReport, setWarrantyReport] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dialog states
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
    const [claimDialogOpen, setClaimDialogOpen] = useState(false);
    const [selectedSerial, setSelectedSerial] = useState(null);

    // Form data
    const [generateForm, setGenerateForm] = useState({
        product_id: productId || '',
        quantity: 1,
        batch_number: '',
        manufacturing_date: '',
        warranty_months: 12,
        location_id: 1
    });

    const [claimForm, setClaimForm] = useState({
        serial_number: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        issue_description: '',
        claim_type: 'repair',
        priority: 'normal'
    });

    const API_BASE_URL = '';

    useEffect(() => {
        if (productId) {
            fetchSerialNumbers();
        }
        fetchWarrantyClaims();
        fetchWarrantyReport();
    }, [productId]);

    const fetchSerialNumbers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/serial-warranty/serial-numbers/product/${productId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setSerialNumbers(response.data.data);
        } catch (err) {
            setError('Failed to fetch serial numbers');
        }
    };

    const fetchWarrantyClaims = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/serial-warranty/warranty-claims`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setWarrantyClaims(response.data.data);
        } catch (err) {
            setError('Failed to fetch warranty claims');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarrantyReport = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/serial-warranty/warranty-expiry-report`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setWarrantyReport(response.data.data);
        } catch (err) {
            console.error('Failed to fetch warranty report:', err);
        }
    };

    const handleGenerateSerials = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/serial-warranty/serial-numbers/generate`, generateForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setGenerateDialogOpen(false);
            setGenerateForm({
                product_id: productId || '',
                quantity: 1,
                batch_number: '',
                manufacturing_date: '',
                warranty_months: 12,
                location_id: 1
            });

            fetchSerialNumbers();
        } catch (err) {
            setError('Failed to generate serial numbers');
        }
    };

    const handleCreateClaim = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/serial-warranty/warranty-claims`, claimForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });

            setClaimDialogOpen(false);
            setClaimForm({
                serial_number: '',
                customer_name: '',
                customer_phone: '',
                customer_email: '',
                issue_description: '',
                claim_type: 'repair',
                priority: 'normal'
            });

            fetchWarrantyClaims();
        } catch (err) {
            setError('Failed to create warranty claim');
        }
    };

    const handleWarrantyLookup = async (serialNumber) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/serial-warranty/warranty/${serialNumber}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vtria_token')}` }
            });
            setSelectedSerial(response.data.data);
            setWarrantyDialogOpen(true);
        } catch (err) {
            setError('Failed to fetch warranty information');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'in_stock': return 'primary';
            case 'sold': return 'success';
            case 'returned': return 'warning';
            case 'defective': return 'error';
            case 'scrapped': return 'default';
            default: return 'default';
        }
    };

    const getWarrantyStatusColor = (status) => {
        switch (status) {
            case 'active': return 'success';
            case 'expiring_soon': return 'warning';
            case 'expired': return 'error';
            default: return 'default';
        }
    };

    const getClaimStatusColor = (status) => {
        switch (status) {
            case 'open': return 'error';
            case 'in_progress': return 'warning';
            case 'resolved': return 'success';
            case 'closed': return 'default';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const SerialNumbersTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Serial Number</TableCell>
                        <TableCell>Batch</TableCell>
                        <TableCell>Manufacturing Date</TableCell>
                        <TableCell>Warranty Expiry</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {serialNumbers.map((serial) => (
                        <TableRow key={serial.id}>
                            <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                    {serial.serial_number}
                                </Typography>
                            </TableCell>
                            <TableCell>{serial.batch_number || '-'}</TableCell>
                            <TableCell>
                                {serial.manufacturing_date ?
                                    new Date(serial.manufacturing_date).toLocaleDateString('en-IN') :
                                    '-'
                                }
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">
                                        {serial.warranty_expiry_date ?
                                            new Date(serial.warranty_expiry_date).toLocaleDateString('en-IN') :
                                            '-'
                                        }
                                    </Typography>
                                    <Chip
                                        label={serial.warranty_status}
                                        color={getWarrantyStatusColor(serial.warranty_status)}
                                        size="small"
                                    />
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={serial.status}
                                    color={getStatusColor(serial.status)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>{serial.location_name || '-'}</TableCell>
                            <TableCell>{serial.customer_name || '-'}</TableCell>
                            <TableCell>
                                <IconButton
                                    size="small"
                                    onClick={() => handleWarrantyLookup(serial.serial_number)}
                                >
                                    <SearchIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const WarrantyClaimsTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Claim #</TableCell>
                        <TableCell>Serial Number</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Issue</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Warranty Valid</TableCell>
                        <TableCell>Claim Date</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {warrantyClaims.map((claim) => (
                        <TableRow key={claim.id}>
                            <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                    {claim.claim_number}
                                </Typography>
                            </TableCell>
                            <TableCell>{claim.serial_number}</TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {claim.product_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {claim.product_sku}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {claim.customer_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {claim.customer_phone}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" sx={{ maxWidth: 200 }}>
                                    {claim.issue_description.substring(0, 50)}...
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip label={claim.claim_type} size="small" />
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={claim.priority}
                                    color={claim.priority === 'urgent' ? 'error' : claim.priority === 'high' ? 'warning' : 'default'}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={claim.status}
                                    color={getClaimStatusColor(claim.status)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={claim.warranty_valid ? 'Valid' : 'Expired'}
                                    color={claim.warranty_valid ? 'success' : 'error'}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                {new Date(claim.claim_date).toLocaleDateString('en-IN')}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const WarrantyReportTable = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Serial Number</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Warranty Expiry</TableCell>
                        <TableCell>Days Remaining</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Order #</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {warrantyReport.map((item) => (
                        <TableRow key={item.serial_number}>
                            <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                    {item.serial_number}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {item.product_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.product_sku}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {item.customer_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.customer_phone}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                {new Date(item.warranty_expiry_date).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell>
                                <Typography
                                    variant="body2"
                                    color={item.days_remaining < 0 ? 'error.main' : item.days_remaining < 30 ? 'warning.main' : 'text.primary'}
                                >
                                    {item.days_remaining < 0 ? 'Expired' : `${item.days_remaining} days`}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={item.warranty_status}
                                    color={getWarrantyStatusColor(item.warranty_status)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>{item.order_number || '-'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const GenerateSerialDialog = () => (
        <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Generate Serial Numbers</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Quantity"
                            type="number"
                            value={generateForm.quantity}
                            onChange={(e) => setGenerateForm({ ...generateForm, quantity: parseInt(e.target.value) })}
                            inputProps={{ min: 1, max: 1000 }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Warranty Months"
                            type="number"
                            value={generateForm.warranty_months}
                            onChange={(e) => setGenerateForm({ ...generateForm, warranty_months: parseInt(e.target.value) })}
                            inputProps={{ min: 1, max: 60 }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Batch Number"
                            value={generateForm.batch_number}
                            onChange={(e) => setGenerateForm({ ...generateForm, batch_number: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Manufacturing Date"
                            type="date"
                            value={generateForm.manufacturing_date}
                            onChange={(e) => setGenerateForm({ ...generateForm, manufacturing_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerateSerials} variant="contained">
                    Generate Serial Numbers
                </Button>
            </DialogActions>
        </Dialog>
    );

    const CreateClaimDialog = () => (
        <Dialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Create Warranty Claim</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Serial Number"
                            value={claimForm.serial_number}
                            onChange={(e) => setClaimForm({ ...claimForm, serial_number: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Customer Name"
                            value={claimForm.customer_name}
                            onChange={(e) => setClaimForm({ ...claimForm, customer_name: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Customer Phone"
                            value={claimForm.customer_phone}
                            onChange={(e) => setClaimForm({ ...claimForm, customer_phone: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Customer Email"
                            type="email"
                            value={claimForm.customer_email}
                            onChange={(e) => setClaimForm({ ...claimForm, customer_email: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Claim Type</InputLabel>
                            <Select
                                value={claimForm.claim_type}
                                onChange={(e) => setClaimForm({ ...claimForm, claim_type: e.target.value })}
                            >
                                <MenuItem value="repair">Repair</MenuItem>
                                <MenuItem value="replacement">Replacement</MenuItem>
                                <MenuItem value="refund">Refund</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={claimForm.priority}
                                onChange={(e) => setClaimForm({ ...claimForm, priority: e.target.value })}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="normal">Normal</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Issue Description"
                            multiline
                            rows={4}
                            value={claimForm.issue_description}
                            onChange={(e) => setClaimForm({ ...claimForm, issue_description: e.target.value })}
                            placeholder="Describe the issue in detail..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setClaimDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateClaim} variant="contained">
                    Create Claim
                </Button>
            </DialogActions>
        </Dialog>
    );

    const WarrantyInfoDialog = () => (
        <Dialog open={warrantyDialogOpen} onClose={() => setWarrantyDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Warranty Information</DialogTitle>
            <DialogContent>
                {selectedSerial && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Product Details</Typography>
                                    <Typography><strong>Serial Number:</strong> {selectedSerial.product_info.serial_number}</Typography>
                                    <Typography><strong>Product:</strong> {selectedSerial.product_info.product_name}</Typography>
                                    <Typography><strong>SKU:</strong> {selectedSerial.product_info.product_sku}</Typography>
                                    <Typography><strong>Manufacturing Date:</strong> {new Date(selectedSerial.product_info.manufacturing_date).toLocaleDateString('en-IN')}</Typography>
                                    <Typography><strong>Warranty Expiry:</strong> {new Date(selectedSerial.product_info.warranty_expiry_date).toLocaleDateString('en-IN')}</Typography>
                                    <Typography><strong>Status:</strong>
                                        <Chip
                                            label={selectedSerial.product_info.warranty_status}
                                            color={getWarrantyStatusColor(selectedSerial.product_info.warranty_status)}
                                            size="small"
                                            sx={{ ml: 1 }}
                                        />
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Customer Details</Typography>
                                    <Typography><strong>Customer:</strong> {selectedSerial.product_info.customer_name || 'Not sold'}</Typography>
                                    <Typography><strong>Phone:</strong> {selectedSerial.product_info.customer_phone || '-'}</Typography>
                                    <Typography><strong>Email:</strong> {selectedSerial.product_info.customer_email || '-'}</Typography>
                                    <Typography><strong>Order Number:</strong> {selectedSerial.product_info.order_number || '-'}</Typography>
                                    <Typography><strong>Order Date:</strong> {selectedSerial.product_info.order_date ? new Date(selectedSerial.product_info.order_date).toLocaleDateString('en-IN') : '-'}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        {selectedSerial.warranty_claims.length > 0 && (
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>Warranty Claims History</Typography>
                                        <List>
                                            {selectedSerial.warranty_claims.map((claim) => (
                                                <ListItem key={claim.id}>
                                                    <ListItemText
                                                        primary={`Claim #${claim.claim_number} - ${claim.claim_type}`}
                                                        secondary={`${claim.issue_description} | Status: ${claim.status} | ${new Date(claim.claim_date).toLocaleDateString('en-IN')}`}
                                                    />
                                                    <Chip
                                                        label={claim.status}
                                                        color={getClaimStatusColor(claim.status)}
                                                        size="small"
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setWarrantyDialogOpen(false)}>Close</Button>
            </DialogActions>
        </Dialog>
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
                    Serial Number & Warranty Tracking
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setGenerateDialogOpen(true)}
                        disabled={!productId}
                    >
                        Generate Serials
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<ClaimIcon />}
                        onClick={() => setClaimDialogOpen(true)}
                    >
                        Create Claim
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab
                    label={
                        <Badge badgeContent={serialNumbers.length} color="primary">
                            Serial Numbers
                        </Badge>
                    }
                />
                <Tab
                    label={
                        <Badge badgeContent={warrantyClaims.filter(c => c.status === 'open').length} color="error">
                            Warranty Claims
                        </Badge>
                    }
                />
                <Tab
                    label={
                        <Badge badgeContent={warrantyReport.filter(w => w.warranty_status === 'expiring_soon').length} color="warning">
                            Warranty Report
                        </Badge>
                    }
                />
            </Tabs>

            {activeTab === 0 && <SerialNumbersTable />}
            {activeTab === 1 && <WarrantyClaimsTable />}
            {activeTab === 2 && <WarrantyReportTable />}

            <GenerateSerialDialog />
            <CreateClaimDialog />
            <WarrantyInfoDialog />
        </Box>
    );
};

export default SerialWarrantyTracker;
