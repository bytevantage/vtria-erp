import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const EstimationEnhanced = ({ enquiryId, onEstimationCreated }) => {
  const [sections, setSections] = useState([
    {
      section_name: 'Main Panel',
      section_order: 1,
      subsections: [
        {
          subsection_name: 'Incoming',
          subsection_order: 1,
          items: []
        }
      ]
    }
  ]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSubsectionId, setEditingSubsectionId] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSubsectionName, setNewSubsectionName] = useState('');
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [currentSubsectionIndex, setCurrentSubsectionIndex] = useState({ section: 0, subsection: 0 });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products`);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addSection = () => {
    const newSection = {
      section_name: 'New Section',
      section_order: sections.length + 1,
      subsections: [
        {
          subsection_name: 'General',
          subsection_order: 1,
          items: []
        }
      ]
    };
    setSections([...sections, newSection]);
  };

  const addSubsection = (sectionIndex) => {
    const updatedSections = [...sections];
    const newSubsection = {
      subsection_name: 'New Subsection',
      subsection_order: updatedSections[sectionIndex].subsections.length + 1,
      items: []
    };
    updatedSections[sectionIndex].subsections.push(newSubsection);
    setSections(updatedSections);
  };

  const updateSectionName = (sectionIndex, newName) => {
    const updatedSections = [...sections];
    updatedSections[sectionIndex].section_name = newName;
    setSections(updatedSections);
    setEditingSectionId(null);
  };

  const updateSubsectionName = (sectionIndex, subsectionIndex, newName) => {
    const updatedSections = [...sections];
    updatedSections[sectionIndex].subsections[subsectionIndex].subsection_name = newName;
    setSections(updatedSections);
    setEditingSubsectionId(null);
  };

  const openAddItemDialog = (sectionIndex, subsectionIndex) => {
    setCurrentSubsectionIndex({ section: sectionIndex, subsection: subsectionIndex });
    setShowAddItemDialog(true);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemDiscount(0);
  };

  const addItemToSubsection = () => {
    if (!selectedProduct) return;

    const discountedPrice = selectedProduct.last_price * (1 - itemDiscount / 100);
    const finalPrice = itemQuantity * discountedPrice;

    const newItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      make: selectedProduct.make,
      model: selectedProduct.model,
      part_code: selectedProduct.part_code,
      category_name: selectedProduct.category_name,
      subcategory_name: selectedProduct.subcategory_name,
      quantity: itemQuantity,
      mrp: selectedProduct.mrp,
      last_price: selectedProduct.last_price,
      discount_percentage: itemDiscount,
      discounted_price: discountedPrice,
      final_price: finalPrice,
      unit: selectedProduct.unit,
      stock_available: selectedProduct.stock_quantity || 0,
      is_stock_available: (selectedProduct.stock_quantity || 0) >= itemQuantity
    };

    const updatedSections = [...sections];
    updatedSections[currentSubsectionIndex.section]
      .subsections[currentSubsectionIndex.subsection]
      .items.push(newItem);

    setSections(updatedSections);
    setShowAddItemDialog(false);
  };

  const updateItemDiscount = (sectionIndex, subsectionIndex, itemIndex, newDiscount) => {
    const updatedSections = [...sections];
    const item = updatedSections[sectionIndex].subsections[subsectionIndex].items[itemIndex];

    const discountedPrice = item.last_price * (1 - newDiscount / 100);
    const finalPrice = item.quantity * discountedPrice;

    item.discount_percentage = newDiscount;
    item.discounted_price = discountedPrice;
    item.final_price = finalPrice;

    setSections(updatedSections);
  };

  const removeItem = (sectionIndex, subsectionIndex, itemIndex) => {
    const updatedSections = [...sections];
    updatedSections[sectionIndex].subsections[subsectionIndex].items.splice(itemIndex, 1);
    setSections(updatedSections);
  };

  const calculateTotals = () => {
    let totalMRP = 0;
    let totalDiscounted = 0;
    let totalDiscountAmount = 0;

    sections.forEach(section => {
      section.subsections.forEach(subsection => {
        subsection.items.forEach(item => {
          const itemMRP = item.quantity * item.mrp;
          totalMRP += itemMRP;
          totalDiscounted += item.final_price;
          totalDiscountAmount += (itemMRP - item.final_price);
        });
      });
    });

    return { totalMRP, totalDiscounted, totalDiscountAmount };
  };

  const saveEstimation = async () => {
    try {
      setLoading(true);

      const { totalMRP, totalDiscounted, totalDiscountAmount } = calculateTotals();

      const estimationData = {
        enquiry_id: enquiryId,
        sections: sections,
        notes: 'Generated from enhanced estimation form'
      };

      const response = await axios.post(`${API_BASE_URL}/estimation/enhanced`, estimationData);

      if (response.data.success) {
        alert('Estimation created successfully!');
        if (onEstimationCreated) {
          onEstimationCreated(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error saving estimation:', error);
      alert('Error saving estimation');
    } finally {
      setLoading(false);
    }
  };

  const { totalMRP, totalDiscounted, totalDiscountAmount } = calculateTotals();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Enhanced Estimation - Dynamic Sections
      </Typography>

      {/* Summary Card */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="primary">
              Total MRP: ₹{totalMRP.toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="success.main">
              Final Amount: ₹{totalDiscounted.toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="error.main">
              Total Discount: ₹{totalDiscountAmount.toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="text.secondary">
              Discount %: {totalMRP > 0 ? ((totalDiscountAmount / totalMRP) * 100).toFixed(2) : 0}%
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Sections */}
      {sections.map((section, sectionIndex) => (
        <Accordion key={sectionIndex} defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {editingSectionId === sectionIndex ? (
                <TextField
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onBlur={() => updateSectionName(sectionIndex, newSectionName)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateSectionName(sectionIndex, newSectionName);
                    }
                  }}
                  size="small"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {section.section_name}
                </Typography>
              )}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSectionId(sectionIndex);
                  setNewSectionName(section.section_name);
                }}
              >
                <EditIcon />
              </IconButton>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            {/* Subsections */}
            {section.subsections.map((subsection, subsectionIndex) => (
              <Paper key={subsectionIndex} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {editingSubsectionId === `${sectionIndex}-${subsectionIndex}` ? (
                    <TextField
                      value={newSubsectionName}
                      onChange={(e) => setNewSubsectionName(e.target.value)}
                      onBlur={() => updateSubsectionName(sectionIndex, subsectionIndex, newSubsectionName)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateSubsectionName(sectionIndex, subsectionIndex, newSubsectionName);
                        }
                      }}
                      size="small"
                      autoFocus
                    />
                  ) : (
                    <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                      {subsection.subsection_name}
                    </Typography>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingSubsectionId(`${sectionIndex}-${subsectionIndex}`);
                      setNewSubsectionName(subsection.subsection_name);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => openAddItemDialog(sectionIndex, subsectionIndex)}
                    sx={{ ml: 1 }}
                  >
                    Add Item
                  </Button>
                </Box>

                {/* Items Table */}
                {subsection.items.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Make/Model</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>MRP</TableCell>
                          <TableCell>Discount %</TableCell>
                          <TableCell>Final Price</TableCell>
                          <TableCell>Stock</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {subsection.items.map((item, itemIndex) => (
                          <TableRow
                            key={`${item.part_code || item.product_name || 'item'}-${itemIndex}`}
                            sx={{
                              bgcolor: !item.is_stock_available ? 'warning.light' : 'inherit',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {item.product_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.part_code}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.make} {item.model}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">
                                  {item.quantity} {item.unit}
                                </Typography>
                                {!item.is_stock_available && (
                                  <Tooltip title="Insufficient stock">
                                    <WarningIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>₹{item.mrp.toLocaleString()}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={item.discount_percentage}
                                onChange={(e) => updateItemDiscount(
                                  sectionIndex,
                                  subsectionIndex,
                                  itemIndex,
                                  parseFloat(e.target.value) || 0
                                )}
                                size="small"
                                sx={{ width: 80 }}
                                inputProps={{ min: 0, max: 100, step: 0.1 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                ₹{item.final_price.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.stock_available}
                                size="small"
                                color={item.is_stock_available ? 'success' : 'warning'}
                                icon={item.is_stock_available ? <CheckCircleIcon /> : <WarningIcon />}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeItem(sectionIndex, subsectionIndex, itemIndex)}
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
              </Paper>
            ))}

            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => addSubsection(sectionIndex)}
              size="small"
            >
              Add Subsection
            </Button>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={addSection}
        >
          Add Section
        </Button>
        <Button
          startIcon={<SaveIcon />}
          variant="contained"
          onClick={saveEstimation}
          disabled={loading}
        >
          Save Estimation
        </Button>
      </Box>

      {/* Add Item Dialog */}
      <Dialog
        open={showAddItemDialog}
        onClose={() => setShowAddItemDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Item to Subsection</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Select Product"
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const product = products.find(p => p.id === parseInt(e.target.value));
                  setSelectedProduct(product);
                }}
                SelectProps={{ native: true }}
              >
                <option value="">Select a product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.make} {product.model} ({product.part_code})
                  </option>
                ))}
              </TextField>
            </Grid>

            {selectedProduct && (
              <>
                <Grid item xs={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Quantity"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Discount %"
                    value={itemDiscount}
                    onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2"><strong>MRP:</strong> ₹{selectedProduct.mrp}</Typography>
                    <Typography variant="body2"><strong>Last Price:</strong> ₹{selectedProduct.last_price}</Typography>
                    <Typography variant="body2"><strong>Stock Available:</strong> {selectedProduct.stock_quantity || 0}</Typography>
                    <Typography variant="body2"><strong>Final Price:</strong> ₹{(itemQuantity * selectedProduct.last_price * (1 - itemDiscount / 100)).toLocaleString()}</Typography>
                    {(selectedProduct.stock_quantity || 0) < itemQuantity && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Insufficient stock! Available: {selectedProduct.stock_quantity || 0}
                      </Alert>
                    )}
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddItemDialog(false)}>Cancel</Button>
          <Button
            onClick={addItemToSubsection}
            variant="contained"
            disabled={!selectedProduct}
          >
            Add Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstimationEnhanced;
