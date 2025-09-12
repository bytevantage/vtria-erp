/**
 * Document Controller for VTRIA ERP
 * Handles document generation, versioning, and management API endpoints
 */

const path = require('path');
const fs = require('fs');
const documentService = require('../services/documentService');
const { Document, DocumentVersion } = require('../models');
const logger = require('../utils/logger');
const auditService = require('../services/auditService');

const documentController = {
  /**
   * Get all documents with filtering options
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getAllDocuments: async (req, res) => {
    try {
      const {
        document_type,
        case_id,
        ticket_id,
        uploaded_by,
        start_date,
        end_date,
        search
      } = req.query;
      
      // Build filter conditions
      const where = {};
      
      if (document_type) {
        where.document_type = document_type;
      }
      
      if (case_id) {
        where.case_id = case_id;
      }
      
      if (ticket_id) {
        where.ticket_id = ticket_id;
      }
      
      if (uploaded_by) {
        where.uploaded_by = uploaded_by;
      }
      
      // Date range filter
      if (start_date || end_date) {
        where.document_date = {};
        
        if (start_date) {
          where.document_date[Op.gte] = new Date(start_date);
        }
        
        if (end_date) {
          where.document_date[Op.lte] = new Date(end_date);
        }
      }
      
      // Search in document number or filename
      if (search) {
        where[Op.or] = [
          { document_number: { [Op.iLike]: `%${search}%` } },
          { filename: { [Op.iLike]: `%${search}%` } },
          { original_name: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Get documents with pagination
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      
      const documents = await Document.findAndCountAll({
        where,
        include: [
          { association: 'uploadedBy', attributes: ['id', 'first_name', 'last_name'] },
          { association: 'case', attributes: ['id', 'title', 'case_number'] },
          { association: 'ticket', attributes: ['id', 'title', 'ticket_number'] }
        ],
        order: [['document_date', 'DESC']],
        limit,
        offset
      });
      
      return res.status(200).json({
        success: true,
        total: documents.count,
        documents: documents.rows
      });
    } catch (error) {
      logger.error('Error in getAllDocuments:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve documents',
        error: error.message
      });
    }
  },
  
  /**
   * Get document by ID with versions
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getDocumentById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const document = await documentService.getDocumentWithVersions(id);
      
      return res.status(200).json({
        success: true,
        document
      });
    } catch (error) {
      logger.error('Error in getDocumentById:', error);
      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  /**
   * Upload a new document
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  uploadDocument: async (req, res) => {
    try {
      // File should be available from multer middleware
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      const userId = req.user.id;
      const documentData = {
        document_type: req.body.document_type || 'OTHER',
        case_id: req.body.case_id || null,
        ticket_id: req.body.ticket_id || null,
        is_public: req.body.is_public === 'true',
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        description: req.body.description || '',
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
      };
      
      // Create document record
      const document = await Document.create({
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        document_type: documentData.document_type,
        document_date: new Date(),
        case_id: documentData.case_id,
        ticket_id: documentData.ticket_id,
        uploaded_by: userId,
        is_public: documentData.is_public,
        tags: documentData.tags,
        metadata: {
          description: documentData.description,
          ...documentData.metadata
        }
      });
      
      // Create initial version
      await DocumentVersion.create({
        document_id: document.id,
        version_number: 1,
        filename: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        changes: 'Initial version',
        created_by: userId,
        is_current: true
      });
      
      await auditService.logActivity(
        'document_uploaded',
        userId,
        { 
          document_id: document.id, 
          document_type: document.document_type,
          original_name: document.original_name
        }
      );
      
      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      logger.error('Error in uploadDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: error.message
      });
    }
  },
  
  /**
   * Upload a technical document with versioning
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  uploadTechnicalDocument: async (req, res) => {
    try {
      // File should be available from multer middleware
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      const userId = req.user.id;
      const documentData = {
        document_number: req.body.document_number,
        case_id: req.body.case_id || null,
        ticket_id: req.body.ticket_id || null,
        is_public: req.body.is_public === 'true',
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        description: req.body.description || '',
        file_type: req.body.file_type || 'TECHNICAL',
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
      };
      
      const result = await documentService.uploadTechnicalDocument(
        req.file,
        documentData,
        userId
      );
      
      return res.status(201).json({
        success: true,
        message: 'Technical document uploaded successfully',
        document: result.document,
        version: result.version
      });
    } catch (error) {
      logger.error('Error in uploadTechnicalDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload technical document',
        error: error.message
      });
    }
  },
  
  /**
   * Update a technical document with a new version
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateTechnicalDocument: async (req, res) => {
    try {
      const { id } = req.params;
      
      // File should be available from multer middleware
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      const userId = req.user.id;
      const versionData = {
        changes: req.body.changes || `Version update`,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
        document_metadata: req.body.document_metadata ? JSON.parse(req.body.document_metadata) : null
      };
      
      const result = await documentService.updateTechnicalDocument(
        id,
        req.file,
        versionData,
        userId
      );
      
      return res.status(200).json({
        success: true,
        message: 'Technical document updated successfully',
        document: result.document,
        version: result.version
      });
    } catch (error) {
      logger.error('Error in updateTechnicalDocument:', error);
      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  /**
   * Generate a PDF document
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  generatePDF: async (req, res) => {
    try {
      const {
        document_type,
        case_id,
        ticket_id,
        data
      } = req.body;
      
      if (!document_type) {
        return res.status(400).json({
          success: false,
          message: 'Document type is required'
        });
      }
      
      if (!data) {
        return res.status(400).json({
          success: false,
          message: 'Document data is required'
        });
      }
      
      const userId = req.user.id;
      const documentData = typeof data === 'string' ? JSON.parse(data) : data;
      
      const result = await documentService.generatePDF(
        document_type,
        documentData,
        userId,
        case_id,
        ticket_id
      );
      
      return res.status(201).json({
        success: true,
        message: 'PDF document generated successfully',
        document: result.document,
        file_path: result.filePath
      });
    } catch (error) {
      logger.error('Error in generatePDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PDF document',
        error: error.message
      });
    }
  },
  
  /**
   * Download document version file
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  downloadDocumentVersion: async (req, res) => {
    try {
      const { versionId } = req.params;
      
      const version = await documentService.getDocumentVersionFile(versionId);
      
      // Log download activity
      await auditService.logActivity(
        'document_downloaded',
        req.user.id,
        { 
          document_id: version.document_id, 
          version_id: version.id,
          version_number: version.version_number
        }
      );
      
      // Send file
      return res.download(version.file_path, version.filename);
    } catch (error) {
      logger.error('Error in downloadDocumentVersion:', error);
      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  /**
   * Get document versions
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getDocumentVersions: async (req, res) => {
    try {
      const { id } = req.params;
      
      const versions = await DocumentVersion.findAll({
        where: { document_id: id },
        include: [
          { association: 'createdBy', attributes: ['id', 'first_name', 'last_name'] }
        ],
        order: [['version_number', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        versions
      });
    } catch (error) {
      logger.error('Error in getDocumentVersions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve document versions',
        error: error.message
      });
    }
  },
  
  /**
   * Delete a document and all its versions
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteDocument: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get document with versions
      const document = await Document.findByPk(id, {
        include: [{ model: DocumentVersion, as: 'versions' }]
      });
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      // Delete physical files
      if (document.versions && document.versions.length > 0) {
        document.versions.forEach(version => {
          if (fs.existsSync(version.file_path)) {
            fs.unlinkSync(version.file_path);
          }
        });
      }
      
      // Log deletion activity
      await auditService.logActivity(
        'document_deleted',
        userId,
        { 
          document_id: id, 
          document_type: document.document_type,
          document_number: document.document_number
        }
      );
      
      // Delete versions first (due to foreign key constraints)
      await DocumentVersion.destroy({ where: { document_id: id } });
      
      // Delete document
      await document.destroy();
      
      return res.status(200).json({
        success: true,
        message: 'Document and all versions deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: error.message
      });
    }
  }
};

module.exports = documentController;
