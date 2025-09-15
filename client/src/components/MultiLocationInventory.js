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
    AccordionDetails
} from '@mui/material';
import {
    Add as AddIcon,
    SwapHoriz as TransferIcon,
    Visibility as ViewIcon,
    CheckCircle as ApproveIcon,
    LocalShipping as ShipIcon,
    ExpandMore as ExpandMoreIcon,
    Warehouse as WarehouseIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

const MultiLocationInventory = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [locations, setLocations] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Dialog states
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    
    // Form data
    const [transferForm, setTransferForm] = useState({
        from_location_id: '',
        to_location_id: '',
        reason: '',
        priority: 'normal',
        items: []
    });

    const API_BASE_URL = 'http://localhost:3001';

    useEffect(() => {
        fetchLocationSummary();
        fetchTransfers();
    }, []);

    const fetchLocationSummary = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/multi-location-inventory/locations/summary`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setLocations(response.data.data);
        } catch (err) {
            setError('Failed to fetch location data');
        }
    };

    const fetchTransfers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/multi-location-inventory/transfers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setTransfers(response.data.data);
        } catch (err) {
            setError('Failed to fetch transfer data');
        } finally {
            setLoading(false);
        }
    };

    const fetchStockByProduct = async (productId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/multi-location-inventory/stock/${productId}/locations`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return response.data.data;
        } catch (err) {
            console.error('Failed to fetch stock data:', err);
            return [];
        }
    };

    const handleCreateTransfer = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/multi-location-inventory/transfers`, transferForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            setTransferDialogOpen(false);
            setTransferForm({
                from_location_id: '',
                to_location_id: '',
                reason: '',
                priority: 'normal',
                items: []
            });
            
            fetchTransfers();
        } catch (err) {
            setError('Failed to create transfer request');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveTransfer = async (transferId) => {
        try {
            await axios.put(`${API_BASE_URL}/api/multi-location-inventory/transfers/${transferId}/approve`, {
                approved_by_notes: 'Approved via web interface'
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            fetchTransfers();
        } catch (err) {
            setError('Failed to approve transfer');
        }
    };

    const handleExecuteTransfer = async (transferId, items) => {
        try {
            await axios.put(`${API_BASE_URL}/api/multi-location-inventory/transfers/${transferId}/execute`, {
                shipped_items: items
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            fetchTransfers();
        } catch (err) {
            setError('Failed to execute transfer');
        }
    };

    const handleViewTransfer = (transfer) => {
        console.log('Viewing transfer:', transfer);
        // Add view functionality here
    };

    const handleShipTransfer = async (transferId) => {
        try {
            await axios.put(`${API_BASE_URL}/api/multi-location-inventory/transfers/${transferId}/ship`, {}, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchTransfers();
        } catch (err) {
            setError('Failed to ship transfer');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'info';
            case 'shipped': return 'primary';
            case 'received': return 'success';
            case 'rejected': return 'error';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'error';
            case 'high': return 'warning';
            case 'normal': return 'info';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    const LocationSummaryCard = ({ location }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarehouseIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="div">
                        {location.name}
                    </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {location.address}
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary">
                                {location.total_products || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Products
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                                {location.total_quantity || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Total Qty
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
                
                {location.low_stock_items > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            {location.low_stock_items} items below reorder level
                        </Typography>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );

    const TransferRequestDialog = () => (
        <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Create Transfer Request</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>From Location</InputLabel>
                            <Select
                                value={transferForm.from_location_id}
                                onChange={(e) => setTransferForm({...transferForm, from_location_id: e.target.value})}
                            >
                                {locations.map((location) => (
                                    <MenuItem key={location.id} value={location.id}>
                                        {location.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>To Location</InputLabel>
                            <Select
                                value={transferForm.to_location_id}
                                onChange={(e) => setTransferForm({...transferForm, to_location_id: e.target.value})}
                            >
                                {locations.map((location) => (
                                    <MenuItem key={location.id} value={location.id}>
                                        {location.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={transferForm.priority}
                                onChange={(e) => setTransferForm({...transferForm, priority: e.target.value})}
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
                            label="Reason"
                            multiline
                            rows={3}
                            value={transferForm.reason}
                            onChange={(e) => setTransferForm({...transferForm, reason: e.target.value})}
                            placeholder="Enter reason for transfer request"
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTransfer} variant="contained">
                    Create Request
                </Button>
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
                <Typography variant="h4" component="h1">
                    Multi-Location Inventory
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setTransferDialogOpen(true)}
                >
                    New Transfer
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Location Overview" />
                <Tab label="Transfer Requests" />
                <Tab label="Stock Movements" />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {locations.map((location) => (
                        <Grid item xs={12} md={6} lg={4} key={location.id}>
                            <LocationSummaryCard location={location} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {activeTab === 1 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Transfer #</TableCell>
                                <TableCell>From</TableCell>
                                <TableCell>To</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Priority</TableCell>
                                <TableCell>Items</TableCell>
                                <TableCell>Requested</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transfers.map((transfer) => (
                                <TableRow key={transfer.id}>
                                    <TableCell>{transfer.transfer_number}</TableCell>
                                    <TableCell>{transfer.from_location_name}</TableCell>
                                    <TableCell>{transfer.to_location_name}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={transfer.status} 
                                            color={getStatusColor(transfer.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={transfer.priority} 
                                            color={getPriorityColor(transfer.priority)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{transfer.item_count}</TableCell>
                                    <TableCell>
                                        {new Date(transfer.requested_at).toLocaleDateString('en-IN')}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" title="View Details" onClick={() => handleViewTransfer(transfer)}>
                                            <ViewIcon />
                                        </IconButton>
                                        {transfer.status === 'pending' && (
                                            <IconButton 
                                                size="small" 
                                                title="Approve"
                                                onClick={() => handleApproveTransfer(transfer.id)}
                                            >
                                                <ApproveIcon />
                                            </IconButton>
                                        )}
                                        {transfer.status === 'approved' && (
                                            <IconButton size="small" title="Ship" onClick={() => handleShipTransfer(transfer.id)}>
                                                <ShipIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {activeTab === 2 && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Stock Movement History
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Stock movement tracking will be displayed here
                    </Typography>
                </Box>
            )}

            <TransferRequestDialog />
        </Box>
    );
};

export default MultiLocationInventory;
