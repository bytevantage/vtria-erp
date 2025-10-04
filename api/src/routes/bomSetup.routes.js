const express = require('express');
const router = express.Router();
const bomSetupController = require('../controllers/bomSetup.controller');

router.post('/setup', bomSetupController.setupBomTables);

module.exports = router;