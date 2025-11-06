import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EnterpriseButton from './common/EnterpriseButton';

// Import auth utilities
import { getAuthHeaders, handleAuthError } from '../utils/auth';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  DateRange as DateRangeIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as ApproveIcon,
  Send as SendIcon,
  ThumbUp as AcceptIcon,
  ThumbDown as RejectIcon,
  Undo as RejectForReworkIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  Email as EmailIcon,
  ListAlt as BomIcon,
} from '@mui/icons-material';

const QuotationsEnhanced = () => {
  const COMPONENT_VERSION = 'Q-ENH-1.1';
  // Use relative API calls in Docker environment to leverage proxy
  const API_BASE_URL = process.env.DOCKER_ENV === 'true' ? '' : (process.env.REACT_APP_API_URL || '');

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState({ open: false, quotation: null });
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [quotationDetails, setQuotationDetails] = useState(null);
  const [quotationItems, setQuotationItems] = useState([]);
  const [availableEstimations, setAvailableEstimations] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [showDeletedStages, setShowDeletedStages] = useState(false);
  const [deletedStages, setDeletedStages] = useState([]);
  const [formData, setFormData] = useState({
    estimation_id: '',
    client_state: '',
    lead_time_days: 30,
    terms_conditions: 'Standard terms and conditions apply',
    delivery_terms: '4-6 weeks from approval',
    payment_terms: '30% advance, 70% on delivery',
    warranty_terms: '12 months warranty from date of installation',
    notes: '',
  });

  // Item editing state
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [itemFormData, setItemFormData] = useState({
    item_id: '',
    item_name: '',
    quantity: 1,
    unit: '',
    rate: 0,
    tax_percentage: 0
  });

  // Rejection dialog state
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionQuotationId, setRejectionQuotationId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch stock items
  const fetchStockItems = async () => {
    try {
      console.log('🔄 Fetching stock items...');
      const response = await axios.get(`${API_BASE_URL}/api/inventory-enhanced/items/enhanced`, {
        headers: getAuthHeaders()
      });
      console.log('📦 Stock items response:', response.data);
      if (response.data && response.data.success) {
        console.log('✅ Setting stock items:', response.data.data.length, 'items');
        setStockItems(response.data.data);
      } else {
        console.error('❌ API response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching stock items:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchAvailableEstimations();
    fetchStockItems();

    // Check if navigated from Case Dashboard
    const selectedCase = sessionStorage.getItem('selectedCase');
    if (selectedCase) {
      try {
        const caseData = JSON.parse(selectedCase);
        // Find and select the quotation for this case
        handleCaseNavigation(caseData);
        // Clear the session storage after use
        sessionStorage.removeItem('selectedCase');
      } catch (error) {
        console.error('Error parsing case data from session storage:', error);
      }
    }
  }, []);

  const handleCaseNavigation = async (caseData) => {
    try {
      console.log('🔍 Navigating to quotation for case:', caseData);

      // URL encode the case number to handle forward slashes
      const encodedCaseNumber = encodeURIComponent(caseData.caseNumber);
      console.log('🌐 API URL (encoded):', `${API_BASE_URL}/api/quotations/by-case/${encodedCaseNumber}`);

      // Find quotation associated with this case
      const response = await axios.get(`${API_BASE_URL}/api/quotations/by-case/${encodedCaseNumber}`);
      if (response.data.success && response.data.data) {
        const quotation = response.data.data;
        console.log('🎯 Found quotation:', quotation.quotation_id);

        // Open the quotation for editing using the existing handleOpen pattern
        await handleOpen(quotation);
      } else {
        console.log('❌ No quotation data found');
        // No quotation found for this case, show available estimations for this case
        setError(`No quotation found for case ${caseData.caseNumber}. You may need to create one from an approved estimation.`);
      }
    } catch (error) {
      console.error('💥 Error loading case quotation:', error);
      console.error('Response:', error.response?.data);
      setError(`Error loading quotation for case ${caseData.caseNumber}: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch quotations and available estimations from enhanced endpoint
      const authHeaders = getAuthHeaders();
      if (!authHeaders) return; // Auth headers will handle redirect if no token

      const quotationsResponse = await axios.get(`${API_BASE_URL}/api/quotations/enhanced/all`, {
        headers: authHeaders
      });

      let allItems = [];

      // The enhanced endpoint now returns both quotations and available estimations
      if (quotationsResponse.data.success) {
        const items = quotationsResponse.data.data.map(item => ({
          ...item,
          // Map to frontend expected structure
          type: item.record_type === 'quotation' ? 'quotation' : 'estimation',
          canCreateQuotation: item.canCreateQuotation || false,
          // Ensure consistent field naming
          quotation_number: item.quotation_id || `Ready: ${item.estimation_number}`,
          total_amount: item.total_final_price,
          grand_total: item.total_final_price, // Add this for Financial Details section
          status: item.record_type === 'quotation' ? (item.status || 'draft') : 'ready_for_quotation'
        }));

        allItems = items;
      }

      setQuotations(allItems);

      // Also set available estimations for backward compatibility
      const availableEstimations = allItems.filter(item => item.canCreateQuotation);
      setAvailableEstimations(availableEstimations);

    } catch (error) {
      console.error('Error fetching quotations:', error);
      try {
        handleAuthError(error);
      } catch (authError) {
        setError('Failed to load quotations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEstimations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/estimation`, {
        headers: getAuthHeaders()
      });
      const allEstimations = response.data.data || [];

      // Get estimations that are approved
      const approvedEstimations = allEstimations.filter(estimation =>
        estimation.status === 'approved'
      );

      // Enhance with case and client information
      const enhancedEstimations = await Promise.all(
        approvedEstimations.map(async (estimation) => {
          try {
            // Get case details
            const caseResponse = await axios.get(`${API_BASE_URL}/api/case-management/id/${estimation.case_id}`);
            const caseData = caseResponse.data.data;

            if (caseData) {
              // Get client details
              const clientResponse = await axios.get(`${API_BASE_URL}/api/clients/${caseData.client_id}`);
              const client = clientResponse.data.data;

              return {
                ...estimation,
                case_number: caseData.case_number,
                project_name: caseData.project_name,
                client_name: client?.company_name || 'Unknown Client',
                client_state: client?.state || caseData.client_state || '',
                hasQuotation: quotations.some(q => q.estimation_id === estimation.id)
              };
            }

            return null;
          } catch (error) {
            console.error('Error enhancing estimation:', error);
            return null;
          }
        })
      );

      // Filter out null entries and estimations that already have quotations
      const validEstimations = enhancedEstimations
        .filter(est => est !== null && !est.hasQuotation);

      setAvailableEstimations(validEstimations);
    } catch (error) {
      console.error('Error fetching estimations:', error);
    }
  };

  const fetchQuotationDetails = async (quotationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/quotations/enhanced/${quotationId}`);
      if (response.data.success) {
        setQuotationDetails(response.data.data);
        setQuotationItems(response.data.data.items || []);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching quotation details:', error);
      setError('Failed to fetch quotation details');
    }
    return null;
  };

  const handleOpen = async (quotation = null) => {
    if (quotation) {
      setEditingQuotation(quotation);

      // Fetch detailed quotation data including items
      const details = await fetchQuotationDetails(quotation.id);

      setFormData({
        estimation_id: quotation.estimation_id?.toString() || details?.estimation_id?.toString() || '',
        client_state: quotation.client_state || details?.client_state || '',
        lead_time_days: quotation.lead_time_days || 30,
        terms_conditions: quotation.terms_conditions || 'Standard terms and conditions apply',
        delivery_terms: quotation.delivery_terms || '4-6 weeks from approval',
        payment_terms: quotation.payment_terms || '30% advance, 70% on delivery',
        warranty_terms: quotation.warranty_terms || '12 months warranty from date of installation',
        notes: quotation.notes || '',
      });
    } else {
      setEditingQuotation(null);
      setQuotationDetails(null);
      setQuotationItems([]);
      setFormData({
        estimation_id: '',
        client_state: '',
        lead_time_days: 30,
        terms_conditions: 'Standard terms and conditions apply',
        delivery_terms: '4-6 weeks from approval',
        payment_terms: '30% advance, 70% on delivery',
        warranty_terms: '12 months warranty from date of installation',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingQuotation(null);
    setQuotationDetails(null);
    setQuotationItems([]);
    setError('');
    setCurrentTab(0);
    setEditingItemIndex(null);
    setItemFormData({
      item_name: '',
      description: '',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      tax_percentage: 18,
      hsn_code: ''
    });
    // Refresh the quotations list to ensure data is up to date
    fetchQuotations();
  };

  const handleViewClose = () => {
    setViewDialog({ open: false, quotation: null });
  };

  const handleView = (quotation) => {
    setViewDialog({ open: true, quotation });
  };

  const handleEstimationChange = (estimationId) => {
    // Find the selected estimation
    const selectedEstimation = availableEstimations.find(est => est.id.toString() === estimationId);

    // Update form data with estimation_id and auto-populate client_state
    setFormData({
      ...formData,
      estimation_id: estimationId,
      client_state: selectedEstimation?.client_state || ''
    });
  };

  // Helper function to transform items from frontend format to backend format
  const transformItemForBackend = (item) => {
    return {
      description: item.item_name || item.description || null,
      hsn_code: item.hsn_code || null,
      quantity: item.quantity || 0,
      unit: item.unit || 'nos',
      rate: item.rate || 0,
      discount_percentage: item.discount_percentage || 0,
      tax_rate: item.tax_percentage || item.tax_rate || 0,
      amount: item.amount || (item.quantity * item.rate),
      lead_time_days: item.lead_time_days || null
    };
  };

  // Helper function to sanitize data - convert undefined to null and transform items
  const sanitizeData = (obj) => {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeData(item));
    }

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeData(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  const handleSubmit = async () => {
    try {
      setError('');

      console.log('Form data being submitted:', formData);
      console.log('Quotation items being submitted:', quotationItems);

      if (!editingQuotation && !formData.estimation_id) {
        setError('Please select an estimation');
        return;
      }

      if (editingQuotation) {
        // Update existing quotation using enhanced API
        // Transform items to backend format first
        const transformedItems = quotationItems.map(item => transformItemForBackend(item));
        const rawSubmitData = { ...formData, items: transformedItems };
        const submitData = sanitizeData(rawSubmitData);
        console.log('Updating quotation with transformed and sanitized data:', submitData);
        const response = await axios.put(`${API_BASE_URL}/api/quotations/enhanced/${editingQuotation.id}`, submitData, {
          headers: getAuthHeaders()
        });
        console.log('Update response:', response.data);
        if (response.data.success) {
          await fetchQuotations();
          await fetchAvailableEstimations();
          handleClose();
        } else {
          console.error('Update failed:', response.data);
          setError(response.data.message || 'Failed to update quotation');
        }
      } else {
        // Create new quotation using enhanced API
        // Transform items to backend format first
        const transformedItems = quotationItems.map(item => transformItemForBackend(item));
        const rawSubmitData = { ...formData, items: transformedItems };
        const submitData = sanitizeData(rawSubmitData);
        console.log('Creating quotation with transformed and sanitized data:', submitData);
        const response = await axios.post(`${API_BASE_URL}/api/quotations/enhanced/create`, submitData, {
          headers: getAuthHeaders()
        });
        if (response.data.success) {
          await fetchQuotations();
          await fetchAvailableEstimations();
          handleClose();
        } else {
          setError(response.data.message || 'Failed to create quotation');
        }
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      setError(error.response?.data?.message || 'Failed to save quotation');
    }
  };

  const handleDelete = async (quotation) => {
    const confirmMessage = `Are you sure you want to delete this quotation?\n\nCase: ${quotation.case_number}\nQuotation: ${quotation.quotation_id}\nClient: ${quotation.client_name}\n\nNote: This will permanently delete the quotation. You can create a new quotation from the estimation if needed.`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        setError('');

        // Use the enhanced quotation delete endpoint
        const response = await axios.delete(`${API_BASE_URL}/api/quotations/${quotation.id}`, {
          headers: getAuthHeaders()
        });

        if (response.data.success) {
          await fetchQuotations();
          await fetchAvailableEstimations();
          alert('Quotation deleted successfully.');
        } else {
          throw new Error(response.data.message || 'Failed to delete quotation');
        }
      } catch (error) {
        console.error('Error deleting quotation:', error);
        setError(`Error deleting quotation: ${error.response?.data?.message || error.message}. Please try again.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchDeletedStages = async () => {
    try {
      setLoading(true);
      // Get all quotation stage deletions
      const allDeletedStages = [];

      // Get recent quotations to check for deleted quotation stages
      const quotationsResponse = await axios.get(`${API_BASE_URL}/api/quotations`);
      if (quotationsResponse.data.success) {
        // For each quotation, check if its case has deleted quotation stages
        for (const quotationItem of quotationsResponse.data.data) {
          if (quotationItem.case_number) {
            try {
              const deletedStagesResponse = await axios.get(
                `${API_BASE_URL}/api/case-management/${quotationItem.case_number}/deleted-stages?stage=quotation`
              );
              if (deletedStagesResponse.data.success && deletedStagesResponse.data.data.length > 0) {
                allDeletedStages.push(...deletedStagesResponse.data.data.map(stage => ({
                  ...stage,
                  case_number: quotationItem.case_number,
                  project_name: quotationItem.project_name,
                  client_name: quotationItem.client_name,
                  last_state: stage.previous_state,
                  deleted_at: stage.deleted_at,
                  deleted_by_name: stage.deleted_by_name,
                  deletion_reason: stage.deletion_reason
                })));
              }
            } catch (err) {
              console.log(`No deleted quotation stages found for case ${quotationItem.case_number}`);
            }
          }
        }
      }

      setDeletedStages(allDeletedStages);
    } catch (error) {
      console.error('Error fetching deleted stages:', error);
      setError('Error fetching deleted quotation stages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecreateStage = async (deletedStage) => {
    const confirmMessage = `Recreate quotation stage for case: ${deletedStage.case_number}?\n\nThis will restore the quotation stage data and move the case back to quotation state.`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        const response = await axios.post(`${API_BASE_URL}/api/case-management/stage-backup/${deletedStage.id}/recreate`);

        if (response.data.success) {
          alert(`Quotation stage recreated successfully for case ${deletedStage.case_number}`);
          fetchDeletedStages();
          fetchQuotations();
        } else {
          throw new Error(response.data.message || 'Failed to recreate quotation stage');
        }
      } catch (error) {
        console.error('Error recreating quotation stage:', error);
        setError(`Error recreating quotation stage: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApproveQuotation = async (id) => {
    if (window.confirm('Are you sure you want to approve this quotation? This will automatically move the associated case to Order state, making it ready for production.')) {
      try {
        setError('');
        const response = await axios.post(`${API_BASE_URL}/api/quotations/enhanced/${id}/approve`, {}, {
          headers: getAuthHeaders()
        });
        if (response.data.success) {
          await fetchQuotations();

          // Show success message with case transition info
          if (response.data.data?.case_transitioned) {
            alert(`Quotation approved successfully! Case ${response.data.data.case_number} has been moved to Order state and is now ready for production.`);
          } else {
            alert(`Quotation approved successfully!`);
          }
        } else {
          setError(response.data.message || 'Failed to approve quotation');
        }
      } catch (error) {
        console.error('Error approving quotation:', error);
        setError(error.response?.data?.message || 'Failed to approve quotation');
      }
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      setError('');
      const response = await axios.put(`${API_BASE_URL}/api/quotations/enhanced/${id}/status`, {
        status: status
      }, {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        await fetchQuotations();
      } else {
        setError(response.data.message || `Failed to update status to ${status}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error.response?.data?.message || `Failed to update status to ${status}`);
    }
  };

  const handleSendQuotation = async (id) => {
    if (window.confirm('Send this quotation to the client?')) {
      await handleStatusUpdate(id, 'sent');
    }
  };

  const handleCreateQuotationFromEstimation = async (estimation) => {
    try {
      setError('');
      setLoading(true);

      // Create a new quotation based on the estimation data
      const quotationData = {
        estimation_id: estimation.id,
        client_state: estimation.client_state,
        notes: `Created from estimation ${estimation.estimation_id}`,
        lead_time_days: 30, // Default lead time
        terms_conditions: 'Standard terms and conditions apply',
        delivery_terms: 'FOB destination',
        payment_terms: '30 days net',
        warranty_terms: '1 year warranty'
      };

      const response = await axios.post(`${API_BASE_URL}/api/quotations/enhanced/create-from-estimation`, quotationData, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        // Refresh the quotations list to show the new quotation
        await fetchQuotations();
        // Open the newly created quotation for editing
        handleOpen(response.data.data);
      } else {
        setError(response.data.message || 'Failed to create quotation from estimation');
      }
    } catch (error) {
      console.error('Error creating quotation from estimation:', error);
      setError(error.response?.data?.message || 'Failed to create quotation from estimation');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEstimation = async (estimationId) => {
    if (window.confirm('Are you sure you want to approve this estimation?')) {
      try {
        setError('');
        setLoading(true);

        const response = await axios.post(`${API_BASE_URL}/api/estimations/${estimationId}/approve`, {}, {
          headers: getAuthHeaders()
        });

        if (response.data.success) {
          // Refresh the quotations list to update the estimation status
          await fetchQuotations();
        } else {
          setError(response.data.message || 'Failed to approve estimation');
        }
      } catch (error) {
        console.error('Error approving estimation:', error);
        setError(error.response?.data?.message || 'Failed to approve estimation');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRejectForRework = async (id) => {
    const reason = window.prompt('Please provide a reason for rejecting this quotation for rework:');
    if (reason !== null) { // User didn't cancel
      try {
        setError('');
        const response = await axios.put(`${API_BASE_URL}/api/quotations/enhanced/${id}/status`, {
          status: 'draft',
          rejection_reason: reason.trim() || 'Rejected for rework'
        }, {
          headers: getAuthHeaders()
        });
        if (response.data.success) {
          await fetchQuotations();
        } else {
          setError(response.data.message || 'Failed to reject quotation for rework');
        }
      } catch (error) {
        console.error('Error rejecting quotation for rework:', error);
        setError(error.response?.data?.message || 'Failed to reject quotation for rework');
      }
    }
  };

  // Rejection dialog handlers
  const handleOpenRejectionDialog = (quotationId) => {
    setRejectionQuotationId(quotationId);
    setRejectionReason('');
    setRejectionDialogOpen(true);
  };

  const handleCloseRejectionDialog = () => {
    setRejectionDialogOpen(false);
    setRejectionQuotationId(null);
    setRejectionReason('');
  };

  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    try {
      setError('');
      const response = await axios.put(`${API_BASE_URL}/api/quotations/enhanced/${rejectionQuotationId}/status`, {
        status: 'draft', // Set to draft so it can be edited and resubmitted
        rejection_reason: rejectionReason.trim()
      }, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        await fetchQuotations();
        handleCloseRejectionDialog();
        alert('Quotation rejected and returned to draft status for revision.');
      } else {
        setError(response.data.message || 'Failed to reject quotation');
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      setError(error.response?.data?.message || 'Failed to reject quotation');
    }
  };

  const handleGeneratePDF = async (quotationId, quotationNumber) => {
    try {
      setError('');
      const response = await axios.get(
        `${API_BASE_URL}/api/quotations/enhanced/${quotationId}/pdf`,
        { responseType: 'blob' }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation_${quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadBOM = async (quotation) => {
    try {
      setError('');
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/quotations/enhanced/${quotation.id}/bom`,
        {
          responseType: 'blob',
          headers: getAuthHeaders()
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BOM_${quotation.case_number || quotation.quotation_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error('Error downloading BOM:', error);
      setError('Failed to download BOM. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Item editing functions
  const handleAddItem = () => {
    setEditingItemIndex(-1); // Use -1 to indicate "add new item" mode
    setItemFormData({
      item_id: '',
      item_name: '',
      quantity: 1,
      unit: '',
      rate: 0,
      tax_percentage: 0
    });
  };

  const handleItemSelection = (itemId) => {
    const selectedItem = stockItems.find(item => item.id === itemId);
    if (selectedItem) {
      setItemFormData({
        ...itemFormData,
        item_id: itemId,
        item_name: selectedItem.item_name,
        unit: selectedItem.primary_unit || 'nos',
        rate: parseFloat(selectedItem.selling_price) || 0,
        tax_percentage: parseFloat(selectedItem.gst_rate) || 0
      });
    }
  };

  const handleEditItem = (index) => {
    const item = quotationItems[index];
    setEditingItemIndex(index);
    setItemFormData({
      item_id: item.item_id || '',
      item_name: item.item_name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'nos',
      rate: item.rate || 0,
      tax_percentage: item.tax_percentage || 0
    });
  };

  const handleSaveItem = () => {
    const newItem = {
      ...itemFormData,
      amount: calculateItemAmount(itemFormData.quantity, itemFormData.rate, 0) // No tax in simplified version
    };

    if (editingItemIndex !== null && editingItemIndex !== -1) {
      // Edit existing item
      const updatedItems = [...quotationItems];
      updatedItems[editingItemIndex] = { ...updatedItems[editingItemIndex], ...newItem };
      setQuotationItems(updatedItems);
    } else {
      // Add new item
      setQuotationItems([...quotationItems, { ...newItem, id: Date.now() }]);
    }

    setEditingItemIndex(null);
    setItemFormData({
      item_id: '',
      item_name: '',
      quantity: 1,
      unit: '',
      rate: 0,
      tax_percentage: 0
    });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = quotationItems.filter((_, i) => i !== index);
    setQuotationItems(updatedItems);
  };

  const calculateItemAmount = (quantity, rate) => {
    return quantity * rate;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_approval': return 'warning';
      case 'approved': return 'success';
      case 'sent': return 'info';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'error';
      case 'ready_for_quotation': return 'primary';
      default: return 'default';
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ padding: '24px 0' }}>
      {value === index && children}
    </div>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
            📝 Quotations Management
            <Typography component="span" variant="caption" sx={{ background: '#e3f2fd', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}>v{COMPONENT_VERSION}</Typography>
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage quotations linked to approved estimations and cases
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => {
              setShowDeletedStages(!showDeletedStages);
              if (!showDeletedStages) {
                fetchDeletedStages();
              }
            }}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: showDeletedStages ? '#f44336' : '#1976d2',
              color: showDeletedStages ? '#f44336' : '#1976d2',
              '&:hover': {
                borderColor: showDeletedStages ? '#d32f2f' : '#1565c0',
                backgroundColor: showDeletedStages ? 'rgba(244, 67, 54, 0.04)' : 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            {showDeletedStages ? 'Hide Deleted Quotation Stages' : 'View Deleted Quotation Stages'}
          </Button>
        </Box>
      </Box>

      {quotations.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          <strong>No quotations or approved estimations available.</strong>
          <br />
          This page shows:
          <br />
          • Approved estimations ready for quotation (with Create Quotation button)
          <br />
          • Existing quotations in all workflow stages
          <br />
          <br />
          📋 For submitted estimations awaiting approval, please visit the Estimations page.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: '16px',
            overflow: 'auto',
            maxHeight: '70vh',
            '& .MuiTable-root': {
              minWidth: { xs: 350, sm: 650, md: 900, lg: 1100 },
              tableLayout: 'auto'
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  whiteSpace: 'nowrap'
                }}>
                  Quotation No.
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', sm: 'table-cell' }
                }}>
                  Case No.
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', md: 'table-cell' }
                }}>
                  Est. No.
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5'
                }}>
                  Client
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', sm: 'table-cell' }
                }}>
                  Project
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', md: 'table-cell' }
                }}>
                  Assigned To
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5'
                }}>
                  Amount
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', lg: 'table-cell' }
                }}>
                  Profit %
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5'
                }}>
                  Status
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  backgroundColor: '#f5f5f5',
                  display: { xs: 'none', md: 'table-cell' }
                }}>
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    backgroundColor: '#f5f5f5',
                    position: 'sticky',
                    right: 0,
                    zIndex: 1,
                    boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={{ xs: 6, sm: 8, md: 10 }} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      📄 No quotations found. Create your first quotation!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={`${quotation.type || 'item'}-${quotation.id}`} hover>
                    {/* Quotation No - Always visible */}
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {quotation.quotation_id}
                      </Typography>
                    </TableCell>

                    {/* Case No - Hidden on mobile */}
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                        {quotation.case_number || 'N/A'}
                      </Typography>
                    </TableCell>

                    {/* Est No - Hidden on mobile and tablet */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {quotation.estimation_number || 'N/A'}
                      </Typography>
                    </TableCell>

                    {/* Client - Always visible */}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {quotation.client_name}
                        </Typography>
                        {/* Show additional info on mobile */}
                        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                          <Typography variant="caption" color="textSecondary">
                            Case: {quotation.case_number || 'N/A'}
                            {quotation.project_name && ` • ${quotation.project_name}`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Project - Hidden on mobile */}
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {quotation.project_name || 'N/A'}
                      </Typography>
                    </TableCell>

                    {/* Assigned To - Hidden on mobile and tablet */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Box>
                        <Typography variant="body2" color="primary" fontWeight={500}>
                          {quotation.created_by_name || quotation.assigned_to_name || 'Unassigned'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {quotation.created_by_role?.replace('-', ' ').toUpperCase() || quotation.assigned_to_role?.replace('-', ' ').toUpperCase() || 'TEAM MEMBER'}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Amount - Always visible */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }} noWrap>
                        ₹{(() => {
                          // Prefer grand_total only if it's not 0, otherwise use total_amount
                          const amount = (quotation.grand_total && parseFloat(quotation.grand_total) > 0)
                            ? quotation.grand_total
                            : quotation.total_amount || quotation.estimation_total || 0;
                          return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </Typography>
                    </TableCell>

                    {/* Profit % - Hidden on smaller screens */}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {(() => {
                        const pct = quotation.profit_percentage_calculated ?? quotation.profit_percentage;
                        if (pct === null || pct === undefined) {
                          return <Typography variant="body2" color="text.secondary" component="span">N/A</Typography>;
                        }
                        const num = Number(pct);
                        return (
                          <Chip
                            label={`${num.toFixed(2)}%`}
                            color={num < 10 ? 'error' : 'success'}
                            size="small"
                            sx={{ borderRadius: '6px', fontWeight: 500 }}
                          />
                        );
                      })()}
                    </TableCell>

                    {/* Status - Always visible */}
                    <TableCell>
                      <Box>
                        <Chip
                          label={quotation.status}
                          color={getStatusColor(quotation.status)}
                          size="small"
                          sx={{ borderRadius: '6px', fontWeight: 500 }}
                        />
                        {/* Show profit % on smaller screens where it's hidden */}
                        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                          {(() => {
                            const pct = quotation.profit_percentage_calculated ?? quotation.profit_percentage;
                            if (pct === null || pct === undefined) return null;
                            return (
                              <Typography variant="caption" color="textSecondary" noWrap>
                                Profit: {Number(pct).toFixed(2)}%
                              </Typography>
                            );
                          })()}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Date - Hidden on mobile and tablet */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" noWrap>
                        {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-IN') : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'white',
                        zIndex: 1,
                        boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Box display="flex" gap={0.25} flexWrap="wrap">
                        {/* Actions for estimations */}
                        {quotation.type === 'estimation' && (
                          <>
                            <IconButton
                              onClick={() => handleView(quotation)}
                              size="small"
                              title="View Estimation"
                              sx={{ color: '#1976d2', p: 0.5 }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>

                            {/* Create Quotation button - all estimations here are approved */}
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleCreateQuotationFromEstimation(quotation)}
                              sx={{
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                minWidth: 'auto',
                                backgroundColor: '#2e7d32',
                                '&:hover': {
                                  backgroundColor: '#1b5e20'
                                }
                              }}
                            >
                              Create Quotation
                            </Button>
                          </>
                        )}

                        {/* Actions for actual quotations */}
                        {quotation.type === 'quotation' && (
                          <>
                            <IconButton
                              onClick={() => handleView(quotation)}
                              size="small"
                              title="View"
                              sx={{ color: '#1976d2', p: 0.5 }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>

                            {/* PDF download */}
                            <IconButton
                              onClick={() => handleGeneratePDF(quotation.id, quotation.quotation_id)}
                              size="small"
                              title="PDF"
                              sx={{ color: '#2e7d32', p: 0.5 }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>

                            {/* Edit - for draft, pending_approval, approved, and rejected */}
                            {['draft', 'pending_approval', 'approved', 'rejected'].includes(quotation.status) && (
                              <IconButton
                                onClick={() => handleOpen(quotation)}
                                size="small"
                                title="Edit"
                                sx={{ color: '#ed6c02', p: 0.5 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}

                            {/* Submit for Approval - only for draft and rejected */}
                            {['draft', 'rejected'].includes(quotation.status) && (
                              <IconButton
                                onClick={() => handleStatusUpdate(quotation.id, 'pending_approval')}
                                size="small"
                                title={quotation.status === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}
                                sx={{ color: '#ff9800', p: 0.5 }}
                              >
                                <SendIcon fontSize="small" />
                              </IconButton>
                            )}

                            {/* Approve - only for pending_approval */}
                            {quotation.status === 'pending_approval' && (
                              <IconButton
                                onClick={() => handleApproveQuotation(quotation.id)}
                                size="small"
                                title="Approve"
                                sx={{ color: '#2e7d32', p: 0.5 }}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            )}

                            {/* Reject for Rework - only for pending_approval */}
                            {quotation.status === 'pending_approval' && (
                              <IconButton
                                onClick={() => handleRejectForRework(quotation.id)}
                                size="small"
                                title="Reject for Rework"
                                sx={{ color: '#ed6c02', p: 0.5 }}
                              >
                                <RejectForReworkIcon fontSize="small" />
                              </IconButton>
                            )}

                            {/* Send - only for approved */}
                            {quotation.status === 'approved' && (
                              <>
                                <IconButton
                                  onClick={() => handleSendQuotation(quotation.id)}
                                  size="small"
                                  title="Send"
                                  sx={{ color: '#1976d2', p: 0.5 }}
                                >
                                  <SendIcon fontSize="small" />
                                </IconButton>

                                {/* BOM Download - only for approved */}
                                <IconButton
                                  onClick={() => handleDownloadBOM(quotation)}
                                  size="small"
                                  title="Download BOM"
                                  sx={{ color: '#9c27b0', p: 0.5 }}
                                >
                                  <BomIcon fontSize="small" />
                                </IconButton>

                                {/* Customer Accepted - mark quotation as accepted to start production */}
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => {
                                    if (window.confirm('Mark this quotation as accepted by customer? This will move the case to Order state and make it ready for production.')) {
                                      handleStatusUpdate(quotation.id, 'accepted');
                                    }
                                  }}
                                  sx={{
                                    fontSize: '0.7rem',
                                    padding: '4px 8px',
                                    minWidth: 'auto',
                                    backgroundColor: '#2e7d32',
                                    '&:hover': {
                                      backgroundColor: '#1b5e20'
                                    }
                                  }}
                                >
                                  ✓ Customer Accepted
                                </Button>
                              </>
                            )}

                            {/* Accept - only for sent */}
                            {quotation.status === 'sent' && (
                              <IconButton
                                onClick={() => handleStatusUpdate(quotation.id, 'accepted')}
                                size="small"
                                title="Accept"
                                sx={{ color: '#2e7d32', p: 0.5 }}
                              >
                                <AcceptIcon fontSize="small" />
                              </IconButton>
                            )}

                            {/* Reject - only for sent */}
                            {quotation.status === 'sent' && (
                              <IconButton
                                onClick={() => handleOpenRejectionDialog(quotation.id)}
                                size="small"
                                title="Reject with Reason"
                                sx={{ color: '#d32f2f', p: 0.5 }}
                              >
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            )}

                            {/* Delete - only for draft and rejected */}
                            {['draft', 'rejected'].includes(quotation.status) && (
                              <IconButton
                                onClick={() => handleDelete(quotation)}
                                size="small"
                                title="Delete"
                                sx={{ color: '#d32f2f', p: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Deleted Quotation Stages Table */}
      {showDeletedStages && (
        <Box mt={4}>
          <Typography variant="h6" sx={{ mb: 2, color: '#f44336', fontWeight: 600 }}>
            🗑️ Deleted Quotation Stages
          </Typography>
          <TableContainer component={Paper} sx={{ border: '2px solid #ffebee' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#ffebee' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Case Number</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Last State</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Deleted By</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Deleted At</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedStages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="textSecondary">
                        No deleted quotation stages found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedStages.map((deletedStage) => (
                    <TableRow key={`deleted-stage-${deletedStage.id}`} sx={{ backgroundColor: '#fff5f5' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#d32f2f' }}>
                        {deletedStage.case_number}
                      </TableCell>
                      <TableCell>{deletedStage.project_name}</TableCell>
                      <TableCell>{deletedStage.client_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={deletedStage.last_state || 'N/A'}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: '#f44336', color: '#f44336' }}
                        />
                      </TableCell>
                      <TableCell>{deletedStage.deleted_by_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {deletedStage.deleted_at
                          ? new Date(deletedStage.deleted_at).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {deletedStage.deletion_reason || 'No reason provided'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleRecreateStage(deletedStage)}
                            sx={{
                              color: '#2e7d32',
                              '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.04)' }
                            }}
                            title="Recreate this quotation stage"
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.25rem',
          fontWeight: 700
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <AssignmentIcon />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Professional quotations for VTRIA Engineering Solutions
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="Basic Information" />
            {editingQuotation && <Tab label="Items" />}
            <Tab label="Terms & Conditions" />
            <Tab label="Additional Notes" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          {error && (
            <Box sx={{ p: 3, pb: 0 }}>
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {error}
              </Alert>
            </Box>
          )}

          {/* Warning for approved quotations */}
          {editingQuotation && editingQuotation.status === 'approved' && (
            <Box sx={{ p: 3, pb: 0 }}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <strong>Limited Edit Mode:</strong> This quotation is approved. You can only edit terms & conditions, delivery terms, payment terms, warranty terms, and internal notes. Pricing and estimation details are locked.
              </Alert>
            </Box>
          )}

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                📋 Quotation Details
              </Typography>

              <Grid container spacing={3}>
                {editingQuotation && quotationDetails ? (
                  // Show read-only case and estimation info when editing
                  <Grid item xs={12}>
                    <Card sx={{ p: 3, backgroundColor: '#f5f5f5', borderRadius: '12px' }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
                        📄 Quotation Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Quotation Number</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {editingQuotation.quotation_id}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Estimation Number</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {quotationDetails.estimation_number}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Project Name</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {quotationDetails.project_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Client</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {quotationDetails.client_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            ₹{parseFloat(quotationDetails.total_amount || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="textSecondary">Grand Total</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            ₹{parseFloat(quotationDetails.grand_total || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                ) : (
                  // Show estimation selector when creating new quotation
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Select Case & Estimation *</InputLabel>
                      <Select
                        value={formData.estimation_id}
                        onChange={(e) => handleEstimationChange(e.target.value)}
                        label="Select Case & Estimation *"
                        disabled={editingQuotation !== null}
                      >
                        <MenuItem value="">
                          <em>Select an estimation</em>
                        </MenuItem>
                        {availableEstimations.map((estimation) => (
                          <MenuItem key={estimation.id} value={estimation.id.toString()}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {estimation.case_number} → {estimation.estimation_id}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {estimation.project_name} ({estimation.client_name})
                              </Typography>
                              <Typography variant="caption" sx={{ ml: 1, color: '#2e7d32' }}>
                                ₹{estimation.total_final_price?.toLocaleString('en-IN')}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Client State"
                    value={formData.client_state}
                    onChange={(e) => setFormData({ ...formData, client_state: e.target.value })}
                    placeholder="Enter client state for tax calculation"
                    disabled={editingQuotation && editingQuotation.status === 'approved'}
                    InputProps={{
                      readOnly: editingQuotation && editingQuotation.status === 'approved'
                    }}
                    helperText={editingQuotation && editingQuotation.status === 'approved' ? 'Cannot modify client state for approved quotations' : ''}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Lead Time (Days)"
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })}
                    inputProps={{ min: 1 }}
                    disabled={editingQuotation && editingQuotation.status === 'approved'}
                    InputProps={{
                      readOnly: editingQuotation && editingQuotation.status === 'approved'
                    }}
                    helperText={editingQuotation && editingQuotation.status === 'approved' ? 'Cannot modify lead time for approved quotations' : ''}
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Items Tab - Only shown when editing */}
          {editingQuotation && (
            <TabPanel value={currentTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#1976d2' }}>
                    📦 Quotation Items
                  </Typography>
                  {editingQuotation.status !== 'approved' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddItem}
                      sx={{ borderRadius: '8px' }}
                    >
                      Add Item
                    </Button>
                  )}
                </Box>

                {editingItemIndex !== null && (
                  <Card sx={{ mb: 3, borderRadius: '12px', border: '2px solid #1976d2' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                        {editingItemIndex === -1 ? 'Add New Item' : 'Edit Item'}
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Item Name *</InputLabel>
                            <Select
                              value={itemFormData.item_id}
                              onChange={(e) => handleItemSelection(e.target.value)}
                              label="Item Name *"
                            >
                              {stockItems.map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.item_name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Quantity *"
                            type="number"
                            value={itemFormData.quantity}
                            onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 0 })}
                            inputProps={{ min: 0, step: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Unit"
                            value={itemFormData.unit}
                            InputProps={{
                              readOnly: true,
                            }}
                            sx={{
                              '& .MuiInputBase-input': {
                                backgroundColor: '#f5f5f5',
                                color: '#666',
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Rate (₹) *"
                            type="number"
                            value={itemFormData.rate}
                            InputProps={{
                              readOnly: true,
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{
                              '& .MuiInputBase-input': {
                                backgroundColor: '#f5f5f5',
                                color: '#666',
                              },
                            }}
                          />
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                          variant="contained"
                          onClick={handleSaveItem}
                          disabled={!itemFormData.item_id || !itemFormData.quantity || !itemFormData.rate}
                        >
                          {editingItemIndex !== null && editingItemIndex !== -1 ? 'Update Item' : 'Add Item'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => setEditingItemIndex(null)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {quotationItems.length > 0 ? (
                  <TableContainer component={Paper} sx={{ borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Rate (₹)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Tax %</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Amount (₹)</TableCell>
                          {editingQuotation.status !== 'approved' && (
                            <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quotationItems.map((item, index) => (
                          <TableRow key={`quotation-item-${item.id || item.item_name || 'item'}-${index}`}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item.item_name}
                              </Typography>
                              {item.hsn_code && (
                                <Typography variant="caption" color="textSecondary">
                                  HSN: {item.hsn_code}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {item.quantity} {item.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {item.tax_percentage}%
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                                ₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            {editingQuotation.status !== 'approved' && (
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditItem(index)}
                                    sx={{ color: '#ed6c02' }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveItem(index)}
                                    sx={{ color: '#d32f2f' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    No items found for this quotation. {editingQuotation.status !== 'approved' && 'Click "Add Item" to get started.'}
                  </Alert>
                )}
              </Box>
            </TabPanel>
          )}

          <TabPanel value={currentTab} index={editingQuotation ? 2 : 1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                📝 Terms & Conditions
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Terms & Conditions"
                    multiline
                    rows={3}
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Delivery Terms"
                    multiline
                    rows={3}
                    value={formData.delivery_terms}
                    onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    multiline
                    rows={3}
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Warranty Terms"
                    multiline
                    rows={3}
                    value={formData.warranty_terms}
                    onChange={(e) => setFormData({ ...formData, warranty_terms: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={editingQuotation ? 3 : 2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
                📄 Additional Information
              </Typography>

              <TextField
                fullWidth
                label="Internal Notes"
                multiline
                rows={6}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any internal notes, special considerations, or additional information..."
                variant="outlined"
              />
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{ borderRadius: '8px', px: 3 }}
          >
            Cancel
          </Button>

          {editingQuotation && editingQuotation.status === 'draft' && (
            <Button
              onClick={async () => {
                await handleSubmit();
                if (editingQuotation) {
                  await handleStatusUpdate(editingQuotation.id, 'pending_approval');
                }
              }}
              variant="contained"
              color="warning"
              sx={{ borderRadius: '8px', px: 3 }}
              startIcon={<EmailIcon />}
            >
              Submit for Approval
            </Button>
          )}

          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              borderRadius: '8px',
              px: 4,
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            }}
          >
            {editingQuotation ? 'Update Quotation' : 'Create Quotation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={handleViewClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <ViewIcon />
            <Box>
              <Typography variant="h6">
                Quotation Details: {viewDialog.quotation?.quotation_id}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Complete quotation information and preview
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          {/* Display rejection reason if exists */}
          {viewDialog.quotation?.rejection_reason && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: '8px' }}>
              <AlertTitle>Rejection Reason</AlertTitle>
              <Typography variant="body2">
                {viewDialog.quotation.rejection_reason}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
                This quotation was rejected and returned to draft status for revision.
              </Typography>
            </Alert>
          )}

          {viewDialog.quotation && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="primary" />
                    Client Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Company"
                        secondary={viewDialog.quotation.client_name}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Project"
                        secondary={viewDialog.quotation.project_name}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Case Number"
                        secondary={viewDialog.quotation.case_number}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon color="primary" />
                    Financial Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Total Amount"
                        secondary={`₹${viewDialog.quotation.grand_total?.toLocaleString('en-IN') || '0'}`}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Status"
                        secondary={null}
                      />
                      <Chip
                        label={viewDialog.quotation.status}
                        color={getStatusColor(viewDialog.quotation.status)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Valid Until"
                        secondary={viewDialog.quotation.valid_until ?
                          new Date(viewDialog.quotation.valid_until).toLocaleDateString('en-IN') : 'N/A'}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentIcon color="primary" />
                    Terms & Conditions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Terms & Conditions:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.terms_conditions || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Delivery Terms:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.delivery_terms || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Payment Terms:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.payment_terms || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Warranty Terms:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {viewDialog.quotation.warranty_terms || 'Not specified'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={handleViewClose} variant="outlined">
            Close
          </Button>
          <Button
            onClick={() => handleOpen(viewDialog.quotation)}
            variant="contained"
            startIcon={<EditIcon />}
          >
            Edit Quotation
          </Button>
          <Button
            onClick={() => handleGeneratePDF(viewDialog.quotation?.id, viewDialog.quotation?.quotation_id)}
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onClose={handleCloseRejectionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Quotation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this quotation. The quotation will be returned to draft status for revision.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter the reason for rejection..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectionDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRejection}
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim()}
          >
            Reject & Return to Draft
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuotationsEnhanced;