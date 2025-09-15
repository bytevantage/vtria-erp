-- AI-Powered Insights and Recommendations System
-- File: 034_ai_insights_system.sql
-- Implements machine learning insights, predictive analytics, and automated recommendations

-- AI model definitions and configurations
CREATE TABLE ai_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL UNIQUE,
    model_type ENUM('predictive', 'classification', 'clustering', 'recommendation', 'anomaly_detection') NOT NULL,
    model_category ENUM('project_delay', 'cost_estimation', 'resource_optimization', 'quality_prediction', 'client_satisfaction', 'risk_assessment') NOT NULL,
    
    -- Model configuration
    model_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    algorithm_type VARCHAR(50) NOT NULL,
    training_data_source TEXT NOT NULL,
    input_features JSON NOT NULL COMMENT 'Features used by the model',
    output_schema JSON NOT NULL COMMENT 'Structure of model outputs',
    
    -- Performance metrics
    accuracy_score DECIMAL(5,4) NULL,
    precision_score DECIMAL(5,4) NULL,
    recall_score DECIMAL(5,4) NULL,
    f1_score DECIMAL(5,4) NULL,
    last_trained_at TIMESTAMP NULL,
    training_data_size INT NULL,
    
    -- Model status
    is_active BOOLEAN DEFAULT TRUE,
    is_production_ready BOOLEAN DEFAULT FALSE,
    confidence_threshold DECIMAL(5,4) DEFAULT 0.7500,
    
    -- Metadata
    description TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_model_type (model_type),
    INDEX idx_model_category (model_category),
    INDEX idx_active (is_active)
) COMMENT='AI model definitions and performance tracking';

-- AI-generated insights and predictions
CREATE TABLE ai_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    case_id INT NULL,
    milestone_id INT NULL,
    client_id INT NULL,
    
    -- Insight details
    insight_type ENUM('prediction', 'recommendation', 'anomaly', 'optimization', 'warning', 'opportunity') NOT NULL,
    insight_category ENUM('schedule', 'budget', 'quality', 'resource', 'risk', 'client_satisfaction') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- AI analysis
    confidence_score DECIMAL(5,4) NOT NULL,
    severity_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    predicted_impact ENUM('positive', 'negative', 'neutral') NOT NULL,
    predicted_value DECIMAL(15,2) NULL COMMENT 'Quantified impact (cost, time, etc.)',
    
    -- Supporting data
    input_data JSON NOT NULL COMMENT 'Data used to generate this insight',
    model_output JSON NOT NULL COMMENT 'Raw model output',
    supporting_evidence TEXT NULL,
    
    -- Actionability
    is_actionable BOOLEAN DEFAULT TRUE,
    recommended_actions JSON NULL COMMENT 'Suggested actions to take',
    urgency_level ENUM('immediate', 'within_week', 'within_month', 'long_term') DEFAULT 'within_week',
    
    -- Tracking
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INT NULL,
    acknowledged_at TIMESTAMP NULL,
    is_acted_upon BOOLEAN DEFAULT FALSE,
    action_taken TEXT NULL,
    action_result ENUM('successful', 'partially_successful', 'unsuccessful', 'pending') NULL,
    
    -- Feedback for model improvement
    user_rating ENUM('very_helpful', 'helpful', 'neutral', 'not_helpful', 'incorrect') NULL,
    user_feedback TEXT NULL,
    actual_outcome TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_model_id (model_id),
    INDEX idx_case_id (case_id),
    INDEX idx_insight_type (insight_type),
    INDEX idx_insight_category (insight_category),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_severity_level (severity_level),
    INDEX idx_created_at (created_at),
    INDEX idx_actionable (is_actionable)
) COMMENT='AI-generated insights and predictions with tracking';

-- Automated recommendations with smart suggestions
CREATE TABLE ai_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insight_id INT NULL,
    case_id INT NULL,
    milestone_id INT NULL,
    client_id INT NULL,
    
    -- Recommendation details
    recommendation_type ENUM('process_improvement', 'resource_allocation', 'timeline_adjustment', 'cost_optimization', 'quality_enhancement', 'risk_mitigation') NOT NULL,
    priority_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Implementation details
    effort_level ENUM('minimal', 'low', 'medium', 'high', 'extensive') NOT NULL,
    estimated_time_to_implement VARCHAR(50) NULL,
    estimated_cost_impact DECIMAL(12,2) NULL,
    estimated_time_savings_hours INT NULL,
    
    -- AI confidence and reasoning
    confidence_score DECIMAL(5,4) NOT NULL,
    reasoning TEXT NOT NULL,
    success_probability DECIMAL(5,4) NULL,
    risk_factors JSON NULL COMMENT 'Potential risks of implementation',
    
    -- Implementation plan
    implementation_steps JSON NULL COMMENT 'Step-by-step implementation guide',
    required_resources JSON NULL COMMENT 'Resources needed for implementation',
    dependencies JSON NULL COMMENT 'Prerequisites and dependencies',
    success_metrics JSON NULL COMMENT 'How to measure success',
    
    -- Status tracking
    status ENUM('generated', 'reviewed', 'approved', 'in_progress', 'implemented', 'rejected', 'expired') DEFAULT 'generated',
    assigned_to INT NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    implementation_started_at TIMESTAMP NULL,
    implementation_completed_at TIMESTAMP NULL,
    
    -- Results and feedback
    implementation_success ENUM('successful', 'partially_successful', 'unsuccessful') NULL,
    actual_impact_value DECIMAL(12,2) NULL,
    lessons_learned TEXT NULL,
    user_satisfaction_rating ENUM('excellent', 'good', 'fair', 'poor') NULL,
    
    -- Expiry and relevance
    expires_at TIMESTAMP NULL,
    is_relevant BOOLEAN DEFAULT TRUE,
    relevance_score DECIMAL(5,4) DEFAULT 1.0000,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (insight_id) REFERENCES ai_insights(id) ON DELETE SET NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_insight_id (insight_id),
    INDEX idx_case_id (case_id),
    INDEX idx_recommendation_type (recommendation_type),
    INDEX idx_priority_level (priority_level),
    INDEX idx_status (status),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_created_at (created_at)
) COMMENT='AI-generated recommendations with implementation tracking';

-- Smart alerts and proactive notifications
CREATE TABLE ai_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    insight_id INT NULL,
    case_id INT NULL,
    milestone_id INT NULL,
    
    -- Alert details
    alert_type ENUM('deadline_risk', 'budget_overrun', 'quality_issue', 'resource_conflict', 'client_satisfaction', 'anomaly_detected') NOT NULL,
    severity ENUM('info', 'warning', 'error', 'critical') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Triggering conditions
    trigger_condition TEXT NOT NULL,
    threshold_value DECIMAL(15,4) NULL,
    actual_value DECIMAL(15,4) NULL,
    deviation_percentage DECIMAL(5,2) NULL,
    
    -- AI analysis
    confidence_score DECIMAL(5,4) NOT NULL,
    predicted_outcome TEXT NULL,
    time_to_critical_hours INT NULL COMMENT 'Hours until situation becomes critical',
    
    -- Alert metadata
    is_critical BOOLEAN DEFAULT FALSE,
    requires_immediate_action BOOLEAN DEFAULT FALSE,
    suggested_actions JSON NULL,
    escalation_rules JSON NULL,
    
    -- Status and response
    status ENUM('active', 'acknowledged', 'resolved', 'dismissed', 'expired') DEFAULT 'active',
    acknowledged_by INT NULL,
    acknowledged_at TIMESTAMP NULL,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT NULL,
    
    -- Notification tracking
    notifications_sent JSON NULL COMMENT 'Record of sent notifications',
    last_escalated_at TIMESTAMP NULL,
    escalation_level INT DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
    FOREIGN KEY (insight_id) REFERENCES ai_insights(id) ON DELETE SET NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_model_id (model_id),
    INDEX idx_case_id (case_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_is_critical (is_critical),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
) COMMENT='Smart alerts with AI-driven proactive notifications';

-- Machine learning training data and model performance tracking
CREATE TABLE ai_training_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    case_id INT NULL,
    milestone_id INT NULL,
    
    -- Training data
    feature_vector JSON NOT NULL COMMENT 'Input features for training',
    target_value JSON NOT NULL COMMENT 'Expected output/label',
    data_source ENUM('historical_cases', 'milestone_activities', 'user_feedback', 'external_data', 'synthetic') NOT NULL,
    
    -- Data quality
    data_quality_score DECIMAL(5,4) DEFAULT 1.0000,
    is_validated BOOLEAN DEFAULT FALSE,
    validation_method VARCHAR(100) NULL,
    data_completeness DECIMAL(5,4) DEFAULT 1.0000,
    
    -- Metadata
    collection_timestamp TIMESTAMP NOT NULL,
    data_version VARCHAR(20) DEFAULT '1.0',
    source_reference VARCHAR(500) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE SET NULL,
    
    INDEX idx_model_id (model_id),
    INDEX idx_case_id (case_id),
    INDEX idx_data_source (data_source),
    INDEX idx_collection_timestamp (collection_timestamp)
) COMMENT='Training data for machine learning models';

-- Predictive analytics and forecasting results
CREATE TABLE ai_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    case_id INT NULL,
    milestone_id INT NULL,
    
    -- Prediction details
    prediction_type ENUM('completion_date', 'cost_estimate', 'resource_requirement', 'quality_score', 'risk_probability', 'client_satisfaction') NOT NULL,
    predicted_value DECIMAL(15,4) NOT NULL,
    confidence_interval_lower DECIMAL(15,4) NULL,
    confidence_interval_upper DECIMAL(15,4) NULL,
    confidence_score DECIMAL(5,4) NOT NULL,
    
    -- Prediction context
    prediction_horizon_days INT NOT NULL,
    input_features JSON NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    
    -- Accuracy tracking
    actual_value DECIMAL(15,4) NULL,
    accuracy_score DECIMAL(5,4) NULL,
    absolute_error DECIMAL(15,4) NULL,
    percentage_error DECIMAL(7,4) NULL,
    is_validated BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    prediction_date TIMESTAMP NOT NULL,
    target_date TIMESTAMP NOT NULL,
    validation_date TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    
    INDEX idx_model_id (model_id),
    INDEX idx_case_id (case_id),
    INDEX idx_prediction_type (prediction_type),
    INDEX idx_prediction_date (prediction_date),
    INDEX idx_target_date (target_date),
    INDEX idx_confidence_score (confidence_score)
) COMMENT='Predictive analytics results with accuracy tracking';

-- Insert default AI models for the system
INSERT INTO ai_models (
    model_name,
    model_type,
    model_category,
    algorithm_type,
    training_data_source,
    input_features,
    output_schema,
    description,
    created_by,
    is_production_ready
) VALUES
(
    'Project Delay Predictor',
    'predictive',
    'project_delay',
    'Random Forest Regression',
    'Historical case and milestone data',
    '["milestone_count", "complexity_level", "team_size", "client_response_time", "requirements_changes", "critical_path_length"]',
    '{"predicted_delay_days": "number", "confidence": "number", "risk_factors": "array"}',
    'Predicts likelihood and magnitude of project delays based on historical patterns',
    1,
    TRUE
),
(
    'Cost Overrun Detector',
    'predictive',
    'cost_estimation',
    'Gradient Boosting Regressor',
    'Historical cost and budget data',
    '["initial_estimate", "scope_changes", "team_experience", "project_complexity", "client_history", "market_conditions"]',
    '{"predicted_cost_overrun_percentage": "number", "confidence": "number", "cost_drivers": "array"}',
    'Identifies potential cost overruns and their contributing factors',
    1,
    TRUE
),
(
    'Resource Optimization Engine',
    'recommendation',
    'resource_optimization',
    'Linear Programming with ML',
    'Resource allocation and utilization data',
    '["current_allocation", "skill_requirements", "availability", "project_priorities", "deadline_constraints"]',
    '{"optimal_allocation": "object", "efficiency_gain": "number", "recommendations": "array"}',
    'Optimizes resource allocation across projects for maximum efficiency',
    1,
    TRUE
),
(
    'Quality Risk Assessor',
    'classification',
    'quality_prediction',
    'Support Vector Machine',
    'Quality metrics and defect data',
    '["code_complexity", "testing_coverage", "team_experience", "timeline_pressure", "requirements_clarity"]',
    '{"quality_risk_level": "string", "probability": "number", "risk_areas": "array"}',
    'Assesses quality risks and suggests preventive measures',
    1,
    TRUE
),
(
    'Client Satisfaction Predictor',
    'predictive',
    'client_satisfaction',
    'Neural Network',
    'Client feedback and project metrics',
    '["communication_frequency", "milestone_adherence", "response_time", "issue_resolution_speed", "delivery_quality"]',
    '{"satisfaction_score": "number", "confidence": "number", "improvement_areas": "array"}',
    'Predicts client satisfaction and identifies improvement opportunities',
    1,
    TRUE
),
(
    'Anomaly Detection System',
    'anomaly_detection',
    'risk_assessment',
    'Isolation Forest',
    'All project metrics and activities',
    '["activity_patterns", "performance_metrics", "resource_usage", "timeline_deviations", "communication_patterns"]',
    '{"anomaly_score": "number", "anomaly_type": "string", "affected_areas": "array"}',
    'Detects unusual patterns that may indicate risks or opportunities',
    1,
    TRUE
);

-- Create views for AI analytics and dashboards
CREATE VIEW ai_insights_summary AS
SELECT 
    ai.insight_category,
    ai.insight_type,
    ai.severity_level,
    COUNT(*) as total_insights,
    AVG(ai.confidence_score) as avg_confidence,
    SUM(CASE WHEN ai.is_acknowledged = TRUE THEN 1 ELSE 0 END) as acknowledged_count,
    SUM(CASE WHEN ai.is_acted_upon = TRUE THEN 1 ELSE 0 END) as acted_upon_count,
    AVG(CASE 
        WHEN ai.user_rating = 'very_helpful' THEN 5
        WHEN ai.user_rating = 'helpful' THEN 4
        WHEN ai.user_rating = 'neutral' THEN 3
        WHEN ai.user_rating = 'not_helpful' THEN 2
        WHEN ai.user_rating = 'incorrect' THEN 1
        ELSE NULL
    END) as avg_user_rating,
    DATE(ai.created_at) as insight_date
FROM ai_insights ai
WHERE ai.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ai.insight_category, ai.insight_type, ai.severity_level, DATE(ai.created_at)
ORDER BY insight_date DESC, total_insights DESC;

CREATE VIEW ai_model_performance AS
SELECT 
    am.model_name,
    am.model_type,
    am.model_category,
    am.accuracy_score,
    am.confidence_threshold,
    am.last_trained_at,
    COUNT(ai.id) as insights_generated,
    AVG(ai.confidence_score) as avg_insight_confidence,
    SUM(CASE WHEN ai.user_rating IN ('very_helpful', 'helpful') THEN 1 ELSE 0 END) as positive_feedback_count,
    SUM(CASE WHEN ai.user_rating IN ('not_helpful', 'incorrect') THEN 1 ELSE 0 END) as negative_feedback_count,
    COUNT(ap.id) as predictions_made,
    AVG(ap.accuracy_score) as avg_prediction_accuracy
FROM ai_models am
LEFT JOIN ai_insights ai ON am.id = ai.model_id
LEFT JOIN ai_predictions ap ON am.id = ap.model_id
WHERE am.is_active = TRUE
GROUP BY am.id, am.model_name, am.model_type, am.model_category, 
         am.accuracy_score, am.confidence_threshold, am.last_trained_at;

-- Create stored procedures for AI operations
DELIMITER //

-- Generate insights for a specific case
CREATE PROCEDURE GenerateAIInsights(
    IN p_case_id INT,
    IN p_model_types TEXT -- Comma-separated list of model types to run
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_model_id INT;
    DECLARE v_model_name VARCHAR(100);
    DECLARE v_model_type VARCHAR(50);
    
    DECLARE model_cursor CURSOR FOR
        SELECT id, model_name, model_type
        FROM ai_models
        WHERE is_active = TRUE 
        AND is_production_ready = TRUE
        AND (p_model_types IS NULL OR FIND_IN_SET(model_type, p_model_types) > 0);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN model_cursor;
    
    model_loop: LOOP
        FETCH model_cursor INTO v_model_id, v_model_name, v_model_type;
        
        IF done THEN
            LEAVE model_loop;
        END IF;
        
        -- Call specific model logic based on type
        CASE v_model_type
            WHEN 'predictive' THEN
                CALL RunPredictiveModel(v_model_id, p_case_id);
            WHEN 'recommendation' THEN
                CALL RunRecommendationModel(v_model_id, p_case_id);
            WHEN 'anomaly_detection' THEN
                CALL RunAnomalyDetection(v_model_id, p_case_id);
        END CASE;
        
    END LOOP;
    
    CLOSE model_cursor;
END//

-- Simplified predictive model runner (placeholder for actual ML integration)
CREATE PROCEDURE RunPredictiveModel(
    IN p_model_id INT,
    IN p_case_id INT
)
BEGIN
    DECLARE v_case_complexity VARCHAR(20);
    DECLARE v_milestone_count INT;
    DECLARE v_team_size INT;
    DECLARE v_predicted_delay DECIMAL(10,2);
    DECLARE v_confidence DECIMAL(5,4);
    
    -- Get case data for prediction
    SELECT 
        COALESCE(c.priority, 'medium'),
        COUNT(cm.id),
        COUNT(DISTINCT cm.assigned_to)
    INTO v_case_complexity, v_milestone_count, v_team_size
    FROM cases c
    LEFT JOIN case_milestones cm ON c.id = cm.case_id
    WHERE c.id = p_case_id
    GROUP BY c.id;
    
    -- Simple rule-based prediction (replace with actual ML model)
    SET v_predicted_delay = CASE 
        WHEN v_case_complexity = 'high' AND v_milestone_count > 5 THEN 
            RAND() * 10 + 5  -- 5-15 days delay
        WHEN v_case_complexity = 'medium' THEN 
            RAND() * 5 + 2   -- 2-7 days delay
        ELSE 
            RAND() * 3       -- 0-3 days delay
    END;
    
    SET v_confidence = 0.7500 + (RAND() * 0.2000); -- 75-95% confidence
    
    -- Insert prediction
    INSERT INTO ai_predictions (
        model_id, case_id, prediction_type, predicted_value,
        confidence_score, prediction_horizon_days, input_features,
        model_version, prediction_date, target_date
    ) VALUES (
        p_model_id, p_case_id, 'completion_date', v_predicted_delay,
        v_confidence, 30, 
        JSON_OBJECT(
            'case_complexity', v_case_complexity,
            'milestone_count', v_milestone_count,
            'team_size', v_team_size
        ),
        '1.0', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
    );
    
    -- Generate insight if delay is significant
    IF v_predicted_delay > 3 AND v_confidence > 0.8000 THEN
        INSERT INTO ai_insights (
            model_id, case_id, insight_type, insight_category,
            title, description, confidence_score, severity_level,
            predicted_impact, input_data, model_output,
            recommended_actions
        ) VALUES (
            p_model_id, p_case_id, 'warning', 'schedule',
            'Potential Project Delay Detected',
            CONCAT('AI analysis indicates a potential delay of ', ROUND(v_predicted_delay, 1), ' days based on current project parameters.'),
            v_confidence, 
            CASE WHEN v_predicted_delay > 7 THEN 'high' ELSE 'medium' END,
            'negative',
            JSON_OBJECT(
                'complexity', v_case_complexity,
                'milestone_count', v_milestone_count,
                'team_size', v_team_size
            ),
            JSON_OBJECT(
                'predicted_delay_days', v_predicted_delay,
                'confidence', v_confidence
            ),
            JSON_ARRAY(
                'Review project timeline and milestones',
                'Consider additional resources if needed',
                'Communicate potential delay to stakeholders',
                'Identify and mitigate bottlenecks'
            )
        );
    END IF;
END//

DELIMITER ;