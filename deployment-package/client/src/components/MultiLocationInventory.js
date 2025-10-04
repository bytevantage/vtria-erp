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
    TablePagination
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
import { api } from '../utils/api';

const MultiLocationInventory = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [locations, setLocations] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [pagination, setPagination] = useState({
        page: 0,
        rowsPerPage: 10,
        total: 0
    });
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStates, setLoadingStates] = useState({
        fetchTransfers: false,
        createTransfer: false,
        approveTransfer: {},
        executeTransfer: {},
        shipTransfer: {}
    });
    const [error, setError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    
    // Dialog states
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        content: '',
        onConfirm: null,
        confirmText: 'Confirm',
        confirmColor: 'primary'
    });
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    
    // Form data
    const [transferForm, setTransferForm] = useState({
        from_location_id: '',
        to_location_id: '',
        reason: '',
        priority: 'normal',
        items: []
    });


    useEffect(() => {
        fetchLocationSummary();
        fetchTransfers();
    }, []);

    const fetchLocationSummary = async () => {
        setLoadingStates(prev => ({ ...prev, fetchLocationSummary: true }));
        const { data, error } = await api.get('/api/multi-location-inventory/locations/summary');
        setLoadingStates(prev => ({ ...prev, fetchLocationSummary: false }));
        
        if (error) {
            setError('Failed to fetch location data');
            return;
        }
        setLocations(data?.data || []);
    };

    const fetchTransfers = async () => {
        setLoadingStates(prev => ({ ...prev, fetchTransfers: true }));
        const { page, rowsPerPage } = pagination;
        const { data, error } = await api.get(
            `/api/multi-location-inventory/transfers?page=${page + 1}&limit=${rowsPerPage}`
        );
        setLoadingStates(prev => ({ ...prev, fetchTransfers: false }));
        
        if (error) {
            setError('Failed to fetch transfer data');
            return;
        }
        setTransfers(data?.data || []);
        setPagination(prev => ({
            ...prev,
            total: data?.pagination?.total || 0
        }));
    };

    const fetchStockByProduct = async (productId) => {
        const { data, error } = await api.get(`/api/multi-location-inventory/stock/${productId}/locations`);
        if (error) {
            console.error('Failed to fetch stock data:', error);
            return [];
        }
        return data?.data || [];
    };

    const validateForm = () => {
        const errors = {};
        
        if (!transferForm.from_location_id) {
            errors.from_location_id = 'Source location is required';
        }
        
        if (!transferForm.to_location_id) {
            errors.to_location_id = 'Destination location is required';
        } else if (transferForm.from_location_id === transferForm.to_location_id) {
            errors.to_location_id = 'Source and destination must be different';
        }
        
        if (!transferForm.reason?.trim()) {
            errors.reason = 'Please provide a reason for transfer';
        }
        
        if (!transferForm.items?.length) {
            errors.items = 'Please add at least one item to transfer';
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateTransfer = async () => {
        if (!validateForm()) return;
        
        setLoadingStates(prev => ({ ...prev, createTransfer: true }));
        const { data, error } = await api.post(
            '/api/multi-location-inventory/transfers',
            transferForm
        );
        
        setLoadingStates(prev => ({ ...prev, createTransfer: false }));
        
        if (error) {
            setError(error);
            return;
        }
        
        if (data?.success) {
            setTransferDialogOpen(false);
            setTransferForm({
                from_location_id: '',
                to_location_id: '',
                reason: '',
                priority: 'normal',
                items: []
            });
            setFormErrors({});
            setPagination(prev => ({ ...prev, page: 0 }));
            await fetchTransfers();
        } else {
            setError(data?.message || 'Failed to create transfer request');
        }
    };

    const handleApproveTransfer = (transferId) => {
        const transfer = transfers.find(t => t.id === transferId);
        setConfirmDialog({
            open: true,
            title: 'Confirm Approval',
            content: `Are you sure you want to approve transfer #${transfer?.transfer_number || transferId}?`,
            confirmText: 'Approve',
            confirmColor: 'primary',
            onConfirm: async () => {
                setLoadingStates(prev => ({
                    ...prev,
                    approveTransfer: { ...prev.approveTransfer, [transferId]: true }
                }));
                
                const { error } = await api.put(
                    `/api/multi-location-inventory/transfers/${transferId}/approve`,
                    { approved_by_notes: 'Approved via web interface' }
                );
                
                setLoadingStates(prev => ({
                    ...prev,
                    approveTransfer: { ...prev.approveTransfer, [transferId]: false }
                }));
                
                if (error) {
                    setError('Failed to approve transfer');
                    return;
                }
                
                await fetchTransfers();
            }
        });
    };

    const handleExecuteTransfer = (transferId, items) => {
        const transfer = transfers.find(t => t.id === transferId);
        setConfirmDialog({
            open: true,
            title: 'Confirm Execution',
            content: `Are you sure you want to execute transfer #${transfer?.transfer_number || transferId}? This action cannot be undone.`,
            confirmText: 'Execute',
            confirmColor: 'warning',
            onConfirm: async () => {
                setLoadingStates(prev => ({
                    ...prev,
                    executeTransfer: { ...prev.executeTransfer, [transferId]: true }
                }));
                
                const { error } = await api.put(
                    `/api/multi-location-inventory/transfers/${transferId}/execute`,
                    { shipped_items: items }
                );
                
                setLoadingStates(prev => ({
                    ...prev,
                    executeTransfer: { ...prev.executeTransfer, [transferId]: false }
                }));
                
                if (error) {
                    setError('Failed to execute transfer');
                    return;
                }
                
                await fetchTransfers();
            }
        });
    };

    const handleViewTransfer = (transfer) => {
        console.log('Viewing transfer:', transfer);
        // Add view functionality here
    };

    const handleShipTransfer = (transferId) => {
        const transfer = transfers.find(t => t.id === transferId);
        setConfirmDialog({
            open: true,
            title: 'Confirm Shipment',
            content: `Mark transfer #${transfer?.transfer_number || transferId} as shipped?`,
            confirmText: 'Mark as Shipped',
            confirmColor: 'primary',
            onConfirm: async () => {
                setLoadingStates(prev => ({
                    ...prev,
                    shipTransfer: { ...prev.shipTransfer, [transferId]: true }
                }));
                
                const { error } = await api.put(`/api/multi-location-inventory/transfers/${transferId}/ship`);
                
                setLoadingStates(prev => ({
                    ...prev,
                    shipTransfer: { ...prev.shipTransfer, [transferId]: false }
                }));
                
                if (error) {
                    setError('Failed to ship transfer');
                    return;
                }
                
                await fetchTransfers();
            }
        });
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

    const handleChangePage = (event, newPage) => {
        setPagination(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const handleChangeRowsPerPage = (event) => {
        setPagination(prev => ({
            ...prev,
            page: 0,
            rowsPerPage: parseInt(event.target.value, 10)
        }));
    };

    useEffect(() => {
        fetchTransfers();
    }, [pagination.page, pagination.rowsPerPage]);

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
                        <FormControl fullWidth error={!!formErrors.from_location_id}>
                            <InputLabel>From Location</InputLabel>
                            <Select
                                value={transferForm.from_location_id}
                                onChange={(e) => {
                                    setTransferForm({...transferForm, from_location_id: e.target.value});
                                    setFormErrors({...formErrors, from_location_id: ''});
                                }}
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
                        <FormControl fullWidth error={!!formErrors.to_location_id}>
                            <InputLabel>To Location</InputLabel>
                            <Select
                                value={transferForm.to_location_id}
                                onChange={(e) => {
                                    setTransferForm({...transferForm, to_location_id: e.target.value});
                                    setFormErrors({...formErrors, to_location_id: ''});
                                }}
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
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Reason</InputLabel>
                            <TextField
                                value={transferForm.reason}
                                onChange={(e) => setTransferForm({...transferForm, reason: e.target.value})}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Items</InputLabel>
                            <TextField
                                value={transferForm.items}
                                onChange={(e) => setTransferForm({...transferForm, items: e.target.value})}
                            />
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={() => {
                        setTransferDialogOpen(false);
                        setFormErrors({});
                    }}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleCreateTransfer} 
                    variant="contained"
                    disabled={loadingStates.createTransfer}
                    startIcon={loadingStates.createTransfer ? <CircularProgress size={20} /> : null}
                >
                    {loadingStates.createTransfer ? 'Creating...' : 'Create Request'}
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

    const ConfirmationDialog = () => (
        <Dialog
            open={confirmDialog.open}
            onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogContent>
                <Typography>{confirmDialog.content}</Typography>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                    color="inherit"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => {
                        if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                        setConfirmDialog(prev => ({ ...prev, open: false }));
                    }}
                    color={confirmDialog.confirmColor}
                    variant="contained"
                    autoFocus
                >
                    {confirmDialog.confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <Box sx={{ p: 3 }}>
            <ConfirmationDialog />
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
                                                disabled={loadingStates.approveTransfer[transfer.id]}
                                            >
                                                {loadingStates.approveTransfer[transfer.id] ? (
                                                    <CircularProgress size={20} />
                                                ) : (
                                                    <ApproveIcon />
                                                )}
                                            </IconButton>
                                        )}
                                        {transfer.status === 'approved' && (
                                            <IconButton 
                                                size="small" 
                                                title="Ship" 
                                                onClick={() => handleShipTransfer(transfer.id)}
                                                disabled={loadingStates.shipTransfer[transfer.id]}
                                            >
                                                {loadingStates.shipTransfer[transfer.id] ? (
                                                    <CircularProgress size={20} />
                                                ) : (
                                                    <ShipIcon />
                                                )}
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={pagination.total}
                        rowsPerPage={pagination.rowsPerPage}
                        page={pagination.page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{
                            '.MuiTablePagination-toolbar': {
                                paddingLeft: 2,
                                paddingRight: 1,
                            },
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                marginBottom: 0,
                            },
                        }}
                    />
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
