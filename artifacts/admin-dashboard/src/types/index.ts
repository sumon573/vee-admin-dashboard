/**
 * Application-wide TypeScript type definitions.
 * Feature-specific types that are not shared should live next to their feature.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Auth & User
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'superAdmin' | 'admin' | 'moderator' | 'user';

export const ADMIN_ROLES: UserRole[] = ['superAdmin', 'admin'];

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  /** Vanity ID shown publicly */
  vId?: string;
  country?: string;
  bio?: string;
  role: UserRole;
  photoURL?: string;
  diamonds: number;
  wallet: number;
  online: boolean;
  banned: boolean;
  createdAt: number;
  /** Friend UIDs keyed to true */
  friends?: Record<string, true>;
  /** Follower UIDs keyed to true */
  followers?: Record<string, true>;
  /** Following UIDs keyed to true */
  following?: Record<string, true>;
  /** Joined room IDs keyed to true */
  roomsJoined?: Record<string, true>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reportedUid: string;
  reportedByUid: string;
  reason: string;
  status: ReportStatus;
  timestamp: number;
  moderatorNote?: string;
  resolvedBy?: string;
  resolvedAt?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Rooms
// ─────────────────────────────────────────────────────────────────────────────

export interface Seat {
  index: number;
  locked: boolean;
  uid?: string;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  ownerName?: string;
  active: boolean;
  createdAt: number;
  /** Member UIDs keyed to true */
  members?: Record<string, true>;
  seats?: Seat[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Moderation
// ─────────────────────────────────────────────────────────────────────────────

export interface ModerationLogEntry {
  id: string;
  moderatorUid: string;
  moderatorName: string;
  action: string;
  targetUid: string;
  targetName: string;
  timestamp: number;
  details?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  bannedUsers: number;
  newUsersToday: number;
  totalRooms: number;
  activeRooms: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// User listing options
// ─────────────────────────────────────────────────────────────────────────────

export type UserFilter =
  | 'all'
  | 'online'
  | 'offline'
  | 'admin'
  | 'moderator'
  | 'user'
  | 'banned';

export type UserSort = 'newest' | 'oldest' | 'diamonds' | 'wallet';

export interface UseUsersOptions {
  search?: string;
  filter?: UserFilter;
  sort?: UserSort;
  page?: number;
  pageSize?: number;
}

export interface PaginatedUsers {
  users: AppUser[];
  total: number;
  pages: number;
  currentPage: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/** Navigation item used in the Sidebar. */
export interface NavItem {
  label: string;
  href: string;
  icon?: import('react').ComponentType<{ className?: string }>;
  badge?: number;
  roles?: UserRole[];
}
