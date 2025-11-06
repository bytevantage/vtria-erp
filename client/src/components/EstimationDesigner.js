import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Fab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import IntelligentProductSelector from './IntelligentProductSelector';

const API_BASE_URL = '';

const EstimationDesigner = ({ estimation: estimationProp, onClose }) => {
  // State management
  const [estimation, setEstimation] = useState(estimationProp);
  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editingSubsection, setEditingSubsection] = useState(null);
  const [addItemDialog, setAddItemDialog] = useState({ open: false, subsectionId: null });

  // Form states
  const [newSectionName, setNewSectionName] = useState('');
  const [newSubsectionNames, setNewSubsectionNames] = useState({}); // Object to track subsection names by section ID
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [customDiscount, setCustomDiscount] = useState(0);

  // Intelligent product selection states
  const [intelligentSelectorOpen, setIntelligentSelectorOpen] = useState(false);
  const [currentSubsectionId, setCurrentSubsectionId] = useState(null);
  const [costOptimizationData, setCostOptimizationData] = useState(null);

  // Check if estimation is approved (read-only mode)
  const isApproved = estimation?.status === 'approved';

  useEffect(() => {
    // Run on mount and whenever the incoming prop changes. Avoid depending on local
    // `estimation` state because we update it inside fetchEstimationDetails which
    // caused a re-run loop.
    if (estimationProp) {
      // initialize local estimation state from prop
      setEstimation(estimationProp);
      fetchEstimationDetails();
      fetchProducts();
      fetchCategories();
      fetchCostOptimization();
    }
  }, [estimationProp]);

  const createDefaultSections = async () => {
    try {
      const defaultSections = ['Main Panel', 'Incoming', 'Outgoing'];
      
      for (const sectionName of defaultSections) {
        await axios.post(`${API_BASE_URL}/api/estimation/${estimation.id}/sections`, {
          section_name: sectionName
        });
      }
      
      // Refresh the estimation details after creating defaults
      await fetchEstimationDetails();
    } catch (error) {
      console.error('Error creating default sections:', error);
      setError('Failed to create default sections');
    }
  };

  const fetchEstimationDetails = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Determine what ID parameter to use - prefer numeric id for API calls
      let idParam = estimation.id ? estimation.id : null;

      // If numeric ID is not present, try to resolve it by querying the estimation list
      if (!idParam && estimation.estimation_id) {
        try {
          console.log('Numeric ID missing; attempting to resolve from estimation_id:', estimation.estimation_id);
          const listResp = await axios.get(`${API_BASE_URL}/api/estimation`);
          if (listResp.data.success && Array.isArray(listResp.data.data)) {
            const found = listResp.data.data.find(e => e.estimation_id === estimation.estimation_id || (e.estimation_id && e.estimation_id.toLowerCase() === estimation.estimation_id.toLowerCase()) || e.case_number === estimation.case_number);
            if (found) {
              idParam = found.id;
              console.log('Resolved numeric ID from list:', idParam);
              // update local estimation object to include numeric id for future calls
              setEstimation(found);
            }
          }
        } catch (listError) {
          console.warn('Failed to resolve numeric id from estimation list:', listError);
        }
      }

      if (!idParam) {
        setError('Invalid estimation reference. Missing numeric ID. The estimation object must have an "id" field or a resolvable estimation_id.');
        setLoading(false);
        return;
      }

      console.log('Fetching estimation details for ID:', idParam);
      const response = await axios.get(`${API_BASE_URL}/api/estimation/${idParam}/details`);

      if (response.data.success) {
        console.log('Estimation details fetched successfully:', response.data);
        const detailedEstimation = response.data.data;
        setEstimation(detailedEstimation);
        const sections = detailedEstimation.sections || [];
        setSections(sections);
        
        // If no sections exist, create default sections
        if (sections.length === 0) {
          setTimeout(() => createDefaultSections(), 500); // Small delay to avoid recursion
        }
      } else {
        console.error('API returned success:false', response.data);
        setError(response.data.message || 'Failed to load estimation details. The API returned an unsuccessful response.');

        // Fallback to basic estimation data
        setSections([]);
      }
    } catch (error) {
      console.error('Error fetching estimation details:', error);

      // Enhanced error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);

        setError(`Failed to load estimation details: ${error.response.data?.message || error.response.statusText || error.message}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        setError('Failed to load estimation details: No response received from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        setError(`Failed to load estimation details: ${error.message}`);
      }

      // Create empty sections as fallback
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/inventory-enhanced/items/enhanced`);
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/inventory-enhanced/categories/main`);
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCostOptimization = async () => {
    try {
      // This endpoint may not exist yet, so we'll skip it for now
      // const response = await axios.get(`${API_BASE_URL}/api/inventory-aware-estimation/cost-optimization/${estimation.id}`);
      // if (response.data.success) {
      //   setCostOptimizationData(response.data.data);
      // }
      setCostOptimizationData(null);
    } catch (error) {
      console.error('Error fetching cost optimization:', error);
      setCostOptimizationData(null);
    }
  };

  const handleIntelligentProductSelection = (subsectionId) => {
    console.log('Opening Intelligent Product Selection for subsection:', subsectionId);
    setCurrentSubsectionId(subsectionId);
    setIntelligentSelectorOpen(true);
  };

  const handleIntelligentProductSelect = async (productData) => {
    try {
      console.log('Adding intelligent product selection:', productData);
      console.log('Current subsection ID:', currentSubsectionId);

      const finalPrice = productData.selected_price * productData.quantity;

      const response = await axios.post(`${API_BASE_URL}/api/estimation/subsections/${currentSubsectionId}/items`, {
        product_id: productData.id,
        quantity: productData.quantity,
        mrp: productData.selling_price || productData.last_price || 0,
        discount_percentage: 0,
        discounted_price: productData.selected_price,
        final_price: finalPrice
      });

      if (response.data.success) {
        await fetchEstimationDetails();
        // Only fetch cost optimization if the endpoint exists
        try {
          await fetchCostOptimization();
        } catch (costOptError) {
          console.log('Cost optimization not available:', costOptError);
        }
        setIntelligentSelectorOpen(false);
        setCurrentSubsectionId(null);
        setError(null);
      }
    } catch (error) {
      console.error('Error adding intelligent product selection:', error);
      setError(error.response?.data?.message || 'Failed to add product to estimation');
    }
  };

  const handleSaveAndClose = async () => {
    try {
      // Note: Individual item changes are already auto-saved via other functions
      // This is just to ensure everything is saved and close gracefully
      setError(null);
      onClose();
    } catch (error) {
      console.error('Error saving estimation:', error);
      setError('Failed to save estimation. Please try again.');
    }
  };

  // Section management
  const addSection = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/estimation/${estimation.id}/sections`, {
        section_name: newSectionName || 'Main Panel'
      });

      if (response.data.success) {
        await fetchEstimationDetails();
        setNewSectionName('');
      }
    } catch (error) {
      setError('Failed to add section');
    }
  };

  const updateSectionName = async (sectionId, newName) => {
    try {
      await axios.put(`${API_BASE_URL}/api/estimation/sections/${sectionId}`, {
        section_name: newName
      });

      await fetchEstimationDetails();
      setEditingSection(null);
    } catch (error) {
      setError('Failed to update section name');
    }
  };

  const deleteSection = async (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section and all its subsections?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/estimation/sections/${sectionId}`);
        await fetchEstimationDetails();
      } catch (error) {
        setError('Failed to delete section');
      }
    }
  };

  // Subsection management
  const addSubsection = async (sectionId) => {
    try {
      const subsectionName = newSubsectionNames[sectionId] || '';
      console.log('Adding subsection:', { sectionId, name: subsectionName });

      if (!subsectionName.trim()) {
        setError('Please enter a subsection name');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/estimation/sections/${sectionId}/subsections`, {
        subsection_name: subsectionName.trim()
      });

      console.log('Subsection response:', response.data);

      if (response.data.success) {
        await fetchEstimationDetails();
        // Clear the subsection name for this specific section
        setNewSubsectionNames(prev => ({ ...prev, [sectionId]: '' }));
        setError(null);
      } else {
        setError(response.data.message || 'Failed to add subsection');
      }
    } catch (error) {
      console.error('Error adding subsection:', error);
      setError(error.response?.data?.message || 'Failed to add subsection');
    }
  };

  const updateSubsectionName = async (subsectionId, newName) => {
    try {
      await axios.put(`${API_BASE_URL}/api/estimation/subsections/${subsectionId}`, {
        subsection_name: newName
      });

      await fetchEstimationDetails();
      setEditingSubsection(null);
    } catch (error) {
      setError('Failed to update subsection name');
    }
  };

  const deleteSubsection = async (subsectionId) => {
    if (window.confirm('Are you sure you want to delete this subsection and all its items?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/estimation/subsections/${subsectionId}`);
        await fetchEstimationDetails();
      } catch (error) {
        setError('Failed to delete subsection');
      }
    }
  };

  // Item management
  const addItem = async () => {
    if (!selectedProduct || !itemQuantity) {
      setError('Please select a product and specify quantity');
      return;
    }

    try {
      setError(null); // Clear any previous errors
      
      let subsectionIdToUse = addItemDialog.subsectionId;
      
      // Check if this is a synthetic subsection ID (starts with "default-")
      if (String(addItemDialog.subsectionId).startsWith('default-')) {
        console.log('Detected synthetic subsection ID, creating real subsection first');
        
        // Extract section ID from synthetic ID (format: "default-{sectionId}")
        const sectionId = String(addItemDialog.subsectionId).replace('default-', '');
        console.log('Extracted section ID from synthetic ID:', sectionId);
        
        // Create a real subsection first
        const subsectionResponse = await axios.post(`${API_BASE_URL}/api/estimation/sections/${sectionId}/subsections`, {
          subsection_name: 'General',
          subsection_order: 1
        });
        
        if (subsectionResponse.data.success) {
          subsectionIdToUse = subsectionResponse.data.data.id;
          console.log('Created real subsection with ID:', subsectionIdToUse);
        } else {
          throw new Error('Failed to create subsection');
        }
      } else {
        console.log('Using real subsection ID:', subsectionIdToUse);
      }

      // Check for duplicate product in the same subsection
      const currentSubsection = sections.find(s => 
        s.subsections?.find(sub => sub.id == subsectionIdToUse)
      )?.subsections?.find(sub => sub.id == subsectionIdToUse);
      
      const existingItem = currentSubsection?.items?.find(item => 
        item.product_id == selectedProduct.id
      );

      const priceAfterVendorDiscount = selectedProduct.selling_price * (1 - (parseFloat(selectedProduct.vendor_discount || 0) / 100));

      if (existingItem) {
        // Update existing item - combine quantities and adjust discount
        const newQuantity = parseInt(existingItem.quantity) + parseInt(itemQuantity);
        const existingDiscount = parseFloat(existingItem.discount_percentage || 0);
        const newDiscount = ((existingDiscount * parseInt(existingItem.quantity)) + (customDiscount * parseInt(itemQuantity))) / newQuantity;
        const discountedPrice = priceAfterVendorDiscount * (1 - (newDiscount / 100));
        const finalPrice = discountedPrice * newQuantity;

        const response = await axios.put(`${API_BASE_URL}/api/estimation/items/${existingItem.id}`, {
          quantity: newQuantity,
          discount_percentage: newDiscount,
          discounted_price: discountedPrice,
          final_price: finalPrice
        });

        if (response.data.success) {
          await fetchEstimationDetails();
          setAddItemDialog({ open: false, subsectionId: null });
          setSelectedProduct(null);
          setItemQuantity(1);
          setCustomDiscount(0);
        }
        return; // Exit early for duplicate case
      }

      // Add new item
      const discountedPrice = priceAfterVendorDiscount * (1 - (customDiscount / 100));
      const finalPrice = discountedPrice * itemQuantity;

      const response = await axios.post(`${API_BASE_URL}/api/estimation/subsections/${subsectionIdToUse}/items`, {
        product_id: selectedProduct.id,
        quantity: itemQuantity,
        mrp: selectedProduct.selling_price * (1 - (parseFloat(selectedProduct.vendor_discount || 0) / 100)),
        discount_percentage: customDiscount,
        discounted_price: discountedPrice,
        final_price: finalPrice
      });

      if (response.data.success) {
        await fetchEstimationDetails();

        // Reset form and close dialog
        setAddItemDialog({ open: false, subsectionId: null });
        setSelectedProduct(null);
        setItemQuantity(1);
        setCustomDiscount(0);

        // Show success message (optional - could add a snackbar here)
        console.log('Item added successfully:', response.data.message);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setError(error.response?.data?.message || 'Failed to add item');
    }
  };

  const updateItemDiscount = async (itemId, newDiscount) => {
    try {
      await axios.put(`${API_BASE_URL}/api/estimation/items/${itemId}/discount`, {
        discount_percentage: newDiscount
      });

      await fetchEstimationDetails();
    } catch (error) {
      setError('Failed to update discount');
    }
  };

  const deleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/estimation/items/${itemId}`);
        await fetchEstimationDetails();
      } catch (error) {
        setError('Failed to delete item');
      }
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalMRP = 0;
    let totalFinalPrice = 0;
    let totalDiscount = 0;

    sections.forEach(section => {
      section.subsections?.forEach(subsection => {
        subsection.items?.forEach(item => {
          const mrp = parseFloat(item.mrp) || 0;
          const quantity = parseInt(item.quantity) || 0;
          const finalPrice = parseFloat(item.final_price) || 0;

          totalMRP += mrp * quantity;
          totalFinalPrice += finalPrice;
          totalDiscount += (mrp * quantity) - finalPrice;
        });
      });
    });

    return {
      totalMRP,
      totalFinalPrice,
      totalDiscount,
      discountPercentage: totalMRP > 0 ? (totalDiscount / totalMRP) * 100 : 0
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                <AssignmentIcon sx={{ mr: 2, fontSize: '2rem' }} />
                Estimation Designer
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {estimation?.estimation_id} - {estimation?.project_name}
              </Typography>
              {costOptimizationData && (
                <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                  <Chip
                    label={`Potential Savings: ₹${costOptimizationData.summary?.total_potential_savings || 0}`}
                    color="success"
                    variant="filled"
                    sx={{ bgcolor: 'rgba(76, 175, 80, 0.8)' }}
                  />
                  <Chip
                    label={`${costOptimizationData.summary?.suggestions_count || 0} Optimization Suggestions`}
                    color="info"
                    variant="filled"
                    sx={{ bgcolor: 'rgba(33, 150, 243, 0.8)' }}
                  />
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSaveAndClose}
                sx={{
                  bgcolor: 'rgba(76, 175, 80, 0.9)',
                  '&:hover': { bgcolor: 'rgba(76, 175, 80, 1)' }
                }}
              >
                <SaveIcon sx={{ mr: 1 }} />
                Save and Close
              </Button>
              <Button
                variant="contained"
                onClick={onClose}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                <CloseIcon />
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Approval Warning */}
      {isApproved && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
          This estimation has been approved. Modifications require returning to draft status and reapproval.
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}


      {/* Add New Section */}
      <Card sx={{ mb: 3, borderRadius: '16px' }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              label="New Section Name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Main Panel, Generator, UPS"
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={addSection}
              sx={{ borderRadius: '12px', px: 3 }}
            >
              Add Section
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.map((section, sectionIndex) => (
        <Card key={section.id} sx={{ mb: 3, borderRadius: '16px' }}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                backgroundColor: '#e3f2fd',
                borderRadius: '16px 16px 0 0',
                '&.Mui-expanded': { borderRadius: '16px 16px 0 0' }
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={2}>
                  {editingSection === section.id ? (
                    <TextField
                      value={section.section_name}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[sectionIndex].section_name = e.target.value;
                        setSections(newSections);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateSectionName(section.id, section.section_name);
                        }
                      }}
                      size="small"
                      autoFocus
                    />
                  ) : (
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {section.section_name}
                    </Typography>
                  )}
                </Box>
                <Box display="flex" gap={1} onClick={(e) => e.stopPropagation()}>
                  {editingSection === section.id ? (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => updateSectionName(section.id, section.section_name)}
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setEditingSection(null)}
                      >
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => setEditingSection(section.id)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => deleteSection(section.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* Add Subsection */}
              <Box display="flex" gap={2} alignItems="center" mb={2}>
                <TextField
                  label="New Subsection Name"
                  value={newSubsectionNames[section.id] || ''}
                  onChange={(e) => setNewSubsectionNames(prev => ({ ...prev, [section.id]: e.target.value }))}
                  placeholder="e.g., Incoming, Outgoing"
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addSubsection(section.id)}
                  size="small"
                  disabled={!(newSubsectionNames[section.id] || '').trim()}
                >
                  Add Subsection
                </Button>
              </Box>

              {/* Subsections */}
              {section.subsections?.map((subsection, subsectionIndex) => (
                <Card key={subsection.id} variant="outlined" sx={{ mb: 2, borderRadius: '12px' }}>
                  <CardContent>
                    {/* Subsection Header */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        {editingSubsection === subsection.id ? (
                          <TextField
                            value={subsection.subsection_name}
                            onChange={(e) => {
                              const newSections = [...sections];
                              newSections[sectionIndex].subsections[subsectionIndex].subsection_name = e.target.value;
                              setSections(newSections);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateSubsectionName(subsection.id, subsection.subsection_name);
                              }
                            }}
                            size="small"
                            autoFocus
                          />
                        ) : (
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                            {subsection.subsection_name}
                          </Typography>
                        )}
                      </Box>
                      <Box display="flex" gap={1}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<PsychologyIcon />}
                            disabled={isApproved}
                            onClick={() => handleIntelligentProductSelection(subsection.id)}
                            sx={{ borderRadius: '8px' }}
                            color="primary"
                          >
                            Smart Add
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            disabled={isApproved}
                            onClick={(e) => {
                              e.preventDefault();
                              setAddItemDialog({ open: true, subsectionId: subsection.id });
                            }}
                            sx={{ borderRadius: '8px' }}
                          >
                            Add Item
                          </Button>
                        </Box>
                        {editingSubsection === subsection.id ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => updateSubsectionName(subsection.id, subsection.subsection_name)}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setEditingSubsection(null)}
                            >
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => setEditingSubsection(subsection.id)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteSubsection(subsection.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>

                    {/* Items Table */}
                    {subsection.items?.length > 0 && (
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell><strong>Product Details</strong></TableCell>
                              <TableCell><strong>Codes</strong></TableCell>
                              <TableCell><strong>Category</strong></TableCell>
                              <TableCell><strong>Qty</strong></TableCell>
                              <TableCell><strong>Pricing</strong></TableCell>
                              <TableCell><strong>Discount %</strong></TableCell>
                              <TableCell><strong>Final Price</strong></TableCell>
                              <TableCell><strong>Stock Status</strong></TableCell>
                              <TableCell><strong>Warranty/GST</strong></TableCell>
                              <TableCell><strong>Actions</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {subsection.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {item.make} - {item.model}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2">{item.product_code || item.part_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      HSN: {item.hsn_code || '-'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip label={item.category_name || '-'} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2">
                                      {item.quantity} {item.unit || 'nos'}
                                    </Typography>
                                    {!item.is_stock_available && (
                                      <Tooltip title="Insufficient stock">
                                        <WarningIcon color="warning" fontSize="small" />
                                      </Tooltip>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2">₹{item.mrp?.toLocaleString('en-IN')}</Typography>
                                    {item.vendor_discount > 0 && (
                                      <Typography variant="caption" color="text.secondary">
                                        Vendor: {item.vendor_discount}%
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    type="number"
                                    value={item.discount_percentage}
                                    onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value))}
                                    size="small"
                                    sx={{ width: '80px' }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#2e7d32' }}>
                                  ₹{item.final_price?.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell>
                                  <Box display="flex" flexDirection="column" gap={0.5}>
                                    <Chip
                                      label={item.stock_status || (item.is_stock_available ? 'Available' : 'Low Stock')}
                                      color={
                                        item.stock_status === 'Critical' ? 'error' :
                                          item.stock_status === 'Low Stock' || !item.is_stock_available ? 'warning' : 'success'
                                      }
                                      size="small"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {item.total_stock || 0} {item.unit || 'nos'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box display="flex" flexDirection="column" gap={0.5}>
                                    {item.warranty_period > 0 && (
                                      <Chip
                                        label={`${item.warranty_period} ${item.warranty_period_type}`}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                      />
                                    )}
                                    <Typography variant="caption" color="text.secondary">
                                      GST: {item.gst_rate || 18}%
                                    </Typography>
                                    {item.serial_number_required && (
                                      <Chip label="Serial Req." size="small" variant="outlined" />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => deleteItem(item.id)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              ))}
            </AccordionDetails>
          </Accordion>
        </Card>
      ))}

      {/* Add Item Dialog */}
      <Dialog
        open={addItemDialog.open}
        onClose={() => setAddItemDialog({ open: false, subsectionId: null })}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxHeight: '95vh',
            m: 2
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 3,
          borderRadius: '16px 16px 0 0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AddIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              Add Material/Product to Subsection
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            onClick={() => setAddItemDialog({ open: false, subsectionId: null })}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              borderRadius: '8px'
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 4, backgroundColor: '#f8fafc' }}>
          <Grid container spacing={4}>
            {/* Product Selection Section */}
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600, mb: 3 }}>
                  Product Selection
                </Typography>
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => `${option.item_name || 'Unknown Product'} - ${option.brand || ''} ${option.model_number || ''}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={selectedProduct}
                  onChange={(event, newValue) => setSelectedProduct(newValue)}
                  componentsProps={{
                    popper: {
                      style: {
                        width: '50vw' // Half the viewport width
                      },
                      placement: 'bottom-start'
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Product"
                      fullWidth
                      required
                      variant="outlined"
                      size="large"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box
                        component="li"
                        key={option.id || option.item_code || option.item_name}
                        {...otherProps}
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        p: 3,
                        borderBottom: '1px solid #e2e8f0',
                        minHeight: '120px',
                        '&:hover': {
                          backgroundColor: '#f1f5f9'
                        }
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        {/* Product Name and Status */}
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography
                            variant="h6"
                            fontWeight={600}
                            sx={{
                              fontSize: '1.1rem',
                              color: '#1e293b',
                              lineHeight: 1.4,
                              flex: 1,
                              mr: 3,
                              wordBreak: 'break-word'
                            }}
                          >
                            {option.item_name}
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap" flexShrink={0}>
                            {option.stock_status && (
                              <Chip
                                label={option.stock_status}
                                size="small"
                                color={
                                  option.stock_status === 'Critical' ? 'error' :
                                    option.stock_status === 'Low Stock' ? 'warning' : 'success'
                                }
                                sx={{ fontSize: '0.75rem', height: '26px' }}
                              />
                            )}
                            {option.serial_number_required && (
                              <Chip
                                label="Serial Required"
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem', height: '26px' }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Product Details - Full Width Layout */}
                        <Grid container spacing={3} sx={{ mb: 2 }}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                <strong>Brand:</strong> {option.brand || 'N/A'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                <strong>Model:</strong> {option.model_number || 'N/A'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                <strong>Product Code:</strong> {option.item_code || option.part_number || 'N/A'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                <strong>Selling Price:</strong> ₹{parseFloat(option.selling_price || 0).toLocaleString('en-IN')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                <strong>Stock:</strong> {option.current_stock || 0} {option.primary_unit}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                <strong>GST:</strong> {option.gst_rate || 18}%
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Warranty Info */}
                        {option.warranty_period > 0 && (
                          <Typography variant="body2" color="primary" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            <strong>Warranty:</strong> {option.warranty_period} {option.warranty_period_type}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    );
                  }}
                  ListboxProps={{
                    style: {
                      maxHeight: '60vh',
                      width: '50vw', // Half the viewport width
                      borderRadius: '8px'
                    }
                  }}
                  PaperComponent={({ children, ...props }) => (
                    <Paper
                      {...props}
                      sx={{
                        borderRadius: '8px',
                        mt: 1,
                        width: '50vw !important', // Half the viewport width
                        maxWidth: 'none !important',
                        '& .MuiAutocomplete-listbox': {
                          width: '100%'
                        }
                      }}
                    >
                      {children}
                    </Paper>
                  )}
                />
              </Card>
            </Grid>

            {/* Quantity and Discount Section */}
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600, mb: 3 }}>
                  Quantity & Pricing
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Quantity"
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1) {
                          setItemQuantity(value);
                        } else if (e.target.value === '') {
                          setItemQuantity('');
                        } else {
                          setItemQuantity(1);
                        }
                      }}
                      onBlur={() => {
                        if (itemQuantity === '' || itemQuantity < 1) {
                          setItemQuantity(1);
                        }
                      }}
                      fullWidth
                      required
                      inputProps={{ min: 1, step: 1 }}
                      helperText="Enter a positive integer value"
                      variant="outlined"
                      size="large"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="Unit"
                      value={selectedProduct ? (selectedProduct.primary_unit || 'NOS') : 'NOS'}
                      fullWidth
                      variant="outlined"
                      size="large"
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          fontSize: '1rem',
                          backgroundColor: '#f8fafc'
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Custom Discount (%)"
                      type="number"
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(parseFloat(e.target.value) || 0)}
                      fullWidth
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      variant="outlined"
                      size="large"
                      helperText="Optional: Override default discount"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* Price Calculation Section */}
            {selectedProduct && (
              <Grid item xs={12}>
                <Card sx={{
                  p: 4,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1px solid #0ea5e9'
                }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                      color: '#0c4a6e',
                      fontWeight: 600,
                      mb: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <AssignmentIcon fontSize="medium" />
                    Price Calculation Summary
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* List Price */}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                            List Price per unit:
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                            ₹{parseFloat(selectedProduct.selling_price || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Box>

                        {/* Vendor Discount (if applicable) */}
                        {selectedProduct.vendor_discount && parseFloat(selectedProduct.vendor_discount) > 0 && (
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" sx={{ fontSize: '1rem', color: '#059669' }}>
                              Vendor Discount ({parseFloat(selectedProduct.vendor_discount).toFixed(2)}%):
                            </Typography>
                            <Typography variant="body1" fontWeight={600} color="#059669" sx={{ fontSize: '1rem' }}>
                              -₹{(selectedProduct.selling_price * parseFloat(selectedProduct.vendor_discount) / 100).toLocaleString('en-IN')}
                            </Typography>
                          </Box>
                        )}

                        {/* Price after vendor discount */}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                            {selectedProduct.vendor_discount && parseFloat(selectedProduct.vendor_discount) > 0 
                              ? 'Price after vendor discount:' 
                              : 'Unit Price:'}
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                            ₹{(selectedProduct.selling_price * (1 - (parseFloat(selectedProduct.vendor_discount || 0) / 100))).toLocaleString('en-IN')}
                          </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                            Quantity:
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                            {itemQuantity} {selectedProduct.primary_unit || 'nos'}
                          </Typography>
                        </Box>

                        {/* Subtotal after vendor discount */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ pt: 1, borderTop: '1px solid #e2e8f0' }}>
                          <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                            Subtotal:
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                            ₹{(selectedProduct.selling_price * (1 - (parseFloat(selectedProduct.vendor_discount || 0) / 100)) * itemQuantity).toLocaleString('en-IN')}
                          </Typography>
                        </Box>

                        {/* Custom Discount (if applicable) */}
                        {customDiscount > 0 && (
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" sx={{ fontSize: '1rem', color: '#dc2626' }}>
                              Additional Discount ({customDiscount}%):
                            </Typography>
                            <Typography variant="body1" fontWeight={600} color="error" sx={{ fontSize: '1rem' }}>
                              -₹{(selectedProduct.selling_price * (1 - (parseFloat(selectedProduct.vendor_discount || 0) / 100)) * itemQuantity * customDiscount / 100).toLocaleString('en-IN')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{
                        p: 3,
                        backgroundColor: '#1e293b',
                        color: 'white',
                        borderRadius: '8px'
                      }}>
                        <Typography variant="h6" gutterBottom sx={{ color: '#e2e8f0' }}>
                          Final Amount
                        </Typography>
                        <Typography variant="h4" fontWeight={700} sx={{ color: '#22d3ee' }}>
                          ₹{(selectedProduct.selling_price * (1 - (parseFloat(selectedProduct.vendor_discount || 0) / 100)) * itemQuantity * (1 - customDiscount / 100)).toLocaleString('en-IN')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                          Including all discounts
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{
          p: 4,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          gap: 2,
          justifyContent: 'flex-end'
        }}>
          <Button
            onClick={() => setAddItemDialog({ open: false, subsectionId: null })}
            variant="outlined"
            startIcon={<CancelIcon />}
            size="large"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={addItem}
            disabled={!selectedProduct || !itemQuantity}
            startIcon={<AddIcon />}
            size="large"
            sx={{
              borderRadius: '8px',
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              minWidth: '140px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              }
            }}
          >
            Add Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Intelligent Product Selector */}
      <IntelligentProductSelector
        open={intelligentSelectorOpen}
        onClose={() => setIntelligentSelectorOpen(false)}
        onProductSelect={handleIntelligentProductSelect}
        estimationId={estimation?.id}
        projectLocation={estimation?.project_location}
        preferredLocationId={1}
      />

      {/* Cost Optimization Floating Action Button */}
      {costOptimizationData && costOptimizationData.summary?.suggestions_count > 0 && (
        <Fab
          color="secondary"
          aria-label="cost optimization"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ee5a24 0%, #d63031 100%)',
            }
          }}
          onClick={() => {
            // Show cost optimization suggestions in a dialog or navigate to optimization view
            console.log('Cost optimization suggestions:', costOptimizationData);
          }}
        >
          <TrendingUpIcon />
        </Fab>
      )}
    </Box>
  );
};

export default EstimationDesigner;
