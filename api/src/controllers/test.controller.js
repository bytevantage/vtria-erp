const testController = {};

// Simple test endpoint
testController.test = async (req, res) => {
    try {
        console.log('=== TEST ENDPOINT CALLED ===');
        
        // Get a connection from the pool
        const connection = await req.db.getConnection();
        
        try {
            // Test a simple query
            const [rows] = await connection.query('SELECT 1 as test_value');
            console.log('Test query result:', rows);
            
            res.json({
                success: true,
                message: 'Test successful',
                data: rows
            });
        } finally {
            // Always release the connection back to the pool
            connection.release();
        }
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
                sql: error.sql,
                sqlMessage: error.sqlMessage,
                code: error.code
            })
        });
    }
};

module.exports = testController;
