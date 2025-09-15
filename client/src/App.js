import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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
import LicenseValidation from './components/LicenseValidation';
import './App.css';

// Import components
import Dashboard from './components/Dashboard';
import SalesEnquiry from './components/SalesEnquiry';
import Estimation from './components/Estimation';
import Quotations from './components/QuotationsEnhanced';
import SalesOrders from './components/SalesOrders';
import PurchaseOrders from './components/PurchaseOrders';
import Manufacturing from './components/Manufacturing';
import Inventory from './components/Inventory';
import Users from './components/Users';
import Clients from './components/Clients';
import PurchaseRequisition from './components/PurchaseRequisition';
import GoodsReceivedNote from './components/GoodsReceivedNote';
import ProductManagement from './components/ProductManagement';
import ProductDashboard from './components/ProductDashboard';
import ProductionManagement from './components/ProductionManagement';
import APITest from './components/APITest';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import ConnectionStatus from './components/ConnectionStatus';

// Import new enhanced components
import InvoiceManagement from './components/InvoiceManagement';
import FinancialDashboard from './components/FinancialDashboard';
import PaymentManagement from './components/PaymentManagement';
import ProfitCalculator from './components/ProfitCalculator';
import EmployeeManagement from './components/EmployeeManagement';
import EmployeeDashboard from './components/EmployeeDashboard';
import AttendanceManagement from './components/AttendanceManagement';
import LeaveManagement from './components/LeaveManagement';
import MobileAttendanceApp from './components/MobileAttendanceApp';
import PriceComparison from './components/PriceComparison';
import PurchasePriceComparison from './components/PurchasePriceComparison';
import PriceComparisonPage from './components/PriceComparisonPage';
import CaseHistoryTracker from './components/CaseHistoryTracker';
import TechnicianDashboard from './components/TechnicianDashboard';
import SerialWarrantyTracker from './components/SerialWarrantyTracker';
import SerialWarrantyTrackerPage from './components/SerialWarrantyTrackerPage';
import CaseDashboard from './components/CaseDashboard';

// Import Master Inventory Dashboard
import MasterInventoryDashboard from './components/MasterInventoryDashboard';

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
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
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
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              VTRIA ERP - Industrial Automation Solutions
            </Typography>
            
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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Sales & CRM Routes */}
              <Route path="/sales-enquiry" element={<SalesEnquiry />} />
              <Route path="/estimation" element={<Estimation />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/sales-orders" element={<SalesOrders />} />
              <Route path="/invoice-management" element={<InvoiceManagement />} />
              
              {/* Purchase Routes */}
              <Route path="/purchase-requisition" element={<PurchaseRequisition />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/grn" element={<GoodsReceivedNote />} />
              
              {/* Manufacturing Routes */}
              <Route path="/manufacturing" element={<Manufacturing />} />
              <Route path="/production" element={<ProductionManagement />} />
              
              {/* Inventory Management Routes */}
              <Route path="/inventory" element={<MasterInventoryDashboard />} />
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/product-dashboard" element={<ProductDashboard />} />
              
              {/* Financial Management Routes */}
              <Route path="/financial-dashboard" element={<FinancialDashboard />} />
              <Route path="/payment-management" element={<PaymentManagement />} />
              <Route path="/profit-calculator" element={<ProfitCalculator />} />
              
              {/* Human Resources Routes */}
              <Route path="/employee-management" element={<EmployeeManagement />} />
              <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
              <Route path="/attendance-management" element={<AttendanceManagement />} />
              <Route path="/leave-management" element={<LeaveManagement />} />
              <Route path="/mobile-attendance" element={<MobileAttendanceApp />} />
              
              {/* Reporting & Analytics Routes */}
              <Route path="/price-comparison" element={<PriceComparisonPage />} />
              <Route path="/case-history-tracker" element={<CaseHistoryTracker />} />
              <Route path="/case-dashboard" element={<CaseDashboard />} />
              <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
              
              {/* Admin Routes */}
              <Route path="/api-test" element={<APITest />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
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
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <LicenseProvider>
        <App />
      </LicenseProvider>
    </Router>
  );
}
