const express = require('express');
const router = express.Router();
const industrialEquipmentController = require('../controllers/industrialEquipment.controller');

// Equipment status and monitoring
router.get('/equipment-status', industrialEquipmentController.getEquipmentStatus);
router.get('/maintenance-dashboard', industrialEquipmentController.getMaintenanceDashboard);

// Performance tracking
router.post('/performance-test', industrialEquipmentController.recordPerformanceTest);
router.get('/:serial_number_id/performance-history', industrialEquipmentController.getPerformanceHistory);

// Fault management
router.post('/fault', industrialEquipmentController.recordEquipmentFault);
router.put('/fault/:fault_id/resolve', industrialEquipmentController.resolveEquipmentFault);
router.get('/:serial_number_id/fault-history', industrialEquipmentController.getFaultHistory);

// Operating hours and maintenance
router.put('/:serial_number/operating-hours', industrialEquipmentController.updateOperatingHours);
router.post('/maintenance-schedule', industrialEquipmentController.createMaintenanceSchedule);

module.exports = router;