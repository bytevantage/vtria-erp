import { User, Location, AppState } from '../types';

// Temporary store implementation without Zustand
const mockStore: AppState = {
  user: null,
  currentLocation: null,
  permissions: [],
  setUser: (user: User | null) => { mockStore.user = user; },
  setCurrentLocation: (location: Location | null) => { mockStore.currentLocation = location; },
  setPermissions: (permissions: string[]) => { mockStore.permissions = permissions; },
};

export const useAppStore = () => mockStore;

// Role-based permission helper
export const usePermissions = () => {
  const { user, permissions } = useAppStore();
  
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission) || user?.user_role === 'director';
  };
  
  const hasRole = (role: string): boolean => {
    return user?.user_role === role;
  };
  
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.includes(user?.user_role || '');
  };
  
  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    userRole: user?.user_role,
    isDirector: user?.user_role === 'director',
    isAdmin: user?.user_role === 'admin',
    isSalesAdmin: user?.user_role === 'sales-admin',
    isDesigner: user?.user_role === 'designer',
    isAccounts: user?.user_role === 'accounts',
    isTechnician: user?.user_role === 'technician',
  };
};