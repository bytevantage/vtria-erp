import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  Avatar,
  Paper
} from '@mui/material';
import {
  AdminPanelSettings,
  CheckCircle,
  Lock,
  Email,
  Person
} from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const InitialSetup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [systemInitialized, setSystemInitialized] = useState(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/system-status`);
      setSystemInitialized(response.data.data.initialized);
      
      if (response.data.data.initialized) {
        // Redirect to login if system is already initialized
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error checking system status:', error);
      setError('Unable to check system status. Please refresh the page.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/setup-initial-admin`, {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create admin user');
    } finally {
      setLoading(false);
    }
  };

  if (systemInitialized === null) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'success.main' }}>
                <CheckCircle sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h4" gutterBottom color="success.main">
                Setup Complete!
              </Typography>
              <Typography variant="body1" paragraph>
                Admin user created successfully. You will be redirected to the login page.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting in 3 seconds...
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Card sx={{ boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                <AdminPanelSettings sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h4" gutterBottom>
                Initial System Setup
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Create your administrator account to get started with VTRIA ERP
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.lighter' }}>
              <Typography variant="body2" color="info.dark">
                <strong>Important:</strong> This administrator account will have full access to all system features.
                Please choose a strong password and keep it secure.
              </Typography>
            </Paper>

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  helperText="Minimum 8 characters"
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create Administrator Account'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default InitialSetup;
