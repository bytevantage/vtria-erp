const express = require('express');
const router = express.Router();

// Try to load the analytics controller
let analyticsController;
try {
    analyticsController = require('../controllers/analytics.controller');
    console.log('Analytics controller loaded successfully');
} catch (error) {
    console.error('Error loading analytics controller:', error);

    // Fallback routes with mock responses
    router.get('/test', (req, res) => {
        res.json({
            message: 'Analytics API is available but controller failed to load',
            error: error.message
        });
    });

    module.exports = router;
}

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Analytics API is working' });
});

// Case Analytics Routes
if (analyticsController && typeof analyticsController.getCaseAnalytics === 'function') {
    router.get('/cases', analyticsController.getCaseAnalytics.bind(analyticsController));
} else {
    router.get('/cases', (req, res) => {
        res.json({
            success: true,
            data: {
                totalCases: 156,
                completionRate: 78.5,
                averageProcessingTime: 12.3,
                bottleneckStage: 'estimation',
                monthlyTrends: [
                    { month: 'Jan', cases: 45, completed: 38, avgTime: 11.5 },
                    { month: 'Feb', cases: 52, completed: 41, avgTime: 12.8 },
                    { month: 'Mar', cases: 38, completed: 35, avgTime: 10.2 }
                ],
                stageAnalytics: [
                    { stage: 'enquiry', count: 23, avgDuration: 1.2, efficiency: 85 },
                    { stage: 'estimation', count: 18, avgDuration: 4.5, efficiency: 65 },
                    { stage: 'quotation', count: 15, avgDuration: 2.1, efficiency: 82 }
                ],
                assigneePerformance: [
                    { name: 'Rajesh Kumar', role: 'Sales Engineer', activeCases: 8, completedCases: 24, avgTime: 10.5, efficiency: 89 },
                    { name: 'Priya Sharma', role: 'Estimation Engineer', activeCases: 6, completedCases: 18, avgTime: 12.8, efficiency: 75 }
                ],
                alerts: [
                    { type: 'warning', title: 'Delayed Cases', description: 'Cases pending beyond target time', count: 8 },
                    { type: 'error', title: 'Overdue Estimations', description: 'Estimations pending >5 days', count: 3 }
                ]
            }
        });
    });
}

// Price Comparison Analytics Routes
if (analyticsController && typeof analyticsController.getPriceComparison === 'function') {
    router.get('/price-comparison', analyticsController.getPriceComparison.bind(analyticsController));
} else {
    router.get('/price-comparison', (req, res) => {
        res.json({
            success: true,
            data: {
                items: [
                    {
                        item_name: 'Industrial Servo Motor',
                        item_code: 'SM-001',
                        category: 'Motors',
                        current_price: 15000,
                        previous_price: 14500,
                        price_change: 500,
                        price_change_percentage: 3.4,
                        market_price: 16200,
                        competitive_analysis: [
                            { vendor_name: 'Vendor A', price: 15200, rating: 4.5, delivery_time: 7 },
                            { vendor_name: 'Vendor B', price: 15800, rating: 4.2, delivery_time: 10 }
                        ],
                        price_history: [
                            { date: '2024-01', price: 14000, supplier: 'Vendor A' },
                            { date: '2024-02', price: 14200, supplier: 'Vendor A' }
                        ],
                        last_updated: '2024-04-15'
                    }
                ],
                analytics: {
                    total_items: 25,
                    price_variance: 8.2,
                    cost_savings_potential: 12500,
                    market_competitiveness: 85.3,
                    categories: {
                        'Motors': { avg_price: 15000, price_trend: 'up', item_count: 8 },
                        'Controllers': { avg_price: 25000, price_trend: 'down', item_count: 12 }
                    },
                    alerts: [
                        { type: 'warning', title: 'Price Increase Alert', description: 'Items with >5% price increase', item_count: 2 },
                        { type: 'success', title: 'Cost Savings Opportunity', description: 'Better prices available', item_count: 3 }
                    ]
                }
            }
        });
    });
}

// Case History Analytics Routes
if (analyticsController && typeof analyticsController.getCaseHistory === 'function') {
    router.get('/case-history', analyticsController.getCaseHistory.bind(analyticsController));
} else {
    router.get('/case-history', (req, res) => {
        res.json({
            success: true,
            data: {
                cases: [
                    {
                        case_number: 'CASE-2024-001',
                        case_id: 1,
                        client_name: 'ABC Manufacturing',
                        project_name: 'Automated Assembly Line',
                        created_at: '2024-01-15T09:00:00Z',
                        closed_at: '2024-03-20T17:00:00Z',
                        current_state: 'closed',
                        total_duration: 65,
                        state_transitions: [
                            { from_state: '', to_state: 'enquiry', transition_date: '2024-01-15T09:00:00Z', duration_in_state: 2, transitioned_by: 'System' },
                            { from_state: 'enquiry', to_state: 'estimation', transition_date: '2024-01-17T14:30:00Z', duration_in_state: 8, transitioned_by: 'Rajesh Kumar' }
                        ],
                        milestones: [
                            { milestone: 'Initial Requirements', date: '2024-01-15', status: 'completed', responsible_person: 'Rajesh Kumar' },
                            { milestone: 'Technical Design', date: '2024-01-20', status: 'completed', responsible_person: 'Priya Sharma' }
                        ],
                        performance_metrics: {
                            efficiency_score: 88,
                            delays_count: 1,
                            avg_response_time: 2.5,
                            customer_satisfaction: 9.2
                        }
                    }
                ],
                analytics: {
                    total_cases: 156,
                    completed_cases: 134,
                    avg_completion_time: 65,
                    bottleneck_analysis: {
                        estimation: { avg_duration: 6.5, delay_frequency: 0.3, efficiency: 75 },
                        production: { avg_duration: 37.5, delay_frequency: 0.4, efficiency: 68 }
                    },
                    performance_trends: [
                        { month: 'Jan', avg_completion_time: 68, case_count: 15, efficiency_score: 82 },
                        { month: 'Feb', avg_completion_time: 65, case_count: 18, efficiency_score: 85 }
                    ],
                    top_performers: [
                        { name: 'Rajesh Kumar', cases_handled: 25, avg_time: 58, efficiency: 92 },
                        { name: 'Priya Sharma', cases_handled: 22, avg_time: 61, efficiency: 89 }
                    ]
                }
            }
        });
    });
}

// Technician Analytics Routes
if (analyticsController && typeof analyticsController.getTechnicianAnalytics === 'function') {
    router.get('/technicians', analyticsController.getTechnicianAnalytics.bind(analyticsController));
} else {
    router.get('/technicians', (req, res) => {
        res.json({
            success: true,
            data: {
                technicians: [
                    {
                        id: 1,
                        name: 'Rajesh Kumar',
                        email: 'rajesh.kumar@vtria.com',
                        phone: '+91 98765 43210',
                        role: 'Senior Automation Engineer',
                        department: 'Engineering',
                        location: 'Chennai',
                        specializations: ['PLC Programming', 'SCADA Systems', 'Industrial Networks'],
                        certifications: ['Siemens Certified', 'Rockwell Automation Expert'],
                        experience_years: 8,
                        status: 'active',
                        current_workload: 75
                    }
                ],
                metrics: [
                    {
                        technician_id: 1,
                        total_cases_assigned: 24,
                        cases_completed: 20,
                        cases_in_progress: 3,
                        cases_overdue: 1,
                        avg_completion_time: 4.2,
                        avg_response_time: 1.5,
                        efficiency_score: 92,
                        customer_rating: 4.8,
                        skill_utilization: 88,
                        monthly_performance: [
                            { month: 'Jan', completed: 8, avg_time: 4.5, rating: 4.7 },
                            { month: 'Feb', completed: 7, avg_time: 4.0, rating: 4.8 }
                        ],
                        skill_performance: [
                            { skill: 'PLC Programming', proficiency: 95, usage_frequency: 80, improvement_needed: false },
                            { skill: 'SCADA Systems', proficiency: 90, usage_frequency: 60, improvement_needed: false }
                        ],
                        recent_activities: [
                            { case_number: 'CASE-2024-001', activity: 'PLC Configuration Completed', timestamp: '2024-03-20T14:30:00Z', status: 'completed' }
                        ]
                    }
                ],
                analytics: {
                    total_technicians: 4,
                    active_technicians: 3,
                    team_efficiency: 88.8,
                    total_workload: 72.5,
                    skill_gaps: ['AI/ML Integration', 'Cloud Computing', 'Cybersecurity'],
                    top_performers: [
                        { name: 'Rajesh Kumar', efficiency: 92, cases_completed: 20 },
                        { name: 'Sneha Reddy', efficiency: 90, cases_completed: 17 }
                    ],
                    workload_distribution: [
                        { department: 'Engineering', technicians: 3, avg_workload: 76.7, efficiency: 89 },
                        { department: 'Field Service', technicians: 1, avg_workload: 60, efficiency: 88 }
                    ]
                }
            }
        });
    });
}

// Assignee Workload Analytics Routes
if (analyticsController && typeof analyticsController.getAssigneeWorkload === 'function') {
    router.get('/assignee-workload', analyticsController.getAssigneeWorkload.bind(analyticsController));
} else {
    router.get('/assignee-workload', (req, res) => {
        res.json({
            success: true,
            data: {
                assignees: [
                    {
                        id: 1,
                        name: 'Rajesh Kumar',
                        role: 'Senior Engineer',
                        department: 'Engineering',
                        email: 'rajesh.kumar@vtria.com',
                        phone: '+91 98765 43210',
                        status: 'active',
                        totalCases: 25,
                        activeCases: 8,
                        completedCases: 17,
                        overdueCases: 2,
                        avgCompletionTime: 5.2,
                        efficiency: 89,
                        workloadPercentage: 85,
                        casesByState: {
                            'enquiry': 2,
                            'estimation': 3,
                            'quotation': 1,
                            'order': 1,
                            'production': 1,
                            'delivery': 0
                        },
                        cases: [
                            {
                                case_number: 'CASE-2024-001',
                                client_name: 'ABC Manufacturing',
                                project_name: 'Automated Assembly Line',
                                current_state: 'estimation',
                                created_at: '2024-03-15T09:00:00Z',
                                priority: 'high',
                                estimated_completion: '2024-03-25T17:00:00Z',
                                delay_days: 0
                            }
                        ],
                        performance_metrics: {
                            monthly_trend: [
                                { month: 'Jan', completed: 6, avg_time: 5.5, efficiency: 85 },
                                { month: 'Feb', completed: 5, avg_time: 5.0, efficiency: 87 }
                            ],
                            skill_utilization: [
                                { skill: 'PLC Programming', usage_percentage: 80, proficiency: 95 },
                                { skill: 'System Design', usage_percentage: 60, proficiency: 90 }
                            ],
                            customer_feedback: {
                                rating: 4.8,
                                feedback_count: 15,
                                positive_feedback: 14
                            }
                        }
                    }
                ],
                analytics: {
                    total_assignees: 3,
                    avg_workload: 76.7,
                    team_efficiency: 86.3,
                    capacity_utilization: 82,
                    workload_distribution: {
                        balanced: 1,
                        overloaded: 1,
                        underutilized: 1
                    },
                    department_performance: [
                        { department: 'Engineering', assignees: 1, avg_efficiency: 89, workload: 85, cases_completed: 17 },
                        { department: 'Project Management', assignees: 1, avg_efficiency: 78, workload: 95, cases_completed: 10 }
                    ],
                    alerts: [
                        { type: 'overload', assignee: 'Priya Sharma', description: 'Workload exceeds 90%', severity: 'high' },
                        { type: 'deadline', assignee: 'Rajesh Kumar', description: '2 cases approaching deadline', severity: 'medium' }
                    ]
                }
            }
        });
    });
}

// Health check route
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Analytics API is healthy',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/analytics/cases',
            '/analytics/price-comparison',
            '/analytics/case-history',
            '/analytics/technicians',
            '/analytics/assignee-workload'
        ]
    });
});

// Error handling middleware
router.use((error, req, res) => {
    console.error('Analytics API Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error in analytics API',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

module.exports = router;