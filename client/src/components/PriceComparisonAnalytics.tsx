import React, { useState, useEffect } from 'react';
import {
    Box,
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
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    IconButton,
    LinearProgress,
    Divider,
    Badge
} from '@mui/material';
import {
    CompareArrows as CompareIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Analytics as AnalyticsIcon,
    Assessment as AssessmentIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    ExpandMore as ExpandMoreIcon,
    Visibility as ViewIcon,
    Download as DownloadIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Timeline as TimelineIcon,
    PriceCheck as PriceCheckIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

interface PriceData {
    item_name: string;
    item_code: string;
    category: string;
    current_price: number;
    previous_price: number;
    price_change: number;
    price_change_percentage: number;
    market_price: number;
    competitive_analysis: {
        vendor_name: string;
        price: number;
        rating: number;
        delivery_time: number;
    }[];
    price_history: {
        date: string;
        price: number;
        supplier: string;
    }[];
    last_updated: string;
}

interface PriceAnalytics {
    total_items: number;
    price_variance: number;
    cost_savings_potential: number;
    market_competitiveness: number;
    categories: {
        [key: string]: {
            avg_price: number;
            price_trend: 'up' | 'down' | 'stable';
            item_count: number;
        };
    };
    alerts: Array<{
        type: 'warning' | 'error' | 'info' | 'success';
        title: string;
        description: string;
        item_count: number;
    }>;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`price-tabpanel-${index}`}
            aria-labelledby={`price-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const PriceComparisonAnalytics: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [analytics, setAnalytics] = useState<PriceAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priceRangeFilter, setPriceRangeFilter] = useState('all');

    useEffect(() => {
        fetchPriceData();
    }, [categoryFilter, priceRangeFilter]);

    const fetchPriceData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Simulate API call for price comparison data
            const response = await axios.get(`${API_BASE_URL}/api/analytics/price-comparison`, {
                params: { category: categoryFilter, priceRange: priceRangeFilter }
            });

            if (response.data.success) {
                setPriceData(response.data.data.items);
                setAnalytics(response.data.data.analytics);
            } else {
                // Fallback to mock data
                const mockData = generateMockPriceData();
                setPriceData(mockData.items);
                setAnalytics(mockData.analytics);
            }
        } catch (error) {
            console.error('Error fetching price data:', error);
            const mockData = generateMockPriceData();
            setPriceData(mockData.items);
            setAnalytics(mockData.analytics);
        } finally {
            setLoading(false);
        }
    };

    const generateMockPriceData = () => {
        const items: PriceData[] = [
            {
                item_name: 'Industrial Servo Motor',
                item_code: 'SM-001',
                category: 'Motors',
                current_price: 15000,
                previous_price: 14500,
                price_change: 500,
                price_change_percentage: 3.4,
                market_price: 16200,
                competitive_analysis: [
                    { vendor_name: 'Vendor A', price: 15200, rating: 4.5, delivery_time: 7 },
                    { vendor_name: 'Vendor B', price: 15800, rating: 4.2, delivery_time: 10 },
                    { vendor_name: 'Vendor C', price: 14800, rating: 4.0, delivery_time: 14 }
                ],
                price_history: [
                    { date: '2024-01', price: 14000, supplier: 'Vendor A' },
                    { date: '2024-02', price: 14200, supplier: 'Vendor A' },
                    { date: '2024-03', price: 14500, supplier: 'Vendor B' },
                    { date: '2024-04', price: 15000, supplier: 'Vendor C' }
                ],
                last_updated: '2024-04-15'
            },
            {
                item_name: 'PLC Controller',
                item_code: 'PLC-001',
                category: 'Controllers',
                current_price: 25000,
                previous_price: 26000,
                price_change: -1000,
                price_change_percentage: -3.8,
                market_price: 24500,
                competitive_analysis: [
                    { vendor_name: 'Vendor D', price: 24200, rating: 4.7, delivery_time: 5 },
                    { vendor_name: 'Vendor E', price: 25500, rating: 4.3, delivery_time: 8 },
                    { vendor_name: 'Vendor F', price: 24800, rating: 4.1, delivery_time: 12 }
                ],
                price_history: [
                    { date: '2024-01', price: 26500, supplier: 'Vendor D' },
                    { date: '2024-02', price: 26200, supplier: 'Vendor D' },
                    { date: '2024-03', price: 26000, supplier: 'Vendor E' },
                    { date: '2024-04', price: 25000, supplier: 'Vendor F' }
                ],
                last_updated: '2024-04-14'
            },
            {
                item_name: 'Safety Relay',
                item_code: 'SR-001',
                category: 'Safety',
                current_price: 3500,
                previous_price: 3200,
                price_change: 300,
                price_change_percentage: 9.4,
                market_price: 3800,
                competitive_analysis: [
                    { vendor_name: 'Vendor G', price: 3400, rating: 4.6, delivery_time: 3 },
                    { vendor_name: 'Vendor H', price: 3600, rating: 4.4, delivery_time: 6 },
                    { vendor_name: 'Vendor I', price: 3300, rating: 4.0, delivery_time: 9 }
                ],
                price_history: [
                    { date: '2024-01', price: 3100, supplier: 'Vendor G' },
                    { date: '2024-02', price: 3150, supplier: 'Vendor G' },
                    { date: '2024-03', price: 3200, supplier: 'Vendor H' },
                    { date: '2024-04', price: 3500, supplier: 'Vendor I' }
                ],
                last_updated: '2024-04-13'
            }
        ];

        const analytics: PriceAnalytics = {
            total_items: items.length,
            price_variance: 8.2,
            cost_savings_potential: 12500,
            market_competitiveness: 85.3,
            categories: {
                'Motors': { avg_price: 15000, price_trend: 'up', item_count: 1 },
                'Controllers': { avg_price: 25000, price_trend: 'down', item_count: 1 },
                'Safety': { avg_price: 3500, price_trend: 'up', item_count: 1 }
            },
            alerts: [
                { type: 'warning', title: 'Price Increase Alert', description: 'Items with >5% price increase', item_count: 2 },
                { type: 'success', title: 'Cost Savings Opportunity', description: 'Better prices available', item_count: 3 },
                { type: 'info', title: 'Market Analysis', description: 'Items due for price review', item_count: 1 }
            ]
        };

        return { items, analytics };
    };

    const getPriceChangeColor = (change: number) => {
        if (change > 0) return '#f44336'; // Red for increase
        if (change < 0) return '#4caf50'; // Green for decrease
        return '#9e9e9e'; // Grey for no change
    };

    const getPriceChangeIcon = (change: number) => {
        if (change > 0) return <TrendingUpIcon sx={{ fontSize: 16 }} />;
        if (change < 0) return <TrendingDownIcon sx={{ fontSize: 16 }} />;
        return null;
    };

    const getCompetitivenessLevel = (currentPrice: number, marketPrice: number) => {
        const ratio = currentPrice / marketPrice;
        if (ratio <= 0.95) return { level: 'Excellent', color: '#4caf50' };
        if (ratio <= 1.05) return { level: 'Good', color: '#ff9800' };
        return { level: 'Poor', color: '#f44336' };
    };

    const filteredData = priceData.filter(item => 
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderOverviewTab = () => {
        if (!analytics) return null;

        return (
            <Grid container spacing={3}>
                {/* Key Metrics */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {analytics.total_items}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Items Tracked
                                    </Typography>
                                </Box>
                                <PriceCheckIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        ₹{analytics.cost_savings_potential ? analytics.cost_savings_potential.toLocaleString() : '0'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Savings Potential
                                    </Typography>
                                </Box>
                                <TrendingDownIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {analytics.price_variance}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Price Variance
                                    </Typography>
                                </Box>
                                <AnalyticsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {analytics.market_competitiveness}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Market Competitiveness
                                    </Typography>
                                </Box>
                                <CompareIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Category Analysis */}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Category Price Analysis
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Category</TableCell>
                                            <TableCell align="right">Item Count</TableCell>
                                            <TableCell align="right">Avg Price</TableCell>
                                            <TableCell align="right">Price Trend</TableCell>
                                            <TableCell align="right">Performance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(analytics.categories).map(([category, data]) => (
                                            <TableRow key={category}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {category}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip label={data.item_count} size="small" color="primary" />
                                                </TableCell>
                                                <TableCell align="right">
                                                    ₹{data.avg_price ? data.avg_price.toLocaleString() : 'N/A'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                                                        {data.price_trend === 'up' ? (
                                                            <TrendingUpIcon sx={{ color: '#f44336', mr: 0.5 }} />
                                                        ) : data.price_trend === 'down' ? (
                                                            <TrendingDownIcon sx={{ color: '#4caf50', mr: 0.5 }} />
                                                        ) : (
                                                            <Box sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#9e9e9e', mr: 0.5 }} />
                                                        )}
                                                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                            {data.price_trend}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={data.price_trend === 'down' ? 85 : data.price_trend === 'up' ? 60 : 75}
                                                        sx={{
                                                            width: 60,
                                                            height: 6,
                                                            borderRadius: 3,
                                                            '& .MuiLinearProgress-bar': {
                                                                backgroundColor: data.price_trend === 'down' ? '#4caf50' : 
                                                                                data.price_trend === 'up' ? '#f44336' : '#ff9800'
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Alerts */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Price Alerts
                            </Typography>
                            {analytics.alerts.map((alert, index) => (
                                <Alert
                                    key={index}
                                    severity={alert.type}
                                    sx={{ mb: 2 }}
                                    action={
                                        <Badge badgeContent={alert.item_count} color="error">
                                            <IconButton size="small">
                                                <ViewIcon />
                                            </IconButton>
                                        </Badge>
                                    }
                                >
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {alert.title}
                                    </Typography>
                                    <Typography variant="body2">
                                        {alert.description}
                                    </Typography>
                                </Alert>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderComparisonTab = () => {
        return (
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    {/* Search and Filters */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        placeholder="Search items..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Category</InputLabel>
                                        <Select
                                            value={categoryFilter}
                                            label="Category"
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                        >
                                            <MenuItem value="all">All Categories</MenuItem>
                                            <MenuItem value="Motors">Motors</MenuItem>
                                            <MenuItem value="Controllers">Controllers</MenuItem>
                                            <MenuItem value="Safety">Safety</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Price Range</InputLabel>
                                        <Select
                                            value={priceRangeFilter}
                                            label="Price Range"
                                            onChange={(e) => setPriceRangeFilter(e.target.value)}
                                        >
                                            <MenuItem value="all">All Ranges</MenuItem>
                                            <MenuItem value="0-5000">₹0 - ₹5,000</MenuItem>
                                            <MenuItem value="5000-20000">₹5,000 - ₹20,000</MenuItem>
                                            <MenuItem value="20000+">₹20,000+</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<RefreshIcon />}
                                        onClick={fetchPriceData}
                                    >
                                        Refresh
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Price Comparison Table */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <CompareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Price Comparison Analysis
                            </Typography>
                            
                            {filteredData.map((item, index) => (
                                <Accordion key={`${item.item_name}-${index}`} sx={{ mb: 2 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Grid container alignItems="center" spacing={2}>
                                            <Grid item xs={12} md={3}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {item.item_name}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Code: {item.item_code} | {item.category}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={2}>
                                                <Typography variant="h6" color="primary">
                                                    ₹{item.current_price ? item.current_price.toLocaleString() : 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    Current Price
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={2}>
                                                <Box display="flex" alignItems="center">
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ color: getPriceChangeColor(item.price_change) }}
                                                        fontWeight={500}
                                                    >
                                                        {item.price_change && item.price_change > 0 ? '+' : ''}₹{item.price_change ? item.price_change.toLocaleString() : '0'}
                                                    </Typography>
                                                    {getPriceChangeIcon(item.price_change)}
                                                </Box>
                                                <Typography variant="caption" color="textSecondary">
                                                    vs Previous
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={2}>
                                                <Typography variant="body2">
                                                    ₹{item.market_price ? item.market_price.toLocaleString() : 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    Market Price
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <Chip
                                                    label={getCompetitivenessLevel(item.current_price, item.market_price).level}
                                                    sx={{
                                                        backgroundColor: getCompetitivenessLevel(item.current_price, item.market_price).color,
                                                        color: 'white'
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            {/* Competitive Analysis */}
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Vendor Comparison
                                                </Typography>
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Vendor</TableCell>
                                                                <TableCell align="right">Price</TableCell>
                                                                <TableCell align="right">Rating</TableCell>
                                                                <TableCell align="right">Delivery</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {item.competitive_analysis.map((vendor, vIndex) => (
                                                                <TableRow key={vIndex}>
                                                                    <TableCell>{vendor.vendor_name}</TableCell>
                                                                    <TableCell align="right">
                                                                        ₹{vendor.price ? vendor.price.toLocaleString() : 'N/A'}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Chip
                                                                            label={vendor.rating}
                                                                            size="small"
                                                                            color={vendor.rating >= 4.5 ? 'success' : vendor.rating >= 4 ? 'warning' : 'error'}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {vendor.delivery_time} days
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>

                                            {/* Price History */}
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Price History Trend
                                                </Typography>
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Date</TableCell>
                                                                <TableCell align="right">Price</TableCell>
                                                                <TableCell>Supplier</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {item.price_history.map((history, hIndex) => (
                                                                <TableRow key={hIndex}>
                                                                    <TableCell>{history.date}</TableCell>
                                                                    <TableCell align="right">
                                                                        ₹{history.price ? history.price.toLocaleString() : 'N/A'}
                                                                    </TableCell>
                                                                    <TableCell>{history.supplier}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    <CompareIcon sx={{ mr: 2, fontSize: 36 }} />
                    Price Comparison Analytics
                </Typography>
                
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => console.log('Export data')}
                >
                    Export Report
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Tabs */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                        <Tab 
                            label="Overview" 
                            icon={<AnalyticsIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="Price Comparison" 
                            icon={<CompareIcon />} 
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                    {renderOverviewTab()}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {renderComparisonTab()}
                </TabPanel>
            </Card>
        </Box>
    );
};

export default PriceComparisonAnalytics;