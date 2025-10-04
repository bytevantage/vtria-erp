import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
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
  Divider,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const EstimationDetailView = ({ open, onClose, estimationId }) => {
  const [estimation, setEstimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && estimationId) {
      fetchEstimationDetails();
    }
  }, [open, estimationId]);

  const fetchEstimationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/estimation/${estimationId}/details`);

      if (response.data.success) {
        setEstimation(response.data.data);
      } else {
        setError('Failed to fetch estimation details');
      }
    } catch (error) {
      console.error('Error fetching estimation details:', error);
      setError('Error fetching estimation details');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!estimation?.sections || !Array.isArray(estimation.sections)) return { totalMRP: 0, totalFinalPrice: 0, totalDiscount: 0, discountPercentage: 0 };

    let totalMRP = 0;
    let totalFinalPrice = 0;
    let totalDiscount = 0;

    estimation.sections.forEach(section => {
      // Process items in subsections
      if (section.subsections && Array.isArray(section.subsections)) {
        section.subsections.forEach(subsection => {
          if (subsection.items && Array.isArray(subsection.items)) {
            subsection.items.forEach(item => {
              const mrp = parseFloat(item.mrp) || 0;
              const quantity = parseInt(item.quantity) || 0;
              const finalPrice = parseFloat(item.final_price) || 0;

              totalMRP += mrp * quantity;
              totalFinalPrice += finalPrice;
              totalDiscount += (mrp * quantity) - finalPrice;
            });
          }
        });
      }

      // Also process direct items in sections (if any)
      if (section.items && Array.isArray(section.items)) {
        section.items.forEach(item => {
          const mrp = parseFloat(item.mrp) || 0;
          const quantity = parseInt(item.quantity) || 0;
          const finalPrice = parseFloat(item.final_price) || 0;

          totalMRP += mrp * quantity;
          totalFinalPrice += finalPrice;
          totalDiscount += (mrp * quantity) - finalPrice;
        });
      }
    });

    return {
      totalMRP,
      totalFinalPrice,
      totalDiscount,
      discountPercentage: totalMRP > 0 ? (totalDiscount / totalMRP) * 100 : 0
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Open print dialog which can save as PDF
    window.print();
  };

  const totals = calculateTotals();

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '95vh',
          borderRadius: '12px'
        }
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        color: 'white',
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 3
      }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          Estimation Details
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleExportPDF}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            Save as PDF
          </Button>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              borderRadius: '8px'
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: '#f8fafc' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography>Loading estimation details...</Typography>
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography color="error">{error}</Typography>
          </Box>
        ) : estimation ? (
          <Box sx={{ p: 4 }}>
            {/* Header Information */}
            <Card sx={{ mb: 4, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
                      {estimation.estimation_id}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#64748b', mb: 3 }}>
                      {estimation.project_name}
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>Client:</strong> {estimation.client_name}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>Location:</strong> {estimation.city}, {estimation.state}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>Date:</strong> {new Date(estimation.date).toLocaleDateString('en-IN')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>Enquiry ID:</strong> {estimation.enquiry_id}
                        </Typography>
                        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body1">
                            <strong>Status:</strong>
                          </Typography>
                          <Chip
                            label={estimation.status?.toUpperCase()}
                            color={estimation.status === 'approved' ? 'success' : estimation.status === 'draft' ? 'warning' : 'default'}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                        <Typography variant="body1">
                          <strong>Created By:</strong> {estimation.created_by_name}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{
                      p: 3,
                      backgroundColor: '#1e293b',
                      color: 'white',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#e2e8f0' }}>
                        Total MRP
                      </Typography>
                      <Typography variant="h3" fontWeight={700} sx={{ color: '#22d3ee', mb: 2 }}>
                        ₹{totals.totalMRP.toLocaleString('en-IN')}
                      </Typography>
                      {totals.totalDiscount > 0 && (
                        <Typography variant="body2" color="error" sx={{ color: '#fca5a5' }}>
                          Total Discount: {totals.discountPercentage.toFixed(1)}% (₹{totals.totalDiscount.toLocaleString('en-IN')})
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card sx={{
                      p: 3,
                      backgroundColor: '#22c55e',
                      color: 'white',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#f0fdf4' }}>
                        Final Total
                      </Typography>
                      <Typography variant="h3" fontWeight={700} sx={{ color: 'white', mb: 2 }}>
                        ₹{totals.totalFinalPrice.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#dcfce7' }}>
                        After discounts applied
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Sections and Items */}
            {estimation.sections && Array.isArray(estimation.sections) && estimation.sections.map((section, sectionIndex) => (
              <Card key={section.id} sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Accordion defaultExpanded={sectionIndex === 0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f1f5f9' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {section.heading || section.section_name}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {/* Display subsections and their items */}
                    {section.subsections && Array.isArray(section.subsections) ? (
                      section.subsections.map(subsection => (
                        <Box key={subsection.id} sx={{ mb: subsection !== section.subsections[section.subsections.length - 1] ? 3 : 0 }}>
                          {section.subsections.length > 1 && (
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151', mb: 2, pl: 1 }}>
                              {subsection.subsection_name}
                            </Typography>
                          )}
                          {subsection.items && Array.isArray(subsection.items) && subsection.items.length > 0 ? (
                            <TableContainer component={Paper} sx={{ borderRadius: '8px' }}>
                              <Table>
                                <TableHead>
                                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                                    <TableCell><strong>Product</strong></TableCell>
                                    <TableCell><strong>Make/Model</strong></TableCell>
                                    <TableCell align="right"><strong>MRP</strong></TableCell>
                                    <TableCell align="center"><strong>Qty</strong></TableCell>
                                    <TableCell align="right"><strong>Subtotal</strong></TableCell>
                                    <TableCell align="center"><strong>Discount</strong></TableCell>
                                    <TableCell align="right"><strong>Final Price</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {subsection.items.map((item) => (
                                    <TableRow key={item.id} hover>
                                      <TableCell>
                                        <Box>
                                          <Typography variant="body2" fontWeight={600}>
                                            {item.item_name || item.product_name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Code: {item.item_code || item.part_code}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box>
                                          <Typography variant="body2">
                                            {(item.make && item.make !== 'Unknown' ? item.make : '') +
                                              (item.model && item.model !== 'N/A' ? ` ${item.model}` : '') ||
                                              'Not specified'}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {item.category_name}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell align="right">
                                        ₹{parseFloat(item.mrp || 0).toLocaleString('en-IN')}
                                      </TableCell>
                                      <TableCell align="center">
                                        {item.quantity}
                                      </TableCell>
                                      <TableCell align="right">
                                        ₹{(parseFloat(item.mrp || 0) * parseInt(item.quantity || 0)).toLocaleString('en-IN')}
                                      </TableCell>
                                      <TableCell align="center">
                                        {parseFloat(item.discount_percentage || 0).toFixed(1)}%
                                      </TableCell>
                                      <TableCell align="right">
                                        <Typography variant="body2" fontWeight={600} color="primary">
                                          ₹{parseFloat(item.final_price || 0).toLocaleString('en-IN')}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
                              No items in {subsection.subsection_name}
                            </Typography>
                          )}
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
                        No subsections in this section
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Card>
            ))}

            {!estimation.sections || estimation.sections.length === 0 && (
              <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
                <Typography variant="h6" color="text.secondary">
                  No sections found in this estimation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Use the Design Estimation feature to add sections and items
                </Typography>
              </Card>
            )}
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default EstimationDetailView;