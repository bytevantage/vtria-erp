import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuIcon from '@mui/icons-material/Menu';
import SecurityIcon from '@mui/icons-material/Security';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate, useLocation } from 'react-router-dom';
import { LicenseProvider, useLicense } from './contexts/LicenseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LicenseValidation from './components/LicenseValidation';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getBasePath } from './utils/pathUtils';
import './App.css';

// Import Auth components
import Login from './pages/Auth/Login';

// Import components
import Dashboard from './components/Dashboard';
import SalesEnquiry from './components/SalesEnquiry';
import Estimation from './components/Estimation';
import Quotations from './components/QuotationsEnhanced';
import SalesOrders from './components/SalesOrders';
import PurchaseOrders from './components/PurchaseOrders';
import Inventory from './components/Inventory';
import EnterpriseInventoryManagement from './components/EnterpriseInventoryManagement';
import Users from './components/Users';
import Clients from './components/Clients';
import Vendors from './components/Vendors';
import PurchaseRequisition from './components/PurchaseRequisition';
import GoodsReceivedNote from './components/GoodsReceivedNote';
// Removed redundant product components - now unified in EnterpriseInventoryManagement
import ProductionManagement from './components/ProductionManagement';
import Settings from './components/Settings';
import About from './components/About';
import Sidebar from './components/Sidebar';
import ConnectionStatus from './components/ConnectionStatus';

// Enhanced components - Financial Management Suite
import InvoiceManagement from './components/InvoiceManagement';
import FinancialDashboard from './components/FinancialDashboard';
import PaymentManagement from './components/PaymentManagement';
import ProfitCalculator from './components/ProfitCalculator';

// Employee Management Components - Enabled for HR functionality
import EmployeeManagement from './components/EmployeeManagement';
import EmployeeDashboard from './components/EmployeeDashboard';
import AttendanceManagement from './components/AttendanceManagement';
import LeaveManagement from './components/LeaveManagement';
import MobileAttendanceApp from './components/MobileAttendanceApp';

// User Management Component - Admin functionality
import UserManagement from './components/UserManagement';
// Enhanced Reporting & Analytics Components
import CaseDashboard from './components/CaseDashboard';
import CaseDashboardDebug from './components/CaseDashboardDebug';
import EnterpriseCaseDashboard from './components/EnterpriseCaseDashboard';
import PriceComparisonAnalytics from './components/PriceComparisonAnalytics';
import CaseHistoryTracker from './components/CaseHistoryTracker';
import EnhancedCaseHistoryTracker from './components/EnhancedCaseHistoryTracker';
import EnterpriseAuditDashboard from './components/EnterpriseAuditDashboard';
import UnifiedEnterpriseDashboard from './components/UnifiedEnterpriseDashboard';
import EnterpriseTechnicianDashboard from './components/EnterpriseTechnicianDashboard';
import EnterpriseAssigneeReport from './components/EnterpriseAssigneeReport';
import AssigneeReport from './components/AssigneeReport';

// Production Enhancement Components
import { QualityDashboard, ShopFloorDashboard, PlanningDashboard } from './components/Production';

// import CompetitiveBiddingManager from './components/CompetitiveBiddingManager'; // REMOVED: Competitive Bidding feature

// Master Inventory Dashboard temporarily disabled
// import MasterInventoryDashboard from './components/MasterInventoryDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const {
    isLicenseValid,
    licenseInfo,
    loading,
    showLicenseDialog,
    setShowLicenseDialog,
    handleLicenseValidated,
    clearLicense,
  } = useLicense();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLicenseDialogClose = () => {
    if (isLicenseValid) {
      setShowLicenseDialog(false);
    }
  };

  const drawer = <Sidebar isLicenseValid={isLicenseValid} />;

  return (
    <ErrorBoundary
      fallback={({ error, onRetry }) => (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Application Error
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            A critical error occurred in the application. Please try refreshing the page.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={onRetry}
            startIcon={<RefreshIcon />}
          >
            Refresh Application
          </Button>
        </Box>
      )}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ display: 'flex' }}>
            <AppBar
              position="fixed"
              sx={{
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2, display: { sm: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                  <img
                    src="/vtria-erp/vtria_logo.jpg"
                    alt="VTRIA Logo"
                    style={{ height: 40, width: 'auto' }}
                  />
                  <Typography variant="h6" noWrap component="div">
                    VTRIA ERP - Industrial Automation Solutions
                  </Typography>
                </Box>

                <ConnectionStatus variant="chip" />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      <Typography variant="body2">Checking license...</Typography>
                    </Box>
                  ) : isLicenseValid ? (
                    <>
                      <Chip
                        icon={<SecurityIcon />}
                        label={`Licensed to: ${licenseInfo?.client_name || 'VTRIA'}`}
                        color="success"
                        variant="outlined"
                        size="small"
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                      />
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<ExitToAppIcon />}
                        onClick={clearLicense}
                      >
                        Change License
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<ExitToAppIcon />}
                        onClick={logout}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Chip
                      icon={<SecurityIcon />}
                      label="License Required"
                      color="error"
                      variant="outlined"
                      size="small"
                      sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                    />
                  )}
                </Box>
              </Toolbar>
            </AppBar>
            <Box
              component="nav"
              sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true,
                }}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
              >
                {drawer}
              </Drawer>
              <Drawer
                variant="permanent"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
                open
              >
                {drawer}
              </Drawer>
            </Box>
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                width: { sm: `calc(100% - ${drawerWidth}px)` },
              }}
            >
              <Toolbar />
              {!isLicenseValid && !loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60vh',
                    textAlign: 'center',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                  <Typography variant="h5" color="text.secondary">
                    License Required
                  </Typography>
                  <Typography variant="body1" color="text.secondary" maxWidth={400}>
                    Please enter a valid ByteVantage license key to access VTRIA ERP System.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SecurityIcon />}
                    onClick={() => setShowLicenseDialog(true)}
                    size="large"
                  >
                    Enter License Key
                  </Button>
                </Box>
              ) : (
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading dashboard. Please try again.</div>}>
                        <Dashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  {/* Sales & CRM Routes */}
                  <Route path="/sales-enquiry" element={
                    <ProtectedRoute>
                      <SalesEnquiry />
                    </ProtectedRoute>
                  } />
                  <Route path="/estimation" element={
                    <ProtectedRoute>
                      <Estimation />
                    </ProtectedRoute>
                  } />
                  <Route path="/quotations" element={
                    <ProtectedRoute>
                      <Quotations />
                    </ProtectedRoute>
                  } />
                  <Route path="/sales-orders" element={
                    <ProtectedRoute>
                      <SalesOrders />
                    </ProtectedRoute>
                  } />

                  {/* Purchase Routes */}
                  <Route path="/purchase-requisition" element={
                    <ProtectedRoute>
                      <PurchaseRequisition />
                    </ProtectedRoute>
                  } />
                  <Route path="/purchase-orders" element={
                    <ProtectedRoute>
                      <PurchaseOrders />
                    </ProtectedRoute>
                  } />
                  <Route path="/grn" element={
                    <ProtectedRoute>
                      <GoodsReceivedNote />
                    </ProtectedRoute>
                  } />

                  {/* REMOVED: Competitive Bidding feature
                  <Route path="/competitive-bidding" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading competitive bidding manager. Please try again.</div>}>
                        <CompetitiveBiddingManager />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  */}



                  {/* Production/Manufacturing Routes */}
                  <Route path="/manufacturing" element={<Navigate to="/production" replace />} />
                  <Route path="/production" element={
                    <ProtectedRoute>
                      <ProductionManagement />
                    </ProtectedRoute>
                  } />

                  {/* Production Enhancement Routes */}
                  <Route path="/production/quality" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading quality dashboard. Please try again.</div>}>
                        <QualityDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/production/shopfloor" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading shop floor dashboard. Please try again.</div>}>
                        <ShopFloorDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/production/planning" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading production planning. Please try again.</div>}>
                        <PlanningDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  {/* Unified Inventory & Product Management */}
                  <Route path="/inventory" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading inventory management. Please try again.</div>}>
                        <EnterpriseInventoryManagement />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  {/* Redirect old product routes to unified inventory */}
                  <Route path="/products" element={<Navigate to="/inventory" replace />} />
                  <Route path="/product-dashboard" element={<Navigate to="/inventory" replace />} />

                  {/* Financial Management Routes */}
                  <Route path="/financial-dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading financial dashboard. Please try again.</div>}>
                        <FinancialDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/invoice-management" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading invoice management. Please try again.</div>}>
                        <InvoiceManagement />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/payment-management" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading payment management. Please try again.</div>}>
                        <PaymentManagement />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/profit-calculator" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading profit calculator. Please try again.</div>}>
                        <ProfitCalculator />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  {/* Human Resources Routes - Enabled for HR functionality */}
                  <Route path="/employee-management" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading employee management. Please try again.</div>}>
                        <EmployeeManagement />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/employee-dashboard" element={
                    <ProtectedRoute>
                      <EmployeeDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/attendance-management" element={
                    <ProtectedRoute>
                      <AttendanceManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/leave-management" element={
                    <ProtectedRoute>
                      <LeaveManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/mobile-attendance" element={
                    <ProtectedRoute>
                      <MobileAttendanceApp />
                    </ProtectedRoute>
                  } />

                  {/* Reporting & Analytics Routes */}
                  <Route path="/case-dashboard" element={
                    <ProtectedRoute>
                      <CaseDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/enterprise-case-dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading enterprise case dashboard. Please try again.</div>}>
                        <UnifiedEnterpriseDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/case-history-tracker" element={<Navigate to="/enterprise-case-dashboard" replace />} />
                  <Route path="/price-comparison" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading price comparison analytics. Please try again.</div>}>
                        <PriceComparisonAnalytics />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/technician-dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading technician dashboard. Please try again.</div>}>
                        <EnterpriseTechnicianDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/assignee-report" element={
                    <ProtectedRoute>
                      <ErrorBoundary fallback={<div>Error loading assignee report. Please try again.</div>}>
                        <EnterpriseAssigneeReport />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  {/* Admin Routes */}
                  <Route path="/user-management" element={<Navigate to="/employee-management" replace />} />
                  <Route path="/about" element={
                    <ProtectedRoute>
                      <About />
                    </ProtectedRoute>
                  } />
                  <Route path="/clients" element={
                    <ProtectedRoute>
                      <Clients />
                    </ProtectedRoute>
                  } />
                  <Route path="/vendors" element={
                    <ProtectedRoute>
                      <Vendors />
                    </ProtectedRoute>
                  } />
                  <Route path="/users" element={<Navigate to="/employee-management" replace />} />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                </Routes>
              )}
            </Box>

            <LicenseValidation
              open={showLicenseDialog}
              onLicenseValidated={handleLicenseValidated}
              onClose={handleLicenseDialogClose}
            />
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
    </ErrorBoundary>
  );
}

export default function AppWrapper() {
  const basePath = getBasePath();
  return (
    <Router basename={basePath}>
      <LicenseProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LicenseProvider>
    </Router>
  );
}
