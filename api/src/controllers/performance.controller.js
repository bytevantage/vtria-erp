const db = require('../config/database');

// ============================================================================
// HELPER FUNCTIONS (Outside class to avoid context issues)
// ============================================================================

/**
 * Calculate overall rating from component ratings
 */
function calculateOverallRating(goalsRating, competenciesRating, valuesRating = null, weights = null) {
  const defaultWeights = weights || {
    goals: 0.50,      // 50% weight
    competencies: 0.40, // 40% weight
    values: 0.10      // 10% weight
  };

  let totalWeight = 0;
  let weightedSum = 0;

  if (goalsRating !== null && goalsRating !== undefined) {
    weightedSum += goalsRating * defaultWeights.goals;
    totalWeight += defaultWeights.goals;
  }

  if (competenciesRating !== null && competenciesRating !== undefined) {
    weightedSum += competenciesRating * defaultWeights.competencies;
    totalWeight += defaultWeights.competencies;
  }

  if (valuesRating !== null && valuesRating !== undefined) {
    weightedSum += valuesRating * defaultWeights.values;
    totalWeight += defaultWeights.values;
  }

  return totalWeight > 0 ? (weightedSum / totalWeight) : null;
}

/**
 * Calculate goal achievement percentage
 */
function calculateGoalAchievement(targetValue, currentValue, unit = 'percentage') {
  if (!targetValue || !currentValue) return 0;

  const target = parseFloat(targetValue);
  const current = parseFloat(currentValue);

  if (target === 0) return 0;

  return Math.min((current / target) * 100, 100);
}

/**
 * Determine goal status based on progress and dates
 */
function determineGoalStatus(progressPercentage, targetDate) {
  const today = new Date();
  const target = new Date(targetDate);
  const daysRemaining = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (progressPercentage >= 100) return 'completed';
  if (daysRemaining < 0) return 'behind';
  if (progressPercentage >= 75) return 'on_track';
  if (progressPercentage >= 50 && daysRemaining > 30) return 'on_track';
  if (progressPercentage < 50 && daysRemaining < 30) return 'behind';
  return 'at_risk';
}

// ============================================================================
// PERFORMANCE CONTROLLER
// ============================================================================

class PerformanceController {

  // ========================================================================
  // RATING SCALES & COMPETENCIES
  // ========================================================================

  /**
   * Get all rating scales
   * GET /api/v1/hr/performance/rating-scales
   */
  async getRatingScales(req, res) {
    try {
      const { is_active } = req.query;

      let query = 'SELECT * FROM rating_scales';
      const params = [];

      if (is_active !== undefined) {
        query += ' WHERE is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY scale_name';

      const [scales] = await db.execute(query, params);

      // Parse JSON fields
      const parsedScales = scales.map(scale => ({
        ...scale,
        scale_labels: typeof scale.scale_labels === 'string'
          ? JSON.parse(scale.scale_labels)
          : scale.scale_labels
      }));

      res.json({
        success: true,
        data: parsedScales
      });

    } catch (error) {
      console.error('Error fetching rating scales:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching rating scales',
        error: error.message
      });
    }
  }

  /**
   * Get all competencies
   * GET /api/v1/hr/performance/competencies
   */
  async getCompetencies(req, res) {
    try {
      const { category, is_active } = req.query;

      let query = `
                SELECT c.*, rs.scale_name, rs.min_value, rs.max_value
                FROM competencies c
                LEFT JOIN rating_scales rs ON c.rating_scale_id = rs.id
                WHERE 1=1
            `;
      const params = [];

      if (category) {
        query += ' AND c.category = ?';
        params.push(category);
      }

      if (is_active !== undefined) {
        query += ' AND c.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY c.display_order, c.competency_name';

      const [competencies] = await db.execute(query, params);

      // Parse JSON fields
      const parsedCompetencies = competencies.map(comp => ({
        ...comp,
        applies_to: comp.applies_to ? JSON.parse(comp.applies_to) : null
      }));

      res.json({
        success: true,
        data: parsedCompetencies
      });

    } catch (error) {
      console.error('Error fetching competencies:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching competencies',
        error: error.message
      });
    }
  }

  // ========================================================================
  // REVIEW CYCLES
  // ========================================================================

  /**
   * Get all review cycles
   * GET /api/v1/hr/performance/review-cycles
   */
  async getReviewCycles(req, res) {
    try {
      const { status, cycle_type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = `
                SELECT 
                    rc.*,
                    rs.scale_name,
                    CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                    COUNT(DISTINCT pr.id) as total_reviews,
                    COUNT(DISTINCT CASE WHEN pr.review_status = 'completed' THEN pr.id END) as completed_reviews
                FROM review_cycles rc
                LEFT JOIN rating_scales rs ON rc.rating_scale_id = rs.id
                LEFT JOIN users u ON rc.created_by = u.id
                LEFT JOIN performance_reviews pr ON rc.id = pr.review_cycle_id
                WHERE 1=1
            `;
      const params = [];

      if (status) {
        query += ' AND rc.status = ?';
        params.push(status);
      }

      if (cycle_type) {
        query += ' AND rc.cycle_type = ?';
        params.push(cycle_type);
      }

      query += ' GROUP BY rc.id, rs.scale_name, u.first_name, u.last_name ORDER BY rc.review_period_start DESC';

      // Get total count
      const countQuery = `
                SELECT COUNT(DISTINCT rc.id) as total
                FROM review_cycles rc
                WHERE 1=1
                ${status ? ' AND rc.status = ?' : ''}
                ${cycle_type ? ' AND rc.cycle_type = ?' : ''}
            `;
      const countParams = [];
      if (status) countParams.push(status);
      if (cycle_type) countParams.push(cycle_type);

      const [countResult] = await db.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [cycles] = await db.query(query, params);

      res.json({
        success: true,
        data: cycles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching review cycles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching review cycles',
        error: error.message
      });
    }
  }  /**
   * Create a new review cycle
   * POST /api/v1/hr/performance/review-cycles
   */
  async createReviewCycle(req, res) {
    try {
      const {
        cycle_name,
        cycle_type,
        review_period_start,
        review_period_end,
        self_review_deadline,
        manager_review_deadline,
        peer_feedback_deadline,
        final_review_deadline,
        instructions,
        rating_scale_id
      } = req.body;

      // Validation
      if (!cycle_name || !review_period_start || !review_period_end) {
        return res.status(400).json({
          success: false,
          message: 'Cycle name, start date, and end date are required'
        });
      }

      const query = `
                INSERT INTO review_cycles (
                    cycle_name, cycle_type, review_period_start, review_period_end,
                    self_review_deadline, manager_review_deadline, peer_feedback_deadline,
                    final_review_deadline, instructions, rating_scale_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      const [result] = await db.execute(query, [
        cycle_name,
        cycle_type || 'annual',
        review_period_start,
        review_period_end,
        self_review_deadline,
        manager_review_deadline,
        peer_feedback_deadline,
        final_review_deadline,
        instructions,
        rating_scale_id,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Review cycle created successfully',
        data: {
          id: result.insertId,
          cycle_name
        }
      });

    } catch (error) {
      console.error('Error creating review cycle:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating review cycle',
        error: error.message
      });
    }
  }

  /**
   * Update review cycle status
   * PATCH /api/v1/hr/performance/review-cycles/:id/status
   */
  async updateReviewCycleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['draft', 'open', 'in_progress', 'completed', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const query = 'UPDATE review_cycles SET status = ? WHERE id = ?';
      await db.execute(query, [status, id]);

      res.json({
        success: true,
        message: 'Review cycle status updated successfully'
      });

    } catch (error) {
      console.error('Error updating review cycle status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating review cycle status',
        error: error.message
      });
    }
  }

  // ========================================================================
  // GOALS MANAGEMENT (OKRs & KPIs)
  // ========================================================================

  /**
   * Get employee goals
   * GET /api/v1/hr/performance/employees/:employeeId/goals
   */
  async getEmployeeGoals(req, res) {
    try {
      const { employeeId } = req.params;
      const { review_cycle_id, status, goal_type } = req.query;

      let query = `
                SELECT 
                    g.*,
                    rc.cycle_name,
                    CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                    CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name,
                    parent.goal_title as aligned_with_title
                FROM goals g
                LEFT JOIN review_cycles rc ON g.review_cycle_id = rc.id
                LEFT JOIN users creator ON g.created_by = creator.id
                LEFT JOIN users approver ON g.approved_by = approver.id
                LEFT JOIN goals parent ON g.aligned_with_id = parent.id
                WHERE g.employee_id = ?
            `;
      const params = [employeeId];

      if (review_cycle_id) {
        query += ' AND g.review_cycle_id = ?';
        params.push(review_cycle_id);
      }

      if (status) {
        query += ' AND g.status = ?';
        params.push(status);
      }

      if (goal_type) {
        query += ' AND g.goal_type = ?';
        params.push(goal_type);
      }

      query += ' ORDER BY g.priority DESC, g.target_date ASC';

      const [goals] = await db.execute(query, params);

      // Get key results for OKRs
      for (let goal of goals) {
        if (goal.goal_type === 'okr') {
          const [keyResults] = await db.execute(
            'SELECT * FROM goal_key_results WHERE goal_id = ? ORDER BY display_order',
            [goal.id]
          );
          goal.key_results = keyResults;
        }
      }

      res.json({
        success: true,
        data: goals
      });

    } catch (error) {
      console.error('Error fetching employee goals:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching employee goals',
        error: error.message
      });
    }
  }

  /**
   * Create a new goal
   * POST /api/v1/hr/performance/goals
   */
  async createGoal(req, res) {
    try {
      const {
        employee_id,
        review_cycle_id,
        goal_type,
        goal_title,
        goal_description,
        category,
        priority,
        start_date,
        target_date,
        measurement_criteria,
        target_value,
        weight_percentage,
        aligned_with_id,
        key_results
      } = req.body;

      // Validation
      if (!employee_id || !goal_title || !start_date || !target_date) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID, goal title, start date, and target date are required'
        });
      }

      await db.query('START TRANSACTION');

      try {
        // Insert goal
        const goalQuery = `
                    INSERT INTO goals (
                        employee_id, review_cycle_id, goal_type, goal_title, goal_description,
                        category, priority, start_date, target_date, measurement_criteria,
                        target_value, weight_percentage, aligned_with_id, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

        const [result] = await db.execute(goalQuery, [
          employee_id,
          review_cycle_id,
          goal_type || 'smart',
          goal_title,
          goal_description,
          category || 'individual',
          priority || 'medium',
          start_date,
          target_date,
          measurement_criteria,
          target_value,
          weight_percentage || 0,
          aligned_with_id,
          req.user.id
        ]);

        const goalId = result.insertId;

        // Insert key results for OKRs
        if (goal_type === 'okr' && key_results && key_results.length > 0) {
          const krQuery = `
                        INSERT INTO goal_key_results (
                            goal_id, key_result_title, key_result_description,
                            target_value, unit, display_order
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `;

          for (let i = 0; i < key_results.length; i++) {
            const kr = key_results[i];
            await db.execute(krQuery, [
              goalId,
              kr.title,
              kr.description,
              kr.target_value,
              kr.unit,
              i + 1
            ]);
          }
        }

        await db.query('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Goal created successfully',
          data: {
            id: goalId,
            goal_title
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating goal',
        error: error.message
      });
    }
  }

  /**
   * Update goal progress
   * PATCH /api/v1/hr/performance/goals/:id/progress
   */
  async updateGoalProgress(req, res) {
    try {
      const { id } = req.params;
      const { current_value, progress_percentage, notes } = req.body;

      // Get goal details
      const [goals] = await db.execute(
        'SELECT target_value, target_date FROM goals WHERE id = ?',
        [id]
      );

      if (goals.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      const goal = goals[0];

      // Calculate progress if not provided
      let calculatedProgress = progress_percentage;
      if (!calculatedProgress && current_value && goal.target_value) {
        calculatedProgress = calculateGoalAchievement(goal.target_value, current_value);
      }

      // Determine status
      const status = determineGoalStatus(calculatedProgress || 0, goal.target_date);

      // Update goal
      const query = `
                UPDATE goals 
                SET current_value = ?, 
                    progress_percentage = ?,
                    status = ?,
                    notes = CONCAT(COALESCE(notes, ''), '\n', ?)
                WHERE id = ?
            `;

      await db.execute(query, [
        current_value,
        calculatedProgress,
        status,
        `[${new Date().toISOString()}] ${notes || 'Progress updated'}`,
        id
      ]);

      res.json({
        success: true,
        message: 'Goal progress updated successfully',
        data: {
          progress_percentage: calculatedProgress,
          status
        }
      });

    } catch (error) {
      console.error('Error updating goal progress:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating goal progress',
        error: error.message
      });
    }
  }

  /**
   * Update key result progress
   * PATCH /api/v1/hr/performance/key-results/:id/progress
   */
  async updateKeyResultProgress(req, res) {
    try {
      const { id } = req.params;
      const { current_value, progress_percentage, status } = req.body;

      const query = `
                UPDATE goal_key_results 
                SET current_value = ?, 
                    progress_percentage = ?,
                    status = ?
                WHERE id = ?
            `;

      await db.execute(query, [
        current_value,
        progress_percentage,
        status || 'in_progress',
        id
      ]);

      // Update parent goal progress
      const [keyResult] = await db.execute(
        'SELECT goal_id FROM goal_key_results WHERE id = ?',
        [id]
      );

      if (keyResult.length > 0) {
        const goalId = keyResult[0].goal_id;

        // Calculate average progress of all key results
        const [avgResult] = await db.execute(
          'SELECT AVG(progress_percentage) as avg_progress FROM goal_key_results WHERE goal_id = ?',
          [goalId]
        );

        const avgProgress = avgResult[0].avg_progress || 0;

        // Update goal progress
        await db.execute(
          'UPDATE goals SET progress_percentage = ? WHERE id = ?',
          [avgProgress, goalId]
        );
      }

      res.json({
        success: true,
        message: 'Key result progress updated successfully'
      });

    } catch (error) {
      console.error('Error updating key result progress:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating key result progress',
        error: error.message
      });
    }
  }

  // ========================================================================
  // PERFORMANCE REVIEWS
  // ========================================================================

  /**
   * Get performance reviews
   * GET /api/v1/hr/performance/reviews
   */
  async getPerformanceReviews(req, res) {
    try {
      const { review_cycle_id, employee_id, reviewer_id, review_status } = req.query;

      let query = `
                SELECT 
                    pr.*,
                    rc.cycle_name,
                    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                    e.employee_id as emp_code,
                    e.department,
                    e.designation,
                    CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name,
                    CONCAT(approver.first_name, ' ', approver.last_name) as approver_name
                FROM performance_reviews pr
                JOIN review_cycles rc ON pr.review_cycle_id = rc.id
                JOIN employees e ON pr.employee_id = e.id
                JOIN users reviewer ON pr.reviewer_id = reviewer.id
                LEFT JOIN users approver ON pr.approver_id = approver.id
                WHERE 1=1
            `;
      const params = [];

      if (review_cycle_id) {
        query += ' AND pr.review_cycle_id = ?';
        params.push(review_cycle_id);
      }

      if (employee_id) {
        query += ' AND pr.employee_id = ?';
        params.push(employee_id);
      }

      if (reviewer_id) {
        query += ' AND pr.reviewer_id = ?';
        params.push(reviewer_id);
      }

      if (review_status) {
        query += ' AND pr.review_status = ?';
        params.push(review_status);
      }

      query += ' ORDER BY pr.review_date DESC, pr.created_at DESC';

      const [reviews] = await db.execute(query, params);

      res.json({
        success: true,
        data: reviews
      });

    } catch (error) {
      console.error('Error fetching performance reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching performance reviews',
        error: error.message
      });
    }
  }

  /**
   * Get a single performance review with details
   * GET /api/v1/hr/performance/reviews/:id
   */
  async getPerformanceReview(req, res) {
    try {
      const { id } = req.params;

      // Get review details
      const [reviews] = await db.execute(`
                SELECT 
                    pr.*,
                    rc.cycle_name,
                    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                    e.employee_id as emp_code,
                    e.department,
                    e.designation,
                    e.email,
                    CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name,
                    CONCAT(approver.first_name, ' ', approver.last_name) as approver_name
                FROM performance_reviews pr
                JOIN review_cycles rc ON pr.review_cycle_id = rc.id
                JOIN employees e ON pr.employee_id = e.id
                JOIN users reviewer ON pr.reviewer_id = reviewer.id
                LEFT JOIN users approver ON pr.approver_id = approver.id
                WHERE pr.id = ?
            `, [id]);

      if (reviews.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Performance review not found'
        });
      }

      const review = reviews[0];

      // Get goal assessments
      const [goalAssessments] = await db.execute(`
                SELECT rga.*, g.goal_title, g.goal_type, g.target_value, g.current_value
                FROM review_goal_assessments rga
                JOIN goals g ON rga.goal_id = g.id
                WHERE rga.performance_review_id = ?
                ORDER BY g.priority DESC
            `, [id]);
      review.goal_assessments = goalAssessments;

      // Get competency ratings
      const [competencyRatings] = await db.execute(`
                SELECT rcr.*, c.competency_name, c.category, c.description
                FROM review_competency_ratings rcr
                JOIN competencies c ON rcr.competency_id = c.id
                WHERE rcr.performance_review_id = ?
                ORDER BY c.display_order
            `, [id]);
      review.competency_ratings = competencyRatings;

      // Get feedback
      const [feedback] = await db.execute(`
                SELECT 
                    rf.*,
                    CASE 
                        WHEN rf.is_anonymous = 1 THEN 'Anonymous'
                        ELSE CONCAT(u.first_name, ' ', u.last_name)
                    END as provider_name
                FROM review_feedback rf
                LEFT JOIN users u ON rf.feedback_provider_id = u.id
                WHERE rf.performance_review_id = ?
                ORDER BY rf.provider_relationship, rf.submitted_at
            `, [id]);
      review.feedback = feedback;

      res.json({
        success: true,
        data: review
      });

    } catch (error) {
      console.error('Error fetching performance review:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching performance review',
        error: error.message
      });
    }
  }

  /**
   * Create/Start a performance review
   * POST /api/v1/hr/performance/reviews
   */
  async createPerformanceReview(req, res) {
    try {
      const {
        review_cycle_id,
        employee_id,
        reviewer_id,
        review_type
      } = req.body;

      // Validation
      if (!review_cycle_id || !employee_id || !reviewer_id) {
        return res.status(400).json({
          success: false,
          message: 'Review cycle, employee, and reviewer are required'
        });
      }

      // Check if review already exists
      const [existing] = await db.execute(
        'SELECT id FROM performance_reviews WHERE review_cycle_id = ? AND employee_id = ? AND reviewer_id = ? AND review_type = ?',
        [review_cycle_id, employee_id, reviewer_id, review_type || 'manager']
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Review already exists for this employee, reviewer, and cycle'
        });
      }

      const query = `
                INSERT INTO performance_reviews (
                    review_cycle_id, employee_id, reviewer_id, review_type, review_status
                ) VALUES (?, ?, ?, ?, 'not_started')
            `;

      const [result] = await db.execute(query, [
        review_cycle_id,
        employee_id,
        reviewer_id,
        review_type || 'manager'
      ]);

      res.status(201).json({
        success: true,
        message: 'Performance review created successfully',
        data: {
          id: result.insertId
        }
      });

    } catch (error) {
      console.error('Error creating performance review:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating performance review',
        error: error.message
      });
    }
  }

  /**
   * Submit self-review
   * POST /api/v1/hr/performance/reviews/:id/self-review
   */
  async submitSelfReview(req, res) {
    try {
      const { id } = req.params;
      const { self_review_text, goal_assessments, competency_ratings } = req.body;

      await db.query('START TRANSACTION');

      try {
        // Update review with self assessment
        await db.execute(`
                    UPDATE performance_reviews 
                    SET self_review_text = ?,
                        self_review_submitted_at = NOW(),
                        review_status = 'in_progress'
                    WHERE id = ?
                `, [self_review_text, id]);

        // Insert/update goal assessments
        if (goal_assessments && goal_assessments.length > 0) {
          for (const assessment of goal_assessments) {
            await db.execute(`
                            INSERT INTO review_goal_assessments (
                                performance_review_id, goal_id, self_assessment_text,
                                achievement_percentage
                            ) VALUES (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                self_assessment_text = VALUES(self_assessment_text),
                                achievement_percentage = VALUES(achievement_percentage)
                        `, [id, assessment.goal_id, assessment.self_assessment_text, assessment.achievement_percentage]);
          }
        }

        // Insert/update competency ratings
        if (competency_ratings && competency_ratings.length > 0) {
          for (const rating of competency_ratings) {
            await db.execute(`
                            INSERT INTO review_competency_ratings (
                                performance_review_id, competency_id, self_rating, self_comments
                            ) VALUES (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                self_rating = VALUES(self_rating),
                                self_comments = VALUES(self_comments)
                        `, [id, rating.competency_id, rating.self_rating, rating.self_comments]);
          }
        }

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Self-review submitted successfully'
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error submitting self-review:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting self-review',
        error: error.message
      });
    }
  }

  /**
   * Submit manager review
   * POST /api/v1/hr/performance/reviews/:id/manager-review
   */
  async submitManagerReview(req, res) {
    try {
      const { id } = req.params;
      const {
        manager_review_text,
        manager_strengths,
        manager_areas_for_improvement,
        goal_assessments,
        competency_ratings,
        promotion_recommended,
        salary_increase_recommended,
        recommended_increase_percentage,
        pip_recommended
      } = req.body;

      await db.query('START TRANSACTION');

      try {
        // Update goal assessments with manager ratings
        if (goal_assessments && goal_assessments.length > 0) {
          for (const assessment of goal_assessments) {
            await db.execute(`
                            UPDATE review_goal_assessments 
                            SET manager_assessment_text = ?,
                                achievement_rating = ?
                            WHERE performance_review_id = ? AND goal_id = ?
                        `, [
              assessment.manager_assessment_text,
              assessment.achievement_rating,
              id,
              assessment.goal_id
            ]);
          }
        }

        // Calculate average goal rating
        const [goalAvg] = await db.execute(
          'SELECT AVG(achievement_rating) as avg_rating FROM review_goal_assessments WHERE performance_review_id = ?',
          [id]
        );
        const goalsRating = goalAvg[0].avg_rating;

        // Update competency ratings with manager ratings
        if (competency_ratings && competency_ratings.length > 0) {
          for (const rating of competency_ratings) {
            await db.execute(`
                            UPDATE review_competency_ratings 
                            SET manager_rating = ?,
                                manager_comments = ?,
                                final_rating = ?
                            WHERE performance_review_id = ? AND competency_id = ?
                        `, [
              rating.manager_rating,
              rating.manager_comments,
              rating.manager_rating, // Use manager rating as final for now
              id,
              rating.competency_id
            ]);
          }
        }

        // Calculate average competency rating
        const [compAvg] = await db.execute(
          'SELECT AVG(final_rating) as avg_rating FROM review_competency_ratings WHERE performance_review_id = ?',
          [id]
        );
        const competenciesRating = compAvg[0].avg_rating;

        // Calculate overall rating
        const overallRating = calculateOverallRating(goalsRating, competenciesRating);

        // Update review with manager assessment
        await db.execute(`
                    UPDATE performance_reviews 
                    SET manager_review_text = ?,
                        manager_strengths = ?,
                        manager_areas_for_improvement = ?,
                        manager_submitted_at = NOW(),
                        goals_rating = ?,
                        competencies_rating = ?,
                        overall_rating = ?,
                        promotion_recommended = ?,
                        salary_increase_recommended = ?,
                        recommended_increase_percentage = ?,
                        pip_recommended = ?,
                        review_status = 'submitted',
                        reviewer_signed_at = NOW()
                    WHERE id = ?
                `, [
          manager_review_text,
          manager_strengths,
          manager_areas_for_improvement,
          goalsRating,
          competenciesRating,
          overallRating,
          promotion_recommended || false,
          salary_increase_recommended || false,
          recommended_increase_percentage,
          pip_recommended || false,
          id
        ]);

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Manager review submitted successfully',
          data: {
            goals_rating: goalsRating,
            competencies_rating: competenciesRating,
            overall_rating: overallRating
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error submitting manager review:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting manager review',
        error: error.message
      });
    }
  }

  /**
   * Submit 360-degree feedback
   * POST /api/v1/hr/performance/reviews/:id/feedback
   */
  async submitFeedback(req, res) {
    try {
      const { id } = req.params;
      const {
        provider_relationship,
        is_anonymous,
        strengths,
        areas_for_improvement,
        specific_examples,
        additional_comments,
        overall_rating
      } = req.body;

      // Validation
      if (!provider_relationship) {
        return res.status(400).json({
          success: false,
          message: 'Provider relationship is required'
        });
      }

      const query = `
                INSERT INTO review_feedback (
                    performance_review_id, feedback_provider_id, provider_relationship,
                    is_anonymous, strengths, areas_for_improvement, specific_examples,
                    additional_comments, overall_rating, status, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW())
            `;

      const [result] = await db.execute(query, [
        id,
        req.user.id,
        provider_relationship,
        is_anonymous || false,
        strengths,
        areas_for_improvement,
        specific_examples,
        additional_comments,
        overall_rating
      ]);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          id: result.insertId
        }
      });

    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting feedback',
        error: error.message
      });
    }
  }

  /**
   * Acknowledge review (employee acknowledgment)
   * POST /api/v1/hr/performance/reviews/:id/acknowledge
   */
  async acknowledgeReview(req, res) {
    try {
      const { id } = req.params;
      const { employee_comments } = req.body;

      const query = `
                UPDATE performance_reviews 
                SET employee_acknowledged_at = NOW(),
                    employee_comments = ?,
                    review_status = 'acknowledged'
                WHERE id = ?
            `;

      await db.execute(query, [employee_comments, id]);

      res.json({
        success: true,
        message: 'Review acknowledged successfully'
      });

    } catch (error) {
      console.error('Error acknowledging review:', error);
      res.status(500).json({
        success: false,
        message: 'Error acknowledging review',
        error: error.message
      });
    }
  }

  /**
   * Approve review (final approval)
   * POST /api/v1/hr/performance/reviews/:id/approve
   */
  async approveReview(req, res) {
    try {
      const { id } = req.params;
      const { calibrated_rating, calibration_notes } = req.body;

      const query = `
                UPDATE performance_reviews 
                SET approver_id = ?,
                    approved_at = NOW(),
                    calibrated_rating = ?,
                    calibration_notes = ?,
                    review_status = 'completed'
                WHERE id = ?
            `;

      await db.execute(query, [
        req.user.id,
        calibrated_rating,
        calibration_notes,
        id
      ]);

      res.json({
        success: true,
        message: 'Review approved successfully'
      });

    } catch (error) {
      console.error('Error approving review:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving review',
        error: error.message
      });
    }
  }

  // ========================================================================
  // DEVELOPMENT PLANS
  // ========================================================================

  /**
   * Get employee development plans
   * GET /api/v1/hr/performance/employees/:employeeId/development-plans
   */
  async getEmployeeDevelopmentPlans(req, res) {
    try {
      const { employeeId } = req.params;
      const { status } = req.query;

      let query = `
                SELECT 
                    dp.*,
                    pr.review_date,
                    CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                    CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
                FROM development_plans dp
                LEFT JOIN performance_reviews pr ON dp.performance_review_id = pr.id
                LEFT JOIN users creator ON dp.created_by = creator.id
                LEFT JOIN users approver ON dp.approved_by = approver.id
                WHERE dp.employee_id = ?
            `;
      const params = [employeeId];

      if (status) {
        query += ' AND dp.status = ?';
        params.push(status);
      }

      query += ' ORDER BY dp.start_date DESC';

      const [plans] = await db.execute(query, params);

      // Get actions for each plan
      for (let plan of plans) {
        const [actions] = await db.execute(
          'SELECT * FROM development_plan_actions WHERE development_plan_id = ? ORDER BY display_order',
          [plan.id]
        );
        plan.actions = actions;
      }

      res.json({
        success: true,
        data: plans
      });

    } catch (error) {
      console.error('Error fetching development plans:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching development plans',
        error: error.message
      });
    }
  }

  /**
   * Create a development plan
   * POST /api/v1/hr/performance/development-plans
   */
  async createDevelopmentPlan(req, res) {
    try {
      const {
        employee_id,
        performance_review_id,
        plan_title,
        plan_type,
        focus_areas,
        career_aspirations,
        start_date,
        target_completion_date,
        actions
      } = req.body;

      // Validation
      if (!employee_id || !plan_title || !start_date) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID, plan title, and start date are required'
        });
      }

      await db.query('START TRANSACTION');

      try {
        // Insert plan
        const planQuery = `
                    INSERT INTO development_plans (
                        employee_id, performance_review_id, plan_title, plan_type,
                        focus_areas, career_aspirations, start_date, target_completion_date,
                        created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

        const [result] = await db.execute(planQuery, [
          employee_id,
          performance_review_id,
          plan_title,
          plan_type || 'skill_development',
          focus_areas,
          career_aspirations,
          start_date,
          target_completion_date,
          req.user.id
        ]);

        const planId = result.insertId;

        // Insert actions
        if (actions && actions.length > 0) {
          const actionQuery = `
                        INSERT INTO development_plan_actions (
                            development_plan_id, action_title, action_description,
                            action_type, resources_required, success_criteria,
                            target_date, display_order
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

          for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            await db.execute(actionQuery, [
              planId,
              action.title,
              action.description,
              action.type || 'training',
              action.resources_required,
              action.success_criteria,
              action.target_date,
              i + 1
            ]);
          }
        }

        await db.query('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Development plan created successfully',
          data: {
            id: planId,
            plan_title
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error creating development plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating development plan',
        error: error.message
      });
    }
  }

  /**
   * Update development plan action progress
   * PATCH /api/v1/hr/performance/development-actions/:id/progress
   */
  async updateDevelopmentActionProgress(req, res) {
    try {
      const { id } = req.params;
      const { status, completion_date, progress_notes } = req.body;

      const query = `
                UPDATE development_plan_actions 
                SET status = ?,
                    completion_date = ?,
                    progress_notes = CONCAT(COALESCE(progress_notes, ''), '\n', ?)
                WHERE id = ?
            `;

      await db.execute(query, [
        status,
        completion_date,
        `[${new Date().toISOString()}] ${progress_notes || 'Status updated'}`,
        id
      ]);

      res.json({
        success: true,
        message: 'Development action progress updated successfully'
      });

    } catch (error) {
      console.error('Error updating development action:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating development action',
        error: error.message
      });
    }
  }

  // ========================================================================
  // PERFORMANCE IMPROVEMENT PLANS (PIPs)
  // ========================================================================

  /**
   * Create a Performance Improvement Plan
   * POST /api/v1/hr/performance/pips
   */
  async createPIP(req, res) {
    try {
      const {
        employee_id,
        performance_review_id,
        pip_title,
        performance_concerns,
        impact_of_issues,
        improvement_goals,
        success_criteria,
        support_provided,
        start_date,
        review_date,
        end_date
      } = req.body;

      // Validation
      if (!employee_id || !pip_title || !performance_concerns || !improvement_goals || !success_criteria || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided'
        });
      }

      const query = `
                INSERT INTO performance_improvement_plans (
                    employee_id, performance_review_id, pip_title,
                    performance_concerns, impact_of_issues, improvement_goals,
                    success_criteria, support_provided, start_date, review_date,
                    end_date, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      const [result] = await db.execute(query, [
        employee_id,
        performance_review_id,
        pip_title,
        performance_concerns,
        impact_of_issues,
        improvement_goals,
        success_criteria,
        support_provided,
        start_date,
        review_date,
        end_date,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Performance Improvement Plan created successfully',
        data: {
          id: result.insertId,
          pip_title
        }
      });

    } catch (error) {
      console.error('Error creating PIP:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating PIP',
        error: error.message
      });
    }
  }

  /**
   * Get employee PIPs
   * GET /api/v1/hr/performance/employees/:employeeId/pips
   */
  async getEmployeePIPs(req, res) {
    try {
      const { employeeId } = req.params;

      const [pips] = await db.execute(`
                SELECT 
                    pip.*,
                    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                    e.employee_id as emp_code,
                    CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                    CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
                FROM performance_improvement_plans pip
                JOIN employees e ON pip.employee_id = e.id
                LEFT JOIN users creator ON pip.created_by = creator.id
                LEFT JOIN users approver ON pip.approved_by = approver.id
                WHERE pip.employee_id = ?
                ORDER BY pip.start_date DESC
            `, [employeeId]);

      res.json({
        success: true,
        data: pips
      });

    } catch (error) {
      console.error('Error fetching PIPs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching PIPs',
        error: error.message
      });
    }
  }

  /**
   * Update PIP status
   * PATCH /api/v1/hr/performance/pips/:id/status
   */
  async updatePIPStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, outcome_summary, final_decision, manager_notes } = req.body;

      const query = `
                UPDATE performance_improvement_plans 
                SET status = ?,
                    outcome_summary = ?,
                    final_decision = ?,
                    manager_notes = CONCAT(COALESCE(manager_notes, ''), '\n', ?)
                WHERE id = ?
            `;

      await db.execute(query, [
        status,
        outcome_summary,
        final_decision,
        `[${new Date().toISOString()}] ${manager_notes || 'Status updated'}`,
        id
      ]);

      res.json({
        success: true,
        message: 'PIP status updated successfully'
      });

    } catch (error) {
      console.error('Error updating PIP status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating PIP status',
        error: error.message
      });
    }
  }

  // ========================================================================
  // REPORTS & ANALYTICS
  // ========================================================================

  /**
   * Get performance summary report
   * GET /api/v1/hr/performance/reports/summary
   */
  async getPerformanceSummary(req, res) {
    try {
      const { review_cycle_id, department } = req.query;

      let params = [];
      let whereClause = 'WHERE pr.review_status IN (?, ?)';
      params.push('submitted', 'completed');

      if (review_cycle_id) {
        whereClause += ' AND pr.review_cycle_id = ?';
        params.push(review_cycle_id);
      }

      if (department) {
        whereClause += ' AND e.department = ?';
        params.push(department);
      }

      // Overall statistics
      const [stats] = await db.query(`
                SELECT 
                    COUNT(DISTINCT pr.employee_id) as total_reviewed,
                    AVG(pr.overall_rating) as avg_overall_rating,
                    AVG(pr.goals_rating) as avg_goals_rating,
                    AVG(pr.competencies_rating) as avg_competencies_rating,
                    SUM(CASE WHEN pr.promotion_recommended = 1 THEN 1 ELSE 0 END) as promotions_recommended,
                    SUM(CASE WHEN pr.salary_increase_recommended = 1 THEN 1 ELSE 0 END) as salary_increases_recommended,
                    SUM(CASE WHEN pr.pip_recommended = 1 THEN 1 ELSE 0 END) as pips_recommended,
                    AVG(pr.recommended_increase_percentage) as avg_increase_percentage
                FROM performance_reviews pr
                JOIN employees e ON pr.employee_id = e.id
                ${whereClause}
            `, params);

      // Rating distribution
      const [distribution] = await db.query(`
                SELECT 
                    rating_category,
                    COUNT(*) as count,
                    IFNULL(ROUND((COUNT(*) * 100.0 / NULLIF((
                        SELECT COUNT(*) 
                        FROM performance_reviews pr2 
                        JOIN employees e2 ON pr2.employee_id = e2.id 
                        WHERE pr2.review_status IN ('submitted', 'completed')
                        ${review_cycle_id ? ' AND pr2.review_cycle_id = ?' : ''}
                        ${department ? ' AND e2.department = ?' : ''}
                    ), 0)), 2), 0) as percentage
                FROM (
                    SELECT 
                        pr.id,
                        CASE 
                            WHEN pr.overall_rating >= 4.5 THEN 'Outstanding (4.5-5.0)'
                            WHEN pr.overall_rating >= 3.5 THEN 'Exceeds (3.5-4.4)'
                            WHEN pr.overall_rating >= 2.5 THEN 'Meets (2.5-3.4)'
                            WHEN pr.overall_rating >= 1.5 THEN 'Needs Improvement (1.5-2.4)'
                            ELSE 'Poor (< 1.5)'
                        END as rating_category
                    FROM performance_reviews pr
                    JOIN employees e ON pr.employee_id = e.id
                    ${whereClause}
                ) as ratings
                GROUP BY rating_category
                ORDER BY 
                    CASE rating_category
                        WHEN 'Outstanding (4.5-5.0)' THEN 1
                        WHEN 'Exceeds (3.5-4.4)' THEN 2
                        WHEN 'Meets (2.5-3.4)' THEN 3
                        WHEN 'Needs Improvement (1.5-2.4)' THEN 4
                        ELSE 5
                    END
            `, params);

      // Department-wise analysis
      const [departments] = await db.query(`
                SELECT 
                    e.department,
                    COUNT(DISTINCT pr.employee_id) as employee_count,
                    AVG(pr.overall_rating) as avg_rating,
                    SUM(CASE WHEN pr.promotion_recommended = 1 THEN 1 ELSE 0 END) as promotions
                FROM performance_reviews pr
                JOIN employees e ON pr.employee_id = e.id
                ${whereClause}
                GROUP BY e.department
                ORDER BY avg_rating DESC
            `, params);

      res.json({
        success: true,
        data: {
          summary: stats[0],
          rating_distribution: distribution,
          department_analysis: departments
        }
      });

    } catch (error) {
      console.error('Error generating performance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating performance summary',
        error: error.message
      });
    }
  }  /**
   * Get goals analytics
   * GET /api/v1/hr/performance/reports/goals-analytics
   */
  async getGoalsAnalytics(req, res) {
    try {
      const { review_cycle_id, department } = req.query;

      let params = [];
      let whereClause = 'WHERE 1=1';

      if (review_cycle_id) {
        whereClause += ' AND g.review_cycle_id = ?';
        params.push(review_cycle_id);
      }

      if (department) {
        whereClause += ' AND e.department = ?';
        params.push(department);
      }

      // Goals summary
      const [summary] = await db.query(`
                SELECT 
                    COUNT(*) as total_goals,
                    AVG(g.progress_percentage) as avg_progress,
                    COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN g.status = 'on_track' THEN 1 END) as on_track_count,
                    COUNT(CASE WHEN g.status = 'at_risk' THEN 1 END) as at_risk_count,
                    COUNT(CASE WHEN g.status = 'behind' THEN 1 END) as behind_count
                FROM goals g
                JOIN employees e ON g.employee_id = e.id
                ${whereClause}
            `, params);

      // Goals by type
      const [byType] = await db.query(`
                SELECT 
                    g.goal_type,
                    COUNT(*) as count,
                    AVG(g.progress_percentage) as avg_progress
                FROM goals g
                JOIN employees e ON g.employee_id = e.id
                ${whereClause}
                GROUP BY g.goal_type
            `, params);

      // Goals by priority
      const [byPriority] = await db.query(`
                SELECT 
                    g.priority,
                    COUNT(*) as count,
                    AVG(g.progress_percentage) as avg_progress
                FROM goals g
                JOIN employees e ON g.employee_id = e.id
                ${whereClause}
                GROUP BY g.priority
                ORDER BY FIELD(g.priority, 'critical', 'high', 'medium', 'low')
            `, params);

      res.json({
        success: true,
        data: {
          summary: summary[0],
          by_type: byType,
          by_priority: byPriority
        }
      });

    } catch (error) {
      console.error('Error generating goals analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating goals analytics',
        error: error.message
      });
    }
  }
}

module.exports = new PerformanceController();
