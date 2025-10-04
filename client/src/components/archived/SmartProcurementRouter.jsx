import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getRecommendation } from '../utils/procurementRouting';

const SmartProcurementRouter = () => {
  const navigate = useNavigate();
  const [purchaseRequest, setPurchaseRequest] = useState({
    amount: '',
    category: '',
    industry: '',
    companyType: '',
    isUrgent: false,
    requiresCompliance: false
  });
  const [recommendation, setRecommendation] = useState(null);

  const categories = [
    'MACHINERY', 'EQUIPMENT', 'SOFTWARE_LICENSES', 'CONSTRUCTION',
    'OFFICE_SUPPLIES', 'CONSUMABLES', 'TOOLS', 'SERVICES',
    'MEDICAL', 'AEROSPACE', 'AUTOMOTIVE', 'PHARMACEUTICAL',
    'MARKETING', 'CONSULTING', 'TEMPORARY_SERVICES'
  ];

  const industries = [
    'MANUFACTURING', 'CONSTRUCTION', 'TECHNOLOGY', 'HEALTHCARE',
    'FINANCE', 'RETAIL', 'EDUCATION', 'GOVERNMENT'
  ];

  const companyTypes = ['ENTERPRISE', 'SME', 'STARTUP'];

  const handleInputChange = (field, value) => {
    const updated = { ...purchaseRequest, [field]: value };
    setPurchaseRequest(updated);

    // Auto-generate recommendation when enough data is provided
    if (updated.amount && updated.category && updated.companyType) {
      const rec = getRecommendation(updated);
      setRecommendation(rec);
    }
  };

  const handleRoute = (route) => {
    navigate(route);
  };

  const getRouteDisplay = (route) => {
    return route === '/supplier-quotes'
      ? { name: '🏢 Enterprise Suppliers', color: 'primary', description: 'Formal RFQ Process' }
      : { name: '⚡ Agile Vendors', color: 'warning', description: 'Fast Competitive Sourcing' };
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        🎯 Smart Procurement Router
      </Typography>

      <Typography variant="subtitle1" sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}>
        Let us guide you to the right procurement system based on your needs
      </Typography>

      <Grid container spacing={4}>
        {/* Input Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Purchase Requirements
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Estimated Amount (₹)"
                    type="number"
                    value={purchaseRequest.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 25000"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={purchaseRequest.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat} value={cat}>
                          {cat.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Industry</InputLabel>
                    <Select
                      value={purchaseRequest.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                    >
                      {industries.map(ind => (
                        <MenuItem key={ind} value={ind}>
                          {ind.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Company Type</InputLabel>
                    <Select
                      value={purchaseRequest.companyType}
                      onChange={(e) => handleInputChange('companyType', e.target.value)}
                    >
                      {companyTypes.map(type => (
                        <MenuItem key={type} value={type}>
                          {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant={purchaseRequest.isUrgent ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => handleInputChange('isUrgent', !purchaseRequest.isUrgent)}
                  >
                    🚨 Urgent
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant={purchaseRequest.requiresCompliance ? 'contained' : 'outlined'}
                    color="info"
                    onClick={() => handleInputChange('requiresCompliance', !purchaseRequest.requiresCompliance)}
                  >
                    📋 Compliance Required
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendation */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🤖 AI Recommendation
              </Typography>

              {recommendation ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Recommended System:
                    </Typography>
                    <Chip
                      label={getRouteDisplay(recommendation.route).name}
                      color={getRouteDisplay(recommendation.route).color}
                      sx={{ mb: 1, mr: 1 }}
                    />
                    <Typography variant="body2">
                      {recommendation.reason}
                    </Typography>
                  </Alert>

                  <Box sx={{ mb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      color={getRouteDisplay(recommendation.route).color}
                      onClick={() => handleRoute(recommendation.route)}
                      sx={{ mb: 1 }}
                    >
                      Go to {getRouteDisplay(recommendation.route).name}
                    </Button>
                    <Typography variant="caption" display="block" textAlign="center">
                      {getRouteDisplay(recommendation.route).description}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Alternative Option:
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    color={getRouteDisplay(recommendation.alternatives.secondary).color}
                    onClick={() => handleRoute(recommendation.alternatives.secondary)}
                    sx={{ mb: 1 }}
                  >
                    Or try {getRouteDisplay(recommendation.alternatives.secondary).name}
                  </Button>
                  <Typography variant="caption" display="block" textAlign="center" color="text.secondary">
                    {recommendation.alternatives.explanation}
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  Fill in the purchase details to get a personalized recommendation
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Quick Access Buttons */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Quick Access
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={() => handleRoute('/supplier-quotes')}
                    sx={{ mb: 1 }}
                  >
                    🏢 Enterprise Suppliers
                  </Button>
                  <Typography variant="caption" display="block" textAlign="center" color="text.secondary">
                    Formal RFQ • Compliance • Strategic Sourcing
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    onClick={() => handleRoute('/vendor-quotes')}
                    sx={{ mb: 1 }}
                  >
                    ⚡ Agile Vendors
                  </Button>
                  <Typography variant="caption" display="block" textAlign="center" color="text.secondary">
                    Fast Quotes • Competitive Pricing • Flexible Terms
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Information Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏢 Enterprise Suppliers
              </Typography>
              <Typography variant="body2">
                • Formal RFQ processes with audit trails<br />
                • Multi-level approval workflows<br />
                • Compliance and regulatory requirements<br />
                • Strategic supplier relationship management<br />
                • Long-term contracts and negotiations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚡ Agile Vendors
              </Typography>
              <Typography variant="body2">
                • Fast competitive quote comparison<br />
                • Minimal bureaucracy and quick decisions<br />
                • Market-based pricing optimization<br />
                • Flexible vendor relationships<br />
                • Rapid procurement for urgent needs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SmartProcurementRouter;