const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
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
const vendorRoutes = require('./routes/vendor.routes');
const salesEnquiryRoutes = require('./routes/salesEnquiry.routes');
const estimationRoutes = require('./routes/estimation.routes');
const quotationRoutes = require('./routes/quotation.routes');
const salesOrderRoutes = require('./routes/salesOrder.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const employeeRoutes = require('./routes/employee.routes');
const employeeEnhancedRoutes = require('./routes/employeeEnhanced.routes');
const enterpriseEmployeeRoutes = require('./routes/enterpriseEmployee.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const stockRoutes = require('./routes/stock.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const inventoryEnhancedRoutes = require('./routes/inventoryEnhanced.routes');
const enterpriseInventoryRoutes = require('./routes/enterpriseInventory.routes');
const manufacturingCasesRoutes = require('./routes/manufacturingCases.routes');
const productionRoutes = require('./routes/production.routes');
const userRoutes = require('./routes/user.routes');
const caseHistoryRoutes = require('./routes/caseHistory.routes');
const pdfRoutes = require('./routes/pdf.routes');
const auditRoutes = require('./routes/audit.routes');
const multiLocationInventoryRoutes = require('./routes/multiLocationInventory.routes');
const manufacturingWorkflowRoutes = require('./routes/manufacturingWorkflow.routes');
const purchasePriceComparisonRoutes = require('./routes/purchasePriceComparison.routes');
const vendorPriceRoutes = require('./routes/vendorPrice.routes');
const serialWarrantyTrackingRoutes = require('./routes/serialWarrantyTracking.routes');
const rbacRoutes = require('./routes/rbac.routes');
const stockAvailabilityRoutes = require('./routes/stockAvailability.routes');
const purchaseRequisitionRoutes = require('./routes/purchaseRequisition.routes');
const rfqRoutes = require('./routes/rfq.routes');
const grnRoutes = require('./routes/grn.routes');
const bomRoutes = require('./routes/bom.routes');
const bomSetupRoutes = require('./routes/bomSetup.routes');
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
const financialRoutes = require('./routes/financial.routes');
const hrRoutes = require('./routes/hr.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const placeholderRoutes = require('./routes/placeholder.routes');
const databaseRoutes = require('./routes/database.routes');

// Enterprise Production Features Routes
const leavePolicyManagementRoutes = require('./routes/leavePolicyManagement.routes');
const locationBasedAccessRoutes = require('./routes/locationBasedAccess.routes');
const enhancedAttendanceRoutes = require('./routes/enhancedAttendance.routes');

// Import controllers for direct access
const inventoryEnhancedController = require('./controllers/inventoryEnhanced.controller');

const app = express();

// Middleware - CORS configuration for development
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(databaseMiddleware);

// Serve static files from React build directory
app.use('/vtria-erp', express.static('/Users/srbhandary/Documents/Projects/vtria-erp/client/build'));

// Serve generated documents (PDFs)
app.use('/documents', express.static(path.join(__dirname, '../documents')));

// Catch all handler: send back React's index.html file for client-side routing
app.get('/vtria-erp', (req, res) => {
  res.sendFile('/Users/srbhandary/Documents/Projects/vtria-erp/client/build/index.html');
});


// Swagger API Documentation
// app.use('/api-docs', swagger.serve, swagger.setup);

// Request logging
app.use((req, res, next) => {
  console.log(`=== INCOMING REQUEST: ${req.method} ${req.url} ===`);
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id,
  });
  next();
});

// Audit logging middleware - temporarily disabled due to table issues
// app.use(auditLogger());

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
app.use('/api/vendors', vendorRoutes);
app.use('/api/sales-enquiries', salesEnquiryRoutes);
app.use('/api/estimations', estimationRoutes);
app.use('/api/estimation', estimationRoutes); // Singular route for backward compatibility
app.use('/api/quotations', quotationRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/hr', employeeEnhancedRoutes);
app.use('/api/enterprise-employees', enterpriseEmployeeRoutes);
app.use('/api/purchase-order', purchaseOrderRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes); // Plural route for frontend compatibility
app.use('/api/stock', stockRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-enhanced', inventoryEnhancedRoutes);
app.use('/api/enterprise-inventory', enterpriseInventoryRoutes);
app.use('/api/manufacturing', manufacturingCasesRoutes);

// Removed placeholder BOM endpoint - using real production controller now

// Removed placeholder BOM components endpoint - using real production controller now

app.use('/api/production', productionRoutes);

app.use('/api/users', userRoutes);
app.use('/api/case-history', caseHistoryRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/multi-location-inventory', multiLocationInventoryRoutes);
app.use('/api/manufacturing-workflow', manufacturingWorkflowRoutes);
app.use('/api/purchase-price-comparison', purchasePriceComparisonRoutes);
app.use('/api/vendor-prices', vendorPriceRoutes);
app.use('/api/serial-warranty', serialWarrantyTrackingRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/stock-availability', stockAvailabilityRoutes);
app.use('/api/purchase-requisition', purchaseRequisitionRoutes);
app.use('/api/rfq-campaigns', rfqRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/po-advance-payments', require('./routes/poAdvancePayment.routes'));
app.use('/api/bom', bomRoutes);
app.use('/api/bom-setup', bomSetupRoutes);
app.use('/api/delivery-challan', deliveryChallanRoutes);
app.use('/api/company-config', companyConfigRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/database', databaseRoutes);
// Create simple proxy routes for legacy product API calls to redirect to inventory-enhanced
app.get('/api/products', (req, res) => {
  inventoryEnhancedController.getEnhancedItems(req, res);
});

app.get('/api/products/categories', (req, res) => {
  inventoryEnhancedController.getMainCategories(req, res);
});

app.get('/api/products/categories/flat', (req, res) => {
  inventoryEnhancedController.getMainCategories(req, res);
});

app.get('/api/products/dashboard', (req, res) => {
  inventoryEnhancedController.getInventoryDashboard(req, res);
});

app.get('/api/products/:itemId/serials', (req, res) => {
  inventoryEnhancedController.getSerialNumbers(req, res);
});

app.get('/api/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    // Create a temporary request object to call the controller
    const tempReq = { ...req };
    const tempRes = {
      json: (data) => {
        if (data.success && q && data.data) {
          const filteredItems = data.data.filter(item =>
            item.item_name?.toLowerCase().includes(q.toLowerCase()) ||
            item.item_code?.toLowerCase().includes(q.toLowerCase()) ||
            item.brand?.toLowerCase().includes(q.toLowerCase()) ||
            item.model?.toLowerCase().includes(q.toLowerCase())
          );
          res.json({ success: true, data: filteredItems });
        } else {
          res.json(data);
        }
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };
    inventoryEnhancedController.getEnhancedItems(tempReq, tempRes);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching products', error: error.message });
  }
});

// app.use('/api/products', productsRoutes); // Disabled - using inventory-enhanced routes instead
app.use('/api/inventory-aware-estimation', inventoryAwareEstimationRoutes);
app.use('/api/case-management', caseManagementRoutes);
app.use('/api/closed-cases', closedCasesRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/v1/hr', hrRoutes);
app.use('/api/analytics', analyticsRoutes);

// Enterprise Production Features Routes
app.use('/api/leave-policy', leavePolicyManagementRoutes);
app.use('/api/location-access', locationBasedAccessRoutes);
app.use('/api/enhanced-attendance', enhancedAttendanceRoutes);

// Additional proxy routes for missing endpoints that might be called
app.get('/api/main', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Main endpoint placeholder - consider using /api/inventory-enhanced/categories/main'
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Dashboard endpoint placeholder - consider using /api/inventory-enhanced/dashboard'
  });
});

// Additional missing endpoints for Purchase Orders page
app.get('/api/invoices', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Invoices endpoint placeholder - invoice management not yet implemented'
  });
});

app.get('/api/approved', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Approved items endpoint placeholder'
  });
});

app.get('/api/approved-requisitions', async (req, res) => {
  try {
    const purchaseRequisitionController = require('./controllers/purchaseRequisition.controller');
    await purchaseRequisitionController.getApprovedRequisitions(req, res);
  } catch (error) {
    console.error('Error in approved-requisitions endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approved requisitions',
      error: error.message
    });
  }
});

app.get('/api/enhanced', (req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Enhanced endpoint placeholder - consider using /api/inventory-enhanced/items'
  });
});

// Add direct endpoints without /api prefix to catch any requests that bypass proxy
app.get('/main', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Main endpoint placeholder'
  });
});

app.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Dashboard endpoint placeholder'
  });
});

app.get('/enhanced', (req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Enhanced endpoint placeholder'
  });
});

// PDF generation endpoints for Purchase Orders
app.get('/api/purchase-requisition/:id/pdf', (req, res) => {
  res.json({
    success: false,
    message: 'PDF generation for purchase requisitions not yet implemented'
  });
});

app.get('/api/purchase-order/:id/pdf/po', (req, res) => {
  res.json({
    success: false,
    message: 'PDF generation for purchase orders not yet implemented'
  });
});


// Placeholder routes for missing endpoints (to prevent 404/500 errors)
app.use('/api', placeholderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});


// Audit logging post-response - temporarily disabled
// app.use(logAuditTrail);

// 404 handler for unmatched routes
app.use(handleNotFound);

// Global error handler middleware (must be last)
app.use(globalErrorHandler);

// Start server with port management
async function startServer() {
  try {
    const PORT = process.env.PORT || 3001;

    const server = app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log('🚀 VTRIA ERP API Server Started Successfully');
      console.log('='.repeat(60));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`${'='.repeat(60)}\n`);

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
