import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Divider,
  Card,
  CardContent,
  TextField,
  MenuItem
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const QuotationEnhanced = ({ estimationId, onQuotationCreated }) => {
  const [quotationData, setQuotationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clientState, setClientState] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [states, setStates] = useState([
    'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana',
    'Kerala', 'Goa', 'Gujarat', 'Rajasthan', 'Delhi', 'Mumbai'
  ]);

  useEffect(() => {
    if (estimationId) {
      fetchEstimationData();
    }
  }, [estimationId]);

  const fetchEstimationData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/estimation/${estimationId}`);
      if (response.data.success) {
        setClientState(response.data.data.client_state || 'Karnataka');
      }
    } catch (error) {
      console.error('Error fetching estimation:', error);
    }
  };

  const generateQuotation = async () => {
    try {
      setLoading(true);

      const quotationPayload = {
        estimation_id: estimationId,
        client_state: clientState,
        lead_time_days: leadTimeDays,
        notes: notes
      };

      const response = await axios.post(`${API_BASE_URL}/quotation/enhanced`, quotationPayload);

      if (response.data.success) {
        setQuotationData(response.data.data);

        if (response.data.data.is_low_profit) {
          alert(`Warning: Low profit margin (${response.data.data.profit_percentage.toFixed(2)}%)! Please review pricing.`);
        }

        if (onQuotationCreated) {
          onQuotationCreated(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error generating quotation:', error);
      alert('Error generating quotation');
    } finally {
      setLoading(false);
    }
  };

  const downloadQuotationPDF = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/pdf/quotation/${quotationData.id}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quotationData.quotation_number}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF');
    }
  };

  const generateBOM = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/bom`, {
        quotation_id: quotationData.id,
        notes: 'Auto-generated from quotation'
      });

      if (response.data.success) {
        alert('BOM generated successfully!');
      }
    } catch (error) {
      console.error('Error generating BOM:', error);
      alert('Error generating BOM');
    }
  };

  if (!estimationId) {
    return (
      <Alert severity="info">
        Please select an estimation to generate quotation.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Enhanced Quotation Generator
      </Typography>

      {!quotationData ? (
        // Quotation Generation Form
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Generate Quotation from Estimation
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Client State"
                value={clientState}
                onChange={(e) => setClientState(e.target.value)}
                helperText="Used for tax calculation (CGST/SGST vs IGST)"
              >
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                type="number"
                fullWidth
                label="Lead Time (Days)"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 7)}
                inputProps={{ min: 1, max: 365 }}
                helperText="Delivery lead time"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                fullWidth
                onClick={generateQuotation}
                disabled={loading}
                sx={{ height: 56 }}
              >
                Generate Quotation
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional terms and conditions..."
              />
            </Grid>
          </Grid>
        </Paper>
      ) : (
        // Generated Quotation Display
        <Box>
          {/* Profit Warning */}
          {quotationData.is_low_profit && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                <strong>Low Profit Alert!</strong>
              </Typography>
              <Typography variant="body2">
                Current profit margin is {quotationData.profit_percentage?.toFixed(2)}%,
                which is below the recommended 10% threshold.
              </Typography>
            </Alert>
          )}

          {/* Company Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" color="primary" gutterBottom>
                VTRIA Engineering Solutions Pvt Ltd
              </Typography>
              <Typography variant="body1">
                Industrial Automation | Electrical Control Panels | HVAC | Industrial Refrigeration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mangalore, Karnataka | Bangalore, Karnataka | Pune, Maharashtra
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Quotation Details</Typography>
                <Typography><strong>Quotation No:</strong> {quotationData.quotation_number}</Typography>
                <Typography><strong>Date:</strong> {new Date(quotationData.quotation_date).toLocaleDateString()}</Typography>
                <Typography><strong>Lead Time:</strong> {quotationData.lead_time_days} days</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Client Details</Typography>
                <Typography><strong>Client:</strong> {quotationData.client_name}</Typography>
                <Typography><strong>Project:</strong> {quotationData.project_name}</Typography>
                <Typography><strong>State:</strong> {quotationData.client_state}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Items Table */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Item Details
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>S.No</strong></TableCell>
                    <TableCell><strong>Image</strong></TableCell>
                    <TableCell><strong>Item Description</strong></TableCell>
                    <TableCell><strong>HSN/SAC</strong></TableCell>
                    <TableCell><strong>Qty</strong></TableCell>
                    <TableCell><strong>Unit</strong></TableCell>
                    <TableCell><strong>Rate</strong></TableCell>
                    <TableCell><strong>Discount</strong></TableCell>
                    <TableCell><strong>Tax %</strong></TableCell>
                    <TableCell><strong>Amount</strong></TableCell>
                    <TableCell><strong>Lead Time</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotationData.items?.map((item, index) => (
                    <TableRow key={`quotation-item-${item.section_name || item.product_name || 'item'}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {item.item_image_url ? (
                          <img
                            src={item.item_image_url}
                            alt={item.section_name}
                            style={{ width: 40, height: 40, objectFit: 'cover' }}
                          />
                        ) : (
                          <Box sx={{ width: 40, height: 40, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption">IMG</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2"><strong>{item.section_name}</strong></Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.hsn_code}</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>Set</TableCell>
                      <TableCell>₹{item.rate.toLocaleString()}</TableCell>
                      <TableCell>{item.discount_percentage}%</TableCell>
                      <TableCell>{item.tax_rate}%</TableCell>
                      <TableCell><strong>₹{item.amount.toLocaleString()}</strong></TableCell>
                      <TableCell>{item.lead_time_days} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Tax Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tax Summary
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1">
                    <strong>Subtotal: ₹{quotationData.subtotal?.toLocaleString()}</strong>
                  </Typography>

                  {quotationData.is_interstate ? (
                    <Typography variant="body1">
                      IGST ({quotationData.igst_rate}%): ₹{quotationData.total_igst?.toLocaleString()}
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body1">
                        CGST ({quotationData.cgst_rate}%): ₹{quotationData.total_cgst?.toLocaleString()}
                      </Typography>
                      <Typography variant="body1">
                        SGST ({quotationData.sgst_rate}%): ₹{quotationData.total_sgst?.toLocaleString()}
                      </Typography>
                    </>
                  )}

                  <Typography variant="body1">
                    <strong>Total Tax: ₹{quotationData.total_tax?.toLocaleString()}</strong>
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="h6" color="primary">
                    <strong>Grand Total: ₹{quotationData.grand_total?.toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Profit Analysis
                    </Typography>
                    <Typography variant="body2">
                      <strong>Profit %:</strong> {quotationData.profit_percentage?.toFixed(2)}%
                    </Typography>
                    <Chip
                      label={quotationData.profit_percentage >= 10 ? 'Good Margin' : 'Low Margin'}
                      color={quotationData.profit_percentage >= 10 ? 'success' : 'warning'}
                      icon={quotationData.profit_percentage >= 10 ? <CheckCircleIcon /> : <WarningIcon />}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={downloadQuotationPDF}
            >
              Download Quotation PDF
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={generateBOM}
            >
              Generate BOM
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() => {
                // Submit for approval logic
                alert('Quotation submitted for approval!');
              }}
            >
              Submit for Approval
            </Button>
          </Box>

          {/* Terms and Conditions */}
          {notes && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Terms & Conditions
              </Typography>
              <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                {notes}
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default QuotationEnhanced;
