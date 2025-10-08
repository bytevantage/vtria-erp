const express = require('express');
const router = express.Router();
const inventoryEnhancedController = require('../controllers/inventoryEnhanced.controller');
const authMiddleware = require('../middleware/auth.middleware');

// ====================
// Categories Routes
// ====================

// Get all main categories
router.get('/categories/main', authMiddleware.verifyToken, inventoryEnhancedController.getMainCategories);

// Get subcategories for a main category
router.get('/categories/main/:mainCategoryId/subcategories', authMiddleware.verifyToken, inventoryEnhancedController.getSubCategories);

// Create new category
router.post('/categories', authMiddleware.verifyToken, inventoryEnhancedController.createCategory);

// Update category
router.put('/categories/:id', authMiddleware.verifyToken, inventoryEnhancedController.updateCategory);

// Delete category
router.delete('/categories/:id', authMiddleware.verifyToken, inventoryEnhancedController.deleteCategory);

// ====================
// Enhanced Items Routes
// ====================

// Get all enhanced inventory items with filters
router.get('/items/enhanced', authMiddleware.verifyToken, inventoryEnhancedController.getEnhancedItems);

// Create new enhanced inventory item
router.post('/items/enhanced', authMiddleware.verifyToken, inventoryEnhancedController.createEnhancedItem);

// Update enhanced inventory item
router.put('/items/enhanced/:id', authMiddleware.verifyToken, inventoryEnhancedController.updateEnhancedItem);

// Delete enhanced inventory item
router.delete('/items/enhanced/:id',
  (req, res, next) => {
    console.log(`🚀 DELETE middleware - ID: ${req.params.id}, Headers:`, JSON.stringify(req.headers, null, 2));
    next();
  },
  authMiddleware.verifyToken,
  inventoryEnhancedController.deleteEnhancedItem
);

// ====================
// Serial Number Routes
// ====================

// Get serial numbers for an item
router.get('/items/:itemId/serials', authMiddleware.verifyToken, inventoryEnhancedController.getSerialNumbers);

// Add serial number for an item
router.post('/items/:itemId/serials', authMiddleware.verifyToken, inventoryEnhancedController.addSerialNumber);

// ====================
// Purchase History Routes
// ====================

// Get purchase history for an item
router.get('/items/:itemId/purchase-history', authMiddleware.verifyToken, inventoryEnhancedController.getPurchaseHistory);

// Add purchase history record
router.post('/items/:itemId/purchase-history', authMiddleware.verifyToken, inventoryEnhancedController.addPurchaseHistory);

// ====================
// Dashboard Routes
// ====================

// Get inventory dashboard data
router.get('/dashboard', authMiddleware.verifyToken, inventoryEnhancedController.getInventoryDashboard);

// ====================
// Bulk Operations Routes
// ====================

// Bulk update stock levels
router.post('/bulk/stock-update', authMiddleware.verifyToken, inventoryEnhancedController.bulkUpdateStock);

module.exports = router;