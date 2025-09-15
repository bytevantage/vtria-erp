const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bom.controller');

// BOM routes
router.get('/', bomController.getAllBOMs);
router.get('/:id', bomController.getBOMById);
router.post('/', bomController.createBOM);
router.put('/:id/approve', bomController.approveBOM);
router.put('/:id/lock', bomController.lockBOM);

module.exports = router;
