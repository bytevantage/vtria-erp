-- ============================================================================
-- PERFORMANCE MANAGEMENT SCHEMA
-- ============================================================================
-- This schema supports comprehensive performance management including:
-- - Goal Setting (OKRs & KPIs)
-- - Performance Review Cycles
-- - 360-Degree Feedback
-- - Competency Assessments
-- - Rating & Scoring
-- - Development Plans
-- - Performance Improvement Plans (PIPs)
-- ============================================================================

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS performance_improvement_plans;
DROP TABLE IF EXISTS development_plan_actions;
DROP TABLE IF EXISTS development_plans;
DROP TABLE IF EXISTS review_feedback;
DROP TABLE IF EXISTS review_competency_ratings;
DROP TABLE IF EXISTS review_goal_assessments;
DROP TABLE IF EXISTS performance_reviews;
DROP TABLE IF EXISTS goal_key_results;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS review_cycles;
DROP TABLE IF EXISTS competencies;
DROP TABLE IF EXISTS rating_scales;

-- ============================================================================
-- RATING SCALES
-- ============================================================================
-- Define rating scales for performance evaluations
CREATE TABLE rating_scales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scale_name VARCHAR(100) NOT NULL,
    scale_type ENUM('numeric', 'descriptive', 'grade') DEFAULT 'numeric',
    min_value DECIMAL(3,2) NOT NULL,
    max_value DECIMAL(3,2) NOT NULL,
    scale_labels JSON COMMENT 'Array of {value, label, description}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_scale_name (scale_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default rating scales
INSERT INTO rating_scales (scale_name, scale_type, min_value, max_value, scale_labels) VALUES
('5-Point Scale', 'numeric', 1.00, 5.00, '[
    {"value": 1.0, "label": "Poor", "description": "Performance consistently falls below expectations"},
    {"value": 2.0, "label": "Needs Improvement", "description": "Performance occasionally meets expectations"},
    {"value": 3.0, "label": "Meets Expectations", "description": "Performance consistently meets expectations"},
    {"value": 4.0, "label": "Exceeds Expectations", "description": "Performance frequently exceeds expectations"},
    {"value": 5.0, "label": "Outstanding", "description": "Performance consistently exceeds expectations"}
]'),
('Letter Grade', 'grade', 1.00, 5.00, '[
    {"value": 1.0, "label": "D", "description": "Below expectations"},
    {"value": 2.0, "label": "C", "description": "Meets some expectations"},
    {"value": 3.0, "label": "B", "description": "Meets expectations"},
    {"value": 4.0, "label": "A", "description": "Exceeds expectations"},
    {"value": 5.0, "label": "A+", "description": "Outstanding performance"}
]'),
('Percentage Scale', 'numeric', 0.00, 5.00, '[
    {"value": 0.0, "label": "0-49%", "description": "Unacceptable"},
    {"value": 2.5, "label": "50-64%", "description": "Needs Improvement"},
    {"value": 3.5, "label": "65-74%", "description": "Satisfactory"},
    {"value": 4.0, "label": "75-89%", "description": "Good"},
    {"value": 5.0, "label": "90-100%", "description": "Excellent"}
]');

-- ============================================================================
-- COMPETENCIES
-- ============================================================================
-- Define competencies and skills to be assessed
CREATE TABLE competencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competency_code VARCHAR(50) UNIQUE NOT NULL,
    competency_name VARCHAR(200) NOT NULL,
    category ENUM('technical', 'behavioral', 'leadership', 'core') DEFAULT 'core',
    description TEXT,
    rating_scale_id INT,
    applies_to JSON COMMENT 'Array of roles/departments this applies to',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rating_scale_id) REFERENCES rating_scales(id),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default competencies
INSERT INTO competencies (competency_code, competency_name, category, description, rating_scale_id, display_order) VALUES
-- Core Competencies
('COM_COMM', 'Communication', 'core', 'Ability to clearly convey information and ideas through written and verbal communication', 1, 1),
('COM_TEAM', 'Teamwork & Collaboration', 'core', 'Works effectively with others to achieve common goals', 1, 2),
('COM_PROB', 'Problem Solving', 'core', 'Identifies issues and develops effective solutions', 1, 3),
('COM_INIT', 'Initiative', 'core', 'Takes proactive action without being asked', 1, 4),
('COM_ADAPT', 'Adaptability', 'core', 'Adjusts to changing circumstances and priorities', 1, 5),
('COM_TIME', 'Time Management', 'core', 'Effectively manages time and priorities', 1, 6),
('COM_QUAL', 'Quality of Work', 'core', 'Produces accurate and thorough work', 1, 7),
('COM_CUST', 'Customer Focus', 'core', 'Prioritizes customer satisfaction and service', 1, 8),

-- Technical Competencies
('TEC_SKILL', 'Technical Skills', 'technical', 'Demonstrates required technical expertise for the role', 1, 9),
('TEC_INNOV', 'Innovation', 'technical', 'Develops creative solutions and new approaches', 1, 10),
('TEC_LEARN', 'Continuous Learning', 'technical', 'Actively seeks to improve skills and knowledge', 1, 11),

-- Leadership Competencies
('LEAD_VIS', 'Vision & Strategy', 'leadership', 'Sets clear direction and strategic vision', 1, 12),
('LEAD_DEC', 'Decision Making', 'leadership', 'Makes sound decisions in a timely manner', 1, 13),
('LEAD_DEV', 'People Development', 'leadership', 'Develops and mentors team members', 1, 14),
('LEAD_ACC', 'Accountability', 'leadership', 'Takes ownership of results and outcomes', 1, 15);

-- ============================================================================
-- REVIEW CYCLES
-- ============================================================================
-- Define performance review periods
CREATE TABLE review_cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_name VARCHAR(200) NOT NULL,
    cycle_type ENUM('annual', 'semi_annual', 'quarterly', 'probation', 'project') DEFAULT 'annual',
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    self_review_deadline DATE,
    manager_review_deadline DATE,
    peer_feedback_deadline DATE,
    final_review_deadline DATE,
    status ENUM('draft', 'open', 'in_progress', 'completed', 'closed') DEFAULT 'draft',
    instructions TEXT COMMENT 'Instructions for reviewers',
    rating_scale_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rating_scale_id) REFERENCES rating_scales(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_cycle_type (cycle_type),
    INDEX idx_status (status),
    INDEX idx_review_period (review_period_start, review_period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- GOALS (OKRs & KPIs)
-- ============================================================================
-- Employee goals and objectives
CREATE TABLE goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    review_cycle_id INT,
    goal_type ENUM('okr', 'kpi', 'smart', 'project', 'development') DEFAULT 'smart',
    goal_title VARCHAR(500) NOT NULL,
    goal_description TEXT,
    category ENUM('individual', 'team', 'company') DEFAULT 'individual',
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    completion_date DATE,
    status ENUM('draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled') DEFAULT 'draft',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    measurement_criteria TEXT COMMENT 'How success will be measured',
    target_value VARCHAR(100) COMMENT 'Target metric value',
    current_value VARCHAR(100) COMMENT 'Current metric value',
    weight_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Weight in overall performance',
    aligned_with_id INT COMMENT 'Parent goal this aligns with',
    created_by INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (review_cycle_id) REFERENCES review_cycles(id),
    FOREIGN KEY (aligned_with_id) REFERENCES goals(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_employee (employee_id),
    INDEX idx_review_cycle (review_cycle_id),
    INDEX idx_goal_type (goal_type),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, target_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- GOAL KEY RESULTS (for OKRs)
-- ============================================================================
-- Key results for Objectives (OKR methodology)
CREATE TABLE goal_key_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    goal_id INT NOT NULL,
    key_result_title VARCHAR(500) NOT NULL,
    key_result_description TEXT,
    target_value VARCHAR(100) NOT NULL,
    current_value VARCHAR(100),
    unit VARCHAR(50) COMMENT 'Unit of measurement (%, count, etc)',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('not_started', 'in_progress', 'completed', 'cancelled') DEFAULT 'not_started',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    INDEX idx_goal (goal_id),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PERFORMANCE REVIEWS
-- ============================================================================
-- Main performance review records
CREATE TABLE performance_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_cycle_id INT NOT NULL,
    employee_id INT NOT NULL,
    reviewer_id INT NOT NULL COMMENT 'Primary reviewer (usually manager)',
    review_type ENUM('self', 'manager', 'peer', '360', 'probation', 'final') DEFAULT 'manager',
    review_status ENUM('not_started', 'in_progress', 'submitted', 'acknowledged', 'completed') DEFAULT 'not_started',
    
    -- Self Review
    self_review_text TEXT,
    self_review_submitted_at TIMESTAMP NULL,
    
    -- Manager Review
    manager_review_text TEXT,
    manager_strengths TEXT,
    manager_areas_for_improvement TEXT,
    manager_submitted_at TIMESTAMP NULL,
    
    -- Overall Ratings
    overall_rating DECIMAL(3,2) COMMENT 'Final overall rating',
    goals_rating DECIMAL(3,2) COMMENT 'Goals achievement rating',
    competencies_rating DECIMAL(3,2) COMMENT 'Competencies rating',
    values_rating DECIMAL(3,2) COMMENT 'Company values rating',
    
    -- Calibration & Approval
    calibrated_rating DECIMAL(3,2) COMMENT 'Rating after calibration',
    calibration_notes TEXT,
    
    -- Recommendations
    promotion_recommended BOOLEAN DEFAULT FALSE,
    salary_increase_recommended BOOLEAN DEFAULT FALSE,
    recommended_increase_percentage DECIMAL(5,2),
    pip_recommended BOOLEAN DEFAULT FALSE COMMENT 'Performance Improvement Plan',
    
    -- Signatures & Acknowledgment
    employee_acknowledged_at TIMESTAMP NULL,
    employee_comments TEXT,
    reviewer_signed_at TIMESTAMP NULL,
    approver_id INT,
    approved_at TIMESTAMP NULL,
    
    -- Metadata
    review_date DATE,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (review_cycle_id) REFERENCES review_cycles(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id),
    UNIQUE KEY unique_review (review_cycle_id, employee_id, reviewer_id, review_type),
    INDEX idx_employee (employee_id),
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_review_cycle (review_cycle_id),
    INDEX idx_status (review_status),
    INDEX idx_review_date (review_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- REVIEW GOAL ASSESSMENTS
-- ============================================================================
-- Assessment of individual goals within a review
CREATE TABLE review_goal_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    performance_review_id INT NOT NULL,
    goal_id INT NOT NULL,
    achievement_rating DECIMAL(3,2) COMMENT 'Rating for this specific goal',
    achievement_percentage DECIMAL(5,2) COMMENT 'Percentage of goal achieved',
    self_assessment_text TEXT,
    manager_assessment_text TEXT,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (performance_review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id),
    UNIQUE KEY unique_goal_assessment (performance_review_id, goal_id),
    INDEX idx_review (performance_review_id),
    INDEX idx_goal (goal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- REVIEW COMPETENCY RATINGS
-- ============================================================================
-- Ratings for competencies within a review
CREATE TABLE review_competency_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    performance_review_id INT NOT NULL,
    competency_id INT NOT NULL,
    self_rating DECIMAL(3,2),
    manager_rating DECIMAL(3,2),
    peer_rating_avg DECIMAL(3,2) COMMENT 'Average rating from peers',
    final_rating DECIMAL(3,2),
    self_comments TEXT,
    manager_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (performance_review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (competency_id) REFERENCES competencies(id),
    UNIQUE KEY unique_competency_rating (performance_review_id, competency_id),
    INDEX idx_review (performance_review_id),
    INDEX idx_competency (competency_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- REVIEW FEEDBACK (360-Degree Feedback)
-- ============================================================================
-- Feedback from multiple sources
CREATE TABLE review_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    performance_review_id INT NOT NULL,
    feedback_provider_id INT NOT NULL,
    provider_relationship ENUM('manager', 'peer', 'direct_report', 'customer', 'other') NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Feedback Content
    strengths TEXT,
    areas_for_improvement TEXT,
    specific_examples TEXT,
    additional_comments TEXT,
    
    -- Ratings
    overall_rating DECIMAL(3,2),
    
    -- Status
    status ENUM('pending', 'submitted', 'reviewed') DEFAULT 'pending',
    submitted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (performance_review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (feedback_provider_id) REFERENCES users(id),
    INDEX idx_review (performance_review_id),
    INDEX idx_provider (feedback_provider_id),
    INDEX idx_relationship (provider_relationship),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEVELOPMENT PLANS
-- ============================================================================
-- Individual development plans
CREATE TABLE development_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    performance_review_id INT COMMENT 'Link to review that generated this plan',
    plan_title VARCHAR(500) NOT NULL,
    plan_type ENUM('career_growth', 'skill_development', 'leadership', 'technical', 'behavioral') DEFAULT 'skill_development',
    focus_areas TEXT COMMENT 'Key areas of focus',
    career_aspirations TEXT,
    start_date DATE NOT NULL,
    target_completion_date DATE,
    status ENUM('draft', 'active', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    progress_notes TEXT,
    created_by INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (performance_review_id) REFERENCES performance_reviews(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_employee (employee_id),
    INDEX idx_review (performance_review_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEVELOPMENT PLAN ACTIONS
-- ============================================================================
-- Specific actions/steps in development plans
CREATE TABLE development_plan_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    development_plan_id INT NOT NULL,
    action_title VARCHAR(500) NOT NULL,
    action_description TEXT,
    action_type ENUM('training', 'mentoring', 'project', 'reading', 'certification', 'coaching', 'other') DEFAULT 'training',
    resources_required TEXT,
    success_criteria TEXT,
    target_date DATE,
    completion_date DATE,
    status ENUM('not_started', 'in_progress', 'completed', 'cancelled') DEFAULT 'not_started',
    progress_notes TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (development_plan_id) REFERENCES development_plans(id) ON DELETE CASCADE,
    INDEX idx_plan (development_plan_id),
    INDEX idx_status (status),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PERFORMANCE IMPROVEMENT PLANS (PIPs)
-- ============================================================================
-- Performance Improvement Plans for underperformers
CREATE TABLE performance_improvement_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    performance_review_id INT COMMENT 'Review that triggered the PIP',
    pip_title VARCHAR(500) NOT NULL,
    
    -- Performance Issues
    performance_concerns TEXT NOT NULL COMMENT 'Specific performance issues',
    impact_of_issues TEXT COMMENT 'Impact on team/organization',
    
    -- Improvement Plan
    improvement_goals TEXT NOT NULL COMMENT 'Specific goals to achieve',
    success_criteria TEXT NOT NULL COMMENT 'How success will be measured',
    support_provided TEXT COMMENT 'Support and resources provided',
    
    -- Timeline
    start_date DATE NOT NULL,
    review_date DATE NOT NULL COMMENT 'Mid-point review date',
    end_date DATE NOT NULL,
    
    -- Status & Outcome
    status ENUM('draft', 'active', 'in_progress', 'successful', 'unsuccessful', 'cancelled') DEFAULT 'draft',
    outcome_summary TEXT,
    final_decision ENUM('continued_employment', 'role_change', 'termination', 'extension') COMMENT 'Final decision after PIP',
    
    -- Tracking
    weekly_updates TEXT,
    manager_notes TEXT,
    
    -- Approvals
    created_by INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    hr_reviewed_by INT,
    hr_reviewed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (performance_review_id) REFERENCES performance_reviews(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (hr_reviewed_by) REFERENCES users(id),
    INDEX idx_employee (employee_id),
    INDEX idx_review (performance_review_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- REPORTING VIEWS
-- ============================================================================

-- View: Employee Current Goals Summary
CREATE OR REPLACE VIEW v_employee_current_goals AS
SELECT 
    g.id as goal_id,
    g.employee_id,
    e.employee_id as emp_code,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    e.department,
    e.designation,
    g.goal_type,
    g.goal_title,
    g.category,
    g.priority,
    g.status,
    g.progress_percentage,
    g.target_value,
    g.current_value,
    g.weight_percentage,
    g.start_date,
    g.target_date,
    DATEDIFF(g.target_date, CURDATE()) as days_remaining,
    rc.cycle_name,
    g.created_at
FROM goals g
JOIN employees e ON g.employee_id = e.id
LEFT JOIN review_cycles rc ON g.review_cycle_id = rc.id
WHERE g.status IN ('active', 'on_track', 'at_risk', 'behind')
ORDER BY g.target_date ASC;

-- View: Review Cycle Summary
CREATE OR REPLACE VIEW v_review_cycle_summary AS
SELECT 
    rc.id as cycle_id,
    rc.cycle_name,
    rc.cycle_type,
    rc.review_period_start,
    rc.review_period_end,
    rc.status,
    COUNT(DISTINCT pr.employee_id) as total_employees,
    COUNT(DISTINCT CASE WHEN pr.review_status = 'completed' THEN pr.employee_id END) as completed_reviews,
    COUNT(DISTINCT CASE WHEN pr.review_status = 'in_progress' THEN pr.employee_id END) as in_progress_reviews,
    COUNT(DISTINCT CASE WHEN pr.review_status = 'not_started' THEN pr.employee_id END) as not_started_reviews,
    AVG(pr.overall_rating) as avg_overall_rating,
    AVG(pr.goals_rating) as avg_goals_rating,
    AVG(pr.competencies_rating) as avg_competencies_rating,
    SUM(CASE WHEN pr.promotion_recommended = TRUE THEN 1 ELSE 0 END) as promotions_recommended,
    SUM(CASE WHEN pr.pip_recommended = TRUE THEN 1 ELSE 0 END) as pips_recommended,
    rc.created_at
FROM review_cycles rc
LEFT JOIN performance_reviews pr ON rc.id = pr.review_cycle_id
GROUP BY rc.id;

-- View: Employee Performance History
CREATE OR REPLACE VIEW v_employee_performance_history AS
SELECT 
    pr.employee_id,
    e.employee_id as emp_code,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    e.department,
    e.designation,
    rc.cycle_name,
    rc.cycle_type,
    pr.review_type,
    pr.review_date,
    pr.overall_rating,
    pr.goals_rating,
    pr.competencies_rating,
    pr.promotion_recommended,
    pr.salary_increase_recommended,
    pr.recommended_increase_percentage,
    pr.review_status,
    CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name
FROM performance_reviews pr
JOIN employees e ON pr.employee_id = e.id
JOIN review_cycles rc ON pr.review_cycle_id = rc.id
JOIN users reviewer ON pr.reviewer_id = reviewer.id
WHERE pr.review_status IN ('submitted', 'acknowledged', 'completed')
ORDER BY pr.review_date DESC;

-- View: Active Development Plans Summary
CREATE OR REPLACE VIEW v_active_development_plans AS
SELECT 
    dp.id as plan_id,
    dp.employee_id,
    e.employee_id as emp_code,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    e.department,
    dp.plan_title,
    dp.plan_type,
    dp.status,
    dp.start_date,
    dp.target_completion_date,
    COUNT(dpa.id) as total_actions,
    COUNT(CASE WHEN dpa.status = 'completed' THEN 1 END) as completed_actions,
    COUNT(CASE WHEN dpa.status = 'in_progress' THEN 1 END) as in_progress_actions,
    ROUND((COUNT(CASE WHEN dpa.status = 'completed' THEN 1 END) / COUNT(dpa.id)) * 100, 2) as completion_percentage
FROM development_plans dp
JOIN employees e ON dp.employee_id = e.id
LEFT JOIN development_plan_actions dpa ON dp.id = dpa.development_plan_id
WHERE dp.status IN ('active', 'in_progress')
GROUP BY dp.id;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'Performance Management schema created successfully!' as message,
       'Tables: 12 main tables + 4 views created' as details;
