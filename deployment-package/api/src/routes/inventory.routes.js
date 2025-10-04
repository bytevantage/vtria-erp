const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Dashboard
router.get('/dashboard', verifyToken, (req, res) => inventoryController.getInventoryDashboard(req, res));

// Items management
router.get('/items', verifyToken, (req, res) => inventoryController.getAllItems(req, res));
router.get('/items/:id', verifyToken, (req, res) => inventoryController.getItemById(req, res));
router.post('/items', verifyToken, (req, res) => inventoryController.createItem(req, res));
router.put('/items/:id', verifyToken, (req, res) => inventoryController.updateItem(req, res));

// Stock transactions
router.post('/transactions', verifyToken, (req, res) => inventoryController.createTransaction(req, res));
router.get('/transactions', verifyToken, (req, res) => inventoryController.getTransactions(req, res));

// Reports
router.get('/reorder-report', verifyToken, (req, res) => inventoryController.getReorderReport(req, res));

// Master data
router.get('/categories', verifyToken, (req, res) => inventoryController.getCategories(req, res));
router.get('/units', verifyToken, (req, res) => inventoryController.getUnits(req, res));

// Batch Management Routes
router.get('/batches', verifyToken, (req, res) => inventoryController.getBatches(req, res));
router.get('/costing-summary', verifyToken, (req, res) => inventoryController.getCostingSummary(req, res));

// Serial Number Routes
router.get('/serial-numbers/available', verifyToken, (req, res) => inventoryController.getAvailableSerialNumbers(req, res));
router.post('/allocate-serials', verifyToken, (req, res) => inventoryController.allocateSerialNumbers(req, res));
router.post('/reserve', verifyToken, (req, res) => inventoryController.reserveInventory(req, res));

module.exports = router;
