import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, simulate a user ID (in real app, this would come from auth)
      const response = await axios.get(`${API_BASE_URL}/api/rbac/permissions`, {
        headers: {
          'x-user-id': '1' // Temporary - replace with actual auth token
        }
      });

      if (response.data.success) {
        setUser(response.data.user);
        setPermissions(response.data.permissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setError('Failed to load user permissions');
      
      // Fallback permissions for development
      setUser({
        id: 1,
        role: 'director',
        name: 'Admin User',
        email: 'admin@vtria.com'
      });
      setPermissions({
        sales_enquiry: ['create', 'read', 'update', 'delete', 'approve'],
        estimation: ['create', 'read', 'update', 'delete', 'approve'],
        quotation: ['create', 'read', 'update', 'delete', 'approve'],
        sales_order: ['create', 'read', 'update', 'delete', 'approve'],
        purchase_order: ['create', 'read', 'update', 'delete', 'approve'],
        manufacturing: ['create', 'read', 'update', 'delete', 'approve'],
        inventory: ['create', 'read', 'update', 'delete', 'approve'],
        users: ['create', 'read', 'update', 'delete'],
        clients: ['create', 'read', 'update', 'delete'],
        reports: ['read', 'export']
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific permission
  const hasPermission = (module, action) => {
    if (!permissions[module]) return false;
    return permissions[module].includes(action);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissionChecks) => {
    return permissionChecks.some(({ module, action }) => hasPermission(module, action));
  };

  // Check if user can approve
  const canApprove = (module = null) => {
    if (module) {
      return hasPermission(module, 'approve');
    }
    return ['director', 'admin', 'sales-admin'].includes(user?.role);
  };

  // Check if user can delete
  const canDelete = (module = null) => {
    if (module) {
      return hasPermission(module, 'delete');
    }
    return user?.role === 'director';
  };

  // Check if user can create
  const canCreate = (module) => {
    return hasPermission(module, 'create');
  };

  // Check if user can update
  const canUpdate = (module) => {
    return hasPermission(module, 'update');
  };

  // Check if user can read
  const canRead = (module) => {
    return hasPermission(module, 'read');
  };

  // Get user role display name
  const getRoleDisplayName = (role = user?.role) => {
    const roleNames = {
      director: 'Director',
      admin: 'Administrator',
      'sales-admin': 'Sales Administrator',
      designer: 'Designer',
      accounts: 'Accounts',
      technician: 'Technician'
    };
    return roleNames[role] || role;
  };

  // Filter menu items based on permissions
  const getAccessibleMenuItems = (menuItems) => {
    return menuItems.filter(item => {
      if (!item.requiredPermission) return true;
      const { module, action } = item.requiredPermission;
      return hasPermission(module, action);
    });
  };

  const value = {
    user,
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    canApprove,
    canDelete,
    canCreate,
    canUpdate,
    canRead,
    getRoleDisplayName,
    getAccessibleMenuItems,
    refreshPermissions: fetchUserPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
