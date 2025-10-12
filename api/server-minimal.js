const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Add process error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Log the error but try to gracefully shutdown
    setTimeout(() => {
        console.error('Forcing shutdown due to uncaught exception');
        process.exit(1);
    }, 5000); // Give 5 seconds for cleanup
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

const app = express();

// Import database middleware and connection
const databaseMiddleware = require('./src/middleware/database.middleware');

// Import all route modules
const authRoutes = require('./src/routes/auth.routes');
const bomRoutes = require('./src/routes/bom.routes');
const caseHistoryRoutes = require('./src/routes/caseHistory.routes');
const clientRoutes = require('./src/routes/client.routes');
const employeeRoutes = require('./src/routes/employee.routes');
const companyConfigRoutes = require('./src/routes/companyConfig.routes');
const deliveryChallanRoutes = require('./src/routes/deliveryChallan.routes');
const estimationRoutes = require('./src/routes/estimation.routes');
const financialRoutes = require('./src/routes/financial.routes');
const grnRoutes = require('./src/routes/grn.routes');
const inventoryRoutes = require('./src/routes/inventory.routes');
const manufacturingRoutes = require('./src/routes/manufacturing.routes');
const manufacturingWorkflowRoutes = require('./src/routes/manufacturingWorkflow.routes');
const multiLocationInventoryRoutes = require('./src/routes/multiLocationInventory.routes');
const pdfRoutes = require('./src/routes/pdf.routes');
const productsRoutes = require('./src/routes/products.routes');
const productionRoutes = require('./src/routes/production.routes');
const purchaseRoutes = require('./src/routes/purchase.routes');
const purchaseOrderRoutes = require('./src/routes/purchaseOrder.routes');
const purchasePriceComparisonRoutes = require('./src/routes/purchasePriceComparison.routes');
const purchaseRequisitionRoutes = require('./src/routes/purchaseRequisition.routes');
const quotationRoutes = require('./src/routes/quotation.routes');
const rbacRoutes = require('./src/routes/rbac.routes');
// const rfqRoutes = require('./src/routes/rfq.routes'); // REMOVED: Competitive Bidding feature
const salesRoutes = require('./src/routes/sales.routes');
const salesEnquiryRoutes = require('./src/routes/salesEnquiry.routes');
const salesOrderRoutes = require('./src/routes/salesOrder.routes');
const serialWarrantyTrackingRoutes = require('./src/routes/serialWarrantyTracking.routes');
const stockRoutes = require('./src/routes/stock.routes');
const stockAvailabilityRoutes = require('./src/routes/stockAvailability.routes');
const userRoutes = require('./src/routes/user.routes');
const suppliersRoutes = require('./src/routes/suppliers.routes');
const inventoryEnhancedRoutes = require('./src/routes/inventoryEnhanced.routes');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(databaseMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        message: 'Server is running successfully'
    });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/case-history', caseHistoryRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/company-config', companyConfigRoutes);
app.use('/api/delivery-challan', deliveryChallanRoutes);
app.use('/api/estimation', estimationRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/manufacturing-workflow', manufacturingWorkflowRoutes);
app.use('/api/multi-location-inventory', multiLocationInventoryRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/purchase-order', purchaseOrderRoutes);
app.use('/api/purchase-price-comparison', purchasePriceComparisonRoutes);
app.use('/api/purchase-requisition', purchaseRequisitionRoutes);
app.use('/api/quotation', quotationRoutes);
app.use('/api/rbac', rbacRoutes);
// app.use('/api/rfq-campaigns', rfqRoutes); // REMOVED: Competitive Bidding feature
app.use('/api/sales', salesRoutes);
app.use('/api/sales-enquiry', salesEnquiryRoutes);
app.use('/api/sales-order', salesOrderRoutes);
app.use('/api/serial-warranty', serialWarrantyTrackingRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/stock-availability', stockAvailabilityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/enhanced-inventory', inventoryEnhancedRoutes);

// Global error handler middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);

    // Check if headers were already sent
    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`Minimal server is running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
    console.log(`Test endpoint available at: http://localhost:${PORT}/test`);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('Starting graceful shutdown...');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};