const express = require('express');
const router = express.Router();
const { getUserPermissions } = require('../middleware/rbac.middleware');

// Get current user permissions
router.get('/permissions', getUserPermissions);

module.exports = router;
