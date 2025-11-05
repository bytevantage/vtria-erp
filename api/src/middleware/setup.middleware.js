const db = require('../config/database');

// Middleware to check if system is initialized
const checkSystemInitialized = async (req, res, next) => {
    try {
        // Skip check for setup routes and system status
        if (req.path.includes('/setup-initial-admin') || 
            req.path.includes('/system-status') ||
            req.path.includes('/health')) {
            return next();
        }

        // Check if any users exist
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users WHERE status = "active"');
        
        if (users[0].count === 0) {
            // System not initialized, return specific status
            return res.status(428).json({
                success: false,
                message: 'System not initialized',
                requiresSetup: true,
                setupEndpoint: '/api/auth/setup-initial-admin'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking system initialization:', error);
        next();
    }
};

module.exports = { checkSystemInitialized };
