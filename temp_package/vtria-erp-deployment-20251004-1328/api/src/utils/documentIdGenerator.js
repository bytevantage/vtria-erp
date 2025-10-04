const db = require('../config/database');

/**
 * Generate document ID in format VESPL/XX/2526/XXX
 * VESPL = VTRIA ENGINEERING SOLUTIONS PVT LTD
 * @param {string} documentType - Document type code (EQ, ET, Q, SO, GRN, I, PO, PI, DC, PR, BOM)
 * @returns {Promise<string>} - Generated document ID
 */
async function generateDocumentId(documentType) {
    try {
        const currentYear = new Date().getFullYear();
        const financialYear = `${currentYear % 100}${(currentYear + 1) % 100}`;

        // Get or create sequence for current financial year
        const [sequences] = await db.execute(
            'SELECT last_sequence FROM document_sequences WHERE document_type = ? AND financial_year = ?',
            [documentType, financialYear]
        );

        let nextSequence = 1;
        if (sequences.length > 0) {
            nextSequence = sequences[0].last_sequence + 1;
            // Update sequence
            await db.execute(
                'UPDATE document_sequences SET last_sequence = ? WHERE document_type = ? AND financial_year = ?',
                [nextSequence, documentType, financialYear]
            );
        } else {
            // Create new sequence
            await db.execute(
                'INSERT INTO document_sequences (document_type, financial_year, last_sequence) VALUES (?, ?, ?)',
                [documentType, financialYear, nextSequence]
            );
        }

        return `VESPL/${documentType}/${financialYear}/${nextSequence.toString().padStart(3, '0')}`;
    } catch (error) {
        console.error(`Error generating ${documentType} ID:`, error);
        throw error;
    }
}

/**
 * Document type mappings
 */
const DOCUMENT_TYPES = {
    ENQUIRY: 'EQ',
    CASE: 'C',
    ESTIMATION: 'ET',
    QUOTATION: 'Q',
    SALES_ORDER: 'SO',
    GOODS_RECEIVED_NOTE: 'GRN',
    INVOICE: 'I',
    PURCHASE_ORDER: 'PO',
    PROFORMA_INVOICE: 'PI',
    DELIVERY_CHALLAN: 'DC',
    PURCHASE_REQUISITION: 'PR',
    BILL_OF_MATERIALS: 'BOM',
    ADVANCE_PAYMENT: 'ADV'
};

module.exports = {
    generateDocumentId,
    DOCUMENT_TYPES
};
