const db = require('../config/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');

class HRController {
  // Get employee by ID with all related data
  async getEmployeeProfile(req, res) {
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
          emergency_contacts: emergencyContacts[0],
          skills: skills[0],
          leave_balance: leaveBalances[0],
          performance_reviews: performanceReviews[0],
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

  // Update employee profile
  async updateEmployeeProfile(req, res) {
    const transaction = await db.getConnection();
    try {
      const { id } = req.params;
      const employeeData = req.body;
      
      await transaction.beginTransaction();
      
      // Update basic employee info
      const [result] = await transaction.query(
        `UPDATE employees SET 
          first_name = ?, last_name = ?, email = ?, phone = ?,
          department_id = ?, designation = ?, status = ?,
          date_of_birth = ?, address = ?, city = ?, state = ?,
          postal_code = ?, country = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          employeeData.first_name,
          employeeData.last_name,
          employeeData.email,
          employeeData.phone,
          employeeData.department_id,
          employeeData.designation,
          employeeData.status,
          employeeData.date_of_birth,
          employeeData.address,
          employeeData.city,
          employeeData.state,
          employeeData.postal_code,
          employeeData.country,
          id
        ]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Employee not found');
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Employee profile updated successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating employee profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee profile',
        error: error.message
      });
    } finally {
      if (transaction.release) transaction.release();
    }
  }

  // Upload employee document
  async uploadEmployeeDocument(req, res) {
    const transaction = await db.getConnection();
    try {
      const { employeeId } = req.params;
      const { documentType, documentNumber, expiryDate } = req.body;
      
      if (!req.file) {
        throw new Error('No file uploaded');
      }
      
      await transaction.beginTransaction();
      
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
      
      // Determine document status based on expiry date
      let status = 'valid';
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= 30) {
          status = 'expiring_soon';
        }
      }
      
      // Save document record
      const [result] = await transaction.query(
        `INSERT INTO employee_documents 
         (employee_id, document_type, document_number, file_name, file_path, expiry_date, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          documentType,
          documentNumber || null,
          req.file.originalname,
          filePath,
          expiryDate || null,
          status,
          req.user.id
        ]
      );
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: result.insertId,
          document_type: documentType,
          document_number: documentNumber,
          file_name: req.file.originalname,
          file_path: filePath,
          expiry_date: expiryDate,
          status: status
        }
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
      if (transaction.release) transaction.release();
    }
  }
  
  // Delete employee document
  async deleteEmployeeDocument(req, res) {
    const transaction = await db.getConnection();
    try {
      const { docId } = req.params;
      
      await transaction.beginTransaction();
      
      // Get document info before deleting
      const [documents] = await transaction.query(
        'SELECT * FROM employee_documents WHERE id = ?',
        [docId]
      );
      
      if (!documents.length) {
        throw new Error('Document not found');
      }
      
      const document = documents[0];
      
      // Delete document record
      await transaction.query(
        'DELETE FROM employee_documents WHERE id = ?',
        [docId]
      );
      
      // Delete the actual file
      const filePath = path.join(__dirname, '../../', document.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: error.message
      });
    } finally {
      if (transaction.release) transaction.release();
    }
  }
  
  // Add emergency contact
  async addEmergencyContact(req, res) {
    const transaction = await db.getConnection();
    try {
      const { employeeId } = req.params;
      const contactData = req.body;
      
      await transaction.beginTransaction();
      
      // If setting as primary, unset any existing primary contact
      if (contactData.is_primary) {
        await transaction.query(
          'UPDATE employee_emergency_contacts SET is_primary = 0 WHERE employee_id = ?',
          [employeeId]
        );
      }
      
      // Add new emergency contact
      const [result] = await transaction.query(
        `INSERT INTO employee_emergency_contacts 
         (employee_id, name, relationship, phone, email, address, is_primary, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          contactData.name,
          contactData.relationship,
          contactData.phone,
          contactData.email || null,
          contactData.address || null,
          contactData.is_primary ? 1 : 0,
          req.user.id
        ]
      );
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Emergency contact added successfully',
        data: {
          id: result.insertId,
          ...contactData
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error adding emergency contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add emergency contact',
        error: error.message
      });
    } finally {
      if (transaction.release) transaction.release();
    }
  }
  
  // Add employee skill
  async addEmployeeSkill(req, res) {
    const transaction = await db.getConnection();
    try {
      const { employeeId } = req.params;
      const skillData = req.body;
      
      await transaction.beginTransaction();
      
      // Check if skill already exists for employee
      const [existingSkills] = await transaction.query(
        'SELECT * FROM employee_skills WHERE employee_id = ? AND skill_name = ?',
        [employeeId, skillData.skill_name]
      );
      
      if (existingSkills.length > 0) {
        throw new Error('Skill already exists for this employee');
      }
      
      // Add new skill
      const [result] = await transaction.query(
        `INSERT INTO employee_skills 
         (employee_id, skill_name, proficiency, years_of_experience, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          employeeId,
          skillData.skill_name,
          skillData.proficiency || 'intermediate',
          skillData.years_of_experience || 1,
          req.user.id
        ]
      );
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Skill added successfully',
        data: {
          id: result.insertId,
          ...skillData
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error adding employee skill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add skill',
        error: error.message
      });
    } finally {
      if (transaction.release) transaction.release();
    }
  }
  
  // Delete employee skill
  async deleteEmployeeSkill(req, res) {
    const transaction = await db.getConnection();
    try {
      const { skillId } = req.params;
      
      await transaction.beginTransaction();
      
      // Delete skill
      await transaction.query(
        'DELETE FROM employee_skills WHERE id = ?',
        [skillId]
      );
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Skill deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting employee skill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete skill',
        error: error.message
      });
    } finally {
      if (transaction.release) transaction.release();
    }
  }
  
  // Get all departments
  async getDepartments(req, res) {
    try {
      const [departments] = await db.query('SELECT id, department_name as name FROM departments WHERE status = ? ORDER BY department_name', ['active']);
      
      res.json({
        success: true,
        data: departments
      });
    } catch (error) {
      logger.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch departments',
        error: error.message
      });
    }
  }
}

module.exports = new HRController();
