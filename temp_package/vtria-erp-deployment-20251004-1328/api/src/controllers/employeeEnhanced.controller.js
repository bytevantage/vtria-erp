const db = require('../config/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');

class EmployeeEnhancedController {
  // ====================
  // Employee Management
  // ====================

  // Get employee by ID with all related data
  async getEmployeeFullProfile(req, res) {
    try {
      const { id } = req.params;
      
      // Get employee basic info
      const [employee] = await db.query(
        `SELECT e.*, d.department_name, 
         CONCAT(m.first_name, ' ', m.last_name) as manager_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN employees m ON e.reporting_manager_id = m.id
         WHERE e.id = ?`, 
        [id]
      );

      if (!employee.length) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Get related data in parallel
      const [
        documents,
        emergencyContacts,
        skills,
        leaveBalances,
        performanceReviews,
        training
      ] = await Promise.all([
        db.query('SELECT * FROM employee_documents WHERE employee_id = ?', [id]),
        db.query('SELECT * FROM employee_emergency_contacts WHERE employee_id = ?', [id]),
        db.query('SELECT * FROM employee_skills WHERE employee_id = ?', [id]),
        db.query(`
          SELECT lt.leave_type_name, elb.* 
          FROM employee_leave_balance elb
          JOIN leave_types lt ON elb.leave_type_id = lt.id
          WHERE elb.employee_id = ? AND elb.year = YEAR(CURDATE())
        `, [id]),
        db.query(`
          SELECT pr.*, CONCAT(r.first_name, ' ', r.last_name) as reviewer_name
          FROM performance_reviews pr
          LEFT JOIN employees r ON pr.reviewer_id = r.id
          WHERE pr.employee_id = ?
          ORDER BY pr.review_date DESC
          LIMIT 5
        `, [id]),
        db.query(`
          SELECT t.*, et.completion_status, et.completion_date, et.start_date as training_start_date
          FROM employee_training et
          JOIN training_programs t ON et.training_program_id = t.id
          WHERE et.employee_id = ?
          ORDER BY et.start_date DESC
        `, [id])
      ]);

      res.json({
        success: true,
        data: {
          ...employee[0],
          documents: documents[0],
          emergencyContacts: emergencyContacts[0],
          skills: skills[0],
          leaveBalances: leaveBalances[0],
          performanceReviews: performanceReviews[0],
          training: training[0]
        }
      });
    } catch (error) {
      logger.error('Error fetching employee profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee profile',
        error: error.message
      });
    }
  }

  // Upload employee document
  async uploadDocument(req, res) {
    const transaction = await db.getConnection();
    try {
      await transaction.beginTransaction();
      
      const { employeeId } = req.params;
      const { documentType, documentNumber, expiryDate } = req.body;
      
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      // Generate unique filename
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = path.join('uploads/documents', fileName);
      
      // Move file to uploads directory
      const targetPath = path.join(__dirname, '../../', filePath);
      const targetDir = path.dirname(targetPath);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.renameSync(req.file.path, targetPath);

      // Save document record
      const [result] = await transaction.query(
        `INSERT INTO employee_documents 
         (employee_id, document_type, document_number, file_name, file_path, expiry_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          documentType,
          documentNumber,
          req.file.originalname,
          filePath,
          expiryDate || null,
          req.user.id
        ]
      );

      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        documentId: result.insertId
      });
    } catch (error) {
      await transaction.rollback();
      
      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: error.message
      });
    } finally {
      if (transaction.release) {
        transaction.release();
      }
    }
  }

  // Update employee skills
  async updateSkills(req, res) {
    const transaction = await db.getConnection();
    try {
      await transaction.beginTransaction();
      
      const { employeeId } = req.params;
      const { skills } = req.body;
      
      // Delete existing skills
      await transaction.query('DELETE FROM employee_skills WHERE employee_id = ?', [employeeId]);
      
      // Insert new skills
      if (skills && skills.length > 0) {
        const skillValues = skills.map(skill => [
          employeeId,
          skill.skill_name,
          skill.proficiency_level || 'intermediate'
        ]);
        
        await transaction.query(
          'INSERT INTO employee_skills (employee_id, skill_name, proficiency_level) VALUES ?',
          [skillValues]
        );
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Skills updated successfully'
      });
    } catch (error) {
      await transaction.rollback();
      
      logger.error('Error updating skills:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update skills',
        error: error.message
      });
    } finally {
      if (transaction.release) {
        transaction.release();
      }
    }
  }

  // Get employee leave balance
  async getLeaveBalance(req, res) {
    try {
      const { employeeId } = req.params;
      const { year = new Date().getFullYear() } = req.query;
      
      const [leaveBalances] = await db.query(
        `SELECT lt.leave_type_name, elb.* 
         FROM employee_leave_balance elb
         JOIN leave_types lt ON elb.leave_type_id = lt.id
         WHERE elb.employee_id = ? AND elb.year = ?`,
        [employeeId, year]
      );
      
      res.json({
        success: true,
        data: leaveBalances
      });
    } catch (error) {
      logger.error('Error fetching leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave balance',
        error: error.message
      });
    }
  }

  // Create performance review
  async createPerformanceReview(req, res) {
    const transaction = await db.getConnection();
    try {
      await transaction.beginTransaction();
      
      const { employeeId } = req.params;
      const { rating, comments, goals, nextReviewDate } = req.body;
      
      // Validate reviewer is a manager
      const [isManager] = await transaction.query(
        'SELECT 1 FROM employees WHERE id = ? AND is_manager = 1',
        [req.user.id]
      );
      
      if (!isManager.length) {
        return res.status(403).json({
          success: false,
          message: 'Only managers can create performance reviews'
        });
      }
      
      // Create review
      const [result] = await transaction.query(
        `INSERT INTO performance_reviews 
         (employee_id, reviewer_id, rating, comments, goals, next_review_date, review_date)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          employeeId,
          req.user.id,
          rating,
          comments || null,
          goals || null,
          nextReviewDate || null
        ]
      );
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Performance review created successfully',
        reviewId: result.insertId
      });
    } catch (error) {
      await transaction.rollback();
      
      logger.error('Error creating performance review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create performance review',
        error: error.message
      });
    } finally {
      if (transaction.release) {
        transaction.release();
      }
    }
  }

  // Get team members (for managers)
  async getTeamMembers(req, res) {
    try {
      const { managerId } = req.params;
      const { status = 'active' } = req.query;
      
      const [teamMembers] = await db.query(
        `SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, 
                e.designation, d.department_name, e.hire_date,
                (SELECT COUNT(*) FROM performance_reviews pr 
                 WHERE pr.employee_id = e.id) as review_count
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.reporting_manager_id = ? AND e.status = ?
         ORDER BY e.first_name, e.last_name`,
        [managerId, status]
      );
      
      res.json({
        success: true,
        data: teamMembers
      });
    } catch (error) {
      logger.error('Error fetching team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
        error: error.message
      });
    }
  }

  // Get employee attendance summary
  async getAttendanceSummary(req, res) {
    try {
      const { employeeId } = req.params;
      const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
      
      const [summary] = await db.query(
        `SELECT 
           COUNT(CASE WHEN attendance_status = 'present' THEN 1 END) as present_days,
           COUNT(CASE WHEN is_late = 1 THEN 1 END) as late_days,
           COUNT(CASE WHEN attendance_status = 'on_leave' THEN 1 END) as leave_days,
           COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent_days,
           SUM(total_hours) as total_hours_worked
         FROM attendance_records
         WHERE employee_id = ? 
           AND MONTH(attendance_date) = ? 
           AND YEAR(attendance_date) = ?`,
        [employeeId, month, year]
      );
      
      res.json({
        success: true,
        data: summary[0] || {
          present_days: 0,
          late_days: 0,
          leave_days: 0,
          absent_days: 0,
          total_hours_worked: 0
        }
      });
    } catch (error) {
      logger.error('Error fetching attendance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance summary',
        error: error.message
      });
    }
  }
}

module.exports = new EmployeeEnhancedController();
