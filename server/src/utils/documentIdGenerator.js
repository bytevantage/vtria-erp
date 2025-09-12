/**
 * Document ID Generator for VTRIA ERP
 * Generates standardized document IDs with format VESPL/TYPE/YEAR/SEQUENCE
 */

const { Document, sequelize } = require('../models');
const logger = require('./logger');

/**
 * Document Type Code Mapping
 * Maps document types to their short codes
 */
const DOCUMENT_TYPE_CODES = {
  'ENQUIRY': 'EQ',
  'QUOTATION': 'QT',
  'PURCHASE_ORDER': 'PO',
  'INVOICE': 'IN',
  'TECHNICAL': 'TD',
  'REPORT': 'RP',
  'CASE_ATTACHMENT': 'CA',
  'OTHER': 'DOC'
};

/**
 * Get current financial year in format YY-YY (e.g., 25-26 for 2025-2026)
 * Financial year starts in April
 * @returns {string} Financial year code
 */
const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed, 0 = January
  
  // Financial year starts in April
  const startYear = month >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const endYear = startYear + 1;
  
  // Format as YY-YY
  return `${startYear.toString().substr(2)}${endYear.toString().substr(2)}`;
};

/**
 * Get next sequence number for a document type in the current financial year
 * @param {string} documentType - Document type
 * @param {string} typeCode - Document type code
 * @param {string} financialYear - Financial year code
 * @returns {Promise<number>} Next sequence number
 */
const getNextSequenceNumber = async (documentType, typeCode, financialYear) => {
  try {
    const latestDoc = await Document.findOne({
      where: {
        document_type: documentType,
        document_number: {
          [sequelize.Op.like]: `VESPL/${typeCode}/${financialYear}/%`
        }
      },
      order: [['document_number', 'DESC']]
    });
    
    if (latestDoc && latestDoc.document_number) {
      // Extract sequence number from document number
      const parts = latestDoc.document_number.split('/');
      if (parts.length === 4) {
        const lastSequence = parseInt(parts[3], 10);
        return lastSequence + 1;
      }
    }
    
    // If no document found or invalid format, start with 1
    return 1;
  } catch (error) {
    logger.error('Error getting next sequence number:', error);
    throw new Error('Failed to generate sequence number');
  }
};

/**
 * Generate a standardized document ID
 * Format: VESPL/TYPE/YEAR/SEQUENCE
 * @param {string} documentType - Document type
 * @returns {Promise<string>} Generated document ID
 */
const generateDocumentId = async (documentType) => {
  try {
    // Get document type code
    const typeCode = DOCUMENT_TYPE_CODES[documentType] || 'DOC';
    
    // Get current financial year
    const financialYear = getCurrentFinancialYear();
    
    // Get next sequence number
    const sequenceNumber = await getNextSequenceNumber(documentType, typeCode, financialYear);
    
    // Format sequence number with leading zeros (3 digits)
    const formattedSequence = sequenceNumber.toString().padStart(3, '0');
    
    // Generate document ID
    return `VESPL/${typeCode}/${financialYear}/${formattedSequence}`;
  } catch (error) {
    logger.error('Error generating document ID:', error);
    throw new Error('Failed to generate document ID');
  }
};

module.exports = {
  generateDocumentId,
  getCurrentFinancialYear,
  DOCUMENT_TYPE_CODES
};
