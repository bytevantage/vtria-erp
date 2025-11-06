import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    Box,
    Typography,
    IconButton
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const PDFGenerator = ({
    documentType,
    documentId,
    documentNumber,
    buttonText = "Generate PDF",
    variant = "contained",
    size = "medium",
    disabled = false
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);

    const API_BASE_URL = '';

    const generatePDF = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            let endpoint = '';
            switch (documentType) {
                case 'quotation':
                    endpoint = `/api/pdf/quotation/${documentId}`;
                    break;
                case 'purchase-order':
                    endpoint = `/api/pdf/purchase-order/${documentId}`;
                    break;
                case 'grn':
                    endpoint = `/api/pdf/grn/${documentId}`;
                    break;
                default:
                    throw new Error('Invalid document type');
            }

            const response = await axios.post(`${API_BASE_URL}${endpoint}`, {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                setSuccess('PDF generated successfully!');
                setPdfUrl(response.data.downloadUrl);
                setDialogOpen(true);
            } else {
                setError('Failed to generate PDF');
            }
        } catch (err) {
            console.error('PDF generation error:', err);
            setError(err.response?.data?.error || 'Failed to generate PDF');
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (pdfUrl) {
            const link = document.createElement('a');
            link.href = `${API_BASE_URL}${pdfUrl}`;
            link.download = `${documentType}_${documentNumber}_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const viewPDF = () => {
        if (pdfUrl) {
            const viewUrl = pdfUrl.replace('/download/', '/view/');
            window.open(`${API_BASE_URL}${viewUrl}`, '_blank');
        }
    };

    const handleClose = () => {
        setDialogOpen(false);
        setError(null);
        setSuccess(null);
        setPdfUrl(null);
    };

    return (
        <>
            <Button
                variant={variant}
                size={size}
                startIcon={loading ? <CircularProgress size={20} /> : <PdfIcon />}
                onClick={generatePDF}
                disabled={disabled || loading}
                sx={{ minWidth: 140 }}
            >
                {loading ? 'Generating...' : buttonText}
            </Button>

            {/* Error Alert */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mt: 1 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Success Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">PDF Generated Successfully</Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        <PdfIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                        <Typography variant="body1" gutterBottom>
                            Your {documentType.replace('-', ' ')} PDF has been generated successfully.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Document: {documentNumber}
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={viewPDF}
                        sx={{ mr: 1 }}
                    >
                        View PDF
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={downloadPDF}
                    >
                        Download PDF
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// Specific PDF generator components for different document types
export const QuotationPDFGenerator = ({ quotationId, quotationNumber, ...props }) => (
    <PDFGenerator
        documentType="quotation"
        documentId={quotationId}
        documentNumber={quotationNumber}
        buttonText="Generate Quotation PDF"
        {...props}
    />
);

export const PurchaseOrderPDFGenerator = ({ poId, poNumber, ...props }) => (
    <PDFGenerator
        documentType="purchase-order"
        documentId={poId}
        documentNumber={poNumber}
        buttonText="Generate PO PDF"
        {...props}
    />
);

export const GRNPDFGenerator = ({ grnId, grnNumber, ...props }) => (
    <PDFGenerator
        documentType="grn"
        documentId={grnId}
        documentNumber={grnNumber}
        buttonText="Generate GRN PDF"
        {...props}
    />
);

export default PDFGenerator;
