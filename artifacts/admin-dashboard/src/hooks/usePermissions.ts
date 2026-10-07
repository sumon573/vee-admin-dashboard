import { useAppAuth } from '@/contexts/AuthContext';
import { hasPermission, ROLE_PERMISSIONS, type Permission } from '@/lib/permissions';
import type { UserRole } from '@/types';

/**
 * Hook to check current user's permissions.
 * 
 * @example
 * const { can, role, isSuperAdmin } = usePermissions();
 * if (can('canBanUser')) { ... }
 */
export function usePermissions() {
  const { appUser } = useAppAuth();
  const role: UserRole = appUser?.role || 'user';
  
  const can = (permission: keyof Permission): boolean => {
    return hasPermission(role, permission);
  };
  
  return {
    role,
    can,
    permissions: ROLE_PERMISSIONS[role],
    isSuperAdmin: role === 'superAdmin',
    isAdmin: role === 'admin' || role === 'superAdmin',
    isModerator: role === 'moderator' || role === 'admin' || role === 'superAdmin',
  };
}
