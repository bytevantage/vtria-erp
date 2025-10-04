const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeEnhanced.controller');
const { verifyToken: authenticate, hasRole: authorize } = require('../middleware/auth.middleware');
const { check } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Root route for HR module (no auth)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Human Resources Enhanced module is active',
    data: {
      module: 'hr-enhanced',
      version: '2.0.0',
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
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
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
router.get('/profile/:id',
  authorize(['hr', 'manager', 'employee']),
  employeeController.getEmployeeFullProfile
);

// Document Management Routes
router.post('/:employeeId/documents',
  authorize(['hr', 'manager', 'employee']),
  upload.single('document'),
  [
    check('documentType').isIn(['aadhar', 'pan', 'passport', 'visa', 'resume', 'offer_letter', 'other']),
    check('documentNumber').optional().isString(),
    check('expiryDate').optional().isISO8601().toDate()
  ],
  employeeController.uploadDocument
);

// Skills Management Routes
router.put('/:employeeId/skills',
  authorize(['hr', 'manager', 'employee']),
  [
    check('skills').isArray(),
    check('skills.*.skill_name').isString().notEmpty(),
    check('skills.*.proficiency_level').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert'])
  ],
  employeeController.updateSkills
);

// Leave Management Routes
router.get('/:employeeId/leave-balance',
  authorize(['hr', 'manager', 'employee']),
  employeeController.getLeaveBalance
);

// Performance Review Routes
router.post('/:employeeId/reviews',
  authorize(['hr', 'manager']),
  [
    check('rating').isFloat({ min: 0, max: 5 }),
    check('comments').optional().isString(),
    check('goals').optional().isString(),
    check('nextReviewDate').optional().isISO8601().toDate()
  ],
  employeeController.createPerformanceReview
);

// Team Management Routes (for managers)
router.get('/team/:managerId',
  authorize(['hr', 'manager']),
  employeeController.getTeamMembers
);

// Attendance Routes
router.get('/:employeeId/attendance/summary',
  authorize(['hr', 'manager', 'employee']),
  employeeController.getAttendanceSummary
);

module.exports = router;
