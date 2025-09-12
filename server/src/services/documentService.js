/**
 * Document Service for VTRIA ERP
 * Handles document generation, versioning, and management
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const { Document, DocumentVersion, Case, Ticket, User, sequelize } = require('../models');
const logger = require('../utils/logger');
const auditService = require('./auditService');

// Configure document storage paths
const BASE_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH || 'uploads/documents';
const GENERATED_DOCS_PATH = path.join(BASE_STORAGE_PATH, 'generated');
const TECHNICAL_DOCS_PATH = path.join(BASE_STORAGE_PATH, 'technical');
const TEMPLATES_PATH = path.join(__dirname, '../templates');

// Ensure directories exist
[BASE_STORAGE_PATH, GENERATED_DOCS_PATH, TECHNICAL_DOCS_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const documentService = {
  /**
   * Generate a standardized document ID
   * Format: VESPL/TYPE/YEAR/NUMBER
   * @param {string} type - Document type code (EQ, QT, IN, etc.)
   * @param {number} year - Year (e.g., 2526 for 2025-26)
   * @param {number} sequence - Sequence number
   * @returns {string} Formatted document ID
   */
  generateDocumentId: async (type, year, sequence = null) => {
    try {
      // Map document type to code
      const typeMap = {
        'ENQUIRY': 'EQ',
        'QUOTATION': 'QT',
        'PURCHASE_ORDER': 'PO',
        'INVOICE': 'IN',
        'TECHNICAL': 'TD'
      };
      
      const typeCode = typeMap[type] || 'DOC';
      
      // If year not provided, calculate financial year
      if (!year) {
        const today = new Date();
        const fiscalYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        year = parseInt(fiscalYearStart.toString().substr(2) + (fiscalYearStart + 1).toString().substr(2));
      }
      
      // If sequence not provided, get next sequence number
      if (!sequence) {
        const latestDoc = await Document.findOne({
          where: {
            document_type: type,
            document_number: {
              [sequelize.Op.like]: `VESPL/${typeCode}/${year}/%`
            }
          },
          order: [['document_number', 'DESC']]
        });
        
        if (latestDoc) {
          const lastSequence = parseInt(latestDoc.document_number.split('/').pop());
          sequence = lastSequence + 1;
        } else {
          sequence = 1;
        }
      }
      
      // Format sequence number with leading zeros
      const formattedSequence = sequence.toString().padStart(3, '0');
      
      return `VESPL/${typeCode}/${year}/${formattedSequence}`;
    } catch (error) {
      logger.error('Error generating document ID:', error);
      throw new Error('Failed to generate document ID');
    }
  },
  
  /**
   * Create a new document record
   * @param {Object} documentData - Document data
   * @param {string} userId - User ID creating the document
   * @returns {Object} Created document
   */
  createDocument: async (documentData, userId) => {
    const transaction = await sequelize.transaction();
    
    try {
      // Generate document number if not provided
      if (!documentData.document_number && documentData.document_type) {
        documentData.document_number = await documentService.generateDocumentId(
          documentData.document_type
        );
      }
      
      const document = await Document.create({
        ...documentData,
        uploaded_by: userId
      }, { transaction });
      
      await auditService.logActivity(
        'document_created',
        userId,
        { document_id: document.id, document_type: document.document_type }
      );
      
      await transaction.commit();
      return document;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  },
  
  /**
   * Add a new version to an existing document
   * @param {string} documentId - Document ID
   * @param {Object} versionData - Version data
   * @param {string} userId - User ID creating the version
   * @returns {Object} Created document version
   */
  addDocumentVersion: async (documentId, versionData, userId) => {
    const transaction = await sequelize.transaction();
    
    try {
      const document = await Document.findByPk(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Update previous versions to not be current
      await DocumentVersion.update(
        { is_current: false },
        { 
          where: { document_id: documentId },
          transaction
        }
      );
      
      // Increment document version count
      await document.increment('version_count', { transaction });
      await document.reload({ transaction });
      
      // Create new version
      const version = await DocumentVersion.create({
        document_id: documentId,
        version_number: document.version_count,
        filename: versionData.filename,
        file_path: versionData.file_path,
        file_size: versionData.file_size,
        changes: versionData.changes || 'New version added',
        created_by: userId,
        is_current: true,
        metadata: versionData.metadata || {}
      }, { transaction });
      
      await auditService.logActivity(
        'document_version_added',
        userId,
        { 
          document_id: documentId, 
          version_id: version.id,
          version_number: version.version_number
        }
      );
      
      await transaction.commit();
      return version;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error adding document version:', error);
      throw new Error('Failed to add document version');
    }
  },
  
  /**
   * Generate PDF document from template
   * @param {string} documentType - Type of document to generate
   * @param {Object} data - Data for the document
   * @param {string} userId - User ID generating the document
   * @param {string} caseId - Optional case ID
   * @param {string} ticketId - Optional ticket ID
   * @returns {Object} Created document with file path
   */
  generatePDF: async (documentType, data, userId, caseId = null, ticketId = null) => {
    const transaction = await sequelize.transaction();
    
    try {
      // Generate document number
      const documentNumber = await documentService.generateDocumentId(documentType);
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Add company header
      doc.setFontSize(18);
      doc.text('VTRIA Engineering Solutions Pvt Ltd', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('ISO 9001:2015 Certified Company', 105, 28, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Mangalore | Bangalore | Pune', 105, 35, { align: 'center' });
      
      // Add document title
      doc.setFontSize(16);
      doc.text(documentType.charAt(0) + documentType.slice(1).toLowerCase(), 105, 50, { align: 'center' });
      
      // Add document number and date
      doc.setFontSize(12);
      doc.text(`Document No: ${documentNumber}`, 14, 60);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 68);
      
      // Add content based on document type
      let yPos = 80;
      
      switch (documentType) {
        case 'ENQUIRY':
          doc.text(`Customer: ${data.customer_name || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`Contact: ${data.contact_person || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`Email: ${data.email || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`Phone: ${data.phone || 'N/A'}`, 14, yPos); yPos += 16;
          
          doc.text('Enquiry Details:', 14, yPos); yPos += 8;
          doc.text(data.description || 'No details provided', 14, yPos, { 
            maxWidth: 180 
          });
          break;
          
        case 'QUOTATION':
          doc.text(`Customer: ${data.customer_name || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`Reference: ${data.reference || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`Validity: ${data.validity || '30 days'}`, 14, yPos); yPos += 16;
          
          // Items table
          if (data.items && data.items.length > 0) {
            doc.text('Item', 14, yPos);
            doc.text('Qty', 90, yPos);
            doc.text('Unit Price', 120, yPos);
            doc.text('Total', 170, yPos);
            yPos += 8;
            
            doc.line(14, yPos, 196, yPos);
            yPos += 8;
            
            let total = 0;
            data.items.forEach(item => {
              const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
              total += itemTotal;
              
              doc.text(item.description || 'Item', 14, yPos);
              doc.text(item.quantity?.toString() || '1', 90, yPos);
              doc.text(`₹${item.unit_price?.toFixed(2) || '0.00'}`, 120, yPos);
              doc.text(`₹${itemTotal.toFixed(2)}`, 170, yPos);
              yPos += 8;
            });
            
            yPos += 8;
            doc.line(14, yPos, 196, yPos);
            yPos += 8;
            doc.text('Total:', 140, yPos);
            doc.text(`₹${total.toFixed(2)}`, 170, yPos);
          } else {
            doc.text('No items specified', 14, yPos);
          }
          break;
          
        case 'INVOICE':
          doc.text(`Customer: ${data.customer_name || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`PO Reference: ${data.po_reference || 'N/A'}`, 14, yPos); yPos += 8;
          doc.text(`Invoice Date: ${data.invoice_date || new Date().toLocaleDateString()}`, 14, yPos); yPos += 16;
          
          // Items table similar to quotation
          if (data.items && data.items.length > 0) {
            doc.text('Item', 14, yPos);
            doc.text('Qty', 90, yPos);
            doc.text('Unit Price', 120, yPos);
            doc.text('Total', 170, yPos);
            yPos += 8;
            
            doc.line(14, yPos, 196, yPos);
            yPos += 8;
            
            let subtotal = 0;
            data.items.forEach(item => {
              const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
              subtotal += itemTotal;
              
              doc.text(item.description || 'Item', 14, yPos);
              doc.text(item.quantity?.toString() || '1', 90, yPos);
              doc.text(`₹${item.unit_price?.toFixed(2) || '0.00'}`, 120, yPos);
              doc.text(`₹${itemTotal.toFixed(2)}`, 170, yPos);
              yPos += 8;
            });
            
            yPos += 8;
            doc.line(14, yPos, 196, yPos);
            yPos += 8;
            doc.text('Subtotal:', 140, yPos); yPos += 8;
            doc.text(`₹${subtotal.toFixed(2)}`, 170, yPos - 8);
            
            const gst = subtotal * 0.18; // 18% GST
            doc.text('GST (18%):', 140, yPos); yPos += 8;
            doc.text(`₹${gst.toFixed(2)}`, 170, yPos - 8);
            
            doc.text('Total:', 140, yPos); yPos += 8;
            doc.text(`₹${(subtotal + gst).toFixed(2)}`, 170, yPos - 8);
          } else {
            doc.text('No items specified', 14, yPos);
          }
          break;
          
        default:
          doc.text('Document content not specified', 14, yPos);
      }
      
      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text('VTRIA Engineering Solutions Pvt Ltd | www.vtria.com | info@vtria.com', 105, 285, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
      }
      
      // Save PDF to file
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const docTypeFolder = documentType.toLowerCase();
      
      const docDir = path.join(GENERATED_DOCS_PATH, docTypeFolder, `${year}-${month}`);
      if (!fs.existsSync(docDir)) {
        fs.mkdirSync(docDir, { recursive: true });
      }
      
      const filename = `${documentNumber.replace(/\//g, '-')}.pdf`;
      const filePath = path.join(docDir, filename);
      
      // Save PDF to file system
      const buffer = Buffer.from(doc.output('arraybuffer'));
      fs.writeFileSync(filePath, buffer);
      
      // Create document record
      const document = await Document.create({
        filename,
        original_name: filename,
        file_path: filePath,
        file_size: buffer.length,
        mime_type: 'application/pdf',
        document_type: documentType,
        document_number: documentNumber,
        document_date: new Date(),
        case_id: caseId,
        ticket_id: ticketId,
        uploaded_by: userId,
        is_generated: true,
        template_used: documentType.toLowerCase(),
        metadata: data
      }, { transaction });
      
      // Create initial version
      await DocumentVersion.create({
        document_id: document.id,
        version_number: 1,
        filename,
        file_path: filePath,
        file_size: buffer.length,
        changes: 'Initial version',
        created_by: userId,
        is_current: true
      }, { transaction });
      
      await auditService.logActivity(
        'document_generated',
        userId,
        { 
          document_id: document.id, 
          document_type: documentType,
          document_number: documentNumber
        }
      );
      
      await transaction.commit();
      return { document, filePath };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error generating PDF document:', error);
      throw new Error('Failed to generate PDF document');
    }
  },
  
  /**
   * Upload and version a technical document
   * @param {Object} fileData - File data from multer
   * @param {Object} documentData - Additional document data
   * @param {string} userId - User ID uploading the document
   * @returns {Object} Created document with version info
   */
  uploadTechnicalDocument: async (fileData, documentData, userId) => {
    const transaction = await sequelize.transaction();
    
    try {
      // Determine file extension and type
      const fileExt = path.extname(fileData.originalname).toLowerCase();
      const fileType = documentData.file_type || 'TECHNICAL';
      
      // Generate document number if needed
      const documentNumber = documentData.document_number || 
        await documentService.generateDocumentId('TECHNICAL');
      
      // Create directory structure for technical documents
      const docTypeDir = path.join(TECHNICAL_DOCS_PATH, fileType.toLowerCase());
      if (!fs.existsSync(docTypeDir)) {
        fs.mkdirSync(docTypeDir, { recursive: true });
      }
      
      // Create a unique filename
      const safeDocNumber = documentNumber.replace(/\//g, '-');
      const uniqueFilename = `${safeDocNumber}-v1${fileExt}`;
      const filePath = path.join(docTypeDir, uniqueFilename);
      
      // Move file from temp upload location to final location
      fs.copyFileSync(fileData.path, filePath);
      
      // Create document record
      const document = await Document.create({
        filename: uniqueFilename,
        original_name: fileData.originalname,
        file_path: filePath,
        file_size: fileData.size,
        mime_type: fileData.mimetype,
        document_type: 'TECHNICAL',
        document_number: documentNumber,
        document_date: new Date(),
        case_id: documentData.case_id || null,
        ticket_id: documentData.ticket_id || null,
        uploaded_by: userId,
        is_public: documentData.is_public || false,
        tags: documentData.tags || [],
        metadata: {
          description: documentData.description || '',
          file_type: fileType,
          ...documentData.metadata
        }
      }, { transaction });
      
      // Create initial version
      const version = await DocumentVersion.create({
        document_id: document.id,
        version_number: 1,
        filename: uniqueFilename,
        file_path: filePath,
        file_size: fileData.size,
        changes: 'Initial version',
        created_by: userId,
        is_current: true
      }, { transaction });
      
      await auditService.logActivity(
        'technical_document_uploaded',
        userId,
        { 
          document_id: document.id, 
          document_number: documentNumber,
          original_name: fileData.originalname
        }
      );
      
      await transaction.commit();
      return { document, version };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error uploading technical document:', error);
      throw new Error('Failed to upload technical document');
    }
  },
  
  /**
   * Update an existing technical document with a new version
   * @param {string} documentId - Document ID
   * @param {Object} fileData - File data from multer
   * @param {Object} versionData - Additional version data
   * @param {string} userId - User ID uploading the version
   * @returns {Object} Updated document with new version info
   */
  updateTechnicalDocument: async (documentId, fileData, versionData, userId) => {
    const transaction = await sequelize.transaction();
    
    try {
      const document = await Document.findByPk(documentId, { transaction });
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      if (document.document_type !== 'TECHNICAL') {
        throw new Error('Document is not a technical document');
      }
      
      // Determine file extension
      const fileExt = path.extname(fileData.originalname).toLowerCase();
      
      // Update previous versions to not be current
      await DocumentVersion.update(
        { is_current: false },
        { 
          where: { document_id: documentId },
          transaction
        }
      );
      
      // Increment document version count
      await document.increment('version_count', { transaction });
      await document.reload({ transaction });
      
      // Create a unique filename for the new version
      const safeDocNumber = document.document_number.replace(/\//g, '-');
      const uniqueFilename = `${safeDocNumber}-v${document.version_count}${fileExt}`;
      
      // Get document directory from existing path
      const docDir = path.dirname(document.file_path);
      const filePath = path.join(docDir, uniqueFilename);
      
      // Move file from temp upload location to final location
      fs.copyFileSync(fileData.path, filePath);
      
      // Create new version
      const version = await DocumentVersion.create({
        document_id: documentId,
        version_number: document.version_count,
        filename: uniqueFilename,
        file_path: filePath,
        file_size: fileData.size,
        changes: versionData.changes || `Version ${document.version_count} update`,
        created_by: userId,
        is_current: true,
        metadata: versionData.metadata || {}
      }, { transaction });
      
      // Update document metadata if provided
      if (versionData.document_metadata) {
        const updatedMetadata = {
          ...document.metadata,
          ...versionData.document_metadata
        };
        
        await document.update({
          metadata: updatedMetadata
        }, { transaction });
      }
      
      await auditService.logActivity(
        'technical_document_updated',
        userId,
        { 
          document_id: documentId, 
          version_id: version.id,
          version_number: version.version_number
        }
      );
      
      await transaction.commit();
      return { document, version };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating technical document:', error);
      throw new Error('Failed to update technical document');
    }
  },
  
  /**
   * Get document with its versions
   * @param {string} documentId - Document ID
   * @returns {Object} Document with versions
   */
  getDocumentWithVersions: async (documentId) => {
    try {
      const document = await Document.findByPk(documentId, {
        include: [
          { 
            model: DocumentVersion, 
            as: 'versions',
            include: [
              { model: User, as: 'createdBy', attributes: ['id', 'first_name', 'last_name'] }
            ]
          },
          { model: User, as: 'uploadedBy', attributes: ['id', 'first_name', 'last_name'] },
          { model: Case, as: 'case', attributes: ['id', 'title', 'case_number'] },
          { model: Ticket, as: 'ticket', attributes: ['id', 'title', 'ticket_number'] }
        ]
      });
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      return document;
    } catch (error) {
      logger.error('Error getting document with versions:', error);
      throw new Error('Failed to get document');
    }
  },
  
  /**
   * Get document version file
   * @param {string} versionId - Version ID
   * @returns {Object} Version with file info
   */
  getDocumentVersionFile: async (versionId) => {
    try {
      const version = await DocumentVersion.findByPk(versionId, {
        include: [
          { model: Document, as: 'document' }
        ]
      });
      
      if (!version) {
        throw new Error('Document version not found');
      }
      
      // Check if file exists
      if (!fs.existsSync(version.file_path)) {
        throw new Error('Document file not found');
      }
      
      return version;
    } catch (error) {
      logger.error('Error getting document version file:', error);
      throw new Error('Failed to get document version');
    }
  }
};

module.exports = documentService;
