import React from 'react';
import { 
  Home, 
  Compass, 
  User, 
  Sparkles, 
  Flame, 
  Users, 
  ChevronRight, 
  Scroll, 
  PanelLeftClose,
  LogOut,
  CircleDot,
} from 'lucide-react';
import { useUser } from '../../hooks/useUser.js';
import { useCollections } from '../../hooks/useCollections.ts';
import { features } from '../../config/features.ts';
import { useLogout } from '../../AppRouter.tsx';
import arcaniumLogo from '../../assets/arcanium.png';

export default function DesktopSidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed 
}) {
  const { user } = useUser();
  const { collections } = useCollections();
  const logout = useLogout();

  const navItems = [
    { id: 'home',      label: 'Home',             icon: Home },
    { id: 'explore',   label: 'Discover',          icon: Compass },
    ...(features.aiHousekeeper
      ? [{ id: 'liber', label: 'Liber Companion', icon: Sparkles, badge: 'AI' }]
      : []),
    ...(features.community
      ? [{ id: 'community', label: 'Community', icon: Users }]
      : []),
    ...(features.circles
      ? [{ id: 'circles', label: 'Reading Circles', icon: CircleDot }]
      : []),
    { id: 'profile',   label: 'Scholar Profile',   icon: User },
  ];

  const archivalCodices = collections;

  return (
    <aside 
      className={`${
        collapsed ? 'w-20 px-2.5 py-4' : 'w-68 xl:w-76 p-5'
      } bg-[#FAF8F5] dark:bg-[#15101C] border-r border-[#ECE7DF] dark:border-[#2E243A] flex flex-col justify-between select-none h-screen sticky top-0 overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300 ease-in-out shadow-[2px_0_16px_rgba(0,0,0,0.015)] z-40 flex-shrink-0`}
    >
      {/* Top Section: Navigation & Collections */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Top Header Row */}
        {collapsed ? (
          /* Collapsed Header: Standalone Brand Crest that expands on hover or click */
          <div className="flex flex-col items-center mb-6 w-full pt-1">
            <button
              onMouseEnter={() => setCollapsed(false)}
              onClick={() => setCollapsed(false)}
              title="Hover or click to expand sidebar"
              className="w-12 h-12 rounded-2xl overflow-hidden border border-[#DE9B35]/40 shadow-[0_4px_16px_rgba(67,50,88,0.25)] relative group hover:scale-110 hover:shadow-[0_6px_22px_rgba(67,50,88,0.35)] transition-all duration-200 cursor-pointer"
            >
              <img
                src={arcaniumLogo}
                alt="Arcanium"
                className="w-full h-full object-cover"
              />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#15101C] animate-pulse" />
            </button>
          </div>
        ) : (
          /* Expanded Header: Brand Crest + Title + Collapse Button */
          <div className="flex items-center justify-between py-1 mb-6 w-full">
            <div 
              className="flex items-center gap-3 group cursor-pointer min-w-0" 
              onClick={() => setActiveTab('home')}
              title="Arcanium — The Living Archive"
            >
              <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[#DE9B35]/40 shadow-[0_6px_20px_rgba(67,50,88,0.25)] relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <img
                  src={arcaniumLogo}
                  alt="Arcanium"
                  className="w-full h-full object-cover"
                />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#15101C]" />
              </div>

              <div className="min-w-0">
                <h1 className="font-serif font-bold text-2xl tracking-[0.14em] text-[#342646] dark:text-[#F1ECF7] leading-none truncate">
                  ARCANIUM
                </h1>
                <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#93889F] dark:text-[#8D819A] uppercase mt-1 truncate">
                  THE LIVING ARCHIVE
                </p>
              </div>
            </div>

            {/* Collapse toggle button */}
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse Sidebar"
              className="w-8 h-8 rounded-xl bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] hover:bg-stone-100 dark:hover:bg-[#281F36] flex items-center justify-center text-[#8C8296] dark:text-[#9A8FA7] hover:text-[#43335A] dark:hover:text-white transition-all shadow-2xs active:scale-95 flex-shrink-0 ml-2"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Navigation Menu */}
        <div className="mb-2 w-full">
          {!collapsed && (
            <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#A399AE] dark:text-[#7A6F87] px-3 mb-2">
              Navigation
            </p>
          )}

          <nav className="space-y-1.5 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center transition-all duration-200 group relative ${
                    collapsed
                      ? 'w-11 h-11 mx-auto justify-center rounded-2xl'
                      : 'w-full justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-[13px] font-semibold'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-[#43335A] to-[#55406E] text-white shadow-[0_6px_20px_rgba(67,50,88,0.22)] border border-[#685285]/30 font-bold'
                      : 'text-[#645970] dark:text-[#A69CAF] hover:bg-white dark:hover:bg-[#1E1728] hover:text-[#43335A] dark:hover:text-white hover:border-[#ECE7DF] dark:hover:border-[#352B44] border border-transparent hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${
                      isActive ? 'text-[#FFDE88]' : 'text-[#8A8096] dark:text-[#8E839C] group-hover:text-[#43335A] dark:group-hover:text-white'
                    }`} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isActive 
                        ? 'bg-[#FFDE88] text-[#43335A]' 
                        : 'bg-[#F2EDFA] dark:bg-[#2B2138] text-[#554271] dark:text-[#D1BEE6] border border-[#E1D4F0] dark:border-[#3D3050]'
                    }`}>
                      <Sparkles className="w-2.5 h-2.5" />
                      {item.badge}
                    </span>
                  )}

                  {!collapsed && item.count && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-stone-100 dark:bg-[#2B2138] text-[#8C8296] dark:text-[#A79CB4]'
                    }`}>
                      {item.count}
                    </span>
                  )}

                  {collapsed && isActive && (
                    <span className="absolute right-1 top-1 w-2 h-2 bg-[#FFDE88] rounded-full ring-2 ring-white dark:ring-[#15101C]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Archival Codices / Special Collections */}
        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-[#ECE7DF]/80 dark:border-[#2E243A] animate-fadeIn">
            <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#A399AE] dark:text-[#7A6F87] px-3 mb-2.5 flex items-center justify-between">
              <span>Special Collections</span>
              <Scroll className="w-3 h-3 text-[#B0A6BB] dark:text-[#7A6F87]" />
            </p>

            <div className="space-y-1">
              {archivalCodices.map((c, idx) => (
                <div 
                  key={c.id ?? idx} 
                  onClick={() => setActiveTab(`collection:${c.slug}`)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#70657C] dark:text-[#A69CAF] hover:bg-white dark:hover:bg-[#1E1728] hover:text-[#43335A] dark:hover:text-white cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.coverColor ?? c.color ?? 'bg-purple-400'} ring-2 ring-white dark:ring-[#15101C] shadow-2xs`} />
                    <span className="font-medium group-hover:font-semibold">{c.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#B8AFBF] dark:text-[#645970] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Streak Card strictly above Profile Card */}
      <div className="flex-shrink-0 pt-3 w-full space-y-3">
        {/* 28-Day Reading Streak Talisman Card */}
        <div className="w-full">
          {collapsed ? (
            <div 
              title={`${user.readingStreak}-Day Active Reading Streak (Top 5%)`}
              className="w-11 h-11 mx-auto rounded-2xl bg-gradient-to-br from-[#FAF4E6] to-[#FFF9EE] dark:from-[#261E10] dark:to-[#1D1726] border border-[#F2E4C2] dark:border-[#423318] flex flex-col items-center justify-center cursor-pointer shadow-2xs hover:scale-105 transition-transform"
            >
              <Flame className="w-4 h-4 text-[#DE9B35] fill-[#DE9B35]" />
              <span className="text-[9.5px] font-bold text-[#DE9B35] leading-none mt-0.5">{user.readingStreak}d</span>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-white via-white to-[#FDFBF7] dark:from-[#1E1728] dark:via-[#1E1728] dark:to-[#251D30] rounded-2xl p-3.5 border border-[#ECE5D8] dark:border-[#352B44] shadow-[0_4px_18px_rgba(222,155,53,0.06)] animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#FAF3E6] dark:bg-[#312513] flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-[#DE9B35] fill-[#DE9B35]" />
                  </div>
                  <span className="text-xs font-bold text-[#2D223B] dark:text-[#F1ECF7]">{user.readingStreak} Day Streak</span>
                </div>
                <span className="text-[9.5px] font-bold bg-[#FAF4E6] dark:bg-[#312513] text-[#8E6B23] dark:text-[#FFDE88] border border-[#F2E4C2] dark:border-[#4E3917] px-2 py-0.5 rounded-full">
                  Top 5%
                </span>
              </div>

              <p className="text-[11px] text-[#82798D] dark:text-[#9F94AC] mb-2.5">
                Read today to reach 30-Day Master Milestone!
              </p>

              {/* Weekly Checkpoints */}
              <div className="flex items-center justify-between gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                  // Get actual current day (0 = Sunday, 1 = Monday, etc.)
                  const today = new Date().getDay();
                  // Convert idx to match JavaScript's day numbering (0=Sun, 1=Mon...)
                  const dayIndex = idx === 6 ? 0 : idx + 1; // S=0, M=1, T=2, W=3, T=4, F=5, S=6
                  
                  // Calculate days from today going backwards
                  let daysAgo = (today - dayIndex + 7) % 7;
                  if (daysAgo === 0) daysAgo = 0; // Today
                  
                  const hasCheck = daysAgo < user.readingStreak;
                  const isToday = dayIndex === today;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform ${
                        hasCheck && isToday
                          ? 'bg-[#DE9B35] text-white ring-2 ring-[#DE9B35]/20 scale-110' 
                          : hasCheck
                          ? 'bg-[#43335A] text-white shadow-2xs' 
                          : 'bg-[#EFEAE2] dark:bg-[#2B2138] text-[#968C9E] dark:text-[#7A6F87]'
                      }`}>
                        {hasCheck ? '✓' : ''}
                      </div>
                      <span className="text-[10px] text-[#9D93A5] dark:text-[#7A6F87] font-medium">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="pt-3 border-t border-[#ECE7DF] dark:border-[#2E243A] w-full">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div 
                onClick={() => setActiveTab('profile')}
                title={`${user.displayName} (${user.archiveLevelTitle})`}
                className="w-11 h-11 mx-auto rounded-full overflow-hidden border-2 border-white dark:border-[#2E243A] ring-2 ring-[#43335A]/25 cursor-pointer shadow-2xs hover:scale-105 transition-transform"
              >
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center text-[#8A8296] dark:text-[#7A6F87] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 dark:hover:text-rose-400 active:scale-95 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div 
                onClick={() => setActiveTab('profile')}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-[#1E1728] rounded-2xl border border-[#ECE7DF] dark:border-[#352B44] hover:border-[#D6CFDF] dark:hover:border-[#53436B] hover:shadow-2xs cursor-pointer transition-all group w-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-[#2E243A] ring-2 ring-[#43335A]/25 flex-shrink-0 shadow-2xs">
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#2D223B] dark:text-[#F1ECF7] truncate group-hover:text-[#43335A] dark:group-hover:text-[#D1BEE6]">
                      {user.displayName}
                    </h4>
                    <p className="text-[10px] text-[#857B90] dark:text-[#9F94AC] truncate font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {user.archiveLevelTitle.split(' ').slice(0, 3).join(' ')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A89EAE] dark:text-[#6E637B] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </div>

              {/* Sign out row */}
              <button
                onClick={logout}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-2xl text-xs font-medium text-[#8A8296] dark:text-[#7A6F87] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 active:scale-[0.98] transition-all group border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
              >
                <LogOut className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
