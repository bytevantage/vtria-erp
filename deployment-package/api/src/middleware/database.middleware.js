const db = require('../config/database');

// Database middleware to attach database connection to request object
const databaseMiddleware = (req, res, next) => {
    req.db = db;
    next();
};

module.exports = databaseMiddleware;
