/**
 * User Profile Page for VTRIA ERP
 * User profile management and settings
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Chip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  phone: Yup.string(),
  department: Yup.string()
});

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // API call to update profile would go here
      console.log('Updating profile:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser(values);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Info */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Personal Information
              </Typography>
              {!isEditing && (
                <Button
                  startIcon={<Edit />}
                  variant="outlined"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </Box>

            <Formik
              initialValues={{
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                employee_id: user.employee_id || '',
                phone: user.phone || '',
                department: user.department || ''
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                <Form>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="first_name"
                        label="First Name"
                        fullWidth
                        disabled={!isEditing}
                        value={values.first_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.first_name && Boolean(errors.first_name)}
                        helperText={touched.first_name && errors.first_name}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="last_name"
                        label="Last Name"
                        fullWidth
                        disabled={!isEditing}
                        value={values.last_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.last_name && Boolean(errors.last_name)}
                        helperText={touched.last_name && errors.last_name}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="email"
                        label="Email"
                        fullWidth
                        disabled
                        value={values.email}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="employee_id"
                        label="Employee ID"
                        fullWidth
                        disabled
                        value={values.employee_id}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="phone"
                        label="Phone"
                        fullWidth
                        disabled={!isEditing}
                        value={values.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="department"
                        label="Department"
                        fullWidth
                        disabled={!isEditing}
                        value={values.department}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                  </Grid>

                  {isEditing && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<Save />}
                        disabled={isSubmitting}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Form>
              )}
            </Formik>
          </Paper>
        </Grid>

        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '2rem'
                }}
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </Avatar>
              
              <Typography variant="h6" gutterBottom>
                {user.first_name} {user.last_name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.department}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.employee_id}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Roles
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                {user.roles?.map((role, index) => (
                  <Chip
                    key={index}
                    label={role.name}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              
              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                Locations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.locations?.join(', ') || 'No locations assigned'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
