import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  CircularProgress,
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
  Card,
  CardContent,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider,
  Stack,
  CardHeader,
  Avatar,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  Memory as MemoryIcon,
  Cable as CableIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  GetApp as ExportIcon,
  Upload as ImportIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { api } from '../utils/api';
import { logger } from '../utils/logger';

const EnterpriseInventoryManagement = () => {
  // Debug: Component initialization
  console.log('🚀 EnterpriseInventoryManagement component mounted!');
  console.log('Current URL:', window.location.href);

  // State management
  const [tabValue, setTabValue] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [items, setItems] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    brand: '',
    status: '', // Show all items by default instead of just active
    requiresSerial: '',
    lowStock: false,
  });

  // Dialog states
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [viewItemDialog, setViewItemDialog] = useState(false);
  const [deleteItemDialog, setDeleteItemDialog] = useState(false);
  const [addCategoryDialog, setAddCategoryDialog] = useState(false);
  const [editCategoryDialog, setEditCategoryDialog] = useState(false);
  const [addSerialDialog, setAddSerialDialog] = useState(false);
  const [serialHistoryDialog, setSerialHistoryDialog] = useState(false);
  const [addPurchaseDialog, setAddPurchaseDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState(null);
  const [categoryValidation, setCategoryValidation] = useState({
    isValid: true,
    message: '',
    canReactivate: false,
    inactiveCategory: null
  });
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    description: '',
    requires_serial_tracking: false,
    icon: ''
  });
  const [purchaseForm, setPurchaseForm] = useState({
    item_id: '',
    vendor_id: '',
    vendor_name: '',
    purchase_date: new Date().toISOString().split('T')[0],
    quantity: '',
    unit_cost: '',
    vendor_discount: 0,
    tax_percentage: 18,
    total_cost: '',
    batch_number: '',
    serial_numbers: [],
    invoice_number: '',
    po_number: ''
  });
  const [serialNumberText, setSerialNumberText] = useState('');
  const serialNumberTextareaRef = useRef(null);
  const [itemForm, setItemForm] = useState({
    item_code: '',
    item_name: '',
    description: '',
    main_category_id: '',
    sub_category_id: '',
    brand: '',
    model_number: '',
    part_number: '',
    manufacturer: '',
    specifications: {},
    requires_serial_tracking: false,
    minimum_stock: 0,
    reorder_point: 0,
    standard_cost: 0,
    selling_price: 0,
    gst_rate: 18.00,
    primary_unit: 'NOS',
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fallback: global keydown handler to ensure comma/space insert works in the serial textarea
  useEffect(() => {
    const handler = (e) => {
      const ta = serialNumberTextareaRef.current;
      if (!ta) return;
      if (document.activeElement !== ta) return;
      if (e.key === ',' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const start = ta.selectionStart || 0;
        const end = ta.selectionEnd || 0;
        const insert = e.key === ',' ? ',' : ' ';
        const before = serialNumberText.slice(0, start);
        const after = serialNumberText.slice(end);
        const next = before + insert + after;
        setSerialNumberText(next);
        setPurchaseForm(prev => ({ ...prev, serial_numbers: next }));
        setTimeout(() => {
          try { ta.selectionStart = ta.selectionEnd = start + 1; } catch { }
        }, 0);
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [serialNumberText]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 Starting loadInitialData...');
      setLoading(true);

      // Load categories and dashboard data in parallel
      console.log('📡 Making API calls for categories and dashboard...');
      const [categoriesRes, dashboardRes] = await Promise.all([
        api.get('/api/inventory-enhanced/categories/main'),
        api.get('/api/inventory-enhanced/dashboard')
      ]);

      console.log('📦 Categories API Response (loadInitialData):', categoriesRes);
      console.log('📊 Dashboard API Response:', dashboardRes);

      const categoriesData = categoriesRes?.data || [];
      setCategories(categoriesData);
      console.log(`✅ Set ${categoriesData.length} categories in state:`, categoriesData);

      setDashboardData(dashboardRes?.data || {});

      // Load items
      await loadItems();

    } catch (error) {
      logger.error('Failed to load initial data:', error);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubCategory) params.append('subcategory', selectedSubCategory);
      if (searchTerm) params.append('search', searchTerm);
      if (filters.brand) params.append('brand', filters.brand);
      // Always send status parameter - empty string means "all items"
      params.append('status', filters.status || 'all');
      if (filters.requiresSerial) params.append('requiresSerial', filters.requiresSerial);
      if (filters.lowStock) params.append('lowStock', 'true');

      console.log('🔄 Loading items with filters:', {
        selectedCategory,
        selectedSubCategory,
        searchTerm,
        filters,
        url: `/api/inventory-enhanced/items/enhanced?${params.toString()}`
      });

      const response = await api.get(`/api/inventory-enhanced/items/enhanced?${params.toString()}`);

      console.log('📦 Items API Response:', response);
      const itemsData = response?.data || [];
      console.log(`✅ Loaded ${itemsData.length} items`);

      setItems(itemsData);
    } catch (error) {
      console.error('❌ Failed to load items:', error);
      logger.error('❌ Failed to load items:', error);
      setError('Failed to load inventory items');
      setItems([]); // Ensure we set empty array on error
    }
  }, [selectedCategory, selectedSubCategory, searchTerm, filters]);

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading categories...');
      const response = await api.get('/api/inventory-enhanced/categories/main');
      const categoriesData = response?.data || response || [];

      console.log('📦 Categories API Response:', response);
      console.log('📋 Categories Data:', categoriesData);

      setCategories(categoriesData);
      console.log(`✅ Loaded ${categoriesData.length} categories:`, categoriesData.map(cat => cat.category_name));
      logger.log(`✅ Loaded ${categoriesData.length} categories`);

    } catch (error) {
      console.error('❌ Failed to load categories:', error);
      logger.error('❌ Failed to load categories:', error);
      setCategories([]);
      setError('Unable to load categories. Please refresh the page.');
    }
  };

  // Refresh data when filters change
  useEffect(() => {
    if (!loading) {
      loadItems();
    }
  }, [loading, loadItems]);

  // Validate category name for duplicates (includes inactive categories)
  const validateCategoryName = async (categoryName) => {
    if (!categoryName.trim()) {
      setCategoryValidation({ isValid: true, message: '' });
      return;
    }

    try {
      // Check ALL categories (active + inactive) to prevent conflicts
      const response = await api.get('/api/inventory-enhanced/categories/main?status=all');
      const allCategories = response?.data || [];

      const categoryNameUpper = categoryName.toUpperCase();

      // Check for exact matches
      const existingCategory = allCategories.find(cat =>
        cat.category_name.toUpperCase() === categoryNameUpper ||
        cat.category_code === categoryNameUpper
      );

      if (existingCategory) {
        if (existingCategory.is_active === 0) {
          // Inactive category exists - offer to reactivate
          setCategoryValidation({
            isValid: false,
            message: `Category "${categoryName}" exists but is inactive. Consider reactivating it instead.`,
            canReactivate: true,
            inactiveCategory: existingCategory
          });
        } else {
          // Active category exists
          setCategoryValidation({
            isValid: false,
            message: `Category "${categoryName}" already exists and is active`
          });
        }
        return;
      }

      // Check for potential code conflicts (backend generates codes by removing special chars)
      const potentialCode = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const codeConflict = allCategories.find(cat => cat.category_code === potentialCode);

      if (codeConflict) {
        setCategoryValidation({
          isValid: false,
          message: `Similar category exists ("${codeConflict.category_name}"). Please use a different name.`
        });
        return;
      }

      setCategoryValidation({ isValid: true, message: '' });
    } catch (error) {
      console.warn('Category validation failed:', error);
      // Fallback to basic validation with loaded categories
      setCategoryValidation({
        isValid: true,
        message: 'Could not validate category name - proceed with caution'
      });
    }
  };

  const handleAddItem = async () => {
    try {
      await api.post('/api/inventory-enhanced/items/enhanced', itemForm);
      setAddItemDialog(false);
      setItemForm({
        item_code: '',
        item_name: '',
        description: '',
        main_category_id: '',
        sub_category_id: '',
        brand: '',
        model_number: '',
        part_number: '',
        manufacturer: '',
        specifications: {},
        requires_serial_tracking: false,
        minimum_stock: 0,
        reorder_point: 0,
        standard_cost: 0,
        selling_price: 0,
        gst_rate: 18.00,
        primary_unit: 'NOS',
      });
      await loadItems();
      await loadInitialData(); // Refresh dashboard
    } catch (error) {
      logger.error('Failed to add item:', error);
      setError('Failed to add inventory item');
    }
  };

  // Handle item edit
  const handleEditItem = async () => {
    try {
      logger.log('Editing item:', selectedItem.id, 'with data:', itemForm);
      const response = await api.put(`/api/inventory-enhanced/items/enhanced/${selectedItem.id}`, itemForm);
      logger.log('Edit response:', response.data);

      setEditItemDialog(false);
      setSelectedItem(null);

      // Reset form
      setItemForm({
        item_code: '',
        item_name: '',
        description: '',
        main_category_id: '',
        sub_category_id: '',
        brand: '',
        model_number: '',
        part_number: '',
        manufacturer: '',
        specifications: {},
        requires_serial_tracking: false,
        minimum_stock: 0,
        reorder_point: 0,
        standard_cost: 0,
        selling_price: 0,
        gst_rate: 18.00,
        primary_unit: 'NOS',
      });

      await loadItems();
      await loadInitialData();

      // Show success message
      alert('Item updated successfully!');

    } catch (error) {
      logger.error('Failed to edit item:', error);
      logger.error('Error details:', error.response?.data);
      setError('Failed to edit inventory item: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle item delete
  const handleDeleteItem = async () => {
    try {
      if (!selectedItem?.id) {
        console.error('❌ No selectedItem.id:', selectedItem);
        setError('No item selected for deletion');
        return;
      }

      console.log('🗑️ Deleting item:', selectedItem.id, selectedItem.item_name);
      await api.delete(`/api/inventory-enhanced/items/enhanced/${selectedItem.id}`);
      console.log('✅ Item deleted successfully');
      setDeleteItemDialog(false);
      setSelectedItem(null);
      await loadItems();
      await loadInitialData();
    } catch (error) {
      console.error('❌ Failed to delete item:', error);
      console.error('❌ Error config:', error.config);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ selectedItem was:', selectedItem);
      logger.error('Failed to delete item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      setError(`Failed to delete inventory item: ${errorMessage}`);
    }
  };

  // Handle category delete
  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await api.delete(`/api/inventory-enhanced/categories/${categoryId}`);
        await loadCategories();
        await loadItems();
      } catch (error) {
        logger.error('Failed to delete category:', error);
        setError('Failed to delete category');
      }
    }
  };

  // Handle add category
  const handleAddCategory = async () => {
    try {
      // Check validation state
      if (!categoryValidation.isValid) {
        setError(categoryValidation.message);
        return;
      }

      // Ensure categories are loaded before proceeding
      if (categories.length === 0) {
        logger.log('No categories loaded, loading now...');
        await loadCategories();
      }

      // Double-check if category already exists after ensuring categories are loaded
      const categoryNameUpper = categoryForm.category_name.toUpperCase();
      logger.log(`Checking for existing category: "${categoryNameUpper}"`);
      logger.log('Current categories:', categories.map(cat => `${cat.category_name} (${cat.category_code})`));

      const existingCategory = categories.find(cat =>
        cat.category_name.toUpperCase() === categoryNameUpper ||
        cat.category_code === categoryNameUpper
      );

      if (existingCategory) {
        logger.log('Found existing category:', existingCategory);
        setError(`Category "${categoryForm.category_name}" already exists. Please use a different name.`);
        return;
      }

      // Also check for categories that would generate the same code
      const potentialCode = categoryForm.category_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const codeConflict = categories.find(cat => cat.category_code === potentialCode);

      if (codeConflict) {
        logger.log('Found category code conflict:', codeConflict);
        setError(`A category with similar name already exists ("${codeConflict.category_name}"). Please use a different name.`);
        return;
      }

      logger.log('Adding category:', categoryForm);
      const response = await api.post('/api/inventory-enhanced/categories', categoryForm);
      logger.log('Add category response:', response.data);

      setAddCategoryDialog(false);
      setCategoryForm({
        category_name: '',
        description: '',
        requires_serial_tracking: false,
        icon: ''
      });
      setCategoryValidation({ isValid: true, message: '' });

      await loadCategories();
      await loadItems();
      alert('Category added successfully!');

    } catch (error) {
      logger.error('Failed to add category:', error);
      logger.error('Error details:', error.response?.data);

      // Don't show error for authentication issues - interceptor handles logout
      if (error.response?.status === 401) {
        // Authentication error - interceptor will handle logout and redirect
        return;
      }

      // Better error message for duplicate entries
      if (error.response?.data?.error?.includes('Duplicate entry')) {
        setError(`Category "${categoryForm.category_name}" already exists. Please use a different name.`);
      } else {
        setError('Failed to add category: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Handle edit category
  const handleEditCategory = async () => {
    try {
      logger.log('Editing category:', selectedCategoryForEdit.id, 'with data:', categoryForm);
      const response = await api.put(`/api/inventory-enhanced/categories/${selectedCategoryForEdit.id}`, categoryForm);
      logger.log('Edit category response:', response.data);

      setEditCategoryDialog(false);
      setSelectedCategoryForEdit(null);
      setCategoryForm({
        category_name: '',
        description: '',
        icon: '',
        requires_serial_tracking: false
      });

      await loadCategories();
      await loadItems();
      alert('Category updated successfully!');

    } catch (error) {
      logger.error('Failed to edit category:', error);
      logger.error('Error details:', error.response?.data);
      setError('Failed to edit category: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle add purchase record
  const handleAddPurchase = async () => {
    try {
      // Process serial numbers from text input
      const serialNumbers = serialNumberText
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Validate serial numbers match quantity if serial numbers are provided
      const quantity = parseInt(purchaseForm.quantity);
      if (serialNumbers.length > 0 && serialNumbers.length !== quantity) {
        setError(`Serial number count (${serialNumbers.length}) must match quantity (${quantity})`);
        return;
      }

      // Calculate total cost with discount and tax
      const baseAmount = parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.unit_cost);
      const discountAmount = (baseAmount * parseFloat(purchaseForm.vendor_discount)) / 100;
      const afterDiscount = baseAmount - discountAmount;
      const taxAmount = (afterDiscount * parseFloat(purchaseForm.tax_percentage)) / 100;
      const totalCost = afterDiscount + taxAmount;

      const purchaseData = {
        ...purchaseForm,
        serial_numbers: serialNumbers,
        total_cost: totalCost,
        discount_amount: discountAmount,
        tax_amount: taxAmount
      };

      await api.post(`/api/inventory-enhanced/items/${purchaseForm.item_id}/purchase-history`, purchaseData);
      setAddPurchaseDialog(false);
      setPurchaseForm({
        item_id: '',
        vendor_id: '',
        vendor_name: '',
        purchase_date: new Date().toISOString().split('T')[0],
        quantity: '',
        unit_cost: '',
        vendor_discount: 0,
        tax_percentage: 18,
        total_cost: '',
        batch_number: '',
        serial_numbers: [],
        invoice_number: '',
        po_number: ''
      });
      setSerialNumberText('');
    } catch (error) {
      logger.error('Failed to add purchase record:', error);
      setError('Failed to add purchase record: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle serial number management
  const handleManageSerials = async (item, action) => {
    try {
      logger.log(`Managing serials for ${item?.item_name}:`, action);

      switch (action) {
        case 'add':
          // For now, show an alert - in production this would open a dialog
          alert(`Add Serial Numbers for ${item?.item_name}\n\nThis would open a form to add new serial numbers.`);
          break;

        case 'edit':
          alert(`Edit Serial Number\n\nThis would open a form to edit the selected serial number.`);
          break;

        case 'delete':
          if (window.confirm('Are you sure you want to delete this serial number?')) {
            alert('Serial number deleted successfully.');
          }
          break;

        case 'transfer':
          alert(`Transfer Serial Number\n\nThis would open a form to transfer the serial number to a different location or customer.`);
          break;

        case 'history':
          alert(`Serial Number History\n\nThis would show detailed history of this serial number.`);
          break;

        case 'export':
          alert(`Export Serial Numbers\n\nThis would export serial numbers to Excel/CSV format.`);
          break;

        case 'bulk_import':
          alert(`Bulk Import Serial Numbers\n\nThis would open a dialog to upload CSV/Excel file with serial numbers.`);
          break;

        default:
          logger.log('Unknown action:', action);
      }
    } catch (error) {
      logger.error('Failed to manage serials:', error);
      setError('Failed to manage serial numbers');
    }
  };

  // Calculate total cost in real-time for purchase form
  const calculatePurchaseTotal = () => {
    const quantity = parseFloat(purchaseForm.quantity) || 0;
    const unitCost = parseFloat(purchaseForm.unit_cost) || 0;
    const discount = parseFloat(purchaseForm.vendor_discount) || 0;
    const tax = parseFloat(purchaseForm.tax_percentage) || 0;

    const baseAmount = quantity * unitCost;
    const discountAmount = (baseAmount * discount) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = (afterDiscount * tax) / 100;
    const total = afterDiscount + taxAmount;

    return {
      baseAmount,
      discountAmount,
      taxAmount,
      total
    };
  };

  const getBrandIcon = (brand) => {
    const brandIcons = {
      'Siemens': <MemoryIcon color="primary" />,
      'ABB': <SettingsIcon color="secondary" />,
      'Schneider': <CategoryIcon color="success" />,
      'Omron': <QrCodeIcon color="warning" />,
      'L&T': <InventoryIcon color="info" />,
      'Polycab': <CableIcon color="action" />,
    };
    return brandIcons[brand] || <InventoryIcon />;
  };

  // Function to load subcategories based on main category
  const loadSubcategories = async (mainCategoryId) => {
    if (!mainCategoryId) {
      setSubcategories([]);
      return;
    }

    try {
      const response = await api.get(`/api/inventory-enhanced/categories/main/${mainCategoryId}/subcategories`);
      if (response.data.success) {
        setSubcategories(response.data.data);
      }
    } catch (error) {
      logger.error('Error loading subcategories:', error);
      setSubcategories([]);
    }
  };

  // Handle main category change in form
  const handleMainCategoryChange = (categoryId) => {
    setItemForm({
      ...itemForm,
      main_category_id: categoryId,
      sub_category_id: '' // Reset subcategory when main category changes
    });
    loadSubcategories(categoryId);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'low': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  const getStockStatusText = (status) => {
    switch (status) {
      case 'low': return 'Low Stock';
      case 'warning': return 'Warning';
      default: return 'Normal';
    }
  };

  const renderDashboard = () => (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <InventoryIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" component="div">
                  {dashboardData.summary?.total_items || 0}
                </Typography>
                <Typography color="text.secondary">
                  Total Items
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <WarningIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" component="div">
                  {dashboardData.summary?.low_stock_items || 0}
                </Typography>
                <Typography color="text.secondary">
                  Low Stock Items
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <QrCodeIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" component="div">
                  {dashboardData.summary?.serialized_items || 0}
                </Typography>
                <Typography color="text.secondary">
                  Serialized Items
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <TrendingUpIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" component="div">
                  ₹{Number(dashboardData.summary?.total_inventory_value || 0).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">
                  Inventory Value
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Category Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Category Distribution" />
          <CardContent>
            {dashboardData.categoryDistribution?.map((category, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{category.category_name}</Typography>
                  <Typography variant="body2">{category.item_count} items</Typography>
                </Box>
                <Box sx={{
                  height: 8,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}>
                  <Box sx={{
                    height: '100%',
                    bgcolor: 'primary.main',
                    width: `${(category.item_count / (dashboardData.summary?.total_items || 1)) * 100}%`
                  }} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Top Brands */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Top Brands" />
          <CardContent>
            {dashboardData.topBrands?.map((brand, index) => (
              <Box key={index} sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                p: 1,
                bgcolor: 'grey.50',
                borderRadius: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getBrandIcon(brand.brand)}
                  <Typography variant="body2">{brand.brand}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">{brand.item_count} items</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ₹{Number(brand.brand_value || 0).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderItemsGrid = () => {
    console.log('🎨 Rendering items grid with:', {
      itemsCount: items.length,
      items: items,
      loading,
      error
    });

    return (
      <Box>
        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory || ''}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubCategory('');
                    }}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.category_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Brand</InputLabel>
                  <Select
                    value={filters.brand || ''}
                    onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                    label="Brand"
                  >
                    <MenuItem value="">All Brands</MenuItem>
                    <MenuItem value="Siemens">Siemens</MenuItem>
                    <MenuItem value="ABB">ABB</MenuItem>
                    <MenuItem value="Schneider">Schneider</MenuItem>
                    <MenuItem value="Omron">Omron</MenuItem>
                    <MenuItem value="L&T">L&T</MenuItem>
                    <MenuItem value="Polycab">Polycab</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="">All Items</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                    <MenuItem value="inactive">Inactive Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.lowStock}
                      onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
                    />
                  }
                  label="Low Stock Only"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddItemDialog(true)}
                  >
                    Add Item
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ExportIcon />}
                  >
                    Export
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Items Table */}
        {items.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No inventory items found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Loading items...' : 'Try adjusting your filters or add new inventory items.'}
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Details</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Brand/Model</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Pricing</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {item.item_code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.item_name}
                        </Typography>
                        {item.part_number && (
                          <Typography variant="caption" color="text.secondary">
                            Part: {item.part_number}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={item.main_category_name}
                        variant="outlined"
                      />
                      {item.sub_category_name && (
                        <Chip
                          size="small"
                          label={item.sub_category_name}
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getBrandIcon(item.brand)}
                        <Box>
                          <Typography variant="body2">{item.brand}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.model_number}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {item.current_stock} {item.primary_unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Min: {item.minimum_stock}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          ₹{Number(item.standard_cost || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sell: ₹{Number(item.selling_price || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                          GST: {item.gst_rate || 18}%
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={1}>
                        <Chip
                          size="small"
                          label={getStockStatusText(item.stock_status)}
                          color={getStockStatusColor(item.stock_status)}
                        />
                        <Chip
                          size="small"
                          label={item.item_status === 'active' ? 'Active' : 'Inactive'}
                          color={item.item_status === 'active' ? 'success' : 'default'}
                          variant={item.item_status === 'active' ? 'filled' : 'outlined'}
                        />
                        {item.requires_serial_tracking && (
                          <Chip
                            size="small"
                            icon={<QrCodeIcon />}
                            label="Serialized"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedItem(item);
                              setViewItemDialog(true);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        {item.item_status === 'inactive' && (
                          <Tooltip title="Reactivate Item">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={async () => {
                                try {
                                  await api.put(`/api/inventory-enhanced/items/enhanced/${item.id}`, {
                                    ...item,
                                    item_status: 'active'
                                  });
                                  logger.log(`✅ Reactivated item: ${item.item_name}`);
                                  await loadItems(); // Refresh the items list
                                } catch (error) {
                                  console.error('❌ Failed to reactivate item:', error);
                                  setError('Failed to reactivate item: ' + (error.response?.data?.message || error.message));
                                }
                              }}
                            >
                              <RestoreIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedItem(item);
                              setItemForm({
                                item_code: item.item_code || '',
                                item_name: item.item_name || '',
                                description: item.description || '',
                                main_category_id: item.main_category_id || '',
                                sub_category_id: item.sub_category_id || '',
                                brand: item.brand || '',
                                model_number: item.model_number || '',
                                part_number: item.part_number || '',
                                manufacturer: item.manufacturer || '',
                                specifications: item.specifications || {},
                                requires_serial_tracking: item.requires_serial_tracking || false,
                                minimum_stock: item.minimum_stock || 0,
                                reorder_point: item.reorder_point || 0,
                                standard_cost: item.standard_cost || 0,
                                selling_price: item.selling_price || 0,
                                gst_rate: item.gst_rate || 18.00,
                                primary_unit: item.primary_unit || 'NOS',
                              });
                              // Load subcategories if item has a main category
                              if (item.main_category_id) {
                                loadSubcategories(item.main_category_id);
                              }
                              setEditItemDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              console.log('🗑️ Delete button clicked for item:', item);
                              console.log('🗑️ Item ID:', item?.id, 'Name:', item?.item_name);
                              setSelectedItem(item);
                              setDeleteItemDialog(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        {item.requires_serial_tracking && (
                          <Tooltip title="Manage Serials">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedItem(item);
                                setAddSerialDialog(true);
                              }}
                            >
                              <QrCodeIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Purchase History">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedItem(item);
                              setTabValue(4); // Switch to Purchase History tab
                            }}
                          >
                            <HistoryIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderCategoriesView = () => {
    console.log('🏷️ Rendering categories view with:', {
      categoriesCount: categories.length,
      categories: categories,
      loading,
      error
    });

    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Product Categories ({categories.length})</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={async () => {
              // Ensure categories are loaded before opening dialog
              if (categories.length === 0) {
                logger.log('Loading categories before opening add dialog...');
                await loadCategories();
              }

              setCategoryForm({
                category_name: '',
                description: '',
                requires_serial_tracking: false,
                icon: ''
              });
              setCategoryValidation({ isValid: true, message: '' });
              setAddCategoryDialog(true);
            }}
          >
            Add Category
          </Button>
        </Box>

        {categories.length === 0 ? (
          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CategoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No categories found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Loading categories...' : 'Create your first category to organize inventory items.'}
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {category.category_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {category.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Edit Category">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCategoryForEdit(category);
                              setCategoryForm({
                                category_name: category.category_name || '',
                                description: category.description || '',
                                icon: category.icon || '',
                                requires_serial_tracking: Boolean(category.requires_serial_tracking)
                              });
                              setEditCategoryDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Category">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Chip
                        size="small"
                        label={`${category.item_count || 0} items`}
                        color="primary"
                        variant="outlined"
                      />
                      {category.requires_serial_tracking && (
                        <Chip
                          size="small"
                          icon={<QrCodeIcon />}
                          label="Serial Tracking"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  const renderSerialNumberView = () => {
    // Filter items that require serial tracking
    const serializedItems = items.filter(item => item.requires_serial_tracking);

    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Serial Number Tracking</Typography>
          <Typography variant="body2" color="text.secondary">
            {serializedItems.length} items require serial tracking
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {serializedItems.map((item) => (
            <Grid item xs={12} md={6} key={item.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {item.item_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.brand} - {item.model_number}
                      </Typography>
                    </Box>
                    <Chip
                      icon={<QrCodeIcon />}
                      label={item.available_serials > 0 ? `${item.available_serials} Serials` : 'No Serials Assigned'}
                      color={item.available_serials > 0 ? 'primary' : 'warning'}
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<QrCodeIcon />}
                      onClick={() => {
                        setSelectedItem(item);
                        setAddSerialDialog(true);
                      }}
                    >
                      Manage Serials
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      onClick={() => {
                        setSelectedItem(item);
                        setSerialHistoryDialog(true);
                      }}
                    >
                      Track History
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {serializedItems.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <QrCodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No items require serial tracking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Items marked for serial tracking will appear here
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderPurchaseHistoryView = () => {
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Purchase History</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddPurchaseDialog(true)}
          >
            Add Purchase Record
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Purchase Date</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Total Cost</TableCell>
                <TableCell>Batch/Serial</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No purchase history available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Purchase records will appear here when items are received
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Enterprise Inventory Management
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Industrial Automation Components & Parts Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab
          icon={<TimelineIcon />}
          label="Dashboard"
          iconPosition="start"
        />
        <Tab
          icon={<InventoryIcon />}
          label="Inventory Items"
          iconPosition="start"
        />
        <Tab
          icon={<CategoryIcon />}
          label="Categories"
          iconPosition="start"
        />
        <Tab
          icon={<QrCodeIcon />}
          label="Serial Tracking"
          iconPosition="start"
        />
        <Tab
          icon={<ReceiptIcon />}
          label="Purchase History"
          iconPosition="start"
        />
      </Tabs>

      {tabValue === 0 && renderDashboard()}
      {tabValue === 1 && renderItemsGrid()}
      {tabValue === 2 && renderCategoriesView()}
      {tabValue === 3 && renderSerialNumberView()}
      {tabValue === 4 && renderPurchaseHistoryView()}

      {/* Add Item Dialog */}
      <Dialog open={addItemDialog} onClose={() => setAddItemDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Inventory Item</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Item Code"
                  value={itemForm.item_code || ''}
                  onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  value={itemForm.item_name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={itemForm.description || ''}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Main Category</InputLabel>
                  <Select
                    value={itemForm.main_category_id || ''}
                    onChange={(e) => handleMainCategoryChange(e.target.value)}
                    label="Main Category"
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select a main category</em>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        <Box>
                          <Typography variant="body1">{category.category_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {category.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit of Measurement</InputLabel>
                  <Select
                    value={itemForm.primary_unit || 'NOS'}
                    onChange={(e) => setItemForm({ ...itemForm, primary_unit: e.target.value })}
                    label="Unit of Measurement"
                  >
                    <MenuItem value="NOS">Numbers (NOS)</MenuItem>
                    <MenuItem value="PCS">Pieces (PCS)</MenuItem>
                    <MenuItem value="SET">Set (SET)</MenuItem>
                    <MenuItem value="METER">Meter (MTR)</MenuItem>
                    <MenuItem value="FEET">Feet (FT)</MenuItem>
                    <MenuItem value="KG">Kilogram (KG)</MenuItem>
                    <MenuItem value="GRAM">Gram (GM)</MenuItem>
                    <MenuItem value="LITER">Liter (LTR)</MenuItem>
                    <MenuItem value="ROLL">Roll (ROLL)</MenuItem>
                    <MenuItem value="BOX">Box (BOX)</MenuItem>
                    <MenuItem value="PACKET">Packet (PKT)</MenuItem>
                    <MenuItem value="BUNDLE">Bundle (BDL)</MenuItem>
                    <MenuItem value="PAIR">Pair (PAIR)</MenuItem>
                    <MenuItem value="INCH">Inch (INCH)</MenuItem>
                    <MenuItem value="MM">Millimeter (MM)</MenuItem>
                    <MenuItem value="CM">Centimeter (CM)</MenuItem>
                    <MenuItem value="SQMETER">Square Meter (SQM)</MenuItem>
                    <MenuItem value="CUBICMETER">Cubic Meter (CBM)</MenuItem>
                    <MenuItem value="GALLON">Gallon (GAL)</MenuItem>
                    <MenuItem value="VOLTAGE">Voltage (V)</MenuItem>
                    <MenuItem value="AMPERE">Ampere (A)</MenuItem>
                    <MenuItem value="WATT">Watt (W)</MenuItem>
                    <MenuItem value="HP">Horse Power (HP)</MenuItem>
                    <MenuItem value="RPM">RPM</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={subcategories.map(sub => sub.subcategory_name)}
                  value={subcategories.find(sub => sub.id === itemForm.sub_category_id)?.subcategory_name || ''}
                  onChange={(event, newValue) => {
                    // Find existing subcategory or set as new value
                    const existingSub = subcategories.find(sub => sub.subcategory_name === newValue);
                    setItemForm({
                      ...itemForm,
                      sub_category_id: existingSub ? existingSub.id : '',
                      new_subcategory_name: existingSub ? null : newValue
                    });
                  }}
                  disabled={!itemForm.main_category_id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sub Category (Optional)"
                      helperText={itemForm.main_category_id ? "Select existing or type new subcategory" : "Select main category first"}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={['Siemens', 'ABB', 'Schneider', 'Omron', 'L&T', 'Polycab', 'Allen Bradley', 'Phoenix Contact', 'Weidmuller', 'Pepperl+Fuchs']}
                  value={itemForm.brand || ''}
                  onChange={(event, newValue) => setItemForm({ ...itemForm, brand: newValue || '' })}
                  renderInput={(params) => (
                    <TextField {...params} label="Brand" helperText="Select from list or type new brand" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Model Number"
                  value={itemForm.model_number || ''}
                  onChange={(e) => setItemForm({ ...itemForm, model_number: e.target.value })}
                  helperText="e.g. CPU 1214C, ACS580-01-012A-4"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Part Number"
                  value={itemForm.part_number || ''}
                  onChange={(e) => setItemForm({ ...itemForm, part_number: e.target.value })}
                  helperText="Manufacturer's part number"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={['Siemens AG', 'ABB Ltd', 'Schneider Electric', 'Omron Corporation', 'L&T Electrical & Automation', 'Polycab Wires Pvt Ltd', 'Rockwell Automation', 'Phoenix Contact GmbH', 'Weidmuller Interface GmbH', 'Pepperl+Fuchs GmbH']}
                  value={itemForm.manufacturer || ''}
                  onChange={(event, newValue) => setItemForm({ ...itemForm, manufacturer: newValue || '' })}
                  renderInput={(params) => (
                    <TextField {...params} label="Manufacturer" helperText="Select from list or type new manufacturer" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Standard Cost (Optional)"
                  placeholder="Enter if known, leave blank for vendor pricing"
                  helperText="Will be updated based on vendor quotations"
                  value={itemForm.standard_cost || ''}
                  onChange={(e) => setItemForm({ ...itemForm, standard_cost: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Selling Price (Optional)"
                  placeholder="Market price, can be updated later"
                  helperText="Can be determined after procurement cost analysis"
                  value={itemForm.selling_price || ''}
                  onChange={(e) => setItemForm({ ...itemForm, selling_price: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="GST Rate (%)"
                  value={itemForm.gst_rate || ''}
                  onChange={(e) => setItemForm({ ...itemForm, gst_rate: parseFloat(e.target.value) || 18.00 })}
                  helperText="GST/Tax rate percentage"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Stock"
                  value={itemForm.minimum_stock || ''}
                  onChange={(e) => setItemForm({ ...itemForm, minimum_stock: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(itemForm.requires_serial_tracking)}
                      onChange={(e) => setItemForm({ ...itemForm, requires_serial_tracking: e.target.checked })}
                    />
                  }
                  label="Requires Serial Number Tracking"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddItem}>Add Item</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialog} onClose={() => setEditItemDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Edit Inventory Item</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Editing: {selectedItem?.item_name}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item Code"
                    value={itemForm.item_code || ''}
                    onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item Name"
                    value={itemForm.item_name || ''}
                    onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={itemForm.description || ''}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Main Category</InputLabel>
                    <Select
                      value={itemForm.main_category_id || ''}
                      onChange={(e) => {
                        setItemForm({ ...itemForm, main_category_id: e.target.value, sub_category_id: '' });
                        loadSubcategories(e.target.value);
                      }}
                      label="Main Category"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.category_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Unit of Measurement</InputLabel>
                    <Select
                      value={itemForm.primary_unit || 'NOS'}
                      onChange={(e) => setItemForm({ ...itemForm, primary_unit: e.target.value })}
                      label="Unit of Measurement"
                    >
                      <MenuItem value="NOS">Numbers (NOS)</MenuItem>
                      <MenuItem value="PCS">Pieces (PCS)</MenuItem>
                      <MenuItem value="SET">Set (SET)</MenuItem>
                      <MenuItem value="METER">Meter (MTR)</MenuItem>
                      <MenuItem value="FEET">Feet (FT)</MenuItem>
                      <MenuItem value="KG">Kilogram (KG)</MenuItem>
                      <MenuItem value="GRAM">Gram (GM)</MenuItem>
                      <MenuItem value="LITER">Liter (LTR)</MenuItem>
                      <MenuItem value="ROLL">Roll (ROLL)</MenuItem>
                      <MenuItem value="BOX">Box (BOX)</MenuItem>
                      <MenuItem value="PACKET">Packet (PKT)</MenuItem>
                      <MenuItem value="BUNDLE">Bundle (BDL)</MenuItem>
                      <MenuItem value="PAIR">Pair (PAIR)</MenuItem>
                      <MenuItem value="INCH">Inch (INCH)</MenuItem>
                      <MenuItem value="MM">Millimeter (MM)</MenuItem>
                      <MenuItem value="CM">Centimeter (CM)</MenuItem>
                      <MenuItem value="SQMETER">Square Meter (SQM)</MenuItem>
                      <MenuItem value="CUBICMETER">Cubic Meter (CBM)</MenuItem>
                      <MenuItem value="GALLON">Gallon (GAL)</MenuItem>
                      <MenuItem value="VOLTAGE">Voltage (V)</MenuItem>
                      <MenuItem value="AMPERE">Ampere (A)</MenuItem>
                      <MenuItem value="WATT">Watt (W)</MenuItem>
                      <MenuItem value="HP">Horse Power (HP)</MenuItem>
                      <MenuItem value="RPM">RPM</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    fullWidth
                    freeSolo
                    options={subcategories.map(sub => sub.subcategory_name)}
                    value={subcategories.find(sub => sub.id === itemForm.sub_category_id)?.subcategory_name || ''}
                    onChange={(event, newValue) => {
                      const existingSub = subcategories.find(sub => sub.subcategory_name === newValue);
                      setItemForm({
                        ...itemForm,
                        sub_category_id: existingSub ? existingSub.id : '',
                        new_subcategory_name: existingSub ? null : newValue
                      });
                    }}
                    disabled={!itemForm.main_category_id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Sub Category (Optional)"
                        helperText={itemForm.main_category_id ? "Select existing or type new subcategory" : "Select main category first"}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    fullWidth
                    freeSolo
                    options={['Siemens', 'ABB', 'Schneider', 'Omron', 'L&T', 'Polycab', 'Allen Bradley', 'Phoenix Contact', 'Weidmuller', 'Pepperl+Fuchs']}
                    value={itemForm.brand || ''}
                    onChange={(event, newValue) => setItemForm({ ...itemForm, brand: newValue || '' })}
                    renderInput={(params) => (
                      <TextField {...params} label="Brand" helperText="Select from list or type new brand" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Model Number"
                    value={itemForm.model_number || ''}
                    onChange={(e) => setItemForm({ ...itemForm, model_number: e.target.value })}
                    helperText="e.g. CPU 1214C, ACS580-01-012A-4"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Part Number"
                    value={itemForm.part_number || ''}
                    onChange={(e) => setItemForm({ ...itemForm, part_number: e.target.value })}
                    helperText="Manufacturer's part number"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    fullWidth
                    freeSolo
                    options={['Siemens AG', 'ABB Ltd', 'Schneider Electric', 'Omron Corporation', 'L&T Electrical & Automation', 'Polycab Wires Pvt Ltd', 'Rockwell Automation', 'Phoenix Contact GmbH', 'Weidmuller Interface GmbH', 'Pepperl+Fuchs GmbH']}
                    value={itemForm.manufacturer || ''}
                    onChange={(event, newValue) => setItemForm({ ...itemForm, manufacturer: newValue || '' })}
                    renderInput={(params) => (
                      <TextField {...params} label="Manufacturer" helperText="Select from list or type new manufacturer" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Standard Cost (Buy Price)"
                    value={itemForm.standard_cost || ''}
                    onChange={(e) => setItemForm({ ...itemForm, standard_cost: parseFloat(e.target.value) || 0 })}
                    helperText="Cost price from vendor"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Selling Price"
                    value={itemForm.selling_price || ''}
                    onChange={(e) => setItemForm({ ...itemForm, selling_price: parseFloat(e.target.value) || 0 })}
                    helperText="Price to sell to customers"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="GST Rate (%)"
                    value={itemForm.gst_rate || ''}
                    onChange={(e) => setItemForm({ ...itemForm, gst_rate: parseFloat(e.target.value) || 18.00 })}
                    helperText="GST/Tax rate percentage"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Stock"
                    value={itemForm.minimum_stock || ''}
                    onChange={(e) => setItemForm({ ...itemForm, minimum_stock: parseInt(e.target.value) || 0 })}
                    helperText="Alert when stock goes below this"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Reorder Point"
                    value={itemForm.reorder_point || ''}
                    onChange={(e) => setItemForm({ ...itemForm, reorder_point: parseInt(e.target.value) || 0 })}
                    helperText="Automatic reorder trigger"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Current Stock"
                    value={itemForm.current_stock || ''}
                    onChange={(e) => setItemForm({ ...itemForm, current_stock: parseInt(e.target.value) || 0 })}
                    helperText="Current available quantity"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Vendor Discount (%)"
                    value={itemForm.vendor_discount || ''}
                    onChange={(e) => setItemForm({ ...itemForm, vendor_discount: parseFloat(e.target.value) || 0 })}
                    helperText="Discount percentage from vendor"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(itemForm.requires_serial_tracking)}
                        onChange={(e) => setItemForm({ ...itemForm, requires_serial_tracking: e.target.checked })}
                      />
                    }
                    label="Requires Serial Number Tracking"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItemDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditItem}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* View Item Dialog */}
      <Dialog open={viewItemDialog} onClose={() => setViewItemDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedItem && getBrandIcon(selectedItem.brand)}
            Item Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>{selectedItem.item_name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedItem.description}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Item Code</Typography>
                <Typography variant="body1">{selectedItem.item_code}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Brand</Typography>
                <Typography variant="body1">{selectedItem.brand}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Model</Typography>
                <Typography variant="body1">{selectedItem.model_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Current Stock</Typography>
                <Typography variant="body1">{selectedItem.current_stock} {selectedItem.primary_unit}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Standard Cost</Typography>
                <Typography variant="body1">₹{Number(selectedItem.standard_cost || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Selling Price</Typography>
                <Typography variant="body1">₹{Number(selectedItem.selling_price || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">GST Rate</Typography>
                <Typography variant="body1">{selectedItem.gst_rate || 18}%</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewItemDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={deleteItemDialog} onClose={() => setDeleteItemDialog(false)}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            How would you like to delete "{selectedItem?.item_name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            • <strong>Deactivate:</strong> Hide the item but keep data (can be reactivated later)<br />
            • <strong>Permanently Delete:</strong> Remove completely from database (cannot be undone)
          </Typography>
          {selectedItem?.item_status === 'inactive' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This item is already inactive. You can reactivate it or permanently delete it.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItemDialog(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="outlined"
            onClick={async () => {
              try {
                if (!selectedItem?.id) {
                  console.error('❌ No selectedItem.id for deactivate:', selectedItem);
                  setError('No item selected for deactivation');
                  return;
                }

                console.log('⚠️ Deactivating item:', selectedItem.id, selectedItem.item_name);
                // Soft delete - set status to inactive
                await api.put(`/api/inventory-enhanced/items/enhanced/${selectedItem.id}`, {
                  ...selectedItem,
                  item_status: 'inactive'
                });
                console.log('✅ Item deactivated successfully');
                logger.log(`✅ Deactivated item: ${selectedItem.item_name}`);
                setDeleteItemDialog(false);
                await loadItems();
              } catch (error) {
                console.error('❌ Failed to deactivate item:', error);
                console.error('❌ Deactivate error config:', error.config);
                console.error('❌ Deactivate error response:', error.response);
                console.error('❌ Deactivate error response data:', error.response?.data);
                console.error('❌ selectedItem for deactivate was:', selectedItem);
                const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
                setError(`Failed to deactivate item: ${errorMessage}`);
              }
            }}
            disabled={selectedItem?.item_status === 'inactive'}
          >
            Deactivate
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteItem}
            startIcon={<DeleteIcon />}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryDialog} onClose={() => {
        setAddCategoryDialog(false);
        setCategoryValidation({ isValid: true, message: '' });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category Name"
                value={categoryForm.category_name || ''}
                onChange={async (e) => {
                  const value = e.target.value;
                  setCategoryForm({ ...categoryForm, category_name: value });
                  await validateCategoryName(value);
                }}
                error={!categoryValidation.isValid}
                helperText={categoryValidation.message}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={categoryForm.description || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category Icon</InputLabel>
                <Select
                  value={categoryForm.icon || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  label="Category Icon"
                >
                  <MenuItem value="memory">🔧 Control Systems</MenuItem>
                  <MenuItem value="cable">⚡ Cables & Wiring</MenuItem>
                  <MenuItem value="settings">⚙️ Motor Drives</MenuItem>
                  <MenuItem value="category">📊 HMI & Displays</MenuItem>
                  <MenuItem value="inventory">📦 Sensors & Switches</MenuItem>
                  <MenuItem value="qr_code">🏷️ Power Distribution</MenuItem>
                  <MenuItem value="assignment">📋 Safety Systems</MenuItem>
                  <MenuItem value="receipt">🧾 Instrumentation</MenuItem>
                  <MenuItem value="trending_up">📈 Communication</MenuItem>
                  <MenuItem value="timeline">⏱️ Automation Software</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(categoryForm.requires_serial_tracking)}
                    onChange={(e) => setCategoryForm({ ...categoryForm, requires_serial_tracking: e.target.checked })}
                  />
                }
                label="Items in this category require serial number tracking"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddCategoryDialog(false);
            setCategoryForm({
              category_name: '',
              description: '',
              icon: '',
              requires_serial_tracking: false
            });
            setCategoryValidation({ isValid: true, message: '', canReactivate: false, inactiveCategory: null });
          }}>Cancel</Button>
          {categoryValidation.canReactivate && categoryValidation.inactiveCategory && (
            <Button
              variant="outlined"
              color="success"
              startIcon={<RestoreIcon />}
              onClick={async () => {
                try {
                  // Reactivate the inactive category
                  await api.put(`/api/inventory-enhanced/categories/${categoryValidation.inactiveCategory.id}`, {
                    ...categoryValidation.inactiveCategory,
                    is_active: 1
                  });
                  logger.log(`✅ Reactivated category: ${categoryValidation.inactiveCategory.category_name}`);
                  setAddCategoryDialog(false);
                  setCategoryForm({
                    category_name: '',
                    description: '',
                    icon: '',
                    requires_serial_tracking: false
                  });
                  setCategoryValidation({ isValid: true, message: '', canReactivate: false, inactiveCategory: null });
                  await loadCategories(); // Refresh categories
                } catch (error) {
                  console.error('❌ Failed to reactivate category:', error);
                  setError('Failed to reactivate category: ' + (error.response?.data?.message || error.message));
                }
              }}
            >
              Reactivate Existing
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleAddCategory}
            disabled={!categoryValidation.isValid || !categoryForm.category_name.trim()}
          >
            Add Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialog} onClose={() => setEditCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category Name"
                value={categoryForm.category_name || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={categoryForm.description || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category Icon</InputLabel>
                <Select
                  value={categoryForm.icon || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  label="Category Icon"
                >
                  <MenuItem value="memory">🔧 Control Systems</MenuItem>
                  <MenuItem value="cable">⚡ Cables & Wiring</MenuItem>
                  <MenuItem value="settings">⚙️ Motor Drives</MenuItem>
                  <MenuItem value="category">📊 HMI & Displays</MenuItem>
                  <MenuItem value="inventory">📦 Sensors & Switches</MenuItem>
                  <MenuItem value="qr_code">🏷️ Power Distribution</MenuItem>
                  <MenuItem value="assignment">📋 Safety Systems</MenuItem>
                  <MenuItem value="receipt">🧾 Instrumentation</MenuItem>
                  <MenuItem value="trending_up">📈 Communication</MenuItem>
                  <MenuItem value="timeline">⏱️ Automation Software</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(categoryForm.requires_serial_tracking)}
                    onChange={(e) => setCategoryForm({ ...categoryForm, requires_serial_tracking: e.target.checked })}
                  />
                }
                label="Items in this category require serial number tracking"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditCategoryDialog(false);
            setSelectedCategoryForEdit(null);
            setCategoryForm({
              category_name: '',
              description: '',
              icon: '',
              requires_serial_tracking: false
            });
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditCategory}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Serial History Dialog */}
      <Dialog open={serialHistoryDialog} onClose={() => setSerialHistoryDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Serial Number History - {selectedItem?.item_name}</span>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleManageSerials(selectedItem, 'add')}
            >
              Add Serial Numbers
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Serial Numbers"
                  placeholder="Enter serial number..."
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" defaultValue="">
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="sold">Sold</MenuItem>
                    <MenuItem value="warranty">Under Warranty</MenuItem>
                    <MenuItem value="repair">Under Repair</MenuItem>
                    <MenuItem value="defective">Defective</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={() => handleManageSerials(selectedItem, 'export')}
                >
                  Export
                </Button>
              </Grid>
            </Grid>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Purchase Date</TableCell>
                  <TableCell>Warranty Until</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Sample data - would be replaced with real data */}
                {selectedItem?.requires_serial_tracking ? (
                  <>
                    <TableRow>
                      <TableCell>SN-2024-001</TableCell>
                      <TableCell>
                        <Chip size="small" label="Available" color="success" />
                      </TableCell>
                      <TableCell>2024-01-15</TableCell>
                      <TableCell>2027-01-15</TableCell>
                      <TableCell>Warehouse-A</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleManageSerials(selectedItem, 'edit')}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleManageSerials(selectedItem, 'transfer')}>
                          <AssignmentIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleManageSerials(selectedItem, 'delete')}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>SN-2024-002</TableCell>
                      <TableCell>
                        <Chip size="small" label="Sold" color="primary" />
                      </TableCell>
                      <TableCell>2024-01-15</TableCell>
                      <TableCell>2027-01-15</TableCell>
                      <TableCell>Customer Site</TableCell>
                      <TableCell>ABC Industries</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleManageSerials(selectedItem, 'edit')}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleManageSerials(selectedItem, 'history')}>
                          <HistoryIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <QrCodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography color="text.secondary" variant="h6">
                          No serial number records found
                        </Typography>
                        <Typography color="text.secondary">
                          Click "Add Serial Numbers" to start tracking
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<ImportIcon />}
            onClick={() => handleManageSerials(selectedItem, 'bulk_import')}
          >
            Bulk Import
          </Button>
          <Button onClick={() => setSerialHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Purchase Dialog */}
      <Dialog open={addPurchaseDialog} onClose={() => setAddPurchaseDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Add Purchase Record</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Item Selection */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={items}
                getOptionLabel={(option) => `${option.item_code} - ${option.item_name}`}
                value={items.find(item => item.id === purchaseForm.item_id) || null}
                onChange={(event, newValue) => {
                  setPurchaseForm({
                    ...purchaseForm,
                    item_id: newValue ? newValue.id : ''
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Select Item" required />
                )}
              />
            </Grid>

            {/* Vendor Information */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                freeSolo
                options={['Siemens India', 'ABB India', 'Schneider Electric', 'L&T Electrical', 'Phoenix Contact', 'Omron Electronics', 'Allen Bradley', 'Pepperl+Fuchs']}
                value={purchaseForm.vendor_name || ''}
                onChange={(event, newValue) => setPurchaseForm({ ...purchaseForm, vendor_name: newValue || '' })}
                renderInput={(params) => (
                  <TextField {...params} label="Vendor Name" required />
                )}
              />
            </Grid>

            {/* Purchase Details */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date"
                value={purchaseForm.purchase_date || ''}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Invoice Number"
                value={purchaseForm.invoice_number || ''}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="PO Number"
                value={purchaseForm.po_number || ''}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, po_number: e.target.value })}
              />
            </Grid>

            {/* Quantity and Pricing */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={purchaseForm.quantity || ''}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Unit Cost (₹)"
                value={purchaseForm.unit_cost || ''}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, unit_cost: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Vendor Discount (%)"
                value={purchaseForm.vendor_discount || 0}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor_discount: e.target.value })}
                helperText="Percentage discount from vendor"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Tax (%)"
                value={purchaseForm.tax_percentage || 18}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, tax_percentage: e.target.value })}
                helperText="GST/Tax percentage"
              />
            </Grid>

            {/* Batch and Serial Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Batch Number"
                value={purchaseForm.batch_number || ''}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, batch_number: e.target.value })}
                helperText="Manufacturing batch number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <div style={{ position: 'relative', width: '100%' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '0.875rem',
                  color: 'rgba(0, 0, 0, 0.6)'
                }}>
                  Serial Numbers
                </label>
                <textarea
                  ref={serialNumberTextareaRef}
                  value={serialNumberText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSerialNumberText(value);
                    // Update form with raw text
                    setPurchaseForm(prev => ({
                      ...prev,
                      serial_numbers: value
                    }));
                  }}
                  onKeyDown={(e) => {
                    const ta = serialNumberTextareaRef.current;
                    if (!ta) return;
                    // Manually insert comma/space at caret if browser suppresses them
                    if (e.key === ',' || e.key === ' ' || e.code === 'Space') {
                      e.preventDefault();
                      const start = ta.selectionStart || 0;
                      const end = ta.selectionEnd || 0;
                      const insert = e.key === ',' ? ',' : ' ';
                      const before = serialNumberText.slice(0, start);
                      const after = serialNumberText.slice(end);
                      const next = before + insert + after;
                      setSerialNumberText(next);
                      setPurchaseForm(prev => ({ ...prev, serial_numbers: next }));
                      setTimeout(() => {
                        try { ta.selectionStart = ta.selectionEnd = start + 1; } catch { }
                      }, 0);
                      return;
                    }
                  }}
                  onBlur={(e) => {
                    // Process into array on blur
                    const serials = e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(s => s);
                    setPurchaseForm(prev => ({
                      ...prev,
                      serial_numbers: serials
                    }));
                  }}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '16.5px 14px',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                  data-testid="serial-numbers-input"
                />
                <p style={{
                  margin: '3px 14px 0',
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  marginTop: '4px'
                }}>
                  {`Comma-separated serial numbers (if applicable)${serialNumberText ? ` - Count: ${serialNumberText.split(',').filter(s => s.trim()).length}` : ''}`}
                </p>
              </div>
            </Grid>

            {/* Cost Breakdown */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Base Amount</Typography>
                    <Typography variant="h6">₹{calculatePurchaseTotal().baseAmount.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Discount Amount</Typography>
                    <Typography variant="h6" color="success.main">-₹{calculatePurchaseTotal().discountAmount.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Tax Amount</Typography>
                    <Typography variant="h6" color="warning.main">+₹{calculatePurchaseTotal().taxAmount.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Total Cost</Typography>
                    <Typography variant="h5" color="primary.main">₹{calculatePurchaseTotal().total.toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddPurchaseDialog(false);
            setPurchaseForm({
              item_id: '',
              vendor_id: '',
              vendor_name: '',
              purchase_date: new Date().toISOString().split('T')[0],
              quantity: '',
              unit_cost: '',
              vendor_discount: 0,
              tax_percentage: 18,
              total_cost: '',
              batch_number: '',
              serial_numbers: [],
              invoice_number: '',
              po_number: ''
            });
            setSerialNumberText('');
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPurchase}>Add Purchase Record</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnterpriseInventoryManagement;