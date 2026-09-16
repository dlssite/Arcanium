import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Feather,
  Ban,
  UserCheck,
  Flame,
  Clock,
  BookOpen,
  MoreVertical,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useUserManagement } from '../hooks/useUserManagement';
import { AdminUser, UserRole, UserStatus } from '../types';
import { Card, Badge, Button, Input, Select, Modal } from '../components/ui';

export const UsersPage: React.FC = () => {
  const {
    users,
    allUsersCount,
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
  } = useUserManagement();

  const [inspectModalUser, setInspectModalUser] = useState<AdminUser | null>(null);

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'purple';
      case 'VERIFIED_WRITER':
        return 'amber';
      case 'MODERATOR':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'warning';
      case 'BANNED':
        return 'error';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">
            User Directory
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Manage readers, verified creators, moderators, and account sanctions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="md">
            {isLoading ? 'Loading…' : `${users.length} of ${allUsersCount} Users Displayed`}
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by username, display name, or email..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
              options={[
                { label: 'All Roles', value: 'ALL' },
                { label: 'Readers (User)', value: 'USER' },
                { label: 'Verified Writers', value: 'VERIFIED_WRITER' },
                { label: 'Moderators', value: 'MODERATOR' },
                { label: 'Admins', value: 'ADMIN' },
              ]}
            />
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | UserStatus)}
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Suspended', value: 'SUSPENDED' },
                { label: 'Banned', value: 'BANNED' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Users Data Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF7F2] dark:bg-[#120E1C] border-b border-[#E8E2D8] dark:border-[#2A223D] text-[11px] uppercase tracking-wider text-[#9E94AB] dark:text-[#6D6282] font-semibold">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Streak</th>
                <th className="py-3.5 px-4">Reading Hours</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8] dark:divide-[#2A223D] text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#E8E2D8] dark:bg-[#2A223D] shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" />
                          <div className="h-2.5 w-40 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4"><div className="h-5 w-20 bg-[#E8E2D8] dark:bg-[#2A223D] rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-16 bg-[#E8E2D8] dark:bg-[#2A223D] rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="h-3 w-24 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-3 w-16 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" /></td>
                    <td className="py-3.5 px-4" />
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-rose-500 dark:text-rose-400 text-xs">
                    Failed to load users. Check the API connection and try refreshing.
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D6282] dark:text-[#9E94B3]">
                    No users matching the current search & filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="table-row-hover">
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-800 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                          {u.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <button
                            onClick={() => setInspectModalUser(u)}
                            className="font-semibold text-[#2D253A] dark:text-[#F3EFFC] hover:text-purple-600 dark:hover:text-purple-300 transition-colors text-left truncate block cursor-pointer"
                          >
                            {u.displayName}
                          </button>
                          <div className="text-[11px] text-[#6D6282] dark:text-[#9E94B3] truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(u.status)} size="sm" dot>
                        {u.status}
                      </Badge>
                    </td>

                    {/* Level & Streak */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{u.streakDays}d</span>
                        </div>
                      </div>
                    </td>

                    {/* Reading Hours */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[#2D253A] dark:text-[#F3EFFC]">
                      {u.totalReadingHours} hrs
                      <span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] block">
                        {u.booksRead} books read
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectModalUser(u)}
                          className="text-xs text-purple-700 dark:text-purple-300"
                        >
                          Details
                        </Button>

                        {u.role !== 'VERIFIED_WRITER' && u.role !== 'ADMIN' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => grantVerifiedWriter(u.id)}
                            icon={<Feather className="w-3 h-3 text-amber-500" />}
                            className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                            title="Promote to Verified Writer"
                          >
                            Verify
                          </Button>
                        )}

                        <Button
                          variant={u.status === 'BANNED' ? 'outline' : 'danger'}
                          size="sm"
                          onClick={() => toggleUserBan(u.id)}
                          icon={<Ban className="w-3 h-3" />}
                          className="text-xs"
                          title={u.status === 'BANNED' ? 'Unban user' : 'Ban user'}
                        >
                          {u.status === 'BANNED' ? 'Unban' : 'Ban'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Details Modal */}
      {inspectModalUser && (
        <Modal
          isOpen={true}
          onClose={() => setInspectModalUser(null)}
          title={`User Profile: ${inspectModalUser.displayName}`}
          subtitle={`Account ID: ${inspectModalUser.id} • Registered ${new Date(inspectModalUser.joinedAt).toLocaleDateString()}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toggleUserSuspend(inspectModalUser.id);
                    setInspectModalUser({
                      ...inspectModalUser,
                      status: inspectModalUser.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                    });
                  }}
                >
                  {inspectModalUser.status === 'SUSPENDED' ? 'Lift Suspension' : 'Suspend 7 Days'}
                </Button>
                <Button
                  variant={inspectModalUser.status === 'BANNED' ? 'outline' : 'danger'}
                  size="sm"
                  onClick={() => {
                    toggleUserBan(inspectModalUser.id);
                    setInspectModalUser({
                      ...inspectModalUser,
                      status: inspectModalUser.status === 'BANNED' ? 'ACTIVE' : 'BANNED',
                    });
                  }}
                >
                  {inspectModalUser.status === 'BANNED' ? 'Lift Ban' : 'Permanent Ban'}
                </Button>
              </div>

              <Button variant="secondary" size="sm" onClick={() => setInspectModalUser(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Quick stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D]">
                <div className="text-[10px] text-[#6D6282] dark:text-[#9E94B3] uppercase font-semibold">Reading Hours</div>
                <div className="text-lg font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono mt-1">
                  {inspectModalUser.totalReadingHours}
                </div>
              </div>

              <div className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D]">
                <div className="text-[10px] text-[#6D6282] dark:text-[#9E94B3] uppercase font-semibold">Streak</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-1 flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-current" />
                  {inspectModalUser.streakDays}d
                </div>
              </div>

              <div className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D]">
                <div className="text-[10px] text-[#6D6282] dark:text-[#9E94B3] uppercase font-semibold">Shelves</div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono mt-1">
                  {inspectModalUser.shelfCount}
                </div>
              </div>

              <div className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D]">
                <div className="text-[10px] text-[#6D6282] dark:text-[#9E94B3] uppercase font-semibold">Total XP</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-1">
                  {inspectModalUser.totalXp || 0}
                </div>
              </div>
            </div>

            {/* Role Modifier Dropdown */}
            <div className="p-3.5 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] space-y-2">
              <label className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] block">
                Assign System Role
              </label>
              <div className="flex items-center gap-3">
                <Select
                  value={inspectModalUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setUserRole(inspectModalUser.id, newRole);
                    setInspectModalUser({ ...inspectModalUser, role: newRole });
                  }}
                  options={[
                    { label: 'Reader (Default User)', value: 'USER' },
                    { label: 'Verified Writer', value: 'VERIFIED_WRITER' },
                    { label: 'Moderator', value: 'MODERATOR' },
                    { label: 'Administrator', value: 'ADMIN' },
                  ]}
                />
              </div>
            </div>

            {/* Notes */}
            {inspectModalUser.notes && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 rounded-lg text-xs text-purple-800 dark:text-purple-200">
                <span className="font-semibold block mb-1">Administrative Note:</span>
                {inspectModalUser.notes}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
