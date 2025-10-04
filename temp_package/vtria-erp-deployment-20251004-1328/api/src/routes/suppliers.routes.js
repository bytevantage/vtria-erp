const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliers.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Test route without RBAC
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Suppliers route is working' });
});

// Get all suppliers
router.get('/', 
    checkPermission('suppliers', 'read'),
    suppliersController.getAllSuppliers
);

// Get supplier by ID
router.get('/:id', 
    checkPermission('suppliers', 'read'),
    suppliersController.getSupplierById
);

// Create new supplier
router.post('/', 
    checkPermission('suppliers', 'create'),
    suppliersController.createSupplier
);

// Update supplier
router.put('/:id', 
    checkPermission('suppliers', 'update'),
    suppliersController.updateSupplier
);

// Delete supplier
router.delete('/:id', 
    checkPermission('suppliers', 'delete'),
    suppliersController.deleteSupplier
);

module.exports = router;
