import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Collapse,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  RequestQuote as QuoteIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  Engineering as EngineeringIcon,
  Assignment as AssignmentIcon,
  LocalShipping as LocalShippingIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Sell as SellIcon,
  ShoppingBasket as ShoppingBasketIcon,
  PrecisionManufacturing as PrecisionManufacturingIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  type: 'single' | 'group';
  children?: MenuItem[];
}

interface SidebarProps {
  isLicenseValid: boolean;
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', type: 'single' },
  { text: 'Case Dashboard', icon: <DashboardIcon />, path: '/case-dashboard', type: 'single' },
  {
    text: 'Sales & CRM',
    icon: <SellIcon />,
    type: 'group',
    children: [
      { text: 'Sales Enquiry', icon: <QuoteIcon />, path: '/sales-enquiry', type: 'single' },
      { text: 'Estimation', icon: <EngineeringIcon />, path: '/estimation', type: 'single' },
      { text: 'Quotation', icon: <QuoteIcon />, path: '/quotations', type: 'single' },
      { text: 'Sales Order', icon: <ShoppingCartIcon />, path: '/sales-orders', type: 'single' },
      { text: 'Invoice Management', icon: <AssignmentIcon />, path: '/invoice-management', type: 'single' },
    ]
  },
  {
    text: 'Purchase',
    icon: <ShoppingBasketIcon />,
    type: 'group',
    children: [
      { text: 'Purchase Requisition', icon: <AssignmentIcon />, path: '/purchase-requisition', type: 'single' },
      { text: 'Purchase Order', icon: <ShoppingCartIcon />, path: '/purchase-orders', type: 'single' },
      { text: 'GRN', icon: <LocalShippingIcon />, path: '/grn', type: 'single' },
    ]
  },
  {
    text: 'Manufacturing',
    icon: <PrecisionManufacturingIcon />,
    type: 'group',
    children: [
      { text: 'Production Management', icon: <PrecisionManufacturingIcon />, path: '/production', type: 'single' },
      { text: 'Manufacturing Workflow', icon: <PrecisionManufacturingIcon />, path: '/manufacturing', type: 'single' },
    ]
  },
  {
    text: 'Inventory Management',
    icon: <InventoryIcon />,
    type: 'group',
    children: [
      { text: 'Master Inventory Dashboard', icon: <DashboardIcon />, path: '/inventory', type: 'single' },
      { text: 'Products', icon: <InventoryIcon />, path: '/products', type: 'single' },
      { text: 'Product Dashboard', icon: <DashboardIcon />, path: '/product-dashboard', type: 'single' },
    ]
  },
  {
    text: 'Financial Management',
    icon: <BusinessIcon />,
    type: 'group',
    children: [
      { text: 'Financial Dashboard', icon: <DashboardIcon />, path: '/financial-dashboard', type: 'single' },
      { text: 'Payment Management', icon: <BusinessIcon />, path: '/payment-management', type: 'single' },
      { text: 'Profit Calculator', icon: <AssignmentIcon />, path: '/profit-calculator', type: 'single' },
    ]
  },
  {
    text: 'Human Resources',
    icon: <PeopleIcon />,
    type: 'group',
    children: [
      { text: 'Employee Management', icon: <PeopleIcon />, path: '/employee-management', type: 'single' },
      { text: 'Employee Dashboard', icon: <DashboardIcon />, path: '/employee-dashboard', type: 'single' },
      { text: 'Attendance Management', icon: <AssignmentIcon />, path: '/attendance-management', type: 'single' },
      { text: 'Leave Management', icon: <AssignmentIcon />, path: '/leave-management', type: 'single' },
      { text: 'Mobile Attendance', icon: <LocalShippingIcon />, path: '/mobile-attendance', type: 'single' },
    ]
  },
  {
    text: 'Reporting & Analytics',
    icon: <AssignmentIcon />,
    type: 'group',
    children: [
      { text: 'Case Dashboard', icon: <DashboardIcon />, path: '/case-dashboard', type: 'single' },
      { text: 'Price Comparison', icon: <QuoteIcon />, path: '/price-comparison', type: 'single' },
      { text: 'Case History Tracker', icon: <AssignmentIcon />, path: '/case-history-tracker', type: 'single' },
      { text: 'Technician Dashboard', icon: <EngineeringIcon />, path: '/technician-dashboard', type: 'single' },
    ]
  },
  {
    text: 'Admin',
    icon: <AdminPanelSettingsIcon />,
    type: 'group',
    children: [
      { text: 'Clients', icon: <BusinessIcon />, path: '/clients', type: 'single' },
      { text: 'Users', icon: <PeopleIcon />, path: '/users', type: 'single' },
      { text: 'Settings', icon: <SecurityIcon />, path: '/settings', type: 'single' },
      { text: 'API Test', icon: <SecurityIcon />, path: '/api-test', type: 'single' },
    ]
  },
];

export default function Sidebar({ isLicenseValid }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();

  const handleGroupToggle = (groupText: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupText]: !prev[groupText]
    }));
  };

  const isChildActive = (children: MenuItem[] = []) => {
    return children.some(child => location.pathname === child.path);
  };

  // Auto-open groups when their child routes are active
  useEffect(() => {
    const newOpenGroups: Record<string, boolean> = {};
    menuItems.forEach(item => {
      if (item.type === 'group' && item.children && isChildActive(item.children)) {
        newOpenGroups[item.text] = true;
      }
    });
    setOpenGroups(prev => ({ ...prev, ...newOpenGroups }));
  }, [location.pathname]);

  const renderMenuItem = (item: MenuItem) => {
    if (item.type === 'single') {
      return (
        <ListItem key={item.text} disablePadding>
          <ListItemButton
            selected={location.pathname === item.path}
            onClick={() => item.path && navigate(item.path)}
            disabled={!isLicenseValid}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      );
    } else if (item.type === 'group') {
      const isOpen = openGroups[item.text];
      const hasActiveChild = isChildActive(item.children);
      
      return (
        <div key={item.text}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleGroupToggle(item.text)}
              disabled={!isLicenseValid}
              sx={{
                backgroundColor: hasActiveChild ? 'action.selected' : 'inherit',
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
              {isOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child) => (
                <ListItem key={child.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 4 }}
                    selected={location.pathname === child.path}
                    onClick={() => child.path && navigate(child.path)}
                    disabled={!isLicenseValid}
                  >
                    <ListItemIcon>
                      {child.icon}
                    </ListItemIcon>
                    <ListItemText primary={child.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          VTRIA Engineering Solutions
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map(renderMenuItem)}
      </List>
    </div>
  );
}