import React, { useState } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  Moon,
  Sun,
  Shield,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui';
import { useAdminStore } from '../../stores/adminStore';
import { useAdminAuthStore } from '../../stores/useAdminAuthStore';
import { useAdminStats } from '../../hooks/useAdminStats';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { activities } = useAdminStats();
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);
  const logout = useAdminAuthStore((s) => s.logout);
  const adminUser = useAdminAuthStore((s) => s.user);

  // Derive initials for the avatar from the real display name
  const initials = adminUser?.displayName
    ? adminUser.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-[#FAF7F2]/90 dark:bg-[#120E1C]/80 backdrop-blur-md border-b border-[#E8E2D8] dark:border-[#2A223D] px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Quick Search */}
      <div className="flex items-center gap-4 w-80 md:w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#9E94AB] dark:text-[#6D6282] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users, tomes, flags, crawlers... (Ctrl + K)"
            className="w-full bg-white dark:bg-[#181326] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] dark:placeholder-[#6D6282] pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500/50 shadow-xs dark:shadow-none transition-colors"
          />
        </div>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">

        {/* System Health Indicator */}
        <div className="relative">
          <button
            onClick={() => setShowHealthModal(!showHealthModal)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#181326] hover:bg-[#F3EFEA] dark:hover:bg-[#211A34] border border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-500/30 rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] shadow-xs dark:shadow-none transition-all cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              99.9% Systems Healthy
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 sm:hidden">
              99.9%
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9E94AB] dark:text-[#9E94B3]" />
          </button>

          {showHealthModal && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#181326] border border-[#E0D9CD] dark:border-[#3B3056] rounded-xl shadow-2xl p-4 z-50 animate-fade-in text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8E2D8] dark:border-[#2A223D] pb-2 font-semibold text-[#2D253A] dark:text-[#F3EFFC]">
                <span>Node Diagnostics</span>
                <Badge variant="success" size="sm">Operational</Badge>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Database Cluster',        value: '3.4ms',  ok: true  },
                  { label: 'Liber Inference Gateway',  value: '420ms',  ok: true  },
                  { label: 'Crawler Sync Cluster',     value: '98.8%',  ok: false },
                  { label: 'Redis Shelf Cache',        value: '0.8ms',  ok: true  },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[#6D6282] dark:text-[#9E94B3]">{label}</span>
                    <span className={`font-mono ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity / Notification Feed */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 bg-white dark:bg-[#181326] hover:bg-[#F3EFEA] dark:hover:bg-[#211A34] border border-[#E8E2D8] dark:border-[#2A223D] text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC] rounded-lg shadow-xs dark:shadow-none transition-colors cursor-pointer"
            title="Activity Log"
          >
            <Bell className="w-4 h-4" />
            {activities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-500 ring-2 ring-white dark:ring-[#120E1C]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#181326] border border-[#E0D9CD] dark:border-[#3B3056] rounded-xl shadow-2xl p-4 z-50 animate-fade-in text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8E2D8] dark:border-[#2A223D] pb-2">
                <span className="font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Recent Operations</span>
                <span className="text-[10px] text-[#9E94AB] dark:text-[#9E94B3]">{activities.length} entries</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-2 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D]">
                    <div className="flex items-center justify-between font-medium text-[#2D253A] dark:text-[#F3EFFC]">
                      <span className="truncate">{act.title}</span>
                      <span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] shrink-0">{act.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#6D6282] dark:text-[#9E94B3] mt-0.5 line-clamp-2">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 bg-white dark:bg-[#181326] hover:bg-[#F3EFEA] dark:hover:bg-[#211A34] border border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-500/40 rounded-lg text-purple-600 dark:text-purple-300 shadow-xs dark:shadow-none transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 hover:rotate-45 transition-transform duration-300 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 hover:-rotate-12 transition-transform duration-300 text-purple-600" />
          )}
        </button>

        {/* Admin Profile + Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E8E2D8] dark:border-[#2A223D]">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-amber-500 p-[1.5px] flex-shrink-0">
            <div className="h-full w-full rounded-full bg-[#FAF7F2] dark:bg-[#120E1C] flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-200 overflow-hidden">
              {adminUser?.avatarUrl ? (
                <img src={adminUser.avatarUrl} alt={adminUser.displayName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] leading-none truncate max-w-[120px]">
              {adminUser?.displayName ?? 'Admin'}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono mt-1 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              {adminUser?.role ?? 'Authorised'}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => { void handleLogout(); }}
            title="Sign out"
            className="ml-1 p-2 text-[#6D6282] dark:text-[#9E94B3] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
