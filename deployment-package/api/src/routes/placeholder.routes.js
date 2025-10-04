const express = require('express');
const router = express.Router();

// Placeholder routes for missing endpoints to prevent 404/500 errors
// These return empty data with success status to keep frontend functional

// Price comparison endpoints
router.get('/price-comparison', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Price comparison feature not yet implemented. Showing placeholder data.'
    });
});

// Technicians endpoints
router.get('/technicians', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Technician management not yet implemented. Showing placeholder data.'
    });
});

// Assignee workload endpoints
router.get('/assignee-workload', (req, res) => {
    res.json({
        success: true,
        data: {
            assignees: [],
            workloadSummary: {
                totalTechnicians: 0,
                averageWorkload: 0,
                overloadedTechnicians: 0
            }
        },
        message: 'Assignee workload tracking not yet implemented. Showing placeholder data.'
    });
});

// Locations endpoints
router.get('/locations', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Location management not yet implemented. Showing placeholder data.'
    });
});

// Tax configuration endpoints
router.get('/tax-config', (req, res) => {
    res.json({
        success: true,
        data: {
            gstRates: [],
            taxCategories: [],
            defaultSettings: {}
        },
        message: 'Tax configuration not yet implemented. Showing placeholder data.'
    });
});

// HR-related placeholder routes
router.get('/hr/records', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'HR records not yet implemented. Showing placeholder data.'
    });
});

router.get('/hr/applications', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'HR applications not yet implemented. Showing placeholder data.'
    });
});

router.get('/hr/leave-types', (req, res) => {
    const leaveTypes = [
        {
            id: 1,
            leave_type_name: 'Annual Leave',
            leave_type_code: 'AL',
            max_days_per_year: 21,
            carry_forward_allowed: 1,
            max_carry_forward_days: 5,
            status: 'active'
        },
        {
            id: 2,
            leave_type_name: 'Sick Leave',
            leave_type_code: 'SL',
            max_days_per_year: 12,
            carry_forward_allowed: 0,
            max_carry_forward_days: 0,
            status: 'active'
        },
        {
            id: 3,
            leave_type_name: 'Personal Leave',
            leave_type_code: 'PL',
            max_days_per_year: 5,
            carry_forward_allowed: 0,
            max_carry_forward_days: 0,
            status: 'active'
        },
        {
            id: 4,
            leave_type_name: 'Emergency Leave',
            leave_type_code: 'EL',
            max_days_per_year: 3,
            carry_forward_allowed: 0,
            max_carry_forward_days: 0,
            status: 'active'
        }
    ];
    
    res.json({
        success: true,
        data: leaveTypes,
        message: 'Leave types management showing placeholder data.'
    });
});

// Deleted stages endpoint
router.get('/deleted-stages', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Deleted stages tracking not yet implemented. Showing placeholder data.'
    });
});

module.exports = router;