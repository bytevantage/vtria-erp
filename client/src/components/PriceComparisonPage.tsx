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
import { Compare as CompareIcon } from '@mui/icons-material';
import PurchasePriceComparison from './PurchasePriceComparison';
import axios from 'axios';

interface Estimation {
    id: string;
    estimation_id: string;
    project_name?: string;
    client_name?: string;
}

const PriceComparisonPage = () => {
    const [estimations, setEstimations] = useState<Estimation[]>([]);
    const [selectedEstimationId, setSelectedEstimationId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    useEffect(() => {
        fetchEstimations();
    }, []);

    const fetchEstimations = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/estimations`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setEstimations(response.data.data || []);
        } catch (err) {
            setError('Failed to fetch estimations. Please ensure the API server is running.');
            console.error('Error fetching estimations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEstimationChange = (event: SelectChangeEvent<string>) => {
        setSelectedEstimationId(event.target.value);
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
                    <CompareIcon fontSize="large" />
                    Purchase Price Comparison
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Compare estimated prices with supplier quotes to optimize procurement decisions
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
                                Select Estimation for Price Comparison
                            </Typography>

                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel id="estimation-select-label">
                                    Choose an Estimation
                                </InputLabel>
                                <Select
                                    labelId="estimation-select-label"
                                    value={selectedEstimationId}
                                    label="Choose an Estimation"
                                    onChange={handleEstimationChange}
                                >
                                    <MenuItem value="">
                                        <em>Select an estimation...</em>
                                    </MenuItem>
                                    {estimations.map((estimation) => (
                                        <MenuItem key={estimation.id} value={estimation.id}>
                                            {estimation.estimation_id} - {estimation.project_name || 'Untitled Project'}
                                            {estimation.client_name && ` (${estimation.client_name})`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {estimations.length === 0 && !error && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    No estimations found. Create an estimation first to perform price comparison.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {selectedEstimationId && (
                    <Grid item xs={12}>
                        <PurchasePriceComparison estimationId={selectedEstimationId} />
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default PriceComparisonPage;