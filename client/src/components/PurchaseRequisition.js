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
  Tooltip,
  Tab,
  Tabs,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Send as SubmitIcon,
  Delete as DeleteIcon,
  Cancel as RejectIcon,
  Assignment as AssignmentIcon,
  GetApp as DownloadIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const PurchaseRequisition = () => {
  const [tabValue, setTabValue] = useState(0);
  const [requisitions, setRequisitions] = useState([]);
  const [openQuotations, setOpenQuotations] = useState([]);
  const [openEstimations, setOpenEstimations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function for auth headers
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('vtria_token') || 'demo-token'}`
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [independentPRDialogOpen, setIndependentPRDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Selected data
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [requisitionNotes, setRequisitionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [editableItems, setEditableItems] = useState([]);
  const [independentItems, setIndependentItems] = useState([]);
  const [isEstimationBased, setIsEstimationBased] = useState(false);
  const [estimationData, setEstimationData] = useState(null);

  useEffect(() => {
    fetchData();

    // Check if we came from an estimation
    const estimationData = localStorage.getItem('estimationForPR');
    if (estimationData) {
      try {
        const parsedData = JSON.parse(estimationData);
        if (parsedData.type === 'estimation-based' && parsedData.items && parsedData.estimationData) {
          // Set estimation-based flag and store data
          setIsEstimationBased(true);
          setEstimationData(parsedData);

          // Pre-populate the PR dialog with estimation items
          const estimationInfo = parsedData.estimationData;
          setRequisitionNotes(`Purchase requisition for estimation: ${estimationInfo.estimation_id || estimationInfo.id}`);

          // Items are already aggregated in handleCreateFromEstimation, just format for PR
          const formattedItems = parsedData.items.map(item => ({
            product_id: item.product_id,
            item_name: item.product_name,
            description: item.description || item.product_name || '',
            hsn_code: item.hsn_code || '',
            unit: item.unit || 'Nos',
            quantity: parseInt(item.quantity) || 1,
            estimated_price: parseFloat(item.estimated_price) || 0,
            notes: item.notes || '',
            specification: item.specification || '',
            urgency: 'normal'
          }));

          setIndependentItems(formattedItems);
          setIndependentPRDialogOpen(true);
        }

        // Clear the stored data after using it
        localStorage.removeItem('estimationForPR');
      } catch (error) {
        console.error('Error parsing estimation data:', error);
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRequisitions(),
        fetchOpenQuotations(),
        fetchOpenEstimations(),
        fetchSuppliers(),
        fetchProducts()
      ]);
    } catch (error) {
      setError('Error fetching data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequisitions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/purchase-requisition`);
      setRequisitions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
    }
  };

  const fetchOpenQuotations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/purchase-requisition/open-quotations-grouped`);
      setOpenQuotations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching open quotations:', error);
    }
  };

  const fetchOpenEstimations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/estimations`);
      // Filter for approved estimations that don't have purchase requisitions yet
      const estimations = response.data.data || [];
      const openEstimations = estimations.filter(est =>
        est.status === 'approved' &&
        !est.has_purchase_requisition
      );
      setOpenEstimations(openEstimations);
    } catch (error) {
      console.error('Error fetching open estimations:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vendors`);
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/inventory-enhanced/items/enhanced`);
      // Transform enhanced inventory items to match expected product format
      const transformedProducts = (response.data.data || []).map(item => ({
        id: item.id,
        name: item.item_name,
        description: item.description,
        make: item.brand,
        model: item.model_number,
        part_number: item.part_number,
        manufacturer: item.manufacturer,
        unit: item.primary_unit,
        hsn_code: item.specifications?.hsn_code || '',
        standard_cost: item.standard_cost,
        category: item.main_category_name,
        subcategory: item.sub_category_name,
        requires_serial_tracking: item.requires_serial_tracking,
        current_stock: item.current_stock,
        available_stock: item.available_stock,
        minimum_stock: item.minimum_stock
      }));
      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'sent': return 'primary';
      case 'responded': return 'info';
      case 'cancelled': return 'error';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const handleCreateFromQuotation = (quotation) => {
    // Clear any previous errors when opening dialog
    setError(null);
    setSelectedQuotation(quotation);
    // Initialize editable items with aggregated quantities (like Estimation display)
    setEditableItems(quotation.items.map(item => {
      // Calculate shortage: required quantity minus available stock
      const requiredQuantity = parseInt(item.total_quantity || item.quantity || 0);
      const availableStock = parseInt(item.available_stock || 0);
      const shortageQuantity = Math.max(0, requiredQuantity - availableStock);

      return {
        ...item,
        quantity: shortageQuantity > 0 ? shortageQuantity : requiredQuantity,
        original_quantity: requiredQuantity,
        available_stock: availableStock,
        shortage_quantity: shortageQuantity
      };
    }).filter(item => item.quantity > 0)); // Only include items with shortage or quantity > 0
    setCreateDialogOpen(true);
  };

  const handleCreateFromEstimation = async (estimation) => {
    try {
      setLoading(true);

      // Fetch detailed estimation data with items
      const response = await axios.get(`${API_BASE_URL}/api/estimation/${estimation.id}/details`);

      if (response.data.success) {
        const estimationDetails = response.data.data;

        // Process sections and items with aggregation (same logic as in Estimation.js)
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
                      source: `${section.heading || section.section_name} - ${subsection.subsection_name}`,
                      description: item.description || '',
                      hsn_code: item.hsn_code || '',
                      unit: item.unit || 'Nos'
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
                  source: `${section.heading || section.section_name}`,
                  description: item.description || '',
                  hsn_code: item.hsn_code || '',
                  unit: item.unit || 'Nos'
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
                notes: `From ${item.source}`,
                description: item.description,
                hsn_code: item.hsn_code,
                unit: item.unit
              });
            }
          }
        });

        // Convert map to array
        const aggregatedItems = Array.from(productMap.values());

        // Store estimation data in localStorage for the PR creation flow
        const estimationForPR = {
          estimationId: estimation.id,
          projectName: estimation.project_name,
          clientName: estimation.client_name,
          estimationData: estimation,
          items: aggregatedItems,
          type: 'estimation-based'
        };

        localStorage.setItem('estimationForPR', JSON.stringify(estimationForPR));

        // Navigate to PR creation with estimation context
        window.location.href = '/vtria-erp/purchase-requisition';
      } else {
        setError('Failed to fetch estimation details');
      }
    } catch (error) {
      console.error('Error fetching estimation details:', error);
      setError('Failed to fetch estimation details. Please try again.');
    } finally {
      setLoading(false);
    }
  }; const handleCreateIndependentPR = () => {
    // Clear any previous errors when opening dialog
    setError(null);
    setIsEstimationBased(false);
    setIndependentItems([{
      product_id: null,
      item_name: '',
      description: '',
      hsn_code: '',
      unit: 'Nos',
      quantity: 1,
      estimated_price: 0,
      notes: ''
    }]);
    setIndependentPRDialogOpen(true);
  };

  const handleCreateFromLowStock = () => {
    // Clear any previous errors
    setError(null);

    // Filter products that are below minimum stock
    const lowStockItems = products.filter(product =>
      parseFloat(product.available_stock || 0) <= parseFloat(product.minimum_stock || 0)
    ).map(product => ({
      product_id: product.id,
      item_name: product.name,
      description: product.description,
      hsn_code: product.hsn_code || '',
      unit: product.unit || 'Nos',
      quantity: Math.max(1, parseFloat(product.minimum_stock || 1) - parseFloat(product.available_stock || 0)),
      estimated_price: product.standard_cost || 0,
      notes: `Low stock item - Current: ${product.available_stock || 0}, Min: ${product.minimum_stock || 0}`
    }));

    if (lowStockItems.length === 0) {
      setError('No items are currently below minimum stock levels.');
      return;
    }

    setIsEstimationBased(false);
    setIndependentItems(lowStockItems);
    setIndependentPRDialogOpen(true);
  };

  const handleCreateRequisition = async () => {
    try {
      // Clear any previous errors
      setError(null);

      if (!selectedQuotation) {
        setError('Please select a quotation');
        return;
      }

      if (!selectedSupplier) {
        setError('Please select a supplier');
        return;
      }

      // Prepare items with custom quantities
      const customItems = editableItems.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity
      }));

      const response = await axios.post(`${API_BASE_URL}/api/purchase-requisition/from-quotation`, {
        quotation_id: selectedQuotation.quotation_id,
        supplier_id: selectedSupplier,
        notes: requisitionNotes,
        items: customItems
      });

      // Close dialog and reset form on successful creation
      setCreateDialogOpen(false);
      setSelectedQuotation(null);
      setSelectedSupplier('');
      setRequisitionNotes('');
      setEditableItems([]);

      // Refresh data
      await fetchRequisitions();
      await fetchOpenQuotations(); // Refresh to remove created quotation from list

      console.log('Purchase requisition created successfully:', response.data);
    } catch (error) {
      console.error('Error creating requisition:', error);
      setError(error.response?.data?.message || 'Error creating purchase requisition');
    }
  };

  const handleCreateIndependentRequisition = async () => {
    try {
      // Clear any previous errors
      setError(null);

      if (!selectedSupplier) {
        setError('Please select a supplier');
        return;
      }

      if (independentItems.length === 0 || independentItems.some(item => !item.item_name || item.quantity <= 0)) {
        setError('Please add at least one valid item');
        return;
      }

      let response;

      if (isEstimationBased) {
        // For estimation-based PR, use the from-case endpoint with estimation_id
        response = await axios.post(`${API_BASE_URL}/api/purchase-requisition/from-case`, {
          estimation_id: estimationData?.estimationId || null,
          case_id: estimationData?.estimationData?.case_id || null,
          quotation_id: null, // Explicitly set to null for estimation-based PRs
          supplier_id: selectedSupplier,
          notes: requisitionNotes || '',
          items: independentItems.map(item => ({
            product_id: item.product_id || null,
            quantity: item.quantity || 0,
            estimated_price: item.estimated_price || 0,
            notes: item.notes || '',
            item_name: item.item_name || '',
            description: item.description || '',
            hsn_code: item.hsn_code || '',
            unit: item.unit || 'Nos'
          }))
        });
      } else {
        // For independent PR, use the independent endpoint
        response = await axios.post(`${API_BASE_URL}/api/purchase-requisition/independent`, {
          supplier_id: selectedSupplier,
          notes: requisitionNotes,
          items: independentItems
        });
      }

      // Close dialog and reset form on successful creation
      setIndependentPRDialogOpen(false);
      setSelectedSupplier('');
      setRequisitionNotes('');
      setIndependentItems([]);

      // Clear estimation data if it was estimation-based
      if (isEstimationBased) {
        localStorage.removeItem('estimationForPR');
        setIsEstimationBased(false);
        setEstimationData(null);
      }

      // Refresh data
      await fetchRequisitions();

      console.log('Purchase requisition created successfully:', response.data);
    } catch (error) {
      console.error('Error creating independent requisition:', error);
      setError(error.response?.data?.message || 'Error creating independent purchase requisition');
    }
  };

  const handleViewRequisition = (requisition) => {
    setSelectedRequisition(requisition);
    setViewDialogOpen(true);
  };

  const handleEditRequisition = async (requisition) => {
    try {
      setLoading(true);

      // Fetch full PR details including items
      const response = await axios.get(`${API_BASE_URL}/api/purchase-requisition/${requisition.id}`);
      const prData = response.data.data;

      setSelectedRequisition(prData);
      setSelectedSupplier(prData.supplier_id || '');
      setRequisitionNotes(prData.notes || '');

      // Set editable items from existing PR items
      setEditableItems(prData.items.map(item => {
        // Handle both new format (separate fields) and old format (everything in notes)
        let item_name = item.item_name || item.product_name;
        let description = item.description || '';
        let hsn_code = item.hsn_code || '';
        let unit = item.unit || 'Nos';
        let notes = item.notes || '';

        // If item_name is still empty and we have notes in old format, parse it
        if ((!item_name || item_name === 'Unknown Item') && notes) {
          // Parse old format: "Item Name - Description (HSN: XXX, Unit: XXX)"
          // Handle various formats including extra spaces
          const notesMatch = notes.match(/^(.+?)\s*-\s*(.+?)\s*\(HSN:\s*(.+?),\s*Unit:\s*(.+?)\)$/);
          if (notesMatch) {
            item_name = notesMatch[1].trim();
            description = notesMatch[2].trim();
            hsn_code = notesMatch[3].trim();
            unit = notesMatch[4].trim();
            notes = ''; // Clear notes since we parsed the data
          } else {
            // Try alternative format: "Item Name - (HSN: XXX, Unit: XXX)"
            const altMatch = notes.match(/^(.+?)\s*-\s*\(HSN:\s*(.+?),\s*Unit:\s*(.+?)\)$/);
            if (altMatch) {
              item_name = altMatch[1].trim();
              description = '';
              hsn_code = altMatch[2].trim();
              unit = altMatch[3].trim();
              notes = '';
            } else {
              // Fallback: just use the notes as item name if parsing fails
              item_name = notes;
            }
          }
        }

        return {
          id: item.id,
          item_name: item_name || 'Unknown Item',
          description: description,
          quantity: item.quantity,
          estimated_price: item.estimated_price,
          unit: unit,
          notes: notes,
          hsn_code: hsn_code,
          product_id: item.product_id
        };
      }));

      setEditDialogOpen(true);
    } catch (error) {
      console.error('Error loading PR details:', error);
      setError('Error loading purchase requisition details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequisition = async () => {
    if (!selectedRequisition || !selectedSupplier) {
      setError('Please select a supplier');
      return;
    }

    if (editableItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      setLoading(true);

      // Update the purchase requisition
      await axios.put(`${API_BASE_URL}/api/purchase-requisition/${selectedRequisition.id}`, {
        supplier_id: selectedSupplier,
        notes: requisitionNotes,
        items: editableItems.map(item => ({
          id: item.id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          estimated_price: parseFloat(item.estimated_price) || 0,
          unit: item.unit,
          notes: item.notes,
          hsn_code: item.hsn_code,
          product_id: item.product_id
        }))
      });

      setEditDialogOpen(false);
      setSelectedRequisition(null);
      setSelectedSupplier('');
      setRequisitionNotes('');
      setEditableItems([]);
      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      setError(error.response?.data?.message || 'Error updating purchase requisition');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status, reason = null) => {
    try {
      await axios.put(`${API_BASE_URL}/api/purchase-requisition/${id}/status`, {
        status,
        rejection_reason: reason
      }, { headers: authHeaders() });
      fetchRequisitions();
      // Refresh open quotations when PR is rejected (makes quotation available again)
      if (status === 'rejected') {
        await fetchOpenQuotations();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Error updating requisition status');
    }
  };

  const handleReject = (requisition) => {
    setSelectedRequisition(requisition);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedRequisition && rejectionReason.trim()) {
      handleUpdateStatus(selectedRequisition.id, 'rejected', rejectionReason);
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedRequisition(null);
    }
  };

  const handleReturnToDraft = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/purchase-requisition/${id}/status`, {
        status: 'draft',
        rejection_reason: null
      }, { headers: authHeaders() });
      fetchRequisitions();
    } catch (error) {
      console.error('Error returning to draft:', error);
      setError('Error returning requisition to draft status');
    }
  };

  const handleDelete = async (requisition) => {
    if (window.confirm(`Are you sure you want to delete requisition ${requisition.pr_number}?`)) {
      try {
        await axios.delete(`${API_BASE_URL}/api/purchase-requisition/${requisition.id}`);
        fetchRequisitions();
        // Refresh open quotations as the deleted PR's quotation should now reappear
        await fetchOpenQuotations();
      } catch (error) {
        console.error('Error deleting requisition:', error);
        setError('Error deleting requisition');
      }
    }
  };

  const handleDownloadPDF = async (prId, prNumber) => {
    try {
      setError('');

      // Generate PDF
      const response = await axios.get(`${API_BASE_URL}/api/purchase-requisition/${prId}/pdf`);

      if (response.data.success) {
        // Download the generated PDF
        const downloadUrl = `${API_BASE_URL}${response.data.downloadUrl}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        // Extract filename from the response
        const fileName = response.data.downloadUrl.split('/').pop();
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(response.data.message || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(error.response?.data?.message || 'Error downloading PDF');
    }
  };

  const handleSubmitForApproval = async (prId) => {
    if (window.confirm('Submit this purchase requisition for approval?')) {
      try {
        await axios.put(`${API_BASE_URL}/api/purchase-requisition/${prId}/status`, {
          status: 'pending_approval'
        });
        fetchRequisitions();
      } catch (error) {
        console.error('Error submitting PR for approval:', error);
        setError('Error submitting purchase requisition for approval');
      }
    }
  };

  const handleApprovePR = async (prId) => {
    if (window.confirm('Are you sure you want to approve this purchase requisition?')) {
      try {
        await axios.put(`${API_BASE_URL}/api/purchase-requisition/${prId}/status`, {
          status: 'approved'
        });
        fetchRequisitions();
        // Note: Approved PRs remain linked to quotations, so no need to refresh open quotations
      } catch (error) {
        console.error('Error approving PR:', error);
        setError('Error approving purchase requisition');
      }
    }
  };

  const updateEditableItemQuantity = (index, quantity) => {
    const updated = [...editableItems];
    updated[index].quantity = Math.max(0, parseInt(quantity) || 0);
    setEditableItems(updated);
  };

  const updateEditableItemField = (index, field, value) => {
    const updated = [...editableItems];
    updated[index][field] = value;
    setEditableItems(updated);
  };

  const removeEditableItem = (index) => {
    const updated = editableItems.filter((_, i) => i !== index);
    setEditableItems(updated);
  };

  const addNewEditableItem = () => {
    const newItem = {
      id: null, // New item, no ID
      item_name: '',
      description: '',
      quantity: 1,
      estimated_price: 0,
      unit: 'Nos',
      notes: '',
      hsn_code: '',
      product_id: null
    };
    setEditableItems([...editableItems, newItem]);
  };

  const addIndependentItem = () => {
    setIndependentItems([...independentItems, {
      product_id: null,
      item_name: '',
      description: '',
      hsn_code: '',
      unit: 'Nos',
      quantity: 1,
      estimated_price: 0,
      notes: ''
    }]);
  };

  const mergeOrAddItem = (newItem) => {
    const existingIndex = independentItems.findIndex(item =>
      item.product_id === newItem.product_id &&
      item.item_name === newItem.item_name &&
      item.estimated_price === newItem.estimated_price
    );

    if (existingIndex >= 0) {
      // Item exists, increase quantity
      const updated = [...independentItems];
      updated[existingIndex].quantity += newItem.quantity;
      setIndependentItems(updated);
    } else {
      // New item, add to list
      setIndependentItems([...independentItems, newItem]);
    }
  };

  const removeIndependentItem = (index) => {
    const updated = independentItems.filter((_, i) => i !== index);
    setIndependentItems(updated);
  };

  const updateIndependentItem = (index, field, value) => {
    const updated = [...independentItems];
    updated[index][field] = value;
    setIndependentItems(updated);
  };

  const selectProduct = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updated = [...independentItems];
      updated[index] = {
        ...updated[index],
        product_id: product.id,
        item_name: product.name,
        description: `${product.make} ${product.model}` || product.name,
        hsn_code: product.hsn_code || '',
        unit: product.unit || 'Nos',
        estimated_price: parseFloat(product.last_purchase_price) || 0
      };
      setIndependentItems(updated);
    }
  };

  const selectEditableProduct = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updated = [...editableItems];
      updated[index] = {
        ...updated[index],
        product_id: product.id,
        item_name: product.name,
        description: `${product.make} ${product.model}` || product.name,
        hsn_code: product.hsn_code || '',
        unit: product.unit || 'Nos',
        estimated_price: parseFloat(product.last_purchase_price) || 0
      };
      setEditableItems(updated);
    }
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'sufficient': return 'success';
      case 'partial': return 'warning';
      case 'none': return 'error';
      default: return 'default';
    }
  };

  const getStockStatusText = (stockStatus) => {
    if (!stockStatus) return 'Unknown';
    return `${stockStatus.available} avl, ${stockStatus.shortfall} short`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Purchase Requisitions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {openQuotations.length} quotations available for purchase requisition
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateIndependentPR}
          >
            Create Independent PR
          </Button>
          <Button
            variant="contained"
            startIcon={<WarningIcon />}
            onClick={handleCreateFromLowStock}
            sx={{ ml: 2 }}
          >
            Create PR from Low Stock
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`Requisitions (${requisitions.length})`} />
        <Tab label={`Open Quotations (${openQuotations.length})`} />
        <Tab label={`Open Estimations (${openEstimations.length})`} />
      </Tabs>

      {/* Requisitions List Tab */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>PR Number</strong></TableCell>
                <TableCell><strong>Case Number</strong></TableCell>
                <TableCell><strong>Supplier</strong></TableCell>
                <TableCell><strong>Items</strong></TableCell>
                <TableCell><strong>Total Value</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requisitions.map((requisition) => (
                <TableRow key={requisition.id}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {requisition.pr_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {requisition.case_number && (
                      <Chip label={requisition.case_number} size="small" color="primary" />
                    )}
                  </TableCell>
                  <TableCell>{requisition.supplier_name || 'Not assigned'}</TableCell>
                  <TableCell>{requisition.items_count || 0} items</TableCell>
                  <TableCell>
                    {requisition.total_value ? formatCurrency(requisition.total_value) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={requisition.status}
                      size="small"
                      color={getStatusColor(requisition.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(requisition.pr_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {/* View - always available */}
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handleViewRequisition(requisition)}
                          sx={{ color: '#1976d2', p: 0.5 }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* PDF Download - always available */}
                      <Tooltip title="Download PDF">
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadPDF(requisition.id, requisition.pr_number)}
                          sx={{ color: '#2e7d32', p: 0.5 }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Edit - only for draft */}
                      {requisition.status === 'draft' && (
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditRequisition(requisition)}
                            sx={{ color: '#ed6c02', p: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Submit for Approval - only for draft */}
                      {requisition.status === 'draft' && (
                        <Tooltip title="Submit for Approval">
                          <IconButton
                            size="small"
                            onClick={() => handleSubmitForApproval(requisition.id)}
                            sx={{ color: '#1976d2', p: 0.5 }}
                          >
                            <SubmitIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Approve - only for pending_approval */}
                      {requisition.status === 'pending_approval' && (
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            onClick={() => handleApprovePR(requisition.id)}
                            sx={{ color: '#2e7d32', p: 0.5 }}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Reject - only for pending_approval */}
                      {requisition.status === 'pending_approval' && (
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            onClick={() => handleReject(requisition)}
                            sx={{ color: '#d32f2f', p: 0.5 }}
                          >
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Return to Draft - only for rejected */}
                      {requisition.status === 'rejected' && (
                        <Tooltip title="Return to Draft">
                          <IconButton
                            size="small"
                            onClick={() => handleReturnToDraft(requisition.id)}
                            sx={{ color: '#ff9800', p: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Delete - only for draft */}
                      {requisition.status === 'draft' && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(requisition)}
                            sx={{ color: '#d32f2f', p: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {requisitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No purchase requisitions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Open Quotations Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Quotation</strong></TableCell>
                <TableCell><strong>Client & Case</strong></TableCell>
                <TableCell><strong>Project</strong></TableCell>
                <TableCell><strong>Items</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openQuotations.map((quotation, index) => (
                <TableRow key={`open-quotation-${quotation.quotation_number || quotation.id || 'item'}-${index}`}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {quotation.quotation_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={quotation.client_name} size="small" color="primary" />
                    {quotation.case_number && (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={quotation.case_number} size="small" color="secondary" variant="outlined" />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {quotation.project_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6" color="primary">
                      {quotation.total_items} items
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Total Qty: {quotation.items.reduce((sum, item) => sum + item.total_quantity, 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleCreateFromQuotation(quotation)}
                    >
                      Create PR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {openQuotations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No open quotations requiring purchase requisition found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Open Estimations Tab */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Estimation ID</strong></TableCell>
                <TableCell><strong>Project Name</strong></TableCell>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>Total Value</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openEstimations.map((estimation) => (
                <TableRow key={estimation.id}>
                  <TableCell>{estimation.estimation_id}</TableCell>
                  <TableCell>{estimation.project_name}</TableCell>
                  <TableCell>{estimation.client_name}</TableCell>
                  <TableCell>₹{parseFloat(estimation.total_final_price || 0).toLocaleString()}</TableCell>
                  <TableCell>{new Date(estimation.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleCreateFromEstimation(estimation)}
                    >
                      Create PR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {openEstimations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No approved estimations without purchase requisitions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Requisition Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Purchase Requisition</DialogTitle>
        <DialogContent>
          {selectedQuotation && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quotation: {selectedQuotation.quotation_number}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Client: {selectedQuotation.client_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Project: {selectedQuotation.project_name}
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Supplier</InputLabel>
                <Select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  label="Select Supplier"
                >
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.vendor_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={requisitionNotes}
                onChange={(e) => setRequisitionNotes(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Typography variant="h6" sx={{ mb: 2 }}>Items to be Purchased:</Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Total Qty</TableCell>
                      <TableCell align="center">PR Qty</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Stock Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editableItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {item.item_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {item.original_quantity || item.total_quantity}
                            </Typography>
                            {item.available_stock !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                Stock: {item.available_stock}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => updateEditableItemQuantity(index, e.target.value)}
                            sx={{ width: 80 }}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          {item.stock_status ? (
                            <Chip
                              label={getStockStatusText(item.stock_status)}
                              size="small"
                              color={getStockStatusColor(item.stock_status.status)}
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No stock data
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Note: Prices will be requested from the selected supplier
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRequisition} variant="contained">
            Create Purchase Requisition
          </Button>
        </DialogActions>
      </Dialog>

      {/* Independent PR Dialog */}
      <Dialog open={independentPRDialogOpen} onClose={() => setIndependentPRDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {isEstimationBased ? 'Create Purchase Requisition from Estimation' : 'Create Independent Purchase Requisition'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Supplier</InputLabel>
              <Select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                label="Select Supplier"
              >
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.vendor_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={requisitionNotes}
              onChange={(e) => setRequisitionNotes(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Items:</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addIndependentItem}
                size="small"
              >
                Add Item
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Select Product</TableCell>
                    <TableCell>Item Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>HSN Code</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Est. Price</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {independentItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Autocomplete
                          size="small"
                          options={products}
                          getOptionLabel={(option) => `${option.name} - ${option.make || 'N/A'} [Stock: ${option.available_stock || 0}]`}
                          value={products.find(p => p.id === item.product_id) || null}
                          onChange={(event, newValue) => {
                            if (newValue) {
                              selectProduct(index, newValue.id);
                            } else {
                              // Clear selection
                              updateIndependentItem(index, 'product_id', null);
                              updateIndependentItem(index, 'item_name', '');
                              updateIndependentItem(index, 'description', '');
                              updateIndependentItem(index, 'hsn_code', '');
                              updateIndependentItem(index, 'unit', 'Nos');
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select or type product"
                              size="small"
                              sx={{ minWidth: 200 }}
                            />
                          )}
                          freeSolo
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.item_name}
                          onChange={(e) => updateIndependentItem(index, 'item_name', e.target.value)}
                          placeholder="Item name"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.description}
                          onChange={(e) => updateIndependentItem(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.hsn_code}
                          onChange={(e) => updateIndependentItem(index, 'hsn_code', e.target.value)}
                          placeholder="HSN Code"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={item.unit}
                          onChange={(e) => updateIndependentItem(index, 'unit', e.target.value)}
                          sx={{ minWidth: 80 }}
                        >
                          <MenuItem value="Nos">Nos</MenuItem>
                          <MenuItem value="Kg">Kg</MenuItem>
                          <MenuItem value="Ltr">Ltr</MenuItem>
                          <MenuItem value="Mtr">Mtr</MenuItem>
                          <MenuItem value="Set">Set</MenuItem>
                          <MenuItem value="Box">Box</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => updateIndependentItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          sx={{ width: 80 }}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.estimated_price}
                          onChange={(e) => updateIndependentItem(index, 'estimated_price', parseFloat(e.target.value) || 0)}
                          sx={{ width: 100 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.notes}
                          onChange={(e) => updateIndependentItem(index, 'notes', e.target.value)}
                          placeholder="Notes"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeIndependentItem(index)}
                          disabled={independentItems.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {independentItems.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="right">
                        <Typography variant="h6">Total:</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary">
                          {formatCurrency(independentItems.reduce((sum, item) => {
                            const qty = parseInt(item.quantity) || 0;
                            const price = parseFloat(item.estimated_price) || 0;
                            return sum + (qty * price);
                          }, 0))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIndependentPRDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateIndependentRequisition} variant="contained">
            {isEstimationBased ? 'Create PR from Estimation' : 'Create Independent PR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View PR Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>View Purchase Requisition</DialogTitle>
        <DialogContent>
          {selectedRequisition && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">PR Number</Typography>
                  <Typography variant="body1">{selectedRequisition.pr_number}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedRequisition.status.replace('_', ' ').toUpperCase()}
                    size="small"
                    color={selectedRequisition.status === 'approved' ? 'success' :
                      selectedRequisition.status === 'pending_approval' ? 'warning' : 'default'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{new Date(selectedRequisition.pr_date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Supplier</Typography>
                  <Typography variant="body1">{selectedRequisition.supplier_name || 'N/A'}</Typography>
                </Grid>
                {selectedRequisition.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                    <Typography variant="body1">{selectedRequisition.notes}</Typography>
                  </Grid>
                )}
                {selectedRequisition.rejection_reason && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Rejection Reason</Typography>
                    <Typography variant="body1" color="error">{selectedRequisition.rejection_reason}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit PR Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Edit Purchase Requisition</DialogTitle>
        <DialogContent>
          {selectedRequisition && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Editing PR: {selectedRequisition.pr_number}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PR Number"
                    value={selectedRequisition.pr_number}
                    fullWidth
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Status"
                    value={selectedRequisition.status.replace('_', ' ').toUpperCase()}
                    fullWidth
                    disabled
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Supplier</InputLabel>
                <Select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  label="Select Supplier"
                >
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.vendor_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={requisitionNotes}
                onChange={(e) => setRequisitionNotes(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Typography variant="h6" sx={{ mb: 2 }}>Items:</Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Select Product</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>HSN Code</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Est. Price</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editableItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={products}
                            getOptionLabel={(option) => `${option.name} - ${option.make || 'N/A'} [Stock: ${option.available_stock || 0}]`}
                            value={products.find(p => p.id === item.product_id) || null}
                            onChange={(event, newValue) => {
                              if (newValue) {
                                selectEditableProduct(index, newValue.id);
                              } else {
                                // Clear selection
                                updateEditableItemField(index, 'product_id', null);
                                updateEditableItemField(index, 'item_name', '');
                                updateEditableItemField(index, 'description', '');
                                updateEditableItemField(index, 'hsn_code', '');
                                updateEditableItemField(index, 'unit', 'Nos');
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Select or type product"
                                size="small"
                                sx={{ minWidth: 200 }}
                              />
                            )}
                            freeSolo
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.item_name}
                            onChange={(e) => updateEditableItemField(index, 'item_name', e.target.value)}
                            sx={{ minWidth: 150 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.description}
                            onChange={(e) => updateEditableItemField(index, 'description', e.target.value)}
                            sx={{ minWidth: 150 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.hsn_code}
                            onChange={(e) => updateEditableItemField(index, 'hsn_code', e.target.value)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => updateEditableItemField(index, 'quantity', parseInt(e.target.value) || 0)}
                            sx={{ width: 80 }}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.estimated_price}
                            onChange={(e) => updateEditableItemField(index, 'estimated_price', parseFloat(e.target.value) || 0)}
                            sx={{ width: 100 }}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.unit}
                            onChange={(e) => updateEditableItemField(index, 'unit', e.target.value)}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.notes}
                            onChange={(e) => updateEditableItemField(index, 'notes', e.target.value)}
                            sx={{ minWidth: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeEditableItem(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button
                startIcon={<AddIcon />}
                onClick={addNewEditableItem}
                sx={{ mt: 2 }}
              >
                Add Item
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRequisition} variant="contained" disabled={loading}>
            {loading ? 'Updating...' : 'Update Purchase Requisition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Purchase Requisition</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRejectConfirm} variant="contained" color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseRequisition;