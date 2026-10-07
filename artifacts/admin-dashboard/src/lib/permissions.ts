import type { UserRole } from '@/types';

/**
 * Role hierarchy and permissions system.
 * 
 * Hierarchy (highest to lowest):
 * 1. superAdmin - App owner (Sumon). Has ALL powers. Cannot be created/demoted by anyone except themselves.
 * 2. admin - Can manage users, content, wallet. CANNOT change roles, CANNOT touch superAdmin.
 * 3. moderator - Can moderate content, handle reports. CANNOT manage wallet, CANNOT change roles.
 * 4. user - Regular app user, no admin panel access.
 */

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superAdmin: 100,
  admin: 50,
  moderator: 25,
  user: 0,
};

export interface Permission {
  // User management
  canViewUsers: boolean;
  canBanUser: boolean;
  canUnbanUser: boolean;
  canChangeRole: boolean;
  canChangeToSuperAdmin: boolean;
  
  // Wallet
  canViewWallet: boolean;
  canAddDiamonds: boolean;
  canRemoveDiamonds: boolean;
  
  // Honors & Gifts
  canManageHonors: boolean;
  canGrantHonor: boolean;
  canManageGifts: boolean;
  
  // Broadcast
  canSendBroadcast: boolean;
  
  // Monitoring & Reports
  canViewMonitoring: boolean;
  canViewReports: boolean;
  canHandleReports: boolean;
  
  // System
  canViewAuditLogs: boolean;
  canManageFeatureFlags: boolean;
  canManageMaintenance: boolean;
}

const BASE_PERMISSIONS: Permission = {
  canViewUsers: false,
  canBanUser: false,
  canUnbanUser: false,
  canChangeRole: false,
  canChangeToSuperAdmin: false,
  canViewWallet: false,
  canAddDiamonds: false,
  canRemoveDiamonds: false,
  canManageHonors: false,
  canGrantHonor: false,
  canManageGifts: false,
  canSendBroadcast: false,
  canViewMonitoring: false,
  canViewReports: false,
  canHandleReports: false,
  canViewAuditLogs: false,
  canManageFeatureFlags: false,
  canManageMaintenance: false,
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  superAdmin: {
    // Super Admin has ALL permissions
    canViewUsers: true,
    canBanUser: true,
    canUnbanUser: true,
    canChangeRole: true,
    canChangeToSuperAdmin: true,
    canViewWallet: true,
    canAddDiamonds: true,
    canRemoveDiamonds: true,
    canManageHonors: true,
    canGrantHonor: true,
    canManageGifts: true,
    canSendBroadcast: true,
    canViewMonitoring: true,
    canViewReports: true,
    canHandleReports: true,
    canViewAuditLogs: true,
    canManageFeatureFlags: true,
    canManageMaintenance: true,
  },
  admin: {
    ...BASE_PERMISSIONS,
    canViewUsers: true,
    canBanUser: true,
    canUnbanUser: true,
    // CANNOT change roles - only superAdmin can
    canChangeRole: false,
    canChangeToSuperAdmin: false,
    canViewWallet: true,
    canAddDiamonds: true,
    canRemoveDiamonds: true,
    canManageHonors: true,
    canGrantHonor: true,
    canManageGifts: true,
    canSendBroadcast: true,
    canViewMonitoring: true,
    canViewReports: true,
    canHandleReports: true,
    canViewAuditLogs: true,
    // CANNOT manage feature flags or maintenance - only superAdmin
    canManageFeatureFlags: false,
    canManageMaintenance: false,
  },
  moderator: {
    ...BASE_PERMISSIONS,
    canViewUsers: true,
    canBanUser: true,
    canUnbanUser: false,
    canChangeRole: false,
    canChangeToSuperAdmin: false,
    canViewWallet: false,
    canAddDiamonds: false,
    canRemoveDiamonds: false,
    canManageHonors: false,
    canGrantHonor: false,
    canManageGifts: false,
    canSendBroadcast: false,
    canViewMonitoring: true,
    canViewReports: true,
    canHandleReports: true,
    canViewAuditLogs: false,
    canManageFeatureFlags: false,
    canManageMaintenance: false,
  },
  user: { ...BASE_PERMISSIONS },
};

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Check if actor can modify target's role.
 * Rules:
 * - Only superAdmin can change roles
 * - No one can change a superAdmin's role (except themselves)
 * - Cannot promote anyone to superAdmin except by existing superAdmin
 */
export function canModifyRole(actorRole: UserRole, targetRole: UserRole, newRole: UserRole): boolean {
  // Only superAdmin can change roles at all
  if (actorRole !== 'superAdmin') return false;
  
  // Cannot demote/change another superAdmin (only themselves)
  // This is checked by UID in the service layer
  
  // SuperAdmin can assign any role
  return true;
}

/**
 * Check if actor can perform action on target based on hierarchy.
 * Higher roles can act on lower roles. Same level cannot act on each other.
 * No one can act on superAdmin except superAdmin themselves.
 */
export function canActOn(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === 'superAdmin' && actorRole !== 'superAdmin') return false;
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get role display name.
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    superAdmin: 'Super Admin',
    admin: 'Admin',
    moderator: 'Moderator',
    user: 'User',
  };
  return names[role];
}

/**
 * Get role badge color.
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    superAdmin: 'bg-purple-100 text-purple-800 border-purple-300',
    admin: 'bg-blue-100 text-blue-800 border-blue-300',
    moderator: 'bg-green-100 text-green-800 border-green-300',
    user: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return colors[role];
}
