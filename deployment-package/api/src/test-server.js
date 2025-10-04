const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const databaseMiddleware = require('./middleware/database.middleware');
const caseManagementRoutes = require('./routes/caseManagement.routes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(databaseMiddleware);

// Routes
app.use('/api/case-management', caseManagementRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});