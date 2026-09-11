import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/useAdminAuthStore';

/**
 * Route guard that wraps all protected admin routes.
 *
 * On first mount it attempts a silent token refresh so a page reload does not
 * immediately log the admin out — the httpOnly refresh cookie is exchanged for
 * a new access token transparently.
 *
 * If the admin is not authenticated (and the silent refresh has either completed
 * or been skipped), they are redirected to /login.
 */
export const RequireAdminAuth: React.FC = () => {
  const { isAuthenticated, silentRefresh } = useAdminAuthStore();
  const refreshAttempted = useRef(false);
  const [refreshing, setRefreshing] = React.useState(!isAuthenticated);

  useEffect(() => {
    // Only attempt once per mount cycle — avoid double-firing in StrictMode.
    if (refreshAttempted.current || isAuthenticated) {
      setRefreshing(false);
      return;
    }
    refreshAttempted.current = true;

    void silentRefresh().finally(() => setRefreshing(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // While the silent refresh is in-flight, show a minimal full-screen loader
  // rather than flashing the login page to an already-authenticated admin.
  if (refreshing) {
    return (
      <div className="min-h-screen bg-[#0A0712] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6D6282]">
          <svg
            className="animate-spin h-5 w-5 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Restoring session…</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
