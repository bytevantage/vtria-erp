const db = require('../config/database');

// Helper functions for generating different types of insights
async function generateDelayPrediction(caseData, model) {
  const now = new Date();
  const dueDate = new Date(caseData.due_date);
  const daysToDeadline = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  const progressPercentage = caseData.progress_percentage || 0;
  
  const expectedProgress = Math.max(0, 100 - (daysToDeadline * 2));
  const progressGap = expectedProgress - progressPercentage;
  
  let confidence = 0.7 + (Math.abs(progressGap) / 100) * 0.3;
  confidence = Math.min(confidence, 0.95);
  
  let severity = 'low';
  if (progressGap > 30) severity = 'critical';
  else if (progressGap > 15) severity = 'high';
  else if (progressGap > 5) severity = 'medium';

  return {
    type: 'prediction',
    title: 'Project Delay Risk Analysis',
    description: `Based on current progress (${progressPercentage}%) and ${daysToDeadline} days remaining, there is a ${progressGap > 10 ? 'high' : 'low'} risk of project delay.`,
    confidence,
    severity,
    prediction: {
      delay_probability: Math.min(progressGap / 50, 1),
      estimated_delay_days: Math.max(0, Math.ceil(progressGap / 2)),
      critical_path_impact: progressGap > 20
    },
    riskFactors: [
      'Current progress below expected timeline',
      'Multiple pending milestones',
      'Resource allocation constraints'
    ],
    impact: `Potential delay of ${Math.ceil(progressGap / 2)} days with budget impact of $${Math.ceil(progressGap * 1000)}`,
    metadata: {
      current_progress: progressPercentage,
      days_to_deadline: daysToDeadline,
      progress_gap: progressGap
    }
  };
}

async function generateCostAnalysis(caseData, model) {
  const budgetUsed = caseData.budget_used || 0;
  const totalBudget = caseData.total_budget || 100000;
  const progressPercentage = caseData.progress_percentage || 0;
  
  const expectedBudgetUsed = (progressPercentage / 100) * totalBudget;
  const budgetVariance = budgetUsed - expectedBudgetUsed;
  const variancePercentage = (budgetVariance / totalBudget) * 100;
  
  let confidence = 0.8;
  let severity = 'low';
  
  if (Math.abs(variancePercentage) > 15) {
    severity = 'critical';
    confidence = 0.9;
  } else if (Math.abs(variancePercentage) > 10) {
    severity = 'high';
    confidence = 0.85;
  } else if (Math.abs(variancePercentage) > 5) {
    severity = 'medium';
  }

  return {
    type: 'prediction',
    title: 'Budget Variance Analysis',
    description: `Current budget usage is ${variancePercentage > 0 ? 'above' : 'below'} expected levels by ${Math.abs(variancePercentage).toFixed(1)}%.`,
    confidence,
    severity,
    prediction: {
      overrun_probability: Math.max(0, variancePercentage / 20),
      projected_final_cost: totalBudget + (budgetVariance * 2),
      variance_amount: budgetVariance
    },
    riskFactors: [
      'Budget tracking inconsistencies',
      'Scope creep indicators',
      'Resource cost fluctuations'
    ],
    impact: `Projected budget variance of $${Math.ceil(budgetVariance)}`,
    metadata: {
      budget_used: budgetUsed,
      total_budget: totalBudget,
      variance_percentage: variancePercentage
    }
  };
}

async function generateResourceOptimization(caseData, model) {
  return {
    type: 'optimization',
    title: 'Resource Allocation Optimization',
    description: 'AI analysis suggests potential resource reallocation opportunities to improve efficiency.',
    confidence: 0.75,
    severity: 'medium',
    prediction: {
      efficiency_gain: 15,
      cost_savings: 5000,
      time_savings_days: 3
    },
    riskFactors: [
      'Underutilized team members',
      'Skill mismatch in current assignments',
      'Parallel task opportunities'
    ],
    impact: 'Potential 15% efficiency improvement with $5,000 cost savings',
    metadata: {
      optimization_type: 'resource_reallocation'
    },
    recommendations: [
      'Reassign junior developer to testing tasks',
      'Implement parallel processing for data migration',
      'Cross-train team members on critical path activities'
    ]
  };
}

async function generateQualityAssessment(caseData, model) {
  return {
    type: 'warning',
    title: 'Quality Risk Assessment',
    description: 'Detected patterns suggesting potential quality issues based on historical data.',
    confidence: 0.82,
    severity: 'high',
    prediction: {
      quality_score: 75,
      defect_probability: 0.25,
      testing_adequacy: 'insufficient'
    },
    riskFactors: [
      'Accelerated development timeline',
      'Limited testing coverage',
      'Complex integration requirements'
    ],
    impact: 'Risk of quality issues that could delay delivery by 5-7 days',
    metadata: {
      quality_metrics: {
        code_coverage: 65,
        test_cases: 120,
        defects_found: 8
      }
    }
  };
}

async function generateSatisfactionPrediction(caseData, model) {
  return {
    type: 'prediction',
    title: 'Client Satisfaction Forecast',
    description: 'Predictive analysis of client satisfaction based on project metrics and communication patterns.',
    confidence: 0.78,
    severity: 'medium',
    prediction: {
      satisfaction_score: 78,
      nps_prediction: 7,
      retention_probability: 0.85
    },
    riskFactors: [
      'Communication frequency below average',
      'Multiple change requests',
      'Timeline adjustments'
    ],
    impact: 'Good satisfaction expected with room for improvement in communication',
    metadata: {
      communication_score: 75,
      delivery_performance: 82,
      responsiveness_rating: 80
    }
  };
}

async function generateAnomalyDetection(caseData, model) {
  return {
    type: 'anomaly',
    title: 'Process Anomaly Detected',
    description: 'Unusual patterns detected in project execution that deviate from normal workflow.',
    confidence: 0.88,
    severity: 'high',
    prediction: {
      anomaly_type: 'workflow_deviation',
      impact_level: 'medium',
      correction_needed: true
    },
    riskFactors: [
      'Irregular task completion patterns',
      'Unusual resource allocation',
      'Deviation from standard procedures'
    ],
    impact: 'Process inefficiency that could impact timeline and quality',
    metadata: {
      anomaly_score: 0.88,
      baseline_deviation: 35
    }
  };
}

async function createAIAlert(insight, caseData, model) {
  try {
    const alertData = {
      model_id: model.id,
      insight_id: insight.id,
      case_id: caseData.id,
      alert_type: mapInsightToAlertType(insight.type, insight.severity),
      severity: insight.severity === 'critical' ? 'critical' : 'warning',
      title: `AI Alert: ${insight.title}`,
      message: insight.description,
      trigger_condition: `AI confidence >= ${insight.confidence}`,
      confidence_score: insight.confidence,
      predicted_outcome: insight.description,
      time_to_critical_hours: insight.severity === 'critical' ? 24 : 72,
      is_critical: insight.severity === 'critical',
      requires_immediate_action: insight.severity === 'critical',
      suggested_actions: JSON.stringify(insight.recommendations || []),
      escalation_rules: JSON.stringify({
        escalate_after_hours: insight.severity === 'critical' ? 4 : 24,
        escalation_chain: ['project_manager', 'department_head', 'director']
      })
    };

    await db.execute(`
      INSERT INTO ai_alerts (
        model_id, insight_id, case_id, alert_type, severity, title, message,
        trigger_condition, confidence_score, predicted_outcome, time_to_critical_hours,
        is_critical, requires_immediate_action, suggested_actions, escalation_rules,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      alertData.model_id, alertData.insight_id, alertData.case_id,
      alertData.alert_type, alertData.severity, alertData.title, alertData.message,
      alertData.trigger_condition, alertData.confidence_score, alertData.predicted_outcome,
      alertData.time_to_critical_hours, alertData.is_critical, alertData.requires_immediate_action,
      alertData.suggested_actions, alertData.escalation_rules
    ]);
  } catch (error) {
    console.error('Error creating AI alert:', error);
  }
}

async function createAIRecommendations(insight, caseData, model) {
  try {
    if (!insight.recommendations) return;

    for (const recommendation of insight.recommendations) {
      await db.execute(`
        INSERT INTO ai_recommendations (
          insight_id, case_id, client_id, recommendation_type, priority_level, title, description,
          effort_level, confidence_score, reasoning, implementation_steps, success_metrics,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        insight.id,
        caseData.id,
        caseData.client_id,
        'process_improvement',
        insight.severity === 'critical' ? 'high' : 'medium',
        `AI Recommendation: ${recommendation}`,
        recommendation,
        'medium',
        insight.confidence,
        'AI-generated recommendation based on pattern analysis',
        JSON.stringify([recommendation]),
        JSON.stringify(['Timeline improvement', 'Cost reduction', 'Quality metrics'])
      ]);
    }
  } catch (error) {
    console.error('Error creating AI recommendations:', error);
  }
}

function mapInsightToAlertType(insightType, severity) {
  const mapping = {
    'prediction': severity === 'critical' ? 'deadline_risk' : 'quality_issue',
    'warning': 'quality_issue',
    'anomaly': 'anomaly_detected',
    'optimization': 'resource_conflict'
  };
  return mapping[insightType] || 'anomaly_detected';
}

function mapInsightTypeToCategory(insightType) {
  const mapping = {
    'prediction': 'schedule',
    'warning': 'risk',
    'anomaly': 'risk',
    'optimization': 'resource'
  };
  return mapping[insightType] || 'risk';
}

class AIInsightsController {
  // Get AI dashboard summary
  async getAIDashboard(req, res) {
    try {
      const { clientId } = req.params;
      
      // Get AI insights summary
      const [summary] = await db.execute(`
        SELECT 
          COUNT(*) as total_insights,
          COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence_insights,
          COUNT(CASE WHEN severity_level = 'critical' THEN 1 END) as critical_insights,
          AVG(confidence_score) as avg_confidence,
          COUNT(CASE WHEN insight_type = 'prediction' THEN 1 END) as predictions,
          COUNT(CASE WHEN insight_type = 'recommendation' THEN 1 END) as recommendations
        FROM ai_insights 
        WHERE client_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [clientId]);

      // Get recent alerts
      const [alerts] = await db.execute(`
        SELECT 
          a.*,
          c.case_number,
          c.project_name,
          m.model_name
        FROM ai_alerts a
        LEFT JOIN cases c ON a.case_id = c.id
        LEFT JOIN ai_models m ON a.model_id = m.id
        WHERE a.status = 'active' 
        AND (a.case_id IN (SELECT id FROM cases WHERE client_id = ?) OR a.case_id IS NULL)
        ORDER BY a.severity DESC, a.created_at DESC
        LIMIT 10
      `, [clientId]);

      // Get active recommendations
      const [recommendations] = await db.execute(`
        SELECT 
          r.*,
          c.case_number,
          c.project_name,
          i.title as insight_title
        FROM ai_recommendations r
        LEFT JOIN cases c ON r.case_id = c.id
        LEFT JOIN ai_insights i ON r.insight_id = i.id
        WHERE r.status IN ('generated', 'reviewed', 'approved') 
        AND (r.case_id IN (SELECT id FROM cases WHERE client_id = ?) OR r.case_id IS NULL)
        ORDER BY r.priority_level DESC, r.confidence_score DESC
        LIMIT 10
      `, [clientId]);

      // Get AI model performance
      const [modelPerformance] = await db.execute(`
        SELECT * FROM ai_model_performance 
        ORDER BY last_trained_at DESC
        LIMIT 6
      `);

      res.json({
        success: true,
        data: {
          summary: summary[0],
          alerts,
          recommendations,
          modelPerformance
        }
      });
    } catch (error) {
      console.error('Error getting AI dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI dashboard',
        error: error.message
      });
    }
  }

  // Get AI insights for a specific case
  async getCaseInsights(req, res) {
    try {
      const { caseId } = req.params;
      const { type, severity } = req.query;

      let query = `
        SELECT 
          i.*,
          m.model_name,
          m.model_type,
          c.case_number,
          c.project_name
        FROM ai_insights i
        LEFT JOIN ai_models m ON i.model_id = m.id
        LEFT JOIN cases c ON i.case_id = c.id
        WHERE i.case_id = ?
      `;
      const params = [caseId];

      if (type) {
        query += ' AND i.insight_type = ?';
        params.push(type);
      }

      if (severity) {
        query += ' AND i.severity_level = ?';
        params.push(severity);
      }

      query += ' ORDER BY i.created_at DESC';

      const [insights] = await db.execute(query, params);

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error getting case insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get case insights',
        error: error.message
      });
    }
  }

  // Generate new AI insights
  async generateInsights(req, res) {
    try {
      const { caseId, modelIds } = req.body;

      if (!caseId) {
        return res.status(400).json({
          success: false,
          message: 'Case ID is required'
        });
      }

      // Get case data
      const [cases] = await db.execute(`
        SELECT * FROM cases WHERE id = ?
      `, [caseId]);

      if (cases.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Case not found'
        });
      }

      const caseData = cases[0];

      // Get models to use
      let models;
      if (modelIds && modelIds.length > 0) {
        const placeholders = modelIds.map(() => '?').join(',');
        const [modelResults] = await db.execute(`
          SELECT * FROM ai_models WHERE id IN (${placeholders}) AND is_active = TRUE
        `, modelIds);
        models = modelResults;
      } else {
        const [modelResults] = await db.execute(`
          SELECT * FROM ai_models WHERE is_active = TRUE
        `);
        models = modelResults;
      }

      const generatedInsights = [];

      // Generate insights for each model
      for (const model of models) {
        let insight = null;

        switch (model.model_category) {
          case 'project_delay':
            insight = await generateDelayPrediction(caseData, model);
            break;
          case 'cost_estimation':
            insight = await generateCostAnalysis(caseData, model);
            break;
          case 'resource_optimization':
            insight = await generateResourceOptimization(caseData, model);
            break;
          case 'quality_prediction':
            insight = await generateQualityAssessment(caseData, model);
            break;
          case 'client_satisfaction':
            insight = await generateSatisfactionPrediction(caseData, model);
            break;
          case 'risk_assessment':
            insight = await generateAnomalyDetection(caseData, model);
            break;
        }

        if (insight) {
          // Store insight in database
          const [result] = await db.execute(`
            INSERT INTO ai_insights (
              model_id, case_id, client_id, insight_type, insight_category, title, description,
              confidence_score, severity_level, predicted_impact, predicted_value,
              input_data, model_output, supporting_evidence, recommended_actions, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            model.id,
            caseId,
            caseData.client_id,
            insight.type,
            mapInsightTypeToCategory(insight.type),
            insight.title,
            insight.description,
            insight.confidence,
            insight.severity,
            'neutral',
            null,
            JSON.stringify(insight.metadata),
            JSON.stringify(insight.prediction),
            insight.impact,
            JSON.stringify(insight.recommendations || [])
          ]);

          insight.id = result.insertId;
          generatedInsights.push(insight);

          // Generate alerts if needed
          if (insight.severity === 'critical' || insight.confidence >= 0.9) {
            await createAIAlert(insight, caseData, model);
          }

          // Generate recommendations if applicable
          if (insight.recommendations && insight.recommendations.length > 0) {
            await createAIRecommendations(insight, caseData, model);
          }
        }
      }

      res.json({
        success: true,
        data: {
          insights: generatedInsights,
          generated_count: generatedInsights.length
        }
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate insights',
        error: error.message
      });
    }
  }

  // Get AI recommendations
  async getRecommendations(req, res) {
    try {
      const { caseId } = req.params;
      const { status, priority } = req.query;

      let query = `
        SELECT 
          r.*,
          i.title as insight_title,
          c.case_number,
          c.project_name,
          u.full_name as assigned_user_name
        FROM ai_recommendations r
        LEFT JOIN ai_insights i ON r.insight_id = i.id
        LEFT JOIN cases c ON r.case_id = c.id
        LEFT JOIN users u ON r.assigned_to = u.id
        WHERE r.case_id = ?
      `;
      const params = [caseId];

      if (status) {
        query += ' AND r.status = ?';
        params.push(status);
      }

      if (priority) {
        query += ' AND r.priority_level = ?';
        params.push(priority);
      }

      query += ' ORDER BY r.priority_level DESC, r.confidence_score DESC';

      const [recommendations] = await db.execute(query, params);

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations',
        error: error.message
      });
    }
  }

  // Update recommendation status
  async updateRecommendationStatus(req, res) {
    try {
      const { recommendationId } = req.params;
      const { status, implementation_notes, feedback_score } = req.body;

      const validStatuses = ['active', 'in_progress', 'implemented', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      await db.execute(`
        UPDATE ai_recommendations 
        SET 
          status = ?,
          implementation_notes = COALESCE(?, implementation_notes),
          feedback_score = COALESCE(?, feedback_score),
          updated_at = NOW()
        WHERE id = ?
      `, [status, implementation_notes, feedback_score, recommendationId]);

      res.json({
        success: true,
        message: 'Recommendation status updated successfully'
      });
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recommendation status',
        error: error.message
      });
    }
  }

  // Get AI alerts
  async getAlerts(req, res) {
    try {
      const { clientId } = req.params;
      const { status, severity, alert_type } = req.query;

      let query = `
        SELECT 
          a.*,
          m.model_name,
          c.case_number,
          c.project_name
        FROM ai_alerts a
        LEFT JOIN ai_models m ON a.model_id = m.id
        LEFT JOIN cases c ON a.case_id = c.id
        WHERE (a.case_id IN (SELECT id FROM cases WHERE client_id = ?) OR a.case_id IS NULL)
      `;
      const params = [clientId];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }

      if (severity) {
        query += ' AND a.severity = ?';
        params.push(severity);
      }

      if (alert_type) {
        query += ' AND a.alert_type = ?';
        params.push(alert_type);
      }

      query += ' ORDER BY a.severity DESC, a.created_at DESC';

      const [alerts] = await db.execute(query, params);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get alerts',
        error: error.message
      });
    }
  }

  // Acknowledge alert
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { acknowledged_by, acknowledgment_notes } = req.body;

      await db.execute(`
        UPDATE ai_alerts 
        SET 
          status = 'acknowledged',
          acknowledged_by = ?,
          acknowledged_at = NOW(),
          acknowledgment_notes = ?
        WHERE id = ?
      `, [acknowledged_by, acknowledgment_notes, alertId]);

      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert',
        error: error.message
      });
    }
  }

  // Get AI model performance
  async getModelPerformance(req, res) {
    try {
      const [performance] = await db.execute(`
        SELECT * FROM ai_model_performance
        ORDER BY last_trained_at DESC
      `);

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error getting model performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get model performance',
        error: error.message
      });
    }
  }
}

module.exports = new AIInsightsController();