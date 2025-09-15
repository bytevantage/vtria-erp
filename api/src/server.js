const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const databaseMiddleware = require('./middleware/database.middleware');
const { globalErrorHandler, handleNotFound } = require('./middleware/errorHandler');
const { auditLogger, logAuditTrail } = require('./middleware/auditLogger');
const logger = require('./utils/logger');
// const swagger = require('./config/swagger');
const portManager = require('./utils/portManager');
const slaScheduler = require('./services/slaScheduler');
const notificationService = require('./services/notificationService');
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
    slaScheduler.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    slaScheduler.stop();
    process.exit(0);
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const salesEnquiryRoutes = require('./routes/salesEnquiry.routes');
const estimationRoutes = require('./routes/estimation.routes');
const quotationRoutes = require('./routes/quotation.routes');
const salesOrderRoutes = require('./routes/salesOrder.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const stockRoutes = require('./routes/stock.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const manufacturingRoutes = require('./routes/manufacturing.routes');
const userRoutes = require('./routes/user.routes');
const caseHistoryRoutes = require('./routes/caseHistory.routes');
const pdfRoutes = require('./routes/pdf.routes');
const multiLocationInventoryRoutes = require('./routes/multiLocationInventory.routes');
const manufacturingWorkflowRoutes = require('./routes/manufacturingWorkflow.routes');
const purchasePriceComparisonRoutes = require('./routes/purchasePriceComparison.routes');
const serialWarrantyTrackingRoutes = require('./routes/serialWarrantyTracking.routes');
const rbacRoutes = require('./routes/rbac.routes');
const stockAvailabilityRoutes = require('./routes/stockAvailability.routes');
const purchaseRequisitionRoutes = require('./routes/purchaseRequisition.routes');
const grnRoutes = require('./routes/grn.routes');
const bomRoutes = require('./routes/bom.routes');
const deliveryChallanRoutes = require('./routes/deliveryChallan.routes');
const companyConfigRoutes = require('./routes/companyConfig.routes');
const suppliersRoutes = require('./routes/suppliers.routes');
const productsRoutes = require('./routes/products.routes');
const inventoryAwareEstimationRoutes = require('./routes/inventoryAwareEstimation.routes');
const caseManagementRoutes = require('./routes/caseManagement.routes');
const closedCasesRoutes = require('./routes/closedCases.routes');
const clientPortalRoutes = require('./routes/clientPortal.routes');
const aiInsightsRoutes = require('./routes/aiInsights.routes');
const mobileRoutes = require('./routes/mobile.routes');
const documentRoutes = require('./routes/document.routes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(databaseMiddleware);

// Swagger API Documentation
// app.use('/api-docs', swagger.serve, swagger.setup);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.id,
    });
    next();
});

// Audit logging middleware
app.use(auditLogger());

// Routes
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'VTRIA ERP API Server is running',
        version: '1.0.0',
        company: 'VTRIA Engineering Solutions Pvt Ltd'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales-enquiry', salesEnquiryRoutes);
app.use('/api/estimation', estimationRoutes);
app.use('/api/quotation', quotationRoutes);
app.use('/api/sales-order', salesOrderRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/purchase-order', purchaseOrderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/case-history', caseHistoryRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/multi-location-inventory', multiLocationInventoryRoutes);
app.use('/api/manufacturing-workflow', manufacturingWorkflowRoutes);
app.use('/api/purchase-price-comparison', purchasePriceComparisonRoutes);
app.use('/api/serial-warranty', serialWarrantyTrackingRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/stock-availability', stockAvailabilityRoutes);
app.use('/api/purchase-requisition', purchaseRequisitionRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/delivery-challan', deliveryChallanRoutes);
app.use('/api/company-config', companyConfigRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory-aware-estimation', inventoryAwareEstimationRoutes);
app.use('/api/case-management', caseManagementRoutes);
app.use('/api/closed-cases', closedCasesRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/documents', documentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Audit logging post-response
app.use(logAuditTrail);

// 404 handler for unmatched routes
app.use(handleNotFound);

// Global error handler middleware (must be last)
app.use(globalErrorHandler);

// Start server with port management
async function startServer() {
    try {
        const PORT = process.env.PORT || 3002;
        
        const server = app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 VTRIA ERP API Server Started Successfully');
            console.log('='.repeat(60));
            console.log(`📡 Server running on: http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
            console.log('='.repeat(60) + '\n');
            
            // Update client configuration
            // portManager.updateClientConfig(PORT);
            
            // Start SLA monitoring and notification services
            try {
                // slaScheduler.start();
                logger.info('SLA Scheduler and Notification Service disabled for testing');
            } catch (error) {
                logger.error('Failed to start SLA services:', error);
            }
            
            // Create port lock
            // portManager.createPortLock(PORT);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                // Don't exit, just log
            } else {
                console.error('❌ Server error:', error);
            }
        });

        return server;
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        throw error;
    }
}

// Start the server
startServer().catch(console.error);
