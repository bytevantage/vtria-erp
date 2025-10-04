/**
 * Case Detail Page for VTRIA ERP
 * Detailed view of individual cases with status updates
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Attachment,
  History
} from '@mui/icons-material';
import WorkflowProgressChart from '../../components/WorkflowProgressChart';

// Sample case data - replace with API call
const sampleCase = {
  id: '1',
  case_number: 'CASE-2024-0001',
  title: 'Pump Installation - Client A',
  description: 'Complete installation of industrial pump system including electrical connections and testing.',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  category: 'Installation',
  client_name: 'ABC Industries',
  client_contact: '+91 9876543210',
  assigned_to: 'John Doe',
  created_by: 'Admin User',
  location: 'Mangalore',
  estimated_hours: 24,
  actual_hours: 16,
  due_date: '2024-01-30',
  created_at: '2024-01-15',
  updated_at: '2024-01-20'
};

const statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ON_HOLD'];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(sampleCase);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    // Fetch case data by ID
    // API call would go here
    setEditData(caseData);
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(caseData);
  };

  const handleSave = async () => {
    try {
      // API call to update case
      console.log('Updating case:', editData);
      setCaseData(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating case:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(caseData);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'error',
      IN_PROGRESS: 'warning',
      RESOLVED: 'success',
      CLOSED: 'default',
      ON_HOLD: 'info'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'default',
      MEDIUM: 'info',
      HIGH: 'warning',
      CRITICAL: 'error'
    };
    return colors[priority] || 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/cases')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">
            {caseData.case_number}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {caseData.title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEditing ? (
            <>
              <Button
                startIcon={<Save />}
                variant="contained"
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                startIcon={<Cancel />}
                variant="outlined"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              startIcon={<Edit />}
              variant="contained"
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {isEditing ? (
                  <TextField
                    label="Title"
                    fullWidth
                    value={editData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                ) : (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Title
                    </Typography>
                    <Typography variant="body1">
                      {caseData.title}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12}>
                {isEditing ? (
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={4}
                    value={editData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                ) : (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {caseData.description}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={6}>
                {isEditing ? (
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Status"
                    >
                      {statusOptions.map(status => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={caseData.status}
                      color={getStatusColor(caseData.status)}
                      size="small"
                    />
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={6}>
                {isEditing ? (
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={editData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      label="Priority"
                    >
                      {priorityOptions.map(priority => (
                        <MenuItem key={priority} value={priority}>
                          {priority}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Priority
                    </Typography>
                    <Chip
                      label={caseData.priority}
                      color={getPriorityColor(caseData.priority)}
                      size="small"
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Client Information */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Client Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Client Name
                </Typography>
                <Typography variant="body1">
                  {caseData.client_name}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Contact
                </Typography>
                <Typography variant="body1">
                  {caseData.client_contact}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Workflow Progress Chart */}
          <WorkflowProgressChart caseId={id} />
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Case Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Case Information
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assigned To
                </Typography>
                <Typography variant="body2">
                  {caseData.assigned_to}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body2">
                  {caseData.location}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body2">
                  {new Date(caseData.due_date).toLocaleDateString()}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Estimated Hours
                </Typography>
                <Typography variant="body2">
                  {caseData.estimated_hours}h
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Actual Hours
                </Typography>
                <Typography variant="body2">
                  {caseData.actual_hours}h
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              
              <Button
                fullWidth
                startIcon={<Attachment />}
                variant="outlined"
                sx={{ mb: 1 }}
              >
                Attachments
              </Button>
              
              <Button
                fullWidth
                startIcon={<History />}
                variant="outlined"
              >
                View History
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Workflow Progress Chart at the bottom */}
      <Box sx={{ mt: 4 }}>
        <WorkflowProgressChart caseId={id} compact={true} />
      </Box>
    </Box>
  );
};

export default CaseDetail;
