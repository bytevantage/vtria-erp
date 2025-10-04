import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const DocumentManager = ({ manufacturingCaseId, documents, onDocumentsUpdate }) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const documentTypes = [
    { value: 'drawing', label: 'Technical Drawing' },
    { value: 'specification', label: 'Specification' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'photo', label: 'Photo' },
    { value: 'report', label: 'Report' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

      if (!allowedTypes.includes(file.type)) {
        setError('File type not allowed. Please select PDF, image, or document files.');
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('vtria_token') || 'demo-token';

      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('document_type', documentType);
      formData.append('description', description);

      const response = await axios.post(
        `${API_BASE_URL}/api/manufacturing/cases/${manufacturingCaseId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setDescription('');
        setDocumentType('other');
        setError('');

        // Refresh documents list
        if (onDocumentsUpdate) {
          onDocumentsUpdate();
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const token = localStorage.getItem('vtria_token') || 'demo-token';
      const response = await axios.get(
        `${API_BASE_URL}/api/manufacturing/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const token = localStorage.getItem('vtria_token') || 'demo-token';
        await axios.delete(
          `${API_BASE_URL}/api/manufacturing/documents/${documentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Refresh documents list
        if (onDocumentsUpdate) {
          onDocumentsUpdate();
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        setError('Failed to delete document');
      }
    }
  };

  const getFileIcon = (fileName, documentType) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') return <PdfIcon color="error" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return <ImageIcon color="primary" />;
    if (documentType === 'drawing') return <DocIcon color="info" />;

    return <DocIcon />;
  };

  const getDocumentTypeColor = (type) => {
    const colors = {
      'drawing': 'primary',
      'specification': 'secondary',
      'certificate': 'success',
      'photo': 'info',
      'report': 'warning',
      'other': 'default'
    };
    return colors[type] || 'default';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Documents ({documents?.length || 0})
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Document
            </Button>
          </Box>

          {documents && documents.length > 0 ? (
            <List>
              {documents.map((doc, index) => (
                <React.Fragment key={doc.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        {getFileIcon(doc.document_name, doc.document_type)}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {doc.document_name}
                          </Typography>
                          <Chip
                            label={documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                            color={getDocumentTypeColor(doc.document_type)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {doc.description && (
                            <Typography variant="body2" color="textSecondary">
                              {doc.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary">
                            Uploaded by {doc.uploaded_by_name} • {formatFileSize(doc.file_size)} • {new Date(doc.upload_date).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />

                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(doc.id, doc.document_name)}
                        title="Download"
                      >
                        <DownloadIcon />
                      </IconButton>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItem>

                  {index < documents.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No documents uploaded yet
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Upload drawings, specifications, photos, and other relevant documents
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Document</DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <input
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadIcon />}
                  sx={{ height: 56 }}
                >
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </Button>
              </label>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={documentType}
                  label="Document Type"
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  {documentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document..."
              />
            </Grid>

            {selectedFile && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>File:</strong> {selectedFile.name}<br />
                    <strong>Size:</strong> {formatFileSize(selectedFile.size)}<br />
                    <strong>Type:</strong> {selectedFile.type}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentManager;