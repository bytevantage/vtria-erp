const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const enterpriseEmployeeController = require('../controllers/enterpriseEmployee.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Employee validation schemas
const employeeValidation = [
  body('first_name')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('First name must be between 2-255 characters'),
  
  body('last_name')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Last name must be between 2-255 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Valid phone number is required'),
  
  body('hire_date')
    .isISO8601()
    .withMessage('Valid hire date is required'),
  
  body('employee_type')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'intern', 'consultant', 'temporary'])
    .withMessage('Invalid employee type'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender'),
  
  body('department_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required'),
  
  body('basic_salary')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Valid salary amount is required')
];

const roleAssignmentValidation = [
  param('employee_id')
    .isInt({ min: 1 })
    .withMessage('Valid employee ID is required'),
  
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required'),
  
  body('assignment_type')
    .optional()
    .isIn(['direct', 'inherited_group', 'inherited_position'])
    .withMessage('Invalid assignment type'),
  
  body('effective_from')
    .optional()
    .isISO8601()
    .withMessage('Valid effective from date is required')
];

const groupValidation = [
  body('group_name')
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Group name must be between 3-255 characters'),
  
  body('group_type')
    .optional()
    .isIn(['department', 'project_team', 'functional_team', 'committee', 'temporary'])
    .withMessage('Invalid group type'),
  
  body('department_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required')
];

// ===================================================================
// EMPLOYEE MANAGEMENT ROUTES
// ===================================================================

/**
 * @swagger
 * /api/enterprise-employees:
 *   get:
 *     summary: Get all employees with advanced filtering
 *     tags: [Enterprise Employee Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: employment_status
 *         schema:
 *           type: string
 *           enum: [active, inactive, terminated, on_leave, suspended]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 */
router.get('/', 
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('EMPLOYEE_READ'),
  enterpriseEmployeeController.getAllEmployees
);

/**
 * @swagger
 * /api/enterprise-employees/{id}:
 *   get:
 *     summary: Get employee by ID with comprehensive details
 *     tags: [Enterprise Employee Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee details retrieved successfully
 *       404:
 *         description: Employee not found
 */
router.get('/:id',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('EMPLOYEE_READ'),
  param('id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  handleValidationErrors,
  enterpriseEmployeeController.getEmployee
);

/**
 * @swagger
 * /api/enterprise-employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Enterprise Employee Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *               - hire_date
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               hire_date:
 *                 type: string
 *                 format: date
 *               department_id:
 *                 type: integer
 *               position_id:
 *                 type: integer
 *               initial_roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *               initial_groups:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error
 */
router.post('/',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('EMPLOYEE_CREATE'),
  employeeValidation,
  handleValidationErrors,
  enterpriseEmployeeController.createEmployee
);

/**
 * @swagger
 * /api/enterprise-employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Enterprise Employee Management]
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               employment_status:
 *                 type: string
 *                 enum: [active, inactive, terminated, on_leave, suspended]
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
router.put('/:id',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('EMPLOYEE_UPDATE'),
  param('id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  handleValidationErrors,
  enterpriseEmployeeController.updateEmployee
);

// ===================================================================
// ROLE MANAGEMENT ROUTES
// ===================================================================

/**
 * @swagger
 * /api/enterprise-employees/{employee_id}/roles:
 *   post:
 *     summary: Assign role to employee
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employee_id
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
 *               - role_id
 *             properties:
 *               role_id:
 *                 type: integer
 *               assignment_type:
 *                 type: string
 *                 enum: [direct, inherited_group, inherited_position]
 *                 default: direct
 *               effective_from:
 *                 type: string
 *                 format: date
 *               assignment_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role assigned successfully
 */
router.post('/:employee_id/roles',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('ROLE_ASSIGN'),
  roleAssignmentValidation,
  handleValidationErrors,
  enterpriseEmployeeController.assignRole
);

/**
 * @swagger
 * /api/enterprise-employees/{employee_id}/roles/{role_id}:
 *   delete:
 *     summary: Revoke role from employee
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               revocation_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role revoked successfully
 */
router.delete('/:employee_id/roles/:role_id',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('ROLE_ASSIGN'),
  param('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  param('role_id').isInt({ min: 1 }).withMessage('Valid role ID is required'),
  handleValidationErrors,
  enterpriseEmployeeController.revokeRole
);

// ===================================================================
// GROUP MANAGEMENT ROUTES
// ===================================================================

/**
 * @swagger
 * /api/enterprise-employees/groups:
 *   get:
 *     summary: Get all user groups
 *     tags: [Group Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: group_type
 *         schema:
 *           type: string
 *           enum: [department, project_team, functional_team, committee, temporary]
 *       - in: query
 *         name: include_members
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Groups retrieved successfully
 */
router.get('/groups',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('GROUP_READ'),
  enterpriseEmployeeController.getUserGroups
);

/**
 * @swagger
 * /api/enterprise-employees/groups:
 *   post:
 *     summary: Create user group
 *     tags: [Group Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - group_name
 *             properties:
 *               group_name:
 *                 type: string
 *               description:
 *                 type: string
 *               group_type:
 *                 type: string
 *                 enum: [department, project_team, functional_team, committee, temporary]
 *               department_id:
 *                 type: integer
 *               initial_roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Group created successfully
 */
router.post('/groups',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('GROUP_CREATE'),
  groupValidation,
  handleValidationErrors,
  enterpriseEmployeeController.createUserGroup
);

/**
 * @swagger
 * /api/enterprise-employees/groups/{group_id}/members/{employee_id}:
 *   post:
 *     summary: Add employee to group
 *     tags: [Group Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: group_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membership_type:
 *                 type: string
 *                 enum: [member, lead, admin, owner]
 *                 default: member
 *     responses:
 *       200:
 *         description: Employee added to group successfully
 */
router.post('/groups/:group_id/members/:employee_id',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('GROUP_MANAGE'),
  param('group_id').isInt({ min: 1 }).withMessage('Valid group ID is required'),
  param('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  handleValidationErrors,
  enterpriseEmployeeController.addEmployeeToGroup
);

/**
 * @swagger
 * /api/enterprise-employees/groups/{group_id}/members/{employee_id}:
 *   delete:
 *     summary: Remove employee from group
 *     tags: [Group Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: group_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee removed from group successfully
 */
router.delete('/groups/:group_id/members/:employee_id',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('GROUP_MANAGE'),
  param('group_id').isInt({ min: 1 }).withMessage('Valid group ID is required'),
  param('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  handleValidationErrors,
  enterpriseEmployeeController.removeEmployeeFromGroup
);

// ===================================================================
// PERMISSION CHECKING ROUTES
// ===================================================================

/**
 * @swagger
 * /api/enterprise-employees/{employee_id}/permissions/check:
 *   get:
 *     summary: Check if employee has specific permission
 *     tags: [Permission Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: permission_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission check result
 */
router.get('/:employee_id/permissions/check',
  authMiddleware.verifyToken,
  param('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  query('permission_code').notEmpty().withMessage('Permission code is required'),
  handleValidationErrors,
  enterpriseEmployeeController.checkPermission
);

// ===================================================================
// MASTER DATA ROUTES
// ===================================================================

/**
 * @swagger
 * /api/enterprise-employees/master/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role_type
 *         schema:
 *           type: string
 *           enum: [system, functional, positional, project]
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 */
router.get('/master/roles',
  authMiddleware.verifyToken,
  enterpriseEmployeeController.getRoles
);

/**
 * @swagger
 * /api/enterprise-employees/master/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 */
router.get('/master/departments',
  authMiddleware.verifyToken,
  enterpriseEmployeeController.getDepartments
);

/**
 * @swagger
 * /api/enterprise-employees/master/locations:
 *   get:
 *     summary: Get all work locations
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Work locations retrieved successfully
 */
router.get('/master/locations',
  authMiddleware.verifyToken,
  enterpriseEmployeeController.getWorkLocations
);

module.exports = router;