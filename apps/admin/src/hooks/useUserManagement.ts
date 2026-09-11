import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';
import type { AdminUser, UserRole, UserStatus } from '../types';

// ---------------------------------------------------------------------------
// Shape adapter
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAdminUser(u: any): AdminUser {
  return {
    id:                u.id,
    email:             u.email,
    username:          u.username,
    displayName:       u.displayName,
    avatarUrl:         u.avatarUrl,
    role:              u.role       as UserRole,
    status:            u.status     as UserStatus,
    streakDays:        u.streakDays        ?? 0,
    totalReadingHours: u.totalReadingHours ?? 0,
    shelfCount:        u.shelfCount        ?? 0,
    booksRead:         u.booksRead         ?? 0,
    archiveLevel:      u.archiveLevel      ?? 1,
    joinedAt:          u.joinedAt,
    lastActiveAt:      u.lastActiveAt,
    emailVerified:     u.emailVerified     ?? true,
    notes:             u.notes,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUserManagement() {
  const queryClient    = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  const [searchQuery, setSearchQuery]   = useState('');
  const [roleFilter, setRoleFilter]     = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // ── Server state ──────────────────────────────────────────────────────────
  // Disabled until the auth store confirms we have a valid token so the first
  // request is never sent without an Authorization header.

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', searchQuery, roleFilter, statusFilter],
    enabled:  isAuthenticated,
    queryFn:  async () => {
      const res = await adminApi.getUsers({
        search: searchQuery.trim() || undefined,
        role:   roleFilter   !== 'ALL' ? roleFilter   : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit:  50,
      });
      // Throw on API-level errors so TanStack Query sets isError = true
      if (res.error) throw new Error(res.error.message ?? 'Failed to fetch users');
      return res;
    },
    placeholderData: (prev) => prev,
  });

  const users: AdminUser[] = useMemo(
    () => (data?.data?.users ?? []).map(toAdminUser),
    [data],
  );

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: invalidateUsers,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: invalidateUsers,
  });

  // ── Action helpers ────────────────────────────────────────────────────────

  const toggleUserBan = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    statusMutation.mutate({ id: userId, status: user.status === 'BANNED' ? 'ACTIVE' : 'BANNED' });
  };

  const toggleUserSuspend = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    statusMutation.mutate({ id: userId, status: user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' });
  };

  const grantVerifiedWriter = (userId: string) => {
    roleMutation.mutate({ id: userId, role: 'VERIFIED_WRITER' });
  };

  const setUserRole = (userId: string, role: UserRole) => {
    roleMutation.mutate({ id: userId, role });
  };

  return {
    users,
    allUsersCount: data?.data?.total ?? users.length,
    isLoading,
    isError,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    selectedUser,
    setSelectedUser,
    toggleUserBan,
    toggleUserSuspend,
    grantVerifiedWriter,
    setUserRole,
  };
}
