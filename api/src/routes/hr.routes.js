const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken: authenticate, hasRole } = require('../middleware/auth.middleware');
const hrController = require('../controllers/hr.controller');
const payrollController = require('../controllers/payroll.controller');
const performanceController = require('../controllers/performance.controller');

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

// ============================================================================
// PAYROLL ROUTES
// ============================================================================

// Salary Components
router.get('/payroll/components',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.getSalaryComponents
);

router.post('/payroll/components',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.createSalaryComponent
);

// Employee Salary Structure
router.get('/payroll/employees/:employee_id/salary-structure',
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  payrollController.getEmployeeSalaryStructure
);

router.post('/payroll/employees/:employee_id/salary-structure',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.setEmployeeSalaryStructure
);

// Payroll Cycles
router.get('/payroll/cycles',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.getPayrollCycles
);

router.post('/payroll/cycles',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.createPayrollCycle
);

// Process Payroll
router.post('/payroll/cycles/:cycle_id/process',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.processPayroll
);

router.post('/payroll/cycles/:cycle_id/approve',
  hasRole(['director', 'admin']),
  payrollController.approvePayrollCycle
);

// Payroll Transactions
router.get('/payroll/cycles/:cycle_id/transactions',
  hasRole(['admin', 'director', 'accounts']),
  payrollController.getPayrollTransactions
);

router.get('/payroll/transactions/:id',
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  payrollController.getPayrollTransaction
);

// Reports
router.get('/payroll/reports/summary',
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  payrollController.getPayrollSummary
);

router.get('/payroll/employees/:employee_id/salary-register',
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  payrollController.getEmployeeSalaryRegister
);

// ============================================================================
// END PAYROLL ROUTES
// ============================================================================

// ============================================================================
// PERFORMANCE MANAGEMENT ROUTES
// ============================================================================

// Rating Scales & Competencies
router.get(
  '/performance/rating-scales',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getRatingScales
);

router.get(
  '/performance/competencies',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getCompetencies
);

// Review Cycles
router.get(
  '/performance/review-cycles',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getReviewCycles
);

router.post(
  '/performance/review-cycles',
  authenticate,
  hasRole(['admin', 'director']),
  performanceController.createReviewCycle
);

router.patch(
  '/performance/review-cycles/:id/status',
  authenticate,
  hasRole(['admin', 'director']),
  performanceController.updateReviewCycleStatus
);

// Goals Management
router.get(
  '/performance/employees/:employeeId/goals',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getEmployeeGoals
);

router.post(
  '/performance/goals',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.createGoal
);

router.patch(
  '/performance/goals/:id/progress',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.updateGoalProgress
);

router.patch(
  '/performance/key-results/:id/progress',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.updateKeyResultProgress
);

// Performance Reviews
router.get(
  '/performance/reviews',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getPerformanceReviews
);

router.get(
  '/performance/reviews/:id',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getPerformanceReview
);

router.post(
  '/performance/reviews',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.createPerformanceReview
);

router.post(
  '/performance/reviews/:id/self-review',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin', 'designer', 'technician']),
  performanceController.submitSelfReview
);

router.post(
  '/performance/reviews/:id/manager-review',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.submitManagerReview
);

router.post(
  '/performance/reviews/:id/feedback',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin', 'designer', 'technician']),
  performanceController.submitFeedback
);

router.post(
  '/performance/reviews/:id/acknowledge',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin', 'designer', 'technician']),
  performanceController.acknowledgeReview
);

router.post(
  '/performance/reviews/:id/approve',
  authenticate,
  hasRole(['admin', 'director']),
  performanceController.approveReview
);

// Development Plans
router.get(
  '/performance/employees/:employeeId/development-plans',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getEmployeeDevelopmentPlans
);

router.post(
  '/performance/development-plans',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.createDevelopmentPlan
);

router.patch(
  '/performance/development-actions/:id/progress',
  authenticate,
  hasRole(['admin', 'director', 'sales-admin']),
  performanceController.updateDevelopmentActionProgress
);

// Performance Improvement Plans (PIPs)
router.post(
  '/performance/pips',
  authenticate,
  hasRole(['admin', 'director']),
  performanceController.createPIP
);

router.get(
  '/performance/employees/:employeeId/pips',
  authenticate,
  hasRole(['admin', 'director']),
  performanceController.getEmployeePIPs
);

router.patch(
  '/performance/pips/:id/status',
  authenticate,
  hasRole(['admin', 'director']),
  performanceController.updatePIPStatus
);

// Reports & Analytics
router.get(
  '/performance/reports/summary',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getPerformanceSummary
);

router.get(
  '/performance/reports/goals-analytics',
  authenticate,
  hasRole(['admin', 'director', 'accounts', 'sales-admin']),
  performanceController.getGoalsAnalytics
);

// ============================================================================
// END PERFORMANCE ROUTES
// ============================================================================

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
