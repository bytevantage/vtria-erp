const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Validation middleware
const validateProduct = [
    body('name').notEmpty().withMessage('Product name is required'),
    body('product_code').notEmpty().withMessage('Product code is required'),
    body('mrp').isDecimal().withMessage('Valid MRP is required'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('category_id').isInt().withMessage('Valid category is required')
];

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
router.post('/', authMiddleware.verifyToken, validateProduct, productsController.createProduct);
router.get('/:id', authMiddleware.verifyToken, productsController.getProduct);
router.put('/:id', authMiddleware.verifyToken, productsController.updateProduct);

module.exports = router;
