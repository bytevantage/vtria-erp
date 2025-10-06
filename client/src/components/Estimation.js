import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Send as SubmitIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Build as DesignIcon,
  Delete as DeleteIcon,
  ListAlt as BomIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  Cancel as RejectIcon,
  Undo as ReturnToDraftIcon,
  PictureAsPdf as PdfIcon,
  RequestQuote as QuoteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { api } from '../utils/api';
import EstimationDesigner from './EstimationDesigner';
import EstimationDetailView from './EstimationDetailView';

const API_BASE_URL = process.env.DOCKER_ENV === 'true'
  ? '' // Use proxy when in Docker (empty string means relative URLs)
  : (process.env.REACT_APP_API_URL || 'http://localhost:3001');

const Estimation = () => {
  const [estimations, setEstimations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    enquiry_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [editingEstimation, setEditingEstimation] = useState(null);
  const [selectedEstimation, setSelectedEstimation] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerEstimation, setDesignerEstimation] = useState(null);
  const [showDeletedCases, setShowDeletedCases] = useState(false);
  const [deletedCases, setDeletedCases] = useState([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingEstimation, setRejectingEstimation] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Vendor quote request states
  const [vendorQuoteDialogOpen, setVendorQuoteDialogOpen] = useState(false);
  const [selectedEstimationForQuote, setSelectedEstimationForQuote] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [quoteRequestForm, setQuoteRequestForm] = useState({
    items: [],
    selectedVendors: [],
    dueDate: '',
    notes: '',
    terms: ''
  });

  useEffect(() => {
    fetchEstimations();
    fetchAvailableEnquiries();

    // Check for URL parameters to open specific estimation
    const urlParams = new URLSearchParams(window.location.search);
    const estimationId = urlParams.get('id') || urlParams.get('estimationId');

    if (estimationId) {
      // If estimation ID is provided in URL, fetch and open it in designer
      handleDirectEstimationAccess(estimationId);
    } else {
      // Check if navigated from Case Dashboard
      const selectedCase = sessionStorage.getItem('selectedCase');
      if (selectedCase) {
        try {
          const caseData = JSON.parse(selectedCase);
          handleCaseNavigation(caseData);
          sessionStorage.removeItem('selectedCase');
        } catch (error) {
          console.error('Error parsing case data from session storage:', error);
        }
      }
    }
  }, []);

  const handleCaseNavigation = async (caseData) => {
    try {
      console.log('🔍 Navigating to case:', caseData);

      // URL encode the case number to handle forward slashes
      const encodedCaseNumber = encodeURIComponent(caseData.caseNumber);
      console.log('🌐 API URL (encoded):', `${API_BASE_URL}/api/estimations/by-case/${encodedCaseNumber}`);

      // Find estimation associated with this case
      const { data: response, error } = await api.get(`/api/estimations/by-case/${encodedCaseNumber}`);
      if (error) throw new Error(error);

      console.log('📡 API Response:', response);
      console.log('✅ Success:', response.success);
      console.log('📄 Has Data:', !!response.data);

      if (response.success && response.data) {
        const estimation = response.data;
        console.log('🎯 Found estimation:', estimation.estimation_id);
        // Open the estimation for editing
        setSelectedEstimation(estimation);
        setDesignerEstimation(estimation);
        setDesignerOpen(true);
      } else {
        console.log('❌ No estimation data found');
        // No estimation exists for this case yet, show a helpful message
        setError(`No estimation found for case ${caseData.caseNumber}. This case is ready for estimation - please create a new estimation from the available enquiries list below.`);
        // Refresh available enquiries to show the user options
        await fetchAvailableEnquiries();
      }
    } catch (error) {
      console.error('💥 Error loading case estimation:', error);
      console.error('Response:', error.response?.data);
      if (error.response && error.response.status === 404) {
        setError(`No estimation found for case ${caseData.caseNumber}. This case is ready for estimation - please create a new estimation from the available enquiries list below.`);
        await fetchAvailableEnquiries();
      } else {
        setError(`Error loading estimation for case ${caseData.caseNumber}: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleDirectEstimationAccess = async (estimationId) => {
    try {
      console.log('🔍 Loading estimation directly:', estimationId);
      setLoading(true);
      setError(null);

      let estimation = null;

      // First, try to fetch all estimations and find the matching one
      try {
        const response = await api.get(`/api/estimations`);
        if (response.success && response.data) {
          const estimations = response.data;

          // Try to find by numeric ID first
          estimation = estimations.find(e => e.id.toString() === estimationId);

          // If not found, try to find by estimation_id
          if (!estimation) {
            estimation = estimations.find(e => e.estimation_id === estimationId);
          }

          // If still not found, try case-insensitive search
          if (!estimation) {
            estimation = estimations.find(e =>
              e.estimation_id && e.estimation_id.toLowerCase() === estimationId.toLowerCase()
            );
          }
        }
      } catch (listError) {
        console.log('Failed to fetch estimation list, trying direct lookup');
      }

      // If we found the estimation, open it in designer
      if (estimation) {
        console.log('🎯 Found estimation:', estimation.estimation_id);

        // Open the estimation in designer
        setSelectedEstimation(estimation);
        setDesignerEstimation(estimation);
        setDesignerOpen(true);
      } else {
        console.log('❌ No estimation data found');
        setError(`Estimation with ID "${estimationId}" was not found. Please check the estimation ID and try again.`);
      }
    } catch (error) {
      console.error('💥 Error loading estimation:', error);
      setError(`Error loading estimation: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstimations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch actual estimation records from the API so we have numeric estimation IDs
      const response = await api.get(`/api/estimations`);

      if (response.success) {
        // The API already returns estimations in a usable shape; keep them as-is
        const estimationData = response.data.map(est => ({
          id: est.id,
          estimation_id: est.estimation_id,
          case_number: est.case_number,
          enquiry_id: est.enquiry_id,
          project_name: est.project_name,
          client_name: est.client_name,
          city: est.city,
          state: est.state,
          created_by_name: est.created_by_name,
          status: est.status || 'draft',
          total_final_price: est.total_final_price,
          date: est.date
        }));

        setEstimations(estimationData);
        // Don't set error for empty data - let the UI handle empty state gracefully
      } else {
        // Only set error for actual API failures, not empty data
        console.warn('API response not successful:', response);
        setEstimations([]); // Set empty array instead of error
      }
    } catch (error) {
      console.error('Error fetching estimations:', error);
      setError('Error connecting to server. Please check if the API is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEnquiries = async () => {
    try {
      const response = await api.get(`/api/sales-enquiries`);

      if (response.success) {
        // Get existing estimations to filter out enquiries that already have estimations
        const estimationsResponse = await api.get(`/api/estimations`);

        console.log('Estimations response:', estimationsResponse);

        const existingEstimations = estimationsResponse.success ? estimationsResponse.data : [];
        const estimatedEnquiryIds = existingEstimations.map(est => est.enquiry_id);

        console.log('Estimated enquiry IDs:', estimatedEnquiryIds);

        // Show only enquiries that:
        // 1. Are still in 'enquiry' case state (haven't progressed beyond estimation phase)
        // 2. Don't already have estimations created
        // 3. Have an active case status
        // 4. Have a valid case (case_state is not null)
        const availableEnquiries = response.data.filter(enquiry =>
          enquiry.case_state === 'enquiry' &&
          enquiry.case_status === 'active' &&
          !estimatedEnquiryIds.includes(enquiry.id) // Fix: compare enquiry database ID, not enquiry_id string
        );

        setEnquiries(availableEnquiries);
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setEnquiries([]); // Ensure enquiries is set to empty array on error
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'draft': 'default',
      'submitted': 'info',
      'approved': 'success',
      'rejected': 'error'
    };
    return statusColors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  const handleOpen = () => {
    setFormData({ enquiry_id: '' });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setEditingEstimation(null);
    setFormData({
      enquiry_id: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Only validate enquiry_id for new estimations, not when editing
      if (!editingEstimation && !formData.enquiry_id) {
        setError('Please select an enquiry');
        setLoading(false);
        return;
      }

      if (editingEstimation) {
        // Update existing estimation
        const response = await api.put(`/api/estimations/${editingEstimation.id}`, formData);

        if (response.success) {
          await fetchEstimations();
          await fetchAvailableEnquiries(); // Refresh enquiries list
          handleClose();
        } else {
          setError('Failed to update estimation');
        }
      } else {
        // Create new estimation
        const response = await api.post(`/api/estimations`, formData);

        if (response.success) {
          await fetchEstimations();
          await fetchAvailableEnquiries(); // Refresh enquiries list to remove the used enquiry
          handleClose();
        } else {
          setError(response.message || 'Failed to create estimation');
        }
      }
    } catch (error) {
      console.error('Error saving estimation:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Error saving estimation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewEstimation = (estimation) => {
    // Open detailed view dialog with full estimation details
    setSelectedEstimation(estimation);
    setViewDialogOpen(true);
  };

  const handleEditEstimation = (estimation) => {
    // Open edit form with estimation data
    setFormData({
      enquiry_id: estimation.enquiry_id,
      date: estimation.date.split('T')[0], // Format date for input
      notes: estimation.notes || ''
    });
    setEditingEstimation(estimation);
    setOpen(true);
  };

  const handleSubmitEstimation = async (estimationId) => {
    try {
      // Find the estimation to check its total value
      const estimation = estimations.find(est => est.id === estimationId);
      if (!estimation) {
        setError('Estimation not found');
        return;
      }

      // Validate that the estimation has a positive total value
      const totalValue = parseFloat(estimation.total_final_price) || 0;
      if (totalValue <= 0) {
        setError('Cannot submit estimation for approval. The estimation must have a positive total value. Please add items and calculate the total first.');
        return;
      }

      const { data: response, error } = await api.post(`/api/estimations/${estimationId}/submit`, {});
      if (error) throw new Error(error);
      await fetchEstimations();
    } catch (error) {
      console.error('Error submitting estimation:', error);
      setError('Failed to submit estimation');
    }
  };

  const handleDownloadPDF = async (estimationId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/estimation/${estimationId}/pdf`);

      if (response.success) {
        // Create download link
        const downloadUrl = `${API_BASE_URL}${response.downloadUrl}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `estimation_${estimationId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Error generating PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchaseRequisition = async (estimation) => {
    try {
      // Fetch detailed estimation data with items
      const response = await api.get(`/api/estimation/${estimation.id}/details`);

      if (response.success) {
        const estimationDetails = response.data;

        // Process sections and items into a flat structure for PR
        const rawItems = [];
        if (estimationDetails.sections && Array.isArray(estimationDetails.sections)) {
          estimationDetails.sections.forEach(section => {
            if (section.subsections && Array.isArray(section.subsections)) {
              section.subsections.forEach(subsection => {
                if (subsection.items && Array.isArray(subsection.items)) {
                  subsection.items.forEach(item => {
                    rawItems.push({
                      product_id: item.product_id,
                      product_name: item.item_name || item.product_name,
                      quantity: parseInt(item.quantity) || 0,
                      unit_price: item.quantity > 0 ? (parseFloat(item.final_price) / parseInt(item.quantity)) : 0,
                      total_price: parseFloat(item.final_price) || 0,
                      source: `${section.heading || section.section_name} - ${subsection.subsection_name}`
                    });
                  });
                }
              });
            }
            // Also handle direct items in sections
            if (section.items && Array.isArray(section.items)) {
              section.items.forEach(item => {
                rawItems.push({
                  product_id: item.product_id,
                  product_name: item.item_name || item.product_name,
                  quantity: parseInt(item.quantity) || 0,
                  unit_price: item.quantity > 0 ? (parseFloat(item.final_price) / parseInt(item.quantity)) : 0,
                  total_price: parseFloat(item.final_price) || 0,
                  source: `${section.heading || section.section_name}`
                });
              });
            }
          });
        }

        // Aggregate similar products (same product_id) with combined quantity and weighted average price
        const productMap = new Map();
        rawItems.forEach(item => {
          if (item.product_id && item.quantity > 0) {
            if (productMap.has(item.product_id)) {
              const existing = productMap.get(item.product_id);
              const newQuantity = existing.quantity + item.quantity;
              const newTotalPrice = existing.total_price + item.total_price;
              const newUnitPrice = newQuantity > 0 ? newTotalPrice / newQuantity : 0;

              productMap.set(item.product_id, {
                ...existing,
                quantity: newQuantity,
                estimated_price: newUnitPrice,
                total_price: newTotalPrice,
                notes: existing.notes + `, ${item.source}`
              });
            } else {
              productMap.set(item.product_id, {
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                estimated_price: item.unit_price,
                total_price: item.total_price,
                notes: `From ${item.source}`
              });
            }
          }
        });

        // Convert map to array
        const items = Array.from(productMap.values());

        // Store enhanced estimation data for cross-component communication
        localStorage.setItem('estimationForPR', JSON.stringify({
          estimationId: estimation.id,
          projectName: estimation.project_name,
          clientName: estimation.client_name,
          estimationData: estimation,
          items: items,
          type: 'estimation-based' // Indicate this is not independent
        }));

        // Navigate to purchase requisition page
        window.location.href = '/vtria-erp/purchase-requisition';
      }
    } catch (error) {
      console.error('Error fetching estimation details:', error);
      alert('Failed to fetch estimation details. Please try again.');
    }
  };

  const handleDownloadBomPDF = async (estimation) => {
    try {
      // Generate the BOM PDF using the documents controller (which uses hardcoded data for now)
      const generateResponse = await api.post(`/api/documents/bom/${estimation.id}/generate-pdf`, {});

      if (generateResponse.success && generateResponse.file_path) {
        // The PDF has been generated, now download it using the proper download endpoint
        const fileName = `bom_${estimation.id}.pdf`;
        const properFilename = generateResponse.filename || fileName;
        const documentId = generateResponse.document_id || `BOM_${estimation.id}`;

        // Use the download endpoint that sets proper Content-Disposition headers
        const downloadResponse = await fetch(`${API_BASE_URL}/api/documents/download/boms/${fileName}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`
          }
        });

        if (!downloadResponse.ok) {
          throw new Error('Failed to download PDF file');
        }

        // Convert to blob
        const blob = await downloadResponse.blob();

        // Create download link with proper blob URL using the document ID as filename
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = properFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('BOM PDF downloaded successfully');
      } else {
        throw new Error('Failed to generate BOM PDF');
      }
    } catch (error) {
      console.error('Error downloading BOM PDF:', error);
      alert('Failed to download BOM PDF. Please try again.');
    }
  };

  const handleApproveEstimation = async (estimationId) => {
    try {
      // Find the estimation to check its total value
      const estimation = estimations.find(est => est.id === estimationId);
      if (!estimation) {
        setError('Estimation not found');
        return;
      }

      // Validate that the estimation has a positive total value
      const totalValue = parseFloat(estimation.total_final_price) || 0;
      if (totalValue <= 0) {
        setError('Cannot approve estimation. The estimation must have a positive total value. Please add items and calculate the total first.');
        return;
      }

      const token = localStorage.getItem('vtria_token');
      await axios.post(`${API_BASE_URL}/api/estimations/${estimationId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchEstimations();
    } catch (error) {
      console.error('Error approving estimation:', error);
      setError('Failed to approve estimation');
    }
  };

  const handleRejectEstimation = (estimation) => {
    setRejectingEstimation(estimation);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingEstimation) return;

    try {
      const token = localStorage.getItem('vtria_token');
      await axios.post(`${API_BASE_URL}/api/estimations/${rejectingEstimation.id}/reject`, {
        reason: rejectionReason
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setRejectDialogOpen(false);
      setRejectingEstimation(null);
      setRejectionReason('');
      await fetchEstimations();
    } catch (error) {
      console.error('Error rejecting estimation:', error);
      setError('Failed to reject estimation');
    }
  };

  const handleReturnToDraft = async (estimationId) => {
    try {
      const token = localStorage.getItem('vtria_token');
      await axios.post(`${API_BASE_URL}/api/estimations/${estimationId}/return-to-draft`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchEstimations();
    } catch (error) {
      console.error('Error returning estimation to draft:', error);
      setError('Failed to return estimation to draft');
    }
  };

  // 🎯 VENDOR QUOTE REQUEST HANDLERS
  const handleRequestVendorQuotes = async (estimation) => {
    setSelectedEstimationForQuote(estimation);

    // Fetch vendors and estimation items
    try {
      setLoading(true);

      // Fetch vendors
      const vendorsResponse = await api.get('/api/vendors');
      if (vendorsResponse.success) {
        setVendors(vendorsResponse.data || []);
      }

      // Fetch estimation items
      const itemsResponse = await api.get(`/api/estimation/${estimation.id}/details`);
      if (itemsResponse.success) {
        const estimationDetails = itemsResponse.data;

        // Process sections and items with aggregation
        const rawItems = [];
        if (estimationDetails.sections) {
          estimationDetails.sections.forEach(section => {
            if (section.subsections) {
              section.subsections.forEach(subsection => {
                if (subsection.items) {
                  subsection.items.forEach(item => {
                    rawItems.push({
                      id: item.id,
                      product_id: item.product_id,
                      item_name: item.item_name || item.product_name,
                      quantity: parseInt(item.quantity) || 1,
                      unit_price: (parseFloat(item.final_price) || 0) / (parseInt(item.quantity) || 1),
                      total_price: parseFloat(item.final_price) || 0,
                      unit: 'NOS',
                      source: `${section.heading} - ${subsection.subsection_name}`,
                      stock_check_needed: true
                    });
                  });
                }
              });
            }
          });
        }

        // Aggregate similar products (same product_id)
        const productMap = new Map();
        rawItems.forEach(item => {
          if (item.product_id) {
            if (productMap.has(item.product_id)) {
              const existing = productMap.get(item.product_id);
              const newQuantity = existing.quantity + item.quantity;
              const newTotalPrice = existing.total_price + item.total_price;
              const newUnitPrice = newQuantity > 0 ? newTotalPrice / newQuantity : 0;

              productMap.set(item.product_id, {
                ...existing,
                quantity: newQuantity,
                estimated_price: newUnitPrice,
                total_price: newTotalPrice,
                section: existing.section + `, ${item.source}`,
                subsection: 'Multiple sections' // Indicate it's from multiple sources
              });
            } else {
              productMap.set(item.product_id, {
                id: item.id,
                product_id: item.product_id,
                item_name: item.item_name,
                quantity: item.quantity,
                estimated_price: item.unit_price,
                total_price: item.total_price,
                unit: item.unit,
                section: item.source,
                subsection: item.source,
                stock_check_needed: item.stock_check_needed
              });
            }
          }
        });

        // Convert map to array
        const items = Array.from(productMap.values());

        setQuoteRequestForm(prev => ({
          ...prev,
          items: items,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          notes: `Request for quotation based on estimation ${estimation.estimation_id} for project: ${estimation.project_name}`,
          terms: 'Please provide your best prices including delivery terms and lead time.'
        }));
      }

      setVendorQuoteDialogOpen(true);
    } catch (error) {
      console.error('Error preparing vendor quote request:', error);
      setError('Failed to prepare vendor quote request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVendorQuoteRequest = async () => {
    try {
      if (quoteRequestForm.selectedVendors.length === 0) {
        setError('Please select at least one vendor');
        return;
      }

      if (quoteRequestForm.items.length === 0) {
        setError('No items found for quote request');
        return;
      }

      setLoading(true);

      // Create vendor quote request
      const requestData = {
        estimation_id: selectedEstimationForQuote.id,
        vendor_ids: quoteRequestForm.selectedVendors,
        items: quoteRequestForm.items.map(item => ({
          estimation_item_id: item.id,
          product_id: item.product_id,
          item_name: item.item_name,
          quantity: item.quantity,
          estimated_price: item.estimated_price,
          unit: item.unit,
          notes: `${item.section} - ${item.subsection}`
        })),
        due_date: quoteRequestForm.dueDate,
        notes: quoteRequestForm.notes,
        terms_conditions: quoteRequestForm.terms
      };

      const response = await api.post('/api/purchase-price-comparison/quote-requests', requestData);

      if (response.success) {
        alert(`Vendor quote request sent successfully to ${quoteRequestForm.selectedVendors.length} vendors!`);
        setVendorQuoteDialogOpen(false);

        // Reset form
        setQuoteRequestForm({
          items: [],
          selectedVendors: [],
          dueDate: '',
          notes: '',
          terms: ''
        });
      }
    } catch (error) {
      console.error('Error submitting vendor quote request:', error);
      setError('Failed to submit vendor quote request');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDesigner = (estimation) => {
    setDesignerEstimation(estimation);
    setDesignerOpen(true);
  };

  const handleCloseDesigner = () => {
    setDesignerOpen(false);
    setDesignerEstimation(null);
    // Refresh estimations after designer closes
    fetchEstimations();
  };

  const handleDelete = async (estimation) => {
    const confirmMessage = `Are you sure you want to delete this estimation stage?\n\nCase: ${estimation.case_number}\nProject: ${estimation.project_name}\nClient: ${estimation.client_name}\n\nNote: This will only delete the estimation stage. The case ${estimation.case_number} will revert to the enquiry stage and can be re-estimated.`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);

        // Use stage-specific delete if case_number exists
        if (estimation.case_number) {
          const response = await axios.delete(`${API_BASE_URL}/api/case-management/${encodeURIComponent(estimation.case_number)}/stage`, {
            data: {
              reason: 'Estimation stage deleted from Estimation page',
              stage: 'estimation',
              stage_id: estimation.id
            }
          });

          if (response.success) {
            setError(null);
            fetchEstimations();
            alert(`Estimation stage deleted successfully. Case ${estimation.case_number} reverted to ${response.data.data.new_state} state. You can recreate the estimation stage if needed.`);
          } else {
            throw new Error(response.data.message || 'Failed to delete estimation stage');
          }
        } else {
          // Fallback to direct estimation delete for legacy records
          await axios.delete(`${API_BASE_URL}/api/estimations/${estimation.id}`);
          fetchEstimations();
          alert('Estimation deleted successfully.');
        }
      } catch (error) {
        console.error('Error deleting estimation:', error);
        setError(`Error deleting estimation: ${error.response?.data?.message || error.message}. Please try again.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchDeletedCases = async () => {
    try {
      setLoading(true);
      // Get all estimation stage deletions
      const allDeletedStages = [];

      // Get recent cases to check for deleted estimation stages
      const { data: estimationsResponse, error: estError2 } = await api.get(`/api/estimations`);
      if (estError2) throw new Error(estError2);
      if (estimationsResponse.data.success) {
        // For each estimation, check if its case has deleted estimation stages
        for (const estimationItem of estimationsResponse.data.data) {
          if (estimationItem.case_number) {
            try {
              const deletedStagesResponse = await axios.get(
                `${API_BASE_URL}/api/case-management/${encodeURIComponent(estimationItem.case_number)}/deleted-stages?stage=estimation`
              );
              if (deletedStagesResponse.data.success && deletedStagesResponse.data.data.length > 0) {
                allDeletedStages.push(...deletedStagesResponse.data.data.map(stage => ({
                  ...stage,
                  case_number: estimationItem.case_number,
                  project_name: estimationItem.project_name,
                  client_name: estimationItem.client_name,
                  last_state: stage.previous_state,
                  deleted_at: stage.deleted_at,
                  deleted_by_name: stage.deleted_by_name,
                  deletion_reason: stage.deletion_reason
                })));
              }
            } catch (err) {
              console.log(`No deleted estimation stages found for case ${estimationItem.case_number}`);
            }
          }
        }
      }

      setDeletedCases(allDeletedStages);
    } catch (error) {
      console.error('Error fetching deleted stages:', error);
      setError('Error fetching deleted estimation stages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecreateCase = async (deletedStage) => {
    const confirmMessage = `Recreate estimation stage for case: ${deletedStage.case_number}?\n\nThis will restore the estimation stage data and move the case back to estimation state.`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        const response = await axios.post(`${API_BASE_URL}/api/case-management/stage-backup/${deletedStage.id}/recreate`);

        if (response.success) {
          alert(`Estimation stage recreated successfully for case ${deletedStage.case_number}`);
          fetchDeletedCases();
          fetchEstimations();
        } else {
          throw new Error(response.data.message || 'Failed to recreate estimation stage');
        }
      } catch (error) {
        console.error('Error recreating estimation stage:', error);
        setError(`Error recreating estimation stage: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const workflowSteps = [
    'Sales Enquiry',
    'Estimation',
    'Purchase Requisition',
    'Quotation',
    'Sales Order',
    'Purchase Order',
    'Manufacturing',
    'Delivery'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Estimation - VTRIA Engineering Solutions</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => {
              setShowDeletedCases(!showDeletedCases);
              if (!showDeletedCases) {
                fetchDeletedCases();
              }
            }}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: showDeletedCases ? '#f44336' : '#1976d2',
              color: showDeletedCases ? '#f44336' : '#1976d2',
              '&:hover': {
                borderColor: showDeletedCases ? '#d32f2f' : '#1565c0',
                backgroundColor: showDeletedCases ? 'rgba(244, 67, 54, 0.04)' : 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            {showDeletedCases ? 'Hide Deleted Estimation Stages' : 'View Deleted Estimation Stages'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            disabled={enquiries.length === 0}
          >
            Create Estimation
          </Button>
        </Box>
      </Box>

      {/* Workflow Indicator */}
      <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            VTRIA ERP Workflow
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {workflowSteps.map((step, index) => (
              <Chip
                key={step}
                label={`${index + 1}. ${step}`}
                color={index === 1 ? 'primary' : 'default'}
                variant={index === 1 ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {loading && enquiries.length === 0 && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {!loading && estimations.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          <strong>No estimations available.</strong>
          <br />
          This page shows:
          <br />
          • Draft estimations in progress
          <br />
          • Submitted estimations awaiting approval
          <br />
          • Approved estimations ready for quotation
          <br />
          <br />
          📋 Create estimations from assigned sales enquiries to begin the estimation process.
          {enquiries.length > 0 && (
            <>
              <br /><br />
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpen}>
                Create First Estimation
              </Button>
            </>
          )}
        </Alert>
      )}

      {!loading && estimations.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estimation ID</TableCell>
                <TableCell>Case Number</TableCell>
                <TableCell>Enquiry ID</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Value</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {estimations.map((estimation) => (
                <TableRow key={estimation.id}>
                  <TableCell>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      {estimation.estimation_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" color="secondary">
                      {estimation.case_number || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="secondary">
                      {estimation.enquiry_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box component="div">
                        <Typography variant="body2" fontWeight="bold" component="span" display="block">
                          {estimation.client_name}
                        </Typography>
                      </Box>
                      <Box component="div">
                        <Typography variant="caption" color="text.secondary" component="span" display="block">
                          {estimation.city}, {estimation.state}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{estimation.project_name}</TableCell>
                  <TableCell>
                    <Box>
                      <Box component="div">
                        <Typography variant="body2" color="primary" fontWeight={500} component="span" display="block">
                          {estimation.created_by_name || 'Unassigned'}
                        </Typography>
                      </Box>
                      <Box component="div">
                        <Typography variant="caption" color="textSecondary" component="span" display="block">
                          DESIGNER
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={estimation.status}
                      color={getStatusColor(estimation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatCurrency(estimation.total_final_price)}</TableCell>
                  <TableCell>{new Date(estimation.date).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="primary" onClick={() => handleViewEstimation(estimation)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton size="small" color="secondary" onClick={() => handleDownloadPDF(estimation.id)}>
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Design Estimation">
                        <IconButton size="small" color="warning" onClick={() => handleOpenDesigner(estimation)}>
                          <DesignIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Create Purchase Requisition">
                        <IconButton size="small" color="info" onClick={() => handleCreatePurchaseRequisition(estimation)}>
                          <AssignmentIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={(!estimation.total_final_price || estimation.total_final_price <= 0) ? "BOM PDF requires total value > 0" : "Download BOM PDF"}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!estimation.total_final_price || estimation.total_final_price <= 0}
                            onClick={() => handleDownloadBomPDF(estimation)}
                          >
                            <BomIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {estimation.status === 'approved' && (
                        <Tooltip title="🎯 Request Vendor Quotes - Simple procurement workflow">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleRequestVendorQuotes(estimation)}
                            sx={{
                              bgcolor: 'success.light',
                              color: 'white',
                              '&:hover': { bgcolor: 'success.main' }
                            }}
                          >
                            <QuoteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'draft' && (
                        <Tooltip title="Edit Estimation">
                          <IconButton size="small" color="secondary" onClick={() => handleEditEstimation(estimation)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'draft' && (
                        <Tooltip title="Submit for Approval">
                          <IconButton size="small" color="info" onClick={() => handleSubmitEstimation(estimation.id)}>
                            <SubmitIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'submitted' && (
                        <Tooltip title="Approve">
                          <IconButton size="small" color="success" onClick={() => handleApproveEstimation(estimation.id)}>
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'submitted' && (
                        <Tooltip title="Reject">
                          <IconButton size="small" color="error" onClick={() => handleRejectEstimation(estimation)}>
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {estimation.status === 'rejected' && (
                        <Tooltip title="Return to Draft">
                          <IconButton size="small" color="warning" onClick={() => handleReturnToDraft(estimation.id)}>
                            <ReturnToDraftIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete Case">
                        <IconButton size="small" color="error" onClick={() => handleDelete(estimation)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Deleted Estimation Stages Table */}
      {showDeletedCases && (
        <Box mt={4}>
          <Typography variant="h6" sx={{ mb: 2, color: '#f44336', fontWeight: 600 }}>
            🗑️ Deleted Estimation Stages
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
                {deletedCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="textSecondary">
                        No deleted cases found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedCases.map((deletedCase, index) => (
                    <TableRow key={`deleted-case-${deletedCase.id || deletedCase.case_number}-${index}`} sx={{ backgroundColor: '#fff5f5' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#d32f2f' }}>
                        {deletedCase.case_number}
                      </TableCell>
                      <TableCell>{deletedCase.project_name}</TableCell>
                      <TableCell>{deletedCase.client_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={deletedCase.last_state || 'N/A'}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: '#f44336', color: '#f44336' }}
                        />
                      </TableCell>
                      <TableCell>{deletedCase.deleted_by_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {deletedCase.deleted_at
                          ? new Date(deletedCase.deleted_at).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={deletedCase.deletion_reason || 'No reason provided'}>
                          <Typography variant="body2" sx={{
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {deletedCase.deletion_reason || 'No reason provided'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Recreate this case with a new case number">
                            <IconButton
                              size="small"
                              onClick={() => handleRecreateCase(deletedCase)}
                              sx={{
                                color: '#2e7d32',
                                '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.04)' }
                              }}
                            >
                              <RestoreIcon />
                            </IconButton>
                          </Tooltip>
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

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            bgcolor: '#fafafa'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          padding: '28px 36px',
          borderBottom: 'none'
        }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              📊
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {editingEstimation ? 'Edit Estimation' : 'Create New Estimation'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {editingEstimation ? 'Update estimation details and notes' : 'Generate detailed cost estimations for client projects'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ padding: '0', backgroundColor: '#fafafa' }}>
          {error && (
            <Box sx={{ p: 4, pb: 0 }}>
              <Alert
                severity="error"
                sx={{
                  borderRadius: '16px',
                  border: '1px solid #ffcdd2',
                  backgroundColor: '#fff8f8'
                }}
              >
                {error}
              </Alert>
            </Box>
          )}
          <Box sx={{ p: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 4,
                color: '#2c3e50',
                fontWeight: 600,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              📋 Estimation Information
            </Typography>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e8eaed'
              }}
            >
              <Grid container spacing={4}>
                {/* Sales Enquiry Field - Only show when creating new estimation */}
                {!editingEstimation && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 2,
                          color: '#555',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        Sales Enquiry *
                      </Typography>
                      <FormControl fullWidth required variant="outlined">
                        <Select
                          value={formData.enquiry_id}
                          onChange={(e) => setFormData({ ...formData, enquiry_id: e.target.value })}
                          displayEmpty
                          sx={{
                            borderRadius: '16px',
                            backgroundColor: '#f8f9fa',
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#e0e7ff',
                                borderWidth: '2px'
                              },
                              '&:hover fieldset': {
                                borderColor: '#1976d2',
                                borderWidth: '2px'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#1976d2',
                                borderWidth: '2px'
                              }
                            }
                          }}
                        >
                          <MenuItem value="" disabled>
                            <em style={{ color: '#999', fontSize: '15px' }}>Select a sales enquiry</em>
                          </MenuItem>
                          {enquiries.map((enquiry) => (
                            <MenuItem key={enquiry.id} value={enquiry.id}>
                              <Box>
                                <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50' }}>
                                  {enquiry.enquiry_id} - {enquiry.client_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                  📋 {enquiry.project_name}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Grid>
                )}

                {/* Show enquiry info when editing */}
                {editingEstimation && (
                  <Grid item xs={12}>
                    <Box sx={{
                      backgroundColor: '#f0f8ff',
                      borderRadius: '16px',
                      p: 3,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      border: '2px solid #e3f2fd'
                    }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 2,
                          color: '#1976d2',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        📋 Associated Sales Enquiry
                      </Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ color: '#2c3e50', mb: 1 }}>
                        {editingEstimation?.enquiry_id || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Editing existing estimation - enquiry cannot be changed
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Notes Field */}
                <Grid item xs={12}>
                  <Box sx={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    p: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 2.5,
                        color: '#1976d2',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Notes (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any additional notes or requirements for this estimation..."
                      variant="outlined"
                      sx={{
                        borderRadius: '16px',
                        backgroundColor: '#f8f9fa',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          '& fieldset': {
                            borderColor: '#e0e7ff',
                            borderWidth: '2px'
                          },
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          padding: '24px 36px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e8eaed',
          gap: 3
        }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.8,
              borderColor: '#e0e7ff',
              color: '#666',
              fontSize: '1rem',
              borderWidth: '2px',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderWidth: '2px'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={22} color="inherit" /> : null}
            sx={{
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 700,
              px: 5,
              py: 1.8,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            📊 Create Estimation
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <EstimationDetailView
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        estimationId={selectedEstimation?.id}
      />

      {/* Estimation Designer Dialog */}
      <Dialog
        open={designerOpen}
        onClose={handleCloseDesigner}
        maxWidth="xl"
        fullWidth
        fullScreen
      >
        <DialogContent sx={{ p: 0 }}>
          {designerEstimation && (
            <EstimationDesigner
              estimation={designerEstimation}
              onClose={handleCloseDesigner}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reject Estimation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to reject estimation "{rejectingEstimation?.estimation_id}"?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason (Optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Provide a reason for rejection..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReject}
            color="error"
            variant="contained"
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🎯 VENDOR QUOTE REQUEST DIALOG - Simplified Procurement Workflow */}
      <Dialog
        open={vendorQuoteDialogOpen}
        onClose={() => setVendorQuoteDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <QuoteIcon color="success" />
            <Box>
              <Typography variant="h6" color="success.main">
                🎯 Request Vendor Quotes - Simplified Workflow
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedEstimationForQuote?.estimation_id} - {selectedEstimationForQuote?.project_name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>

            {/* Vendor Selection */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Select Vendors (Multiple)
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Choose Vendors</InputLabel>
                <Select
                  multiple
                  value={quoteRequestForm.selectedVendors}
                  onChange={(e) => setQuoteRequestForm(prev => ({
                    ...prev,
                    selectedVendors: e.target.value
                  }))}
                  label="Choose Vendors"
                >
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.name} - {vendor.city}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Due Date */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Quote Due Date
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={quoteRequestForm.dueDate}
                onChange={(e) => setQuoteRequestForm(prev => ({
                  ...prev,
                  dueDate: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Items List */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Items for Quotation ({quoteRequestForm.items.length} items)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Est. Price</TableCell>
                      <TableCell align="center">Stock Check</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quoteRequestForm.items.map((item, index) => (
                      <TableRow key={`quote-item-${item.id || index}-${item.item_name}`}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {item.item_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {item.section} - {item.subsection}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ₹{parseFloat(item.estimated_price || 0).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={item.stock_check_needed ? "Check" : "OK"}
                            color={item.stock_check_needed ? "warning" : "success"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Request Notes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={quoteRequestForm.notes}
                onChange={(e) => setQuoteRequestForm(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Additional requirements, specifications, or notes for vendors..."
              />
            </Grid>

            {/* Terms */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Terms & Instructions
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={quoteRequestForm.terms}
                onChange={(e) => setQuoteRequestForm(prev => ({
                  ...prev,
                  terms: e.target.value
                }))}
                placeholder="Terms and conditions for the quotation request..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setVendorQuoteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitVendorQuoteRequest}
            variant="contained"
            color="success"
            disabled={loading || quoteRequestForm.selectedVendors.length === 0}
            startIcon={<QuoteIcon />}
          >
            Send Quote Requests ({quoteRequestForm.selectedVendors.length} vendors)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Estimation;
