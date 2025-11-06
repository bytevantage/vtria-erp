import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Container,
    SelectChangeEvent
} from '@mui/material';
import { Assignment as WarrantyIcon } from '@mui/icons-material';
import SerialWarrantyTracker from './SerialWarrantyTracker';
import axios from 'axios';

const SerialWarrantyTrackerPage = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/products`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setProducts(response.data.data || []);
        } catch (err) {
            setError('Failed to fetch products. Please ensure the API server is running.');
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProductChange = (event: SelectChangeEvent<string>) => {
        setSelectedProductId(event.target.value);
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                    <WarrantyIcon fontSize="large" />
                    Serial & Warranty Tracker
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Track serial numbers and manage warranty claims for your products
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Select Product for Serial & Warranty Tracking
                            </Typography>

                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel id="product-select-label">
                                    Choose a Product
                                </InputLabel>
                                <Select
                                    labelId="product-select-label"
                                    value={selectedProductId}
                                    label="Choose a Product"
                                    onChange={handleProductChange}
                                >
                                    <MenuItem value="">
                                        <em>Select a product...</em>
                                    </MenuItem>
                                    {products.map((product) => (
                                        <MenuItem key={product.id} value={product.id}>
                                            {product.part_code} - {product.product_name}
                                            {product.manufacturer && ` (${product.manufacturer})`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {products.length === 0 && !error && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    No products found. Add products first to track serial numbers and warranties.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {selectedProductId && (
                    <Grid item xs={12}>
                        <SerialWarrantyTracker productId={selectedProductId} />
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default SerialWarrantyTrackerPage;