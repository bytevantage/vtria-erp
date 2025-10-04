const express = require('express');
const router = express.Router();
const manufacturingCasesController = require('../controllers/manufacturingCases.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/manufacturing-documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `case-${req.params.caseId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only PDF, images, and common document types
    const allowedTypes = /pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only documents and images allowed!');
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Manufacturing Cases Routes
router.get('/cases', authMiddleware.verifyToken, manufacturingCasesController.getAllCases);
router.post('/cases/create-from-quote', authMiddleware.verifyToken, manufacturingCasesController.createCaseFromQuote);
router.get('/cases/:id', authMiddleware.verifyToken, manufacturingCasesController.getCaseDetails);
router.put('/cases/:id', authMiddleware.verifyToken, manufacturingCasesController.updateCase);
router.delete('/cases/:id', authMiddleware.verifyToken, manufacturingCasesController.deleteCase);

// Case Status Management
router.put('/cases/:id/status', authMiddleware.verifyToken, manufacturingCasesController.updateCaseStatus);
router.get('/cases/:id/with-notes', authMiddleware.verifyToken, manufacturingCasesController.getCaseWithAllNotes);

// Case Approval
router.post('/cases/:id/approve', authMiddleware.verifyToken, manufacturingCasesController.approveCase);

// Sales Order Creation
router.post('/cases/:id/create-sales-order', authMiddleware.verifyToken, manufacturingCasesController.createSalesOrderFromManufacturing);

// BOM Management
router.get('/cases/:id/bom', authMiddleware.verifyToken, manufacturingCasesController.getCaseBOM);
router.post('/cases/:id/bom', authMiddleware.verifyToken, manufacturingCasesController.createCaseBOM);
router.put('/cases/:id/bom/:bomId', authMiddleware.verifyToken, manufacturingCasesController.updateCaseBOM);

// Work Orders
router.get('/work-orders', authMiddleware.verifyToken, manufacturingCasesController.getAllWorkOrders);
router.get('/cases/:id/work-orders', authMiddleware.verifyToken, manufacturingCasesController.getCaseWorkOrders);
router.post('/cases/:id/work-orders', authMiddleware.verifyToken, manufacturingCasesController.createWorkOrder);
router.put('/work-orders/:id/status', authMiddleware.verifyToken, manufacturingCasesController.updateWorkOrderStatus);

// Notes and Comments
router.get('/cases/:id/notes', authMiddleware.verifyToken, manufacturingCasesController.getCaseNotes);
router.post('/cases/:id/notes', authMiddleware.verifyToken, manufacturingCasesController.addCaseNote);
router.put('/notes/:id', authMiddleware.verifyToken, manufacturingCasesController.updateNote);
router.delete('/notes/:id', authMiddleware.verifyToken, manufacturingCasesController.deleteNote);

// Document Management
router.get('/cases/:id/documents', authMiddleware.verifyToken, manufacturingCasesController.getCaseDocuments);
router.post('/cases/:caseId/documents',
  authMiddleware.verifyToken,
  upload.single('document'),
  manufacturingCasesController.uploadDocument
);
router.delete('/documents/:id', authMiddleware.verifyToken, manufacturingCasesController.deleteDocument);
router.get('/documents/:id/download', authMiddleware.verifyToken, manufacturingCasesController.downloadDocument);

// Product Selection and Optimization
router.get('/products/select-optimal', authMiddleware.verifyToken, manufacturingCasesController.getOptimalProducts);
router.post('/cases/:id/allocate-materials', authMiddleware.verifyToken, manufacturingCasesController.allocateMaterials);

// Progress Tracking
router.get('/cases/:id/progress', authMiddleware.verifyToken, manufacturingCasesController.getCaseProgress);
router.post('/cases/:id/progress', authMiddleware.verifyToken, manufacturingCasesController.updateCaseProgress);

// Quality Control
router.get('/cases/:id/quality-checkpoints', authMiddleware.verifyToken, manufacturingCasesController.getQualityCheckpoints);
router.post('/cases/:id/quality-checkpoints', authMiddleware.verifyToken, manufacturingCasesController.createQualityCheckpoint);
router.put('/quality-checkpoints/:id', authMiddleware.verifyToken, manufacturingCasesController.updateQualityCheckpoint);

// Dashboard and Analytics
router.get('/dashboard', authMiddleware.verifyToken, manufacturingCasesController.getDashboardData);
router.get('/analytics/efficiency', authMiddleware.verifyToken, manufacturingCasesController.getEfficiencyMetrics);

module.exports = router;