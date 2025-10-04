import { renderHook, act } from '@testing-library/react';
import { useAppStore, usePermissions } from '../../stores/useAppStore';
import { User, Location } from '../../types';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.getState().setUser(null);
    useAppStore.getState().setCurrentLocation(null);
    useAppStore.getState().setPermissions([]);
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.currentLocation).toBeNull();
    expect(result.current.permissions).toEqual([]);
  });

  it('should set user correctly', () => {
    const { result } = renderHook(() => useAppStore());
    const mockUser: User = {
      id: 1,
      email: 'test@vtria.com',
      full_name: 'Test User',
      user_role: 'admin',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should set location correctly', () => {
    const { result } = renderHook(() => useAppStore());
    const mockLocation: Location = {
      id: 1,
      name: 'Mangalore Office',
      city: 'Mangalore',
      state: 'Karnataka',
      address: 'Test Address',
      status: 'active',
    };

    act(() => {
      result.current.setCurrentLocation(mockLocation);
    });

    expect(result.current.currentLocation).toEqual(mockLocation);
  });
});

describe('usePermissions', () => {
  beforeEach(() => {
    useAppStore.getState().setUser(null);
    useAppStore.getState().setPermissions([]);
  });

  it('should return correct permissions for director', () => {
    const mockUser: User = {
      id: 1,
      email: 'director@vtria.com',
      full_name: 'Director',
      user_role: 'director',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    useAppStore.getState().setUser(mockUser);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isDirector).toBe(true);
    expect(result.current.hasPermission('any-permission')).toBe(true);
    expect(result.current.hasRole('director')).toBe(true);
  });

  it('should return correct permissions for specific roles', () => {
    const mockUser: User = {
      id: 2,
      email: 'designer@vtria.com',
      full_name: 'Designer',
      user_role: 'designer',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    useAppStore.getState().setUser(mockUser);
    useAppStore.getState().setPermissions(['create_estimation', 'view_products']);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isDesigner).toBe(true);
    expect(result.current.hasPermission('create_estimation')).toBe(true);
    expect(result.current.hasPermission('delete_enquiry')).toBe(false);
    expect(result.current.hasAnyRole(['designer', 'admin'])).toBe(true);
  });
});