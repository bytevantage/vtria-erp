/**
 * Documents Management Page for VTRIA ERP
 * File upload and document management interface
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  CloudUpload,
  Download,
  Visibility,
  Delete,
  Description,
  PictureAsPdf,
  Image
} from '@mui/icons-material';

// Sample documents data
const sampleDocuments = [
  {
    id: '1',
    filename: 'pump-installation-report.pdf',
    original_name: 'Pump Installation Report - ABC Industries.pdf',
    document_type: 'REPORT',
    file_size: 2048576,
    case_number: 'CASE-2024-0001',
    uploaded_by: 'John Doe',
    created_at: '2024-01-20T10:30:00Z',
    mime_type: 'application/pdf'
  },
  {
    id: '2',
    filename: 'motor-specs.pdf',
    original_name: 'Motor Specifications.pdf',
    document_type: 'CASE_ATTACHMENT',
    file_size: 1024000,
    case_number: 'CASE-2024-0002',
    uploaded_by: 'Jane Smith',
    created_at: '2024-01-18T14:15:00Z',
    mime_type: 'application/pdf'
  }
];

const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return <PictureAsPdf color="error" />;
  if (mimeType?.includes('image')) return <Image color="info" />;
  return <Description color="action" />;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Documents = () => {
  const [documents, setDocuments] = useState(sampleDocuments);
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const columns = [
    {
      field: 'icon',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => getFileIcon(params.row.mime_type)
    },
    {
      field: 'original_name',
      headerName: 'Document Name',
      width: 300,
      flex: 1
    },
    {
      field: 'document_type',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value.replace('_', ' ')}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'file_size',
      headerName: 'Size',
      width: 100,
      valueFormatter: (params) => formatFileSize(params.value)
    },
    {
      field: 'case_number',
      headerName: 'Case',
      width: 150
    },
    {
      field: 'uploaded_by',
      headerName: 'Uploaded By',
      width: 130
    },
    {
      field: 'created_at',
      headerName: 'Upload Date',
      width: 130,
      type: 'date',
      valueGetter: (params) => new Date(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small">
            <Visibility />
          </IconButton>
          <IconButton size="small">
            <Download />
          </IconButton>
          <IconButton size="small" color="error">
            <Delete />
          </IconButton>
        </Box>
      )
    }
  ];

  const handleFileUpload = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate file upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Add uploaded files to documents list
      const newDocuments = Array.from(files).map((file, index) => ({
        id: (Date.now() + index).toString(),
        filename: `${Date.now()}-${file.name}`,
        original_name: file.name,
        document_type: 'OTHER',
        file_size: file.size,
        case_number: null,
        uploaded_by: 'Current User',
        created_at: new Date().toISOString(),
        mime_type: file.type
      }));
      
      setDocuments(prev => [...newDocuments, ...prev]);
      setOpenUpload(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Documents</Typography>
        <Button
          startIcon={<CloudUpload />}
          variant="contained"
          onClick={() => setOpenUpload(true)}
        >
          Upload Documents
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={documents}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          checkboxSelection
          disableSelectionOnClick
        />
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            {!uploading ? (
              <Card
                sx={{
                  border: '2px dashed #ccc',
                  textAlign: 'center',
                  p: 4,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => document.getElementById('file-input').click()}
              >
                <CardContent>
                  <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Drop files here or click to browse
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Maximum file size: 10MB
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Uploading files...
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ mt: 2, mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {uploadProgress}% complete
                </Typography>
              </Box>
            )}
            
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setOpenUpload(false)}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;
