const db = require('../config/database');

class DocumentNumberGenerator {
    static async generateNumber(type, financialYear) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get or create sequence
            const [sequences] = await connection.execute(
                'INSERT INTO document_sequences (document_type, financial_year, last_sequence) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1',
                [type, financialYear]
            );

            // Get the updated sequence
            const [result] = await connection.execute(
                'SELECT last_sequence FROM document_sequences WHERE document_type = ? AND financial_year = ?',
                [type, financialYear]
            );

            await connection.commit();

            const sequence = String(result[0].last_sequence).padStart(3, '0');
            return `VESPL/${type}/${financialYear}/${sequence}`;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static getCurrentFinancialYear() {
        const today = new Date();
        const month = today.getMonth() + 1; // JavaScript months are 0-indexed
        const year = today.getFullYear();
        
        // If current month is before April (4), use previous year as start
        const startYear = month < 4 ? year - 1 : year;
        const endYear = startYear + 1;
        
        // Return financial year in format "2526" (for 2025-26)
        return `${startYear.toString().slice(-2)}${endYear.toString().slice(-2)}`;
    }
}

module.exports = DocumentNumberGenerator;
