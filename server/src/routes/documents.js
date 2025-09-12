/**
 * Document Management Routes for VTRIA ERP
 * File upload, PDF generation, and document versioning
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Document, DocumentVersion, Case, Ticket, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const rbac = require('../middleware/rbac');
// License middleware is applied globally in server.js
const documentController = require('../controllers/documentController');
const logger = require('../utils/logger');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// Create necessary directories
const BASE_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH || 'uploads/documents';
const GENERATED_DOCS_PATH = path.join(BASE_STORAGE_PATH, 'generated');
const TECHNICAL_DOCS_PATH = path.join(BASE_STORAGE_PATH, 'technical');
const UPLOADS_PATH = path.join(BASE_STORAGE_PATH, 'general');

[BASE_STORAGE_PATH, GENERATED_DOCS_PATH, TECHNICAL_DOCS_PATH, UPLOADS_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = req.body.document_type || 'OTHER';
    let uploadPath = UPLOADS_PATH;
    
    if (docType === 'TECHNICAL') {
      uploadPath = TECHNICAL_DOCS_PATH;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|dwg|dxf|stp|step|igs|iges|stl|obj|zip|rar|7z/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/octet-stream';
    
    if (extname) { // Accept based on extension for CAD files that might have octet-stream mimetype
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};

// Apply middleware to all routes
router.use(authenticate);
// License middleware is applied globally in server.js

/**
 * GET /api/documents
 * Get all documents with filtering options
 */
router.get('/', 
  validate([
    query('document_type').optional().isIn(['ENQUIRY', 'QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'TECHNICAL', 'REPORT', 'CASE_ATTACHMENT', 'OTHER']),
    query('start_date').optional().isDate(),
    query('end_date').optional().isDate()
  ]),
  documentController.getAllDocuments
);

/**
 * GET /api/documents/:id
 * Get document by ID with versions
 */
router.get('/:id', 
  validate([param('id').isUUID()]),
  documentController.getDocumentById
);

/**
 * GET /api/documents/:id/versions
 * Get document versions
 */
router.get('/:id/versions', 
  validate([param('id').isUUID()]),
  documentController.getDocumentVersions
);

/**
 * GET /api/documents/version/:versionId/download
 * Download document version file
 */
router.get('/version/:versionId/download', 
  validate([param('versionId').isUUID()]),
  documentController.downloadDocumentVersion
);

/**
 * POST /api/documents/upload
 * Upload document (general)
 */
router.post('/upload', 
  rbac(['Director', 'Manager', 'Engineer', 'Sales Admin']),
  upload.single('file'),
  documentController.uploadDocument
);

/**
 * POST /api/documents/technical/upload
 * Upload technical document with versioning
 */
router.post('/technical/upload', 
  rbac(['Director', 'Manager', 'Engineer']),
  upload.single('file'),
  documentController.uploadTechnicalDocument
);

/**
 * PUT /api/documents/technical/:id
 * Update technical document with new version
 */
router.put('/technical/:id', 
  rbac(['Director', 'Manager', 'Engineer']),
  validate([param('id').isUUID()]),
  upload.single('file'),
  documentController.updateTechnicalDocument
);

/**
 * POST /api/documents/generate
 * Generate PDF document
 */
router.post('/generate', 
  rbac(['Director', 'Manager', 'Sales Admin']),
  validate([
    body('document_type').isIn(['ENQUIRY', 'QUOTATION', 'PURCHASE_ORDER', 'INVOICE']),
    body('data').notEmpty()
  ]),
  documentController.generatePDF
);

/**
 * DELETE /api/documents/:id
 * Delete document and all versions
 */
router.delete('/:id', 
  rbac(['Director', 'Manager']),
  validate([param('id').isUUID()]),
  documentController.deleteDocument
);

module.exports = router;
