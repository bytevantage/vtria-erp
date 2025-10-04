import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Divider
} from '@mui/material';

const QuotationPrintTemplate = ({ quotation, items, onPrint }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  React.useEffect(() => {
    if (onPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [onPrint]);

  return (
    <Box sx={{ 
      p: 4, 
      maxWidth: '210mm', 
      minHeight: '297mm',
      margin: '0 auto',
      backgroundColor: 'white',
      '@media print': {
        p: 2,
        boxShadow: 'none',
        margin: 0,
        maxWidth: 'none'
      }
    }}>
      {/* Company Letterhead */}
      <Box sx={{ mb: 4, textAlign: 'center', borderBottom: '3px solid #1976d2', pb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 1 }}>
          VTRIA ENGINEERING SOLUTIONS
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Electrical Panel Manufacturing & Industrial Automation
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Address: [Company Address], Mangalore, Karnataka - [Pincode]
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Phone: [Phone Number] | Email: [Email] | GST: [GST Number]
        </Typography>
        <Typography variant="body2">
          Website: www.vtriaengineering.com
        </Typography>
      </Box>

      {/* Document Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 1 }}>
          QUOTATION
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {quotation.quotation_id}
        </Typography>
      </Box>

      {/* Quotation Details */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
            Bill To:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {quotation.client_name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {quotation.client_contact}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {quotation.client_address}
          </Typography>
          {quotation.client_gstin && (
            <Typography variant="body2">
              <strong>GSTIN:</strong> {quotation.client_gstin}
            </Typography>
          )}
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Date:</strong> {formatDate(quotation.date)}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Valid Until:</strong> {formatDate(quotation.valid_until)}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Project:</strong> {quotation.project_name}
            </Typography>
            <Typography variant="body2">
              <strong>Estimation Ref:</strong> {quotation.estimation_reference}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Items Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Sr No</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>HSN/SAC</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', textAlign: 'center' }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', textAlign: 'right' }}>Rate</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', textAlign: 'right' }}>Discount</TableCell>
              <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', textAlign: 'right' }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items?.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center' }}>
                  {index + 1}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {item.section_name || item.product_name}
                  </Typography>
                  {item.description && (
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center' }}>
                  {item.hsn_code || '-'}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center' }}>
                  {item.quantity}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd' }}>
                  {item.unit || 'nos'}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right' }}>
                  {formatCurrency(item.rate)}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right' }}>
                  {item.discount_percentage ? `${item.discount_percentage}%` : '-'}
                </TableCell>
                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Totals Section */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={8}>
          {/* Amount in Words */}
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Amount in Words:
          </Typography>
          <Typography variant="body2" sx={{ 
            border: '1px solid #ddd', 
            p: 1, 
            minHeight: '40px',
            fontStyle: 'italic'
          }}>
            {/* This would need a number-to-words conversion function */}
            [Amount in words will be calculated]
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ border: '1px solid #ddd' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #ddd' }}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(quotation.subtotal)}
              </Typography>
            </Box>
            {quotation.discount_amount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #ddd' }}>
                <Typography variant="body2">Discount ({quotation.discount_percentage}%):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  -{formatCurrency(quotation.discount_amount)}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #ddd' }}>
              <Typography variant="body2">Tax (GST):</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(quotation.total_tax)}
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              p: 1, 
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold'
            }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Grand Total:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                {formatCurrency(quotation.grand_total)}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Terms and Conditions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
          Terms & Conditions:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Payment Terms:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem' }}>
              {quotation.payment_terms}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Delivery Terms:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem' }}>
              {quotation.delivery_terms}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Warranty Terms:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem' }}>
              {quotation.warranty_terms}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>General Terms:</strong>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {quotation.terms_conditions}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        mt: 4, 
        pt: 2, 
        borderTop: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Prepared by:</strong>
          </Typography>
          <Typography variant="body2">
            {quotation.created_by_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(quotation.created_at)}
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" sx={{ mb: 3 }}>
            <strong>For VTRIA Engineering Solutions</strong>
          </Typography>
          <Box sx={{ 
            borderBottom: '1px solid #000', 
            width: '200px', 
            height: '60px',
            mb: 1
          }} />
          <Typography variant="body2">
            Authorized Signatory
          </Typography>
        </Box>
      </Box>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Box>
  );
};

export default QuotationPrintTemplate;
