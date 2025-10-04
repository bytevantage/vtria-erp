const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken: authenticate, hasRole } = require('../middleware/auth.middleware');
const hrController = require('../controllers/hr.controller');

// Root route for HR module (no auth)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Human Resources module is active',
    data: {
      module: 'hr',
      version: '1.0.0',
      endpoints: [
        'GET /employees - Employee management',
        'GET /attendance - Attendance tracking',
        'GET /leave - Leave management',
        'GET /payroll - Payroll processing',
        'GET /performance - Performance reviews',
        'GET /documents - Document management',
        'GET /reports - HR reports'
      ]
    }
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document and image files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticate);

// Employee Profile Routes
router.get('/employees/:id',
  hasRole(['hr', 'manager', 'employee']),
  hrController.getEmployeeProfile
);

router.put('/employees/:id',
  hasRole(['hr', 'manager']),
  hrController.updateEmployeeProfile
);

// Document Management Routes
router.post('/employees/:employeeId/documents',
  hasRole(['hr', 'manager', 'employee']),
  upload.single('document'),
  hrController.uploadEmployeeDocument
);

router.delete('/documents/:docId',
  hasRole(['hr', 'manager']),
  hrController.deleteEmployeeDocument
);

// Emergency Contacts Routes
router.post('/employees/:employeeId/emergency-contacts',
  hasRole(['hr', 'manager', 'employee']),
  hrController.addEmergencyContact
);

// Skills Management Routes
router.post('/employees/:employeeId/skills',
  hasRole(['hr', 'manager', 'employee']),
  hrController.addEmployeeSkill
);

router.delete('/skills/:skillId',
  hasRole(['hr', 'manager']),
  hrController.deleteEmployeeSkill
);

// Departments
router.get('/departments',
  hasRole(['hr', 'manager', 'employee']),
  hrController.getDepartments
);

// Error handling middleware for file uploads
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 10MB.'
    });
  }

  if (err.message === 'Only document and image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only document and image files are allowed (jpeg, jpg, png, pdf, doc, docx, xls, xlsx)'
    });
  }

  next(err);
});

module.exports = router;
