import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Person,
  Work,
  School,
  Star,
  Event,
  Description,
  ContactEmergency,
  Edit,
  Save,
  Cancel,
  Add,
  FileUpload,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { API_BASE_URL } from '../../config';
import authHeader from '../../services/auth-header';

interface EmployeeProfileProps {}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  designation: string;
  department_name: string;
  hire_date: string;
  documents: any[];
  emergencyContacts: any[];
  skills: any[];
  leaveBalances: any[];
  performanceReviews: any[];
  training: any[];
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/hr/profile/${id}`, {
          headers: authHeader()
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch employee profile');
        }
        
        const data = await response.json();
        setEmployee(data.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching employee profile');
        enqueueSnackbar('Failed to load employee profile', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeProfile();
  }, [id, enqueueSnackbar]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !documentType) {
      enqueueSnackbar('Please select a file and document type', { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', documentType);
    if (documentNumber) formData.append('documentNumber', documentNumber);
    if (expiryDate) formData.append('expiryDate', expiryDate.toISOString());

    try {
      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/hr/${id}/documents`, {
        method: 'POST',
        headers: {
          ...authHeader(),
          // Don't set Content-Type, let the browser set it with the boundary
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const result = await response.json();
      enqueueSnackbar('Document uploaded successfully', { variant: 'success' });
      
      // Refresh employee data
      if (employee) {
        const updatedEmployee = { ...employee };
        updatedEmployee.documents = [...(employee.documents || []), result.data];
        setEmployee(updatedEmployee);
      }
      
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('');
      setDocumentNumber('');
      setExpiryDate(null);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to upload document', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const renderBasicInfo = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Basic Information</Typography>
        <Button 
          variant="outlined" 
          startIcon={editMode ? <Save /> : <Edit />}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Save Changes' : 'Edit'}
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3} display="flex" justifyContent="center">
          <Avatar sx={{ width: 150, height: 150, fontSize: '3rem' }}>
            {employee?.first_name?.[0]}{employee?.last_name?.[0]}
          </Avatar>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={employee?.first_name || ''}
                fullWidth
                margin="normal"
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={employee?.last_name || ''}
                fullWidth
                margin="normal"
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Employee ID"
                value={employee?.employee_id || ''}
                fullWidth
                margin="normal"
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                value={employee?.email || ''}
                fullWidth
                margin="normal"
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                value={employee?.phone || ''}
                fullWidth
                margin="normal"
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Designation"
                value={employee?.designation || ''}
                fullWidth
                margin="normal"
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Department"
                value={employee?.department_name || ''}
                fullWidth
                margin="normal"
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Hire Date"
                  value={employee?.hire_date ? new Date(employee.hire_date) : null}
                  onChange={() => {}}
                  disabled
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal'
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderDocuments = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Documents</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Document
        </Button>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Document Type</TableCell>
              <TableCell>Document Number</TableCell>
              <TableCell>File Name</TableCell>
              <TableCell>Uploaded On</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employee?.documents?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.document_type}</TableCell>
                <TableCell>{doc.document_number || 'N/A'}</TableCell>
                <TableCell>{doc.file_name}</TableCell>
                <TableCell>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  {doc.is_verified ? (
                    <Chip 
                      icon={<CheckCircle fontSize="small" />} 
                      label="Verified" 
                      color="success" 
                      size="small" 
                    />
                  ) : (
                    <Chip 
                      icon={<Warning fontSize="small" />} 
                      label="Pending" 
                      color="warning" 
                      size="small" 
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    href={`${API_BASE_URL}${doc.file_path}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!employee?.documents || employee.documents.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No documents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderSkills = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Skills</Typography>
        <Button variant="outlined" startIcon={<Add />}>
          Add Skill
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        {employee?.skills?.map((skill) => (
          <Grid item key={skill.id}>
            <Chip 
              label={`${skill.skill_name} (${skill.proficiency_level})`}
              color="primary"
              variant="outlined"
            />
          </Grid>
        ))}
        {(!employee?.skills || employee.skills.length === 0) && (
          <Grid item xs={12}>
            <Typography color="textSecondary">No skills added yet</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  const renderLeaveBalance = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Leave Balance</Typography>
      
      <Grid container spacing={3}>
        {employee?.leaveBalances?.map((balance) => (
          <Grid item xs={12} sm={6} md={4} key={balance.leave_type_id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary">
                  {balance.leave_type_name}
                </Typography>
                <Box mt={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">Entitled:</Typography>
                    <Typography variant="body2">{balance.entitled_days} days</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">Used:</Typography>
                    <Typography variant="body2">{balance.approved_days} days</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="textSecondary">Remaining:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {balance.remaining_days} days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {(!employee?.leaveBalances || employee.leaveBalances.length === 0) && (
          <Grid item xs={12}>
            <Typography color="textSecondary">No leave balance information available</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  const renderEmergencyContacts = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Emergency Contacts</Typography>
        <Button variant="outlined" startIcon={<Add />}>
          Add Contact
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {employee?.emergencyContacts?.map((contact) => (
          <Grid item xs={12} sm={6} key={contact.id}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <div>
                    <Typography variant="h6">{contact.contact_name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {contact.relationship}
                    </Typography>
                    <Typography variant="body1" mt={1}>
                      {contact.phone}
                    </Typography>
                    {contact.is_primary && (
                      <Chip 
                        label="Primary Contact" 
                        color="primary" 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </div>
                  <IconButton size="small">
                    <Edit fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {(!employee?.emergencyContacts || employee.emergencyContacts.length === 0) && (
          <Grid item xs={12}>
            <Typography color="textSecondary">No emergency contacts added</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!employee) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Employee not found
      </Alert>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          {employee.first_name} {employee.last_name}
          <Typography variant="subtitle1" color="textSecondary">
            {employee.designation} • {employee.department_name}
          </Typography>
        </Typography>
        <Divider />
      </Box>
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Overview" icon={<Person />} iconPosition="start" />
        <Tab label="Documents" icon={<Description />} iconPosition="start" />
        <Tab label="Skills" icon={<Star />} iconPosition="start" />
        <Tab label="Leave" icon={<Event />} iconPosition="start" />
        <Tab label="Emergency Contacts" icon={<ContactEmergency />} iconPosition="start" />
      </Tabs>
      
      {tabValue === 0 && (
        <>
          {renderBasicInfo()}
          {renderSkills()}
          {renderLeaveBalance()}
        </>
      )}
      
      {tabValue === 1 && renderDocuments()}
      {tabValue === 2 && renderSkills()}
      {tabValue === 3 && renderLeaveBalance()}
      {tabValue === 4 && renderEmergencyContacts()}
      
      {/* Upload Document Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <input
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              id="document-upload"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="document-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<FileUpload />}
                disabled={uploading}
                fullWidth
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
              </Button>
            </label>
            <Typography variant="caption" display="block" color="textSecondary" gutterBottom>
              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
            </Typography>
          </Box>
          
          <TextField
            select
            label="Document Type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            fullWidth
            margin="normal"
            disabled={uploading}
          >
            <MenuItem value="aadhar">Aadhar Card</MenuItem>
            <MenuItem value="pan">PAN Card</MenuItem>
            <MenuItem value="passport">Passport</MenuItem>
            <MenuItem value="visa">Visa</MenuItem>
            <MenuItem value="resume">Resume</MenuItem>
            <MenuItem value="offer_letter">Offer Letter</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          
          <TextField
            label="Document Number (Optional)"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            fullWidth
            margin="normal"
            disabled={uploading}
          />
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Expiry Date (Optional)"
              value={expiryDate}
              onChange={(newValue) => setExpiryDate(newValue)}
              disabled={uploading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal'
                }
              }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUploadDialogOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUploadDocument}
            variant="contained"
            color="primary"
            disabled={!selectedFile || !documentType || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : null}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeProfile;
