const express = require('express');
const router = express.Router();
const manufacturingWorkflowController = require('../controllers/manufacturingWorkflow.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Get manufacturing jobs
router.get('/jobs', 
    checkPermission('manufacturing', 'read'),
    manufacturingWorkflowController.getManufacturingJobs
);

// Get job details
router.get('/jobs/:jobId', 
    checkPermission('manufacturing', 'read'),
    manufacturingWorkflowController.getJobDetails
);

// Create manufacturing job
router.post('/jobs', 
    checkPermission('manufacturing', 'create'),
    manufacturingWorkflowController.createManufacturingJob
);

// Update task status
router.put('/tasks/:taskId/status', 
    checkPermission('manufacturing', 'update'),
    manufacturingWorkflowController.updateTaskStatus
);

// Add work log
router.post('/jobs/:jobId/work-logs', 
    checkPermission('manufacturing', 'create'),
    manufacturingWorkflowController.addWorkLog
);

// Get technician dashboard
router.get('/technician/dashboard', 
    checkPermission('manufacturing', 'read'),
    manufacturingWorkflowController.getTechnicianDashboard
);

module.exports = router;
