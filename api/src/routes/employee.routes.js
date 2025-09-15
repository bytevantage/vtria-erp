/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - email
 *         - hire_date
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         employee_id:
 *           type: string
 *           description: Formatted employee ID (EMP/YYYY/XXX)
 *         first_name:
 *           type: string
 *           description: First name
 *         last_name:
 *           type: string
 *           description: Last name
 *         email:
 *           type: string
 *           description: Email address
 *         phone:
 *           type: string
 *           description: Phone number
 *         employee_type:
 *           type: string
 *           enum: [full_time, part_time, contract, intern, consultant]
 *           description: Employee type
 *         status:
 *           type: string
 *           enum: [active, inactive, terminated, on_leave]
 *           description: Employee status
 *         hire_date:
 *           type: string
 *           format: date
 *           description: Hire date
 *         department_id:
 *           type: integer
 *           description: Department ID
 *         designation:
 *           type: string
 *           description: Job designation
 *         basic_salary:
 *           type: number
 *           description: Basic salary amount
 *     
 *     AttendanceRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         employee_id:
 *           type: integer
 *           description: Employee ID
 *         attendance_date:
 *           type: string
 *           format: date
 *           description: Attendance date
 *         check_in_time:
 *           type: string
 *           format: date-time
 *           description: Check-in timestamp
 *         check_out_time:
 *           type: string
 *           format: date-time
 *           description: Check-out timestamp
 *         total_hours:
 *           type: number
 *           description: Total hours worked
 *         attendance_status:
 *           type: string
 *           enum: [present, absent, partial_day, on_leave, holiday, weekend]
 *           description: Attendance status
 *     
 *     LeaveApplication:
 *       type: object
 *       required:
 *         - employee_id
 *         - leave_type_id
 *         - start_date
 *         - end_date
 *         - reason
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         application_id:
 *           type: string
 *           description: Formatted application ID (LA/YYYY/XXXX)
 *         employee_id:
 *           type: integer
 *           description: Employee ID
 *         leave_type_id:
 *           type: integer
 *           description: Leave type ID
 *         start_date:
 *           type: string
 *           format: date
 *           description: Leave start date
 *         end_date:
 *           type: string
 *           format: date
 *           description: Leave end date
 *         total_days:
 *           type: number
 *           description: Total leave days
 *         reason:
 *           type: string
 *           description: Reason for leave
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved, rejected, cancelled, completed]
 *           description: Application status
 */

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const employeeController = require('../controllers/employee.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const validateEmployee = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('hire_date').isDate().withMessage('Valid hire date is required'),
  body('employee_type').optional().isIn(['full_time', 'part_time', 'contract', 'intern', 'consultant']),
  body('department_id').optional().isInt().withMessage('Department ID must be a number'),
  body('basic_salary').optional().isFloat({ min: 0 }).withMessage('Basic salary must be a positive number')
];

const validateAttendance = [
  body('employee_id').isInt().withMessage('Employee ID is required'),
  body('action').isIn(['check_in', 'check_out']).withMessage('Action must be check_in or check_out'),
  body('latitude').optional().isFloat().withMessage('Latitude must be a number'),
  body('longitude').optional().isFloat().withMessage('Longitude must be a number')
];

const validateLeaveApplication = [
  body('employee_id').isInt().withMessage('Employee ID is required'),
  body('leave_type_id').isInt().withMessage('Leave type ID is required'),
  body('start_date').isDate().withMessage('Valid start date is required'),
  body('end_date').isDate().withMessage('Valid end date is required'),
  body('reason').notEmpty().withMessage('Reason is required')
];

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: department
 *         schema:
 *           type: integer
 *         description: Filter by department ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, terminated, on_leave, all]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, employee ID, or email
 *     responses:
 *       200:
 *         description: List of employees retrieved successfully
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error
 */

// Employee Management Routes
router.get('/', authMiddleware.verifyToken, employeeController.getAllEmployees);
router.post('/', authMiddleware.verifyToken, validateEmployee, employeeController.createEmployee);

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
router.get('/:id', authMiddleware.verifyToken, employeeController.getEmployee);
router.put('/:id', authMiddleware.verifyToken, validateEmployee, employeeController.updateEmployee);

/**
 * @swagger
 * /api/employees/attendance/record:
 *   post:
 *     summary: Record attendance (check-in/check-out)
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - action
 *             properties:
 *               employee_id:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [check_in, check_out]
 *               location:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               method:
 *                 type: string
 *                 enum: [manual, biometric, mobile_gps, web, admin_entry]
 *     responses:
 *       200:
 *         description: Attendance recorded successfully
 *       400:
 *         description: Validation error
 */

// Attendance Management Routes
router.post('/attendance/record', authMiddleware.verifyToken, validateAttendance, employeeController.recordAttendance);

/**
 * @swagger
 * /api/employees/attendance/records:
 *   get:
 *     summary: Get attendance records
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: Filter by employee ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Attendance records retrieved successfully
 */
router.get('/attendance/records', authMiddleware.verifyToken, employeeController.getAttendanceRecords);

/**
 * @swagger
 * /api/employees/leave/apply:
 *   post:
 *     summary: Apply for leave
 *     tags: [Leave Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveApplication'
 *     responses:
 *       201:
 *         description: Leave application submitted successfully
 *       400:
 *         description: Validation error or insufficient leave balance
 */

// Leave Management Routes
router.post('/leave/apply', authMiddleware.verifyToken, validateLeaveApplication, employeeController.applyLeave);

/**
 * @swagger
 * /api/employees/leave/applications:
 *   get:
 *     summary: Get leave applications
 *     tags: [Leave Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: Filter by employee ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, approved, rejected, cancelled, completed]
 *         description: Filter by status
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Leave applications retrieved successfully
 */
router.get('/leave/applications', authMiddleware.verifyToken, employeeController.getLeaveApplications);

/**
 * @swagger
 * /api/employees/leave/applications/{id}/process:
 *   put:
 *     summary: Approve or reject leave application
 *     tags: [Leave Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave application processed successfully
 *       404:
 *         description: Application not found
 */
router.put('/leave/applications/:id/process', authMiddleware.verifyToken, employeeController.processLeaveApplication);

/**
 * @swagger
 * /api/employees/{id}/leave-balances:
 *   get:
 *     summary: Get employee leave balances
 *     tags: [Leave Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Leave year (default: current year)
 *     responses:
 *       200:
 *         description: Leave balances retrieved successfully
 */
router.get('/:id/leave-balances', authMiddleware.verifyToken, employeeController.getLeaveBalances);

/**
 * @swagger
 * /api/employees/dashboard:
 *   get:
 *     summary: Get employee dashboard data
 *     tags: [Employee Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard/data', authMiddleware.verifyToken, employeeController.getDashboardData);

/**
 * @swagger
 * /api/employees/master/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 */
router.get('/master/departments', authMiddleware.verifyToken, employeeController.getDepartments);

/**
 * @swagger
 * /api/employees/master/leave-types:
 *   get:
 *     summary: Get all leave types
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Leave types retrieved successfully
 */
router.get('/master/leave-types', authMiddleware.verifyToken, employeeController.getLeaveTypes);

/**
 * @swagger
 * /api/employees/master/work-locations:
 *   get:
 *     summary: Get all work locations
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Work locations retrieved successfully
 */
router.get('/master/work-locations', authMiddleware.verifyToken, employeeController.getWorkLocations);

module.exports = router;