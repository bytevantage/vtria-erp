import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Avatar, Tabs, Tab, Divider, Chip,
  Button, IconButton, LinearProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Card, CardContent,
  CardHeader, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, FormControl, InputLabel, Select, FormHelperText
} from '@mui/material';
import {
  Person, Work, School, Event, ContactEmergency, Edit, Save, Cancel,
  Add, FileUpload, CheckCircle, Warning, Delete, Email, Phone, Home
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { API_BASE_URL } from '../../config';
import authHeader from '../../services/auth-header';

// Types
type Employee = {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_id: number;
  department_name: string;
  designation: string;
  hire_date: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  status: 'active' | 'inactive' | 'on_leave';
  documents: Document[];
  emergency_contacts: EmergencyContact[];
  skills: Skill[];
  leave_balance: LeaveBalance[];
};

type Document = {
  id: number;
  document_type: string;
  document_number: string;
  file_name: string;
  file_path: string;
  expiry_date: string | null;
  status: 'valid' | 'expired' | 'expiring_soon';
};

type EmergencyContact = {
  id: number;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
  is_primary: boolean;
};

type Skill = {
  id: number;
  skill_name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_of_experience: number;
};

type LeaveBalance = {
  leave_type_id: number;
  leave_type_name: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
};

const EnhancedEmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [departments, setDepartments] = useState<{id: number, name: string}[]>([]);
  
  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // New emergency contact state
  const [newEmergencyContact, setNewEmergencyContact] = useState<Partial<EmergencyContact>>({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
    is_primary: false
  });
  const [emergencyContactDialogOpen, setEmergencyContactDialogOpen] = useState(false);
  
  // New skill state
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    skill_name: '',
    proficiency: 'intermediate',
    years_of_experience: 1
  });
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        const [employeeRes, deptRes] = await Promise.all([
          fetch(`${API_BASE_URL}/hr/employees/${id}`, { headers: authHeader() }),
          fetch(`${API_BASE_URL}/departments`, { headers: authHeader() })
        ]);
        
        if (!employeeRes.ok) throw new Error('Failed to fetch employee data');
        if (!deptRes.ok) throw new Error('Failed to fetch departments');
        
        const employeeData = await employeeRes.json();
        const deptData = await deptRes.json();
        
        setEmployee(employeeData.data);
        setDepartments(deptData.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchEmployeeData();
  }, [id]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!employee) return;
    
    const { name, value } = e.target;
    setEmployee({
      ...employee,
      [name]: value
    });
  };
  
  // Handle select change
  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    if (!employee) return;
    
    const name = e.target.name as string;
    const value = e.target.value;
    
    setEmployee({
      ...employee,
      [name]: value
    });
  };
  
  // Handle date change
  const handleDateChange = (date: Date | null, field: string) => {
    if (!employee) return;
    
    setEmployee({
      ...employee,
      [field]: date ? format(date, 'yyyy-MM-dd') : null
    });
  };
  
  // Save employee data
  const saveEmployeeData = async () => {
    if (!employee) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify(employee)
      });
      
      if (!response.ok) throw new Error('Failed to update employee data');
      
      enqueueSnackbar('Employee data updated successfully', { variant: 'success' });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating employee data:', error);
      enqueueSnackbar('Failed to update employee data', { variant: 'error' });
    }
  };
  
  // Handle document upload
  const handleDocumentUpload = async () => {
    if (!selectedFile || !documentType) {
      enqueueSnackbar('Please select a file and document type', { variant: 'warning' });
      return;
    }
    
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('document_type', documentType);
    formData.append('document_number', documentNumber);
    if (expiryDate) {
      formData.append('expiry_date', format(expiryDate, 'yyyy-MM-dd'));
    }
    
    try {
      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/hr/employees/${id}/documents`, {
        method: 'POST',
        headers: {
          ...authHeader(),
          // Don't set Content-Type header when using FormData
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload document');
      
      const result = await response.json();
      
      // Update the employee's documents list
      if (employee) {
        setEmployee({
          ...employee,
          documents: [...(employee.documents || []), result.data]
        });
      }
      
      enqueueSnackbar('Document uploaded successfully', { variant: 'success' });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('');
      setDocumentNumber('');
      setExpiryDate(null);
    } catch (error) {
      console.error('Error uploading document:', error);
      enqueueSnackbar('Failed to upload document', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };
  
  // Handle delete document
  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees/documents/${docId}`, {
        method: 'DELETE',
        headers: authHeader()
      });
      
      if (!response.ok) throw new Error('Failed to delete document');
      
      // Update the employee's documents list
      if (employee) {
        setEmployee({
          ...employee,
          documents: (employee.documents || []).filter(doc => doc.id !== docId)
        });
      }
      
      enqueueSnackbar('Document deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting document:', error);
      enqueueSnackbar('Failed to delete document', { variant: 'error' });
    }
  };
  
  // Handle emergency contact input change
  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setNewEmergencyContact({
      ...newEmergencyContact,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Save emergency contact
  const saveEmergencyContact = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees/${id}/emergency-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify(newEmergencyContact)
      });
      
      if (!response.ok) throw new Error('Failed to save emergency contact');
      
      const result = await response.json();
      
      // Update the employee's emergency contacts list
      if (employee) {
        setEmployee({
          ...employee,
          emergency_contacts: [...(employee.emergency_contacts || []), result.data]
        });
      }
      
      enqueueSnackbar('Emergency contact added successfully', { variant: 'success' });
      setEmergencyContactDialogOpen(false);
      setNewEmergencyContact({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
        is_primary: false
      });
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      enqueueSnackbar('Failed to save emergency contact', { variant: 'error' });
    }
  };
  
  // Handle skill input change
  const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setNewSkill({
      ...newSkill,
      [name]: name === 'years_of_experience' ? parseInt(value) || 0 : value
    });
  };
  
  // Save skill
  const saveSkill = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees/${id}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify(newSkill)
      });
      
      if (!response.ok) throw new Error('Failed to save skill');
      
      const result = await response.json();
      
      // Update the employee's skills list
      if (employee) {
        setEmployee({
          ...employee,
          skills: [...(employee.skills || []), result.data]
        });
      }
      
      enqueueSnackbar('Skill added successfully', { variant: 'success' });
      setSkillDialogOpen(false);
      setNewSkill({
        skill_name: '',
        proficiency: 'intermediate',
        years_of_experience: 1
      });
    } catch (error) {
      console.error('Error saving skill:', error);
      enqueueSnackbar('Failed to save skill', { variant: 'error' });
    }
  };
  
  // Delete skill
  const deleteSkill = async (skillId: number) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees/skills/${skillId}`, {
        method: 'DELETE',
        headers: authHeader()
      });
      
      if (!response.ok) throw new Error('Failed to delete skill');
      
      // Update the employee's skills list
      if (employee) {
        setEmployee({
          ...employee,
          skills: (employee.skills || []).filter(skill => skill.id !== skillId)
        });
      }
      
      enqueueSnackbar('Skill deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting skill:', error);
      enqueueSnackbar('Failed to delete skill', { variant: 'error' });
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>Loading employee data...</Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error || !employee) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error || 'Failed to load employee data. Please try again later.'}
        </Alert>
      </Box>
    );
  }
  
  // Render the employee profile
  return (
    <Box p={3}>
      {/* Header with employee name and actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ width: 80, height: 80, mr: 3 }}>
            {employee.first_name[0]}{employee.last_name[0]}
          </Avatar>
          <div>
            <Typography variant="h4">
              {employee.first_name} {employee.last_name}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {employee.designation} • {employee.department_name}
            </Typography>
            <Box mt={1}>
              <Chip 
                label={employee.status === 'active' ? 'Active' : employee.status === 'on_leave' ? 'On Leave' : 'Inactive'} 
                color={employee.status === 'active' ? 'success' : employee.status === 'on_leave' ? 'warning' : 'default'}
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip 
                label={`Employee ID: ${employee.employee_id}`}
                variant="outlined"
                size="small"
              />
            </Box>
          </div>
        </Box>
        <Box>
          {editMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Save />}
                onClick={saveEmployeeData}
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Cancel />}
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Edit />}
              onClick={toggleEditMode}
            >
              Edit Profile
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Profile" icon={<Person />} />
          <Tab label="Documents" icon={<Description />} />
          <Tab label="Emergency Contacts" icon={<ContactEmergency />} />
          <Tab label="Skills & Qualifications" icon={<School />} />
          <Tab label="Leave Balance" icon={<Event />} />
          <Tab label="Employment Details" icon={<Work />} />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      <Box mt={2}>
        {/* Profile Tab */}
        {tabValue === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Personal Information</Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={employee.first_name || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={employee.last_name || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={employee.email || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone"
                  name="phone"
                  value={employee.phone || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  name="address"
                  value={employee.address || ''}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  margin="normal"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date of Birth"
                    value={employee.date_of_birth ? new Date(employee.date_of_birth) : null}
                    onChange={(date) => handleDateChange(date, 'date_of_birth')}
                    disabled={!editMode}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="normal"
                        disabled={!editMode}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" disabled={!editMode}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department_id"
                    value={employee.department_id || ''}
                    onChange={handleSelectChange}
                    label="Department"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Designation"
                  name="designation"
                  value={employee.designation || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Hire Date"
                    value={employee.hire_date ? new Date(employee.hire_date) : null}
                    onChange={(date) => handleDateChange(date, 'hire_date')}
                    disabled={!editMode}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="normal"
                        disabled={!editMode}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" disabled={!editMode}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={employee.status || 'active'}
                    onChange={handleSelectChange}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="on_leave">On Leave</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {/* Documents Tab */}
        {tabValue === 1 && (
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Documents</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Document
              </Button>
            </Box>
            
            {employee.documents && employee.documents.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Document Type</TableCell>
                      <TableCell>Document Number</TableCell>
                      <TableCell>File Name</TableCell>
                      <TableCell>Expiry Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employee.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>{doc.document_number || 'N/A'}</TableCell>
                        <TableCell>{doc.file_name}</TableCell>
                        <TableCell>
                          {doc.expiry_date ? format(new Date(doc.expiry_date), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={doc.status === 'valid' ? 'Valid' : doc.status === 'expired' ? 'Expired' : 'Expiring Soon'}
                            color={doc.status === 'valid' ? 'success' : doc.status === 'expired' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => window.open(`${API_BASE_URL}/hr/employees/documents/${doc.id}`, '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary">
                  No documents found. Upload a document to get started.
                </Typography>
              </Box>
            )}
          </Paper>
        )}
        
        {/* Emergency Contacts Tab */}
        {tabValue === 2 && (
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Emergency Contacts</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => setEmergencyContactDialogOpen(true)}
              >
                Add Contact
              </Button>
            </Box>
            
            {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
              <Grid container spacing={3}>
                {employee.emergency_contacts.map((contact) => (
                  <Grid item xs={12} md={6} key={contact.id}>
                    <Card variant="outlined">
                      <CardHeader
                        title={
                          <Box display="flex" alignItems="center">
                            {contact.name}
                            {contact.is_primary && (
                              <Chip
                                label="Primary"
                                color="primary"
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        }
                        subheader={contact.relationship}
                        action={
                          <IconButton size="small" color="error">
                            <Delete />
                          </IconButton>
                        }
                      />
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Phone fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="textSecondary">
                            {contact.phone}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Email fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="textSecondary">
                            {contact.email || 'N/A'}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="flex-start">
                          <Home fontSize="small" color="action" sx={{ mr: 1, mt: 0.5 }} />
                          <Typography variant="body2" color="textSecondary">
                            {contact.address || 'N/A'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary">
                  No emergency contacts found. Add a contact to get started.
                </Typography>
              </Box>
            )}
          </Paper>
        )}
        
        {/* Skills & Qualifications Tab */}
        {tabValue === 3 && (
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Skills & Qualifications</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => setSkillDialogOpen(true)}
              >
                Add Skill
              </Button>
            </Box>
            
            {employee.skills && employee.skills.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Skill</TableCell>
                      <TableCell>Proficiency</TableCell>
                      <TableCell>Experience</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employee.skills.map((skill) => (
                      <TableRow key={skill.id}>
                        <TableCell>{skill.skill_name}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Box width={100} mr={1}>
                              <LinearProgress 
                                variant="determinate" 
                                value={skill.proficiency === 'beginner' ? 25 : 
                                       skill.proficiency === 'intermediate' ? 50 :
                                       skill.proficiency === 'advanced' ? 75 : 100}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: 
                                      skill.proficiency === 'beginner' ? '#ff9800' :
                                      skill.proficiency === 'intermediate' ? '#ffc107' :
                                      skill.proficiency === 'advanced' ? '#4caf50' : '#2196f3'
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {skill.proficiency.charAt(0).toUpperCase() + skill.proficiency.slice(1)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {skill.years_of_experience} {skill.years_of_experience === 1 ? 'year' : 'years'}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => deleteSkill(skill.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary">
                  No skills found. Add a skill to get started.
                </Typography>
              </Box>
            )}
          </Paper>
        )}
        
        {/* Leave Balance Tab */}
        {tabValue === 4 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Leave Balance</Typography>
            <Divider sx={{ mb: 3 }} />
            
            {employee.leave_balance && employee.leave_balance.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Leave Type</TableCell>
                      <TableCell align="right">Total Days</TableCell>
                      <TableCell align="right">Used Days</TableCell>
                      <TableCell align="right">Remaining Days</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employee.leave_balance.map((leave) => (
                      <TableRow key={leave.leave_type_id}>
                        <TableCell>{leave.leave_type_name}</TableCell>
                        <TableCell align="right">{leave.total_days}</TableCell>
                        <TableCell align="right">{leave.used_days}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" justifyContent="flex-end" alignItems="center">
                            {leave.remaining_days}
                            {leave.remaining_days < leave.total_days * 0.2 && (
                              <Warning color="warning" fontSize="small" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary">
                  No leave balance information available.
                </Typography>
              </Box>
            )}
            
            <Box mt={3}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Add />}
                onClick={() => {}}
              >
                Request Leave
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Employment Details Tab */}
        {tabValue === 5 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Employment Details</Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Employee ID"
                  value={employee.employee_id || ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Department"
                  value={employee.department_name || ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Designation"
                  value={employee.designation || ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Employment Status"
                  value={employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Hire Date"
                  value={employee.hire_date ? format(new Date(employee.hire_date), 'MMM dd, yyyy') : ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Years of Service"
                  value={employee.hire_date ? 
                    new Date().getFullYear() - new Date(employee.hire_date).getFullYear() + ' years' : ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Grid>
            </Grid>
            
            <Box mt={4}>
              <Typography variant="subtitle1" gutterBottom>Performance Reviews</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary">
                  No performance reviews found.
                </Typography>
              </Box>
            </Box>
            
            <Box mt={4}>
              <Typography variant="subtitle1" gutterBottom>Training & Development</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary">
                  No training records found.
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>
      
      {/* Document Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Document Type</InputLabel>
              <Select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as string)}
                label="Document Type"
              >
                <MenuItem value="resume">Resume</MenuItem>
                <MenuItem value="id_proof">ID Proof</MenuItem>
                <MenuItem value="address_proof">Address Proof</MenuItem>
                <MenuItem value="education_certificate">Education Certificate</MenuItem>
                <MenuItem value="experience_certificate">Experience Certificate</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box mb={2}>
            <TextField
              label="Document Number (Optional)"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              fullWidth
              margin="normal"
            />
          </Box>
          <Box mb={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Expiry Date (Optional)"
                value={expiryDate}
                onChange={(newValue) => setExpiryDate(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                  />
                )}
              />
            </LocalizationProvider>
          </Box>
          <Box mb={2}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<FileUpload />}
              fullWidth
              sx={{ py: 1.5, mt: 2 }}
            >
              {selectedFile ? selectedFile.name : 'Select File'}
              <input
                type="file"
                hidden
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              />
            </Button>
            {selectedFile && (
              <Typography variant="caption" color="textSecondary">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDocumentUpload} 
            variant="contained" 
            color="primary"
            disabled={!selectedFile || !documentType || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Emergency Contact Dialog */}
      <Dialog 
        open={emergencyContactDialogOpen} 
        onClose={() => setEmergencyContactDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Add Emergency Contact</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            name="name"
            value={newEmergencyContact.name || ''}
            onChange={handleEmergencyContactChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Relationship"
            name="relationship"
            value={newEmergencyContact.relationship || ''}
            onChange={handleEmergencyContactChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Phone"
            name="phone"
            value={newEmergencyContact.phone || ''}
            onChange={handleEmergencyContactChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={newEmergencyContact.email || ''}
            onChange={handleEmergencyContactChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Address"
            name="address"
            value={newEmergencyContact.address || ''}
            onChange={handleEmergencyContactChange}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />
          <Box display="flex" alignItems="center" mt={2}>
            <input
              type="checkbox"
              id="is_primary"
              name="is_primary"
              checked={newEmergencyContact.is_primary || false}
              onChange={handleEmergencyContactChange}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="is_primary">Set as primary emergency contact</label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyContactDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveEmergencyContact} 
            variant="contained" 
            color="primary"
            disabled={!newEmergencyContact.name || !newEmergencyContact.relationship || !newEmergencyContact.phone}
          >
            Save Contact
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Skill Dialog */}
      <Dialog 
        open={skillDialogOpen} 
        onClose={() => setSkillDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Add Skill</DialogTitle>
        <DialogContent>
          <TextField
            label="Skill Name"
            name="skill_name"
            value={newSkill.skill_name || ''}
            onChange={handleSkillChange}
            fullWidth
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Proficiency Level</InputLabel>
            <Select
              name="proficiency"
              value={newSkill.proficiency || 'intermediate'}
              onChange={(e) => setNewSkill({...newSkill, proficiency: e.target.value as any})}
              label="Proficiency Level"
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
              <MenuItem value="expert">Expert</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Years of Experience"
            name="years_of_experience"
            type="number"
            value={newSkill.years_of_experience || 0}
            onChange={handleSkillChange}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, step: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkillDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveSkill} 
            variant="contained" 
            color="primary"
            disabled={!newSkill.skill_name}
          >
            Save Skill
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedEmployeeProfile;
