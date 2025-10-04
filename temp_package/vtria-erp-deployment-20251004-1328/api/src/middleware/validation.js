const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors,
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  id: param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  
  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
    
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  date: (field) => body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date in ISO format`)
    .toDate(),
    
  positiveNumber: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`)
    .toFloat(),
    
  requiredString: (field, minLength = 1) => body(field)
    .trim()
    .isLength({ min: minLength })
    .withMessage(`${field} is required and must be at least ${minLength} characters long`),
    
  optionalString: (field, maxLength = 255) => body(field)
    .optional()
    .trim()
    .isLength({ max: maxLength })
    .withMessage(`${field} must not exceed ${maxLength} characters`),
    
  enumValue: (field, values) => body(field)
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`),
    
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  ],
};

// User validation rules
const userValidations = {
  create: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.requiredString('full_name', 2),
    commonValidations.enumValue('user_role', ['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician']),
    handleValidationErrors,
  ],
  
  update: [
    commonValidations.id,
    body('email').optional().isEmail().normalizeEmail(),
    commonValidations.optionalString('full_name', 255),
    body('user_role').optional().isIn(['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician']),
    body('status').optional().isIn(['active', 'inactive']),
    handleValidationErrors,
  ],
  
  login: [
    commonValidations.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
};

// Sales enquiry validation rules
const enquiryValidations = {
  create: [
    commonValidations.date('date'),
    body('client_id').isInt({ min: 1 }).withMessage('Valid client ID is required'),
    commonValidations.requiredString('project_name', 2),
    commonValidations.optionalString('description', 1000),
    body('enquiry_by').isInt({ min: 1 }).withMessage('Valid enquiry_by user ID is required'),
    handleValidationErrors,
  ],
  
  update: [
    commonValidations.id,
    body('date').optional().isISO8601().toDate(),
    body('client_id').optional().isInt({ min: 1 }),
    commonValidations.optionalString('project_name', 255),
    commonValidations.optionalString('description', 1000),
    body('status').optional().isIn(['new', 'assigned', 'estimated', 'quoted', 'approved', 'rejected']),
    body('assigned_to').optional().isInt({ min: 1 }),
    handleValidationErrors,
  ],
  
  list: [
    ...commonValidations.pagination,
    query('status').optional().isIn(['new', 'assigned', 'estimated', 'quoted', 'approved', 'rejected']),
    query('client_id').optional().isInt({ min: 1 }),
    query('assigned_to').optional().isInt({ min: 1 }),
    handleValidationErrors,
  ],
};

// Estimation validation rules
const estimationValidations = {
  create: [
    body('enquiry_id').isInt({ min: 1 }).withMessage('Valid enquiry ID is required'),
    commonValidations.date('date'),
    body('sections').isArray({ min: 1 }).withMessage('At least one section is required'),
    body('sections.*.heading').trim().isLength({ min: 1 }).withMessage('Section heading is required'),
    body('sections.*.items').optional().isArray(),
    body('sections.*.items.*.product_id').optional().isInt({ min: 1 }),
    body('sections.*.items.*.quantity').optional().isInt({ min: 1 }),
    body('sections.*.items.*.discount_percentage').optional().isFloat({ min: 0, max: 100 }),
    handleValidationErrors,
  ],
  
  update: [
    commonValidations.id,
    body('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']),
    body('total_mrp').optional().isFloat({ min: 0 }),
    body('total_discount').optional().isFloat({ min: 0 }),
    body('total_final_price').optional().isFloat({ min: 0 }),
    handleValidationErrors,
  ],
};

// Client validation rules
const clientValidations = {
  create: [
    commonValidations.requiredString('company_name', 2),
    commonValidations.requiredString('contact_person', 2),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().matches(/^[\d\-\+\(\)\s]+$/).withMessage('Invalid phone number format'),
    commonValidations.optionalString('address', 500),
    commonValidations.optionalString('city', 100),
    commonValidations.optionalString('state', 100),
    body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Pincode must be 6 digits'),
    body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format'),
    handleValidationErrors,
  ],
  
  update: [
    commonValidations.id,
    commonValidations.optionalString('company_name', 255),
    commonValidations.optionalString('contact_person', 255),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().matches(/^[\d\-\+\(\)\s]+$/),
    commonValidations.optionalString('address', 500),
    commonValidations.optionalString('city', 100),
    commonValidations.optionalString('state', 100),
    body('pincode').optional().matches(/^[0-9]{6}$/),
    body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
    body('status').optional().isIn(['active', 'inactive']),
    handleValidationErrors,
  ],
};

// Product validation rules
const productValidations = {
  create: [
    commonValidations.requiredString('name', 2),
    commonValidations.optionalString('make', 255),
    commonValidations.optionalString('model', 255),
    commonValidations.optionalString('part_code', 255),
    body('category_id').optional().isInt({ min: 1 }),
    body('sub_category_id').optional().isInt({ min: 1 }),
    commonValidations.optionalString('description', 1000),
    body('mrp').optional().isFloat({ min: 0 }),
    body('last_price').optional().isFloat({ min: 0 }),
    body('last_price_date').optional().isISO8601().toDate(),
    commonValidations.optionalString('hsn_code', 50),
    commonValidations.optionalString('unit', 50),
    handleValidationErrors,
  ],
  
  update: [
    commonValidations.id,
    commonValidations.optionalString('name', 255),
    commonValidations.optionalString('make', 255),
    commonValidations.optionalString('model', 255),
    commonValidations.optionalString('part_code', 255),
    body('category_id').optional().isInt({ min: 1 }),
    body('sub_category_id').optional().isInt({ min: 1 }),
    commonValidations.optionalString('description', 1000),
    body('mrp').optional().isFloat({ min: 0 }),
    body('last_price').optional().isFloat({ min: 0 }),
    body('last_price_date').optional().isISO8601().toDate(),
    commonValidations.optionalString('hsn_code', 50),
    commonValidations.optionalString('unit', 50),
    handleValidationErrors,
  ],
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  userValidations,
  enquiryValidations,
  estimationValidations,
  clientValidations,
  productValidations,
};