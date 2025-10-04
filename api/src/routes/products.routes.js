const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const productsController = require('../controllers/products.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation.middleware');

// Apply sanitization to all routes
router.use(sanitizeInput);

// Validation middleware
const validateProduct = [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name is required and must not exceed 255 characters'),
    body('product_code').trim().isLength({ min: 1, max: 50 }).withMessage('Product code is required and must not exceed 50 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
    body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),
    body('unit').trim().isLength({ min: 1, max: 20 }).withMessage('Unit is required and must not exceed 20 characters'),
    body('mrp').optional().isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
    body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number')
];

const validateId = param('id').isInt({ min: 1 }).withMessage('Invalid product ID');

// Categories routes (must come before /:id routes)
router.get('/categories/flat', authMiddleware.verifyToken, productsController.getFlatCategories);
router.get('/categories', authMiddleware.verifyToken, productsController.getAllCategories);

// Special product routes
router.get('/low-stock', authMiddleware.verifyToken, productsController.getLowStockProducts);
router.get('/serial-required', authMiddleware.verifyToken, productsController.getSerialRequiredProducts);
router.get('/search', authMiddleware.verifyToken, productsController.searchProducts);
router.get('/:productId/vendor-prices', authMiddleware.verifyToken, productsController.getVendorPrices);

// Serial number management routes
router.get('/:id/serials', authMiddleware.verifyToken, productsController.getProductSerials);
router.post('/:id/serials', authMiddleware.verifyToken, productsController.addProductSerial);

// CRUD routes
router.get('/', authMiddleware.verifyToken, productsController.getAllProducts);
router.post('/', authMiddleware.verifyToken, validateProduct, handleValidationErrors, productsController.createProduct);
router.get('/:id', authMiddleware.verifyToken, validateId, handleValidationErrors, productsController.getProduct);
router.put('/:id', authMiddleware.verifyToken, validateId, validateProduct, handleValidationErrors, productsController.updateProduct);

module.exports = router;
