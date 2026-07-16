import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout';

import LoginPage from '@/pages/auth/LoginPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import UsersPage from '@/pages/users/UsersPage';
import UserProfilePage from '@/pages/users/UserProfilePage';
import ReportsPage from '@/pages/reports/ReportsPage';
import RoomsPage from '@/pages/rooms/RoomsPage';
import ModerationLogPage from '@/pages/moderation/ModerationLogPage';

/**
 * Application route tree.
 * 
 * All authenticated routes are nested under <ProtectedRoute /> and <AppLayout />
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public / Standalone Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:uid" element={<UserProfilePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/moderation" element={<ModerationLogPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}