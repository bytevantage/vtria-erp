import React, { useState, useEffect } from 'react';
// Format and useSnackbar imports are moved below
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Avatar,
  IconButton,
  Pagination,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Divider,
  FormHelperText,
  CircularProgress,
  SelectChangeEvent,
  Switch,
  Tooltip
} from '@mui/material';
import SelectOrAddField from './common/SelectOrAddField';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Info as InfoIcon,
  Lock,
  PersonAdd,
  Email,
  Phone,
  Save,
  ArrowBack,
  ArrowForward
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
// Removed notistack dependency - using simple notifications

interface Employee {
  id?: number;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  mobile?: string;
  employee_type: 'full_time' | 'part_time' | 'contract' | 'intern' | 'consultant' | string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated' | 'probation' | string;
  // User Account Fields
  user_id?: number;
  has_system_access?: boolean;
  user_role?: 'director' | 'admin' | 'sales-admin' | 'designer' | 'accounts' | 'technician';
  password?: string; // Only for creation/updates
  hire_date: string;
  confirmation_date?: string;
  exit_date?: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | string;
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | string;
  nationality?: string;
  religion?: string;
  department_id: number | string;
  designation: string;
  reporting_to?: number | string;
  work_location?: string;
  work_shift?: 'morning' | 'evening' | 'night' | 'rotating' | string;
  employment_status?: 'permanent' | 'contract' | 'probation' | 'internship' | string;
  job_title?: string;
  job_description?: string;
  basic_salary: number | string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  ifsc_code?: string;
  pan_number?: string;
  aadhar_number?: string;
  uan_number?: string;
  esi_number?: string;
  current_address?: string;
  current_city?: string;
  current_state?: string;
  current_country?: string;
  current_pincode?: string;
  permanent_address?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_country?: string;
  permanent_pincode?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  highest_qualification?: string;
  institution_name?: string;
  year_of_completion?: number | string;
  total_experience_years?: number | string;
  total_experience_months?: number | string;
  previous_employer?: string;
  previous_designation?: string;
  previous_salary?: number | string;
  created_at?: string;
  updated_at?: string;
  created_by?: number | string;
  updated_by?: number | string;
  department_name?: string;
  manager_name?: string;
  confirm_password?: string;
  [key: string]: string | number | boolean | undefined;
}

interface Department {
  id: number;
  department_name: string;
  department_code: string;
}

// Steps for the stepper
const steps = [
  'Personal Information',
  'Employment Details',
  'Salary & Bank',
  'Contact Information',
  'Education & Experience',
  'Review & Submit'
];

// Helper function to generate employee ID
const generateEmployeeId = (): string => {
  const prefix = 'EMP';
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}/${year}/${random}`;
};

// Helper function to safely create date from string
const safeCreateDate = (dateString: string): Date | null => {
  if (!dateString || dateString === '') return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

const EmployeeManagement = () => {
  // Simple notification function to replace notistack
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You could also use alert() or implement a simple toast system
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  };
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<string[]>([
    'Software Engineer', 'Senior Software Engineer', 'Lead Developer', 'Tech Lead',
    'Project Manager', 'Product Manager', 'Business Analyst', 'QA Engineer',
    'DevOps Engineer', 'Data Analyst', 'UI/UX Designer', 'Sales Manager',
    'Marketing Manager', 'HR Manager', 'Finance Manager', 'Operations Manager',
    'Customer Support', 'Admin Assistant', 'Accountant', 'Team Leader'
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Employee>({
    employee_id: generateEmployeeId(),
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    employee_type: 'full_time',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
    date_of_birth: '',
    gender: 'male',
    department_id: '',
    designation: '',
    basic_salary: 0,
    marital_status: 'single',
    work_shift: 'morning',
    employment_status: 'permanent',
    current_address: '',
    current_city: '',
    current_state: '',
    current_country: 'India',
    current_pincode: '',
    permanent_address: '',
    permanent_city: '',
    permanent_state: '',
    permanent_country: 'India',
    permanent_pincode: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    highest_qualification: '',
    institution_name: '',
    total_experience_years: 0,
    total_experience_months: 0,
    previous_employer: '',
    previous_designation: '',
    previous_salary: 0,
    has_system_access: false,
    user_role: 'technician',
    password: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch: '',
    ifsc_code: '',
    pan_number: '',
    aadhar_number: '',
    uan_number: '',
    esi_number: '',
    confirm_password: '',
    created_at: '',
    updated_at: '',
    created_by: 0,
    updated_by: 0,
    department_name: '',
    manager_name: ''
  });

useEffect(() => {
  fetchEmployees();
  fetchDepartments();
}, [page, searchTerm, statusFilter, departmentFilter]);

const fetchEmployees = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10',
      ...(searchTerm && { search: searchTerm }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(departmentFilter && { department: departmentFilter })
    });

    const response = await fetch(`/api/employees?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      setEmployees(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    setEmployees([]);
  } finally {
    setLoading(false);
  }
};

const fetchDepartments = async () => {
  try {
    const response = await fetch('/api/employees/master/departments', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      setDepartments(result.data || []);
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
    setDepartments([]);
  }
};

// Handler for adding new departments
const handleAddNewDepartment = async (departmentName: string) => {
  try {
    const response = await fetch('/api/employees/master/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
      },
      body: JSON.stringify({
        departmentName: departmentName,
        departmentCode: departmentName.toUpperCase().replace(/\s+/g, '_'),
        status: 'active'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const newDepartment = result.data;
      setDepartments(prev => [...prev, newDepartment]);
      showNotification(
        `Department "${departmentName}" added successfully`,
        'success'
      );
      return {
        id: newDepartment.id,
        label: newDepartment.department_name,
        value: newDepartment.id
      };
    } else {
      throw new Error('Failed to add department');
    }
  } catch (error) {
    console.error('Error adding department:', error);
    // For demo purposes, add it locally if API fails
    const tempId = Date.now();
    const newDept = {
      id: tempId,
      department_name: departmentName,
      department_code: departmentName.toUpperCase().replace(/\s+/g, '_')
    };
    setDepartments(prev => [...prev, newDept]);
    showNotification(`Department "${departmentName}" added locally`, 'info');
    return { id: tempId, label: departmentName, value: tempId };
  }
};

// Handler for adding new designations
const handleAddNewDesignation = (designationName: string) => {
  if (!designations.includes(designationName)) {
    setDesignations(prev => [...prev, designationName]);
    showNotification(`Designation "${designationName}" added`, 'success');
  }
  return { id: designationName, label: designationName, value: designationName };
};

// Handle input changes for all form fields
const handleInputChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;

  // Handle numeric fields
  const numericFields = ['basic_salary', 'total_experience_years', 'total_experience_months', 'previous_salary'];
  const parsedValue = numericFields.includes(name) && value !== '' ? Number(value) : value;

  setFormData(prev => ({
    ...prev,
    [name]: parsedValue
  }));

  // Clear error when user types
  if (formErrors[name]) {
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

// Handle SelectOrAddField changes
const handleSelectOrAddChange = (name: string, value: string | number) => {
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));

  // Clear error when user selects/adds value
  if (formErrors[name]) {
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

// Handle select changes
const handleSelectChange = (e: SelectChangeEvent<string>) => {
  const { name, value } = e.target;
  if (!name) return;

  // Handle numeric fields
  const numericFields = ['department_id', 'reporting_to', 'year_of_completion', 'basic_salary',
    'total_experience_years', 'total_experience_months', 'previous_salary'];

  const parsedValue = numericFields.includes(name) && value !== '' ? Number(value) : value;

  setFormData(prev => ({
    ...prev,
    [name]: parsedValue
  }));

  // Clear error when user selects an option
  if (formErrors[name]) {
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

// Handle date changes
const handleDateChange = (name: string, date: Date | null) => {
  if (date && !isNaN(date.getTime())) {
    setFormData(prev => ({
      ...prev,
      [name]: format(date, 'yyyy-MM-dd')
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

// Handle same as current address checkbox
const handleSameAsCurrentAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { checked } = e.target;
  if (checked) {
    setFormData(prev => ({
      ...prev,
      permanent_address: prev.current_address,
      permanent_city: prev.current_city,
      permanent_state: prev.current_state,
      permanent_country: prev.current_country || 'India',
      permanent_pincode: prev.current_pincode
    }));
  }
};

// Handle next step in the form
const handleNext = () => {
  // Validate current step before proceeding
  const errors = validateStep(activeStep);
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors);
    showNotification('Please fill in all required fields', 'error');
    return;
  }

  setActiveStep((prevStep) => prevStep + 1);
};

// Handle previous step in the form
const handleBack = () => {
  setActiveStep((prevStep) => prevStep - 1);
};

// Validate current step
const validateStep = (step: number): Record<string, string> => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 0: // Personal Information
      if (!formData.first_name || !formData.first_name.toString().trim()) errors.first_name = 'First name is required';
      if (!formData.last_name || !formData.last_name.toString().trim()) errors.last_name = 'Last name is required';
      if (!formData.email) {
        errors.email = 'Email is required';
      } else if (formData.email && !/\S+@\S+\.\S+/.test(formData.email.toString())) {
        errors.email = 'Email is invalid';
      }
      if (!formData.phone) {
        errors.phone = 'Phone number is required';
      } else if (formData.phone && !formData.phone.toString().trim()) {
        errors.phone = 'Phone number is required';
      }
      if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
      if (!formData.gender) errors.gender = 'Gender is required';
      break;

    case 1: // Employment Details
      if (!formData.employee_type) errors.employee_type = 'Employee type is required';
      if (!formData.hire_date) errors.hire_date = 'Hire date is required';
      if (!formData.department_id || formData.department_id === 0 || formData.department_id === '0') errors.department_id = 'Department is required';
      if (!formData.designation || !formData.designation.toString().trim()) errors.designation = 'Designation is required';
      if (!formData.employment_status) errors.employment_status = 'Employment status is required';
      break;

    case 2: // Salary & Bank
      if (!formData.basic_salary || Number(formData.basic_salary) <= 0) {
        errors.basic_salary = 'Basic salary is required and must be greater than 0';
      }
      if (formData.bank_account_number && !/^[0-9]{9,18}$/.test(formData.bank_account_number.toString())) {
        errors.bank_account_number = 'Invalid bank account number';
      }
      if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toString())) {
        errors.ifsc_code = 'Invalid IFSC code';
      }
      if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toString())) {
        errors.pan_number = 'Invalid PAN number';
      }
      if (formData.aadhar_number && !/^[2-9]{1}[0-9]{11}$/.test(formData.aadhar_number.toString())) {
        errors.aadhar_number = 'Invalid Aadhar number';
      }
      break;

    case 3: // Contact Information
      if (!formData.current_address || !formData.current_address.toString().trim()) errors.current_address = 'Current address is required';
      if (!formData.current_city || !formData.current_city.toString().trim()) errors.current_city = 'City is required';
      if (!formData.current_state || !formData.current_state.toString().trim()) errors.current_state = 'State is required';
      if (!formData.current_pincode) {
        errors.current_pincode = 'Pincode is required';
      } else if (!/^[1-9][0-9]{5}$/.test(formData.current_pincode.toString())) {
        errors.current_pincode = 'Invalid pincode';
      }
      if (!formData.emergency_contact_name || !formData.emergency_contact_name.toString().trim()) errors.emergency_contact_name = 'Emergency contact name is required';
      if (!formData.emergency_contact_phone || !formData.emergency_contact_phone.toString().trim()) errors.emergency_contact_phone = 'Emergency contact phone is required';
      break;

    case 4: // Education & Experience
      if (!formData.highest_qualification || !formData.highest_qualification.toString().trim()) errors.highest_qualification = 'Highest qualification is required';
      if (!formData.institution_name || !formData.institution_name.toString().trim()) errors.institution_name = 'Institution name is required';
      break;
  }

  return errors;
};

const handleOpenDialog = (employee?: Employee) => {
  if (employee) {
    setEditingEmployee(employee);
    setFormData({
      ...employee,
      // Ensure all required fields have default values if missing
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      designation: employee.designation || '',
      employee_type: employee.employee_type || 'full_time',
      status: employee.status || 'active',
      hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
      date_of_birth: employee.date_of_birth || '',
      gender: employee.gender || 'male',
      department_id: employee.department_id || '',
      basic_salary: employee.basic_salary || 0,
      marital_status: employee.marital_status || 'single',
      work_shift: employee.work_shift || 'morning',
      employment_status: employee.employment_status || 'permanent',
      current_address: employee.current_address || '',
      current_city: employee.current_city || '',
      current_state: employee.current_state || '',
      current_country: employee.current_country || 'India',
      current_pincode: employee.current_pincode || '',
      permanent_country: employee.permanent_country || 'India',
      total_experience_years: employee.total_experience_years || 0,
      total_experience_months: employee.total_experience_months || 0,
      previous_salary: employee.previous_salary || 0,
      password: '',
      confirm_password: ''
    });
  } else {
    setEditingEmployee(null);
    setFormData({
      employee_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_type: 'full_time',
      status: 'active',
      hire_date: new Date().toISOString().split('T')[0],
      date_of_birth: '',
      gender: 'prefer_not_to_say',
      department_id: '',
      designation: '',
      basic_salary: ''
    });
  }
  setActiveStep(0);
  setFormErrors({});
  setOpenDialog(true);
};

const handleCloseDialog = () => {
  setOpenDialog(false);
  setEditingEmployee(null);
  setActiveStep(0);
  setFormErrors({});

  // Reset form data to initial state
  setFormData({
    employee_id: generateEmployeeId(),
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    employee_type: 'full_time',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
    date_of_birth: '',
    gender: 'male',
    department_id: '',
    designation: '',
    basic_salary: 0,
    marital_status: 'single',
    work_shift: 'morning',
    employment_status: 'permanent',
    current_address: '',
    current_city: '',
    current_state: '',
    current_country: 'India',
    current_pincode: '',
    permanent_address: '',
    permanent_city: '',
    permanent_state: '',
    permanent_country: 'India',
    permanent_pincode: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    highest_qualification: '',
    institution_name: '',
    total_experience_years: 0,
    total_experience_months: 0,
    previous_employer: '',
    previous_designation: '',
    previous_salary: 0,
    has_system_access: false,
    user_role: 'technician',
    password: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch: '',
    ifsc_code: '',
    pan_number: '',
    aadhar_number: '',
    uan_number: '',
    esi_number: '',
    confirm_password: '',
    created_at: '',
    updated_at: '',
    created_by: 0,
    updated_by: 0,
    department_name: '',
    manager_name: ''
  });
};

const handleSubmit = async () => {
  try {
    // Validate all steps before submission
    let allErrors: Record<string, string> = {};
    for (let i = 0; i < steps.length - 1; i++) {
      const stepErrors = validateStep(i);
      allErrors = { ...allErrors, ...stepErrors };
    }

    if (Object.keys(allErrors).length > 0) {
      setFormErrors(allErrors);
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Check if passwords match (for new employee)
    if (!editingEmployee && formData.password !== formData.confirm_password) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    setSaving(true);

    // Use the correct API endpoints
    const url = editingEmployee
      ? `/api/employees/${editingEmployee.id}`
      : '/api/employees';

    const method = editingEmployee ? 'PUT' : 'POST';

    // Prepare the data to send (remove UI-only fields)
    const { ...employeeData } = formData;

    // Get auth token from localStorage
    const token = localStorage.getItem('vtria_token');

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(employeeData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to save employee');
    }

    await response.json();

    showNotification(
      editingEmployee ? 'Employee updated successfully' : 'Employee created successfully',
      'success'
    );

    // Refresh employee list
    fetchEmployees();

    // Close dialog and reset form
    handleCloseDialog();

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save employee';
    console.error('Error saving employee:', error);
    showNotification(errorMessage, 'error');
  } finally {
    setSaving(false);
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'on_leave':
      return 'warning';
    case 'inactive':
      return 'error';
    case 'terminated':
      return 'error';
    default:
      return 'default';
  }
};

const getEmployeeTypeLabel = (type: string) => {
  if (!type) return 'N/A';
  return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// Render form steps
const renderStepContent = (step: number) => {
  switch (step) {
    case 0: // Personal Information
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="First Name *"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleInputChange}
              error={!!formErrors.first_name}
              helperText={formErrors.first_name}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Last Name *"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleInputChange}
              error={!!formErrors.last_name}
              helperText={formErrors.last_name}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email *"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone *"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              error={!!formErrors.phone}
              helperText={formErrors.phone}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!formErrors.gender}>
              <InputLabel>Gender *</InputLabel>
              <Select
                name="gender"
                value={formData.gender || 'male'}
                onChange={handleSelectChange}
                label="Gender *"
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
              </Select>
              {formErrors.gender && <FormHelperText>{formErrors.gender}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Date of Birth *"
              value={safeCreateDate(formData.date_of_birth)}
              onChange={(date: Date | null) => handleDateChange('date_of_birth', date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!formErrors.date_of_birth,
                  helperText: formErrors.date_of_birth
                }
              }}
            />
          </Grid>
        </Grid>
      );

    case 1: // Employment Details
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!formErrors.employee_type}>
              <InputLabel>Employee Type *</InputLabel>
              <Select
                name="employee_type"
                value={formData.employee_type || 'full_time'}
                onChange={handleSelectChange}
                label="Employee Type *"
              >
                <MenuItem value="full_time">Full Time</MenuItem>
                <MenuItem value="part_time">Part Time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
                <MenuItem value="consultant">Consultant</MenuItem>
              </Select>
              {formErrors.employee_type && (
                <FormHelperText>{formErrors.employee_type}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Hire Date *"
              value={safeCreateDate(formData.hire_date) || new Date()}
              onChange={(date: Date | null) => handleDateChange('hire_date', date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!formErrors.hire_date,
                  helperText: formErrors.hire_date
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SelectOrAddField
              label="Department *"
              name="department_id"
              value={formData.department_id || ''}
              onChange={handleSelectOrAddChange}
              options={departments.map(dept => ({
                id: dept.id,
                label: dept.department_name,
                value: dept.id
              }))}
              onAddNew={handleAddNewDepartment}
              error={formErrors.department_id}
              required={true}
              placeholder="Select department or add new one..."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SelectOrAddField
              label="Designation *"
              name="designation"
              value={formData.designation || ''}
              onChange={handleSelectOrAddChange}
              options={designations.map(designation => ({
                id: designation,
                label: designation,
                value: designation
              }))}
              onAddNew={handleAddNewDesignation}
              error={formErrors.designation}
              required={true}
              placeholder="Select designation or add new one..."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!formErrors.employment_status}>
              <InputLabel>Employment Status *</InputLabel>
              <Select
                name="employment_status"
                value={formData.employment_status || 'permanent'}
                onChange={handleSelectChange}
                label="Employment Status *"
              >
                <MenuItem value="permanent">Permanent</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="probation">Probation</MenuItem>
                <MenuItem value="internship">Internship</MenuItem>
              </Select>
              {formErrors.employment_status && (
                <FormHelperText>{formErrors.employment_status}</FormHelperText>
              )}
            </FormControl>
          </Grid>
        </Grid>
      );

    case 2: // Salary & Bank
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Basic Salary *"
              name="basic_salary"
              type="number"
              value={formData.basic_salary || 0}
              onChange={handleInputChange}
              error={!!formErrors.basic_salary}
              helperText={formErrors.basic_salary}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      );

    case 3: // Contact Information
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Current Address</Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address Line 1 *"
              name="current_address"
              value={formData.current_address || ''}
              onChange={handleInputChange}
              error={!!formErrors.current_address}
              helperText={formErrors.current_address}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="City *"
              name="current_city"
              value={formData.current_city || ''}
              onChange={handleInputChange}
              error={!!formErrors.current_city}
              helperText={formErrors.current_city}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="State *"
              name="current_state"
              value={formData.current_state || ''}
              onChange={handleInputChange}
              error={!!formErrors.current_state}
              helperText={formErrors.current_state}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Pincode *"
              name="current_pincode"
              value={formData.current_pincode || ''}
              onChange={handleInputChange}
              error={!!formErrors.current_pincode}
              helperText={formErrors.current_pincode}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Emergency Contact</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Name *"
              name="emergency_contact_name"
              value={formData.emergency_contact_name || ''}
              onChange={handleInputChange}
              error={!!formErrors.emergency_contact_name}
              helperText={formErrors.emergency_contact_name}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Relationship"
              name="emergency_contact_relation"
              value={formData.emergency_contact_relation || ''}
              onChange={handleInputChange}
              helperText="Optional"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Phone *"
              name="emergency_contact_phone"
              value={formData.emergency_contact_phone || ''}
              onChange={handleInputChange}
              error={!!formErrors.emergency_contact_phone}
              helperText={formErrors.emergency_contact_phone}
            />
          </Grid>
        </Grid>
      );

    case 4: // Education & Experience
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Education Details</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Highest Qualification *"
              name="highest_qualification"
              value={formData.highest_qualification || ''}
              onChange={handleInputChange}
              error={!!formErrors.highest_qualification}
              helperText={formErrors.highest_qualification}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Institution Name *"
              name="institution_name"
              value={formData.institution_name || ''}
              onChange={handleInputChange}
              error={!!formErrors.institution_name}
              helperText={formErrors.institution_name}
            />
          </Grid>
        </Grid>
      );

    default:
      return 'Unknown step';
  }
};

return (
  <Box>
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" component="h1">
        Employee Management
      </Typography>
      <Button
        variant="contained"
        startIcon={<PersonAdd />}
        onClick={() => handleOpenDialog()}
      >
        Add Employee
      </Button>
    </Box>

    {/* Filters */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search employees"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="on_leave">On Leave</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="terminated">Terminated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id.toString()}>
                    {dept.department_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              fullWidth
            >
              More Filters
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    {loading && <LinearProgress sx={{ mb: 2 }} />}

    {/* Employee Table */}
    <Card>
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell align="right">Salary</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No employees found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {getInitials(employee.first_name, employee.last_name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {employee.first_name} {employee.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {employee.employee_id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Email fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {employee.email}
                          </Typography>
                        </Box>
                        {employee.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Phone fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {employee.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {employee.department_name}
                        </Typography>
                        {employee.designation && (
                          <Typography variant="caption" color="text.secondary">
                            {employee.designation}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getEmployeeTypeLabel(employee.employee_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={employee.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(employee.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {(() => {
                          const date = safeCreateDate(employee.hire_date);
                          return date ? date.toLocaleDateString() : 'N/A';
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {employee.basic_salary && (
                        <Typography variant="body2" fontWeight="medium">
                          ₹{employee.basic_salary.toLocaleString('en-IN')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(employee)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </CardContent>
    </Card>

    {/* Employee Dialog */}
    <Dialog
      open={openDialog}
      onClose={handleCloseDialog}
      maxWidth="md"
      fullWidth
      fullScreen={window.innerWidth < 600}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </Typography>
          <Typography variant="subtitle2" color="textSecondary">
            Employee ID: {formData.employee_id}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ mt: 4, mb: 2 }}>
            {renderStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleCloseDialog}
          color="inherit"
        >
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep !== 0 && (
          <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ArrowForward />}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {editingEmployee ? 'Update Employee' : 'Create Employee'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  </Box>
);
};

export default EmployeeManagement;