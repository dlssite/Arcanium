import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Feather,
  Sparkles,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  Library,
  MessageSquare,
  ImageIcon,
  Trophy,
  CircleDot,
  Link2,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { useCreatorVerification } from '../../hooks/useCreatorVerification';
import { Badge } from '../ui';
import arcaniumLogo from '../../../arcanium.png';

export const Sidebar: React.FC = () => {
  const sidebarCollapsed = useAdminStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAdminStore((s) => s.toggleSidebar);

  // Live pending count from the real API — replaces the stale Zustand mock store
  const { pendingCount } = useCreatorVerification();

  const navItems = [
    {
      label: 'Overview',
      path: '/',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'User Management',
      path: '/users',
      icon: <Users className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Content Catalog',
      path: '/content',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Verified Writers',
      path: '/creators',
      icon: <Feather className="w-5 h-5 shrink-0" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: 'Reviews',
      path: '/reviews',
      icon: <MessageSquare className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'AI Liber Analytics',
      path: '/ai-liber',
      icon: <Sparkles className="w-5 h-5 shrink-0 text-purple-600 dark:text-purple-400" />,
    },
    {
      label: 'Honors & Badges',
      path: '/honors',
      icon: <Award className="w-5 h-5 shrink-0 text-amber-500 dark:text-amber-400" />,
    },
    {
      label: 'Special Collections',
      path: '/collections',
      icon: <Library className="w-5 h-5 shrink-0 text-purple-500 dark:text-purple-400" />,
    },
    {
      label: 'Reading Circles',
      path: '/circles',
      icon: <CircleDot className="w-5 h-5 shrink-0 text-purple-500 dark:text-purple-400" />,
    },
    {
      label: 'Default Avatars',
      path: '/avatars',
      icon: <ImageIcon className="w-5 h-5 shrink-0 text-pink-500 dark:text-pink-400" />,
    },
    {
      label: 'Ranks & XP',
      path: '/ranks',
      icon: <Trophy className="w-5 h-5 shrink-0 text-amber-500 dark:text-amber-400" />,
    },
    {
      label: 'Connect Cards',
      path: '/connect',
      icon: <Link2 className="w-5 h-5 shrink-0 text-blue-500 dark:text-blue-400" />,
    },
    {
      label: 'Feature Flags',
      path: '/settings',
      icon: <Sliders className="w-5 h-5 shrink-0" />,
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#FAF7F2] dark:bg-[#120E1C] border-r border-[#E8E2D8] dark:border-[#2A223D] flex flex-col transition-all duration-300 ease-in-out select-none ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Floating Toggle Button on Edge */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3.5 top-6 z-50 h-7 w-7 rounded-full bg-white dark:bg-[#181326] border border-[#E0D9CD] dark:border-[#3B3056] text-[#6D6282] dark:text-[#9E94B3] hover:text-purple-600 dark:hover:text-[#F3EFFC] shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
        title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>

      {/* Brand Header */}
      <div
        className={`h-16 border-b border-[#E8E2D8] dark:border-[#2A223D] flex items-center transition-all ${
          sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-4 gap-3'
        }`}
      >
        <div className="h-9 w-9 rounded-lg overflow-hidden border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.35)] shrink-0">
          <img src={arcaniumLogo} alt="Arcanium" className="h-full w-full object-cover" />
        </div>

        {!sidebarCollapsed && (
          <div className="truncate flex-1">
            <span className="font-serif font-bold text-base text-[#2D253A] dark:text-[#F3EFFC] tracking-wide block leading-tight">
              ARCANIUM
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-purple-600 dark:text-purple-400 font-semibold block">
              Command Plane
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto no-scrollbar">
        {!sidebarCollapsed && (
          <div className="px-2.5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E94AB] dark:text-[#6D6282]">
              Navigation
            </span>
          </div>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group relative rounded-xl transition-all duration-150 ${
                sidebarCollapsed
                  ? 'flex items-center justify-center h-11 w-11 mx-auto my-1'
                  : 'flex items-center gap-3 px-3 py-2.5 my-0.5 text-sm font-medium'
              } ${
                isActive
                  ? 'bg-purple-600/10 text-purple-700 border border-purple-500/25 shadow-sm dark:bg-purple-600/15 dark:text-purple-200 dark:border-purple-500/30 dark:shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`
            }
          >
            {item.icon}

            {/* Badge Indicator in Collapsed Mode */}
            {sidebarCollapsed && item.badge !== undefined && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black ring-2 ring-[#FAF7F2] dark:ring-[#120E1C]">
                {item.badge}
              </span>
            )}

            {/* Label in Expanded Mode */}
            {!sidebarCollapsed && (
              <>
                <span className="truncate flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <Badge variant="amber" size="sm">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}

            {/* Rich Hover Tooltip in Collapsed Mode */}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-white dark:bg-[#181326] border border-[#E0D9CD] dark:border-[#3B3056] text-[#2D253A] dark:text-[#F3EFFC] text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <Badge variant="amber" size="sm">
                    {item.badge}
                  </Badge>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-[#E8E2D8] dark:border-[#2A223D]">
        {!sidebarCollapsed ? (
          <div className="p-3 bg-white dark:bg-[#181326] border border-[#E8E2D8] dark:border-[#2A223D] rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#6D6282] dark:text-[#9E94B3]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Plane Status</span>
              </div>
              <Badge variant="success" size="sm" dot>
                Online
              </Badge>
            </div>
            <div className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] font-mono">
              Arcanium Core 2.4.0
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-white dark:bg-[#181326] border border-[#E8E2D8] dark:border-[#2A223D] group relative cursor-pointer"
            title="System Operational"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse" />
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-[#181326] border border-[#E0D9CD] dark:border-[#3B3056] text-[#2D253A] dark:text-[#F3EFFC] text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Core 2.4.0 • Operational
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
