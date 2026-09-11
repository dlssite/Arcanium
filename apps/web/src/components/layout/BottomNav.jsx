import React from 'react';
import { Home, Compass, User, Sparkles, Users } from 'lucide-react';
import { avatarImg } from '../../mocks/mockData.js';
import { useUser } from '../../hooks/useUser.js';
import { features } from '../../config/features.ts';

export default function BottomNav({ activeTab, setActiveTab }) {
  const { hasUnreadNotifications } = useUser();

  const navItems = [
    { id: 'home',      label: 'Home',      icon: Home },
    { id: 'explore',   label: 'Discover',  icon: Compass },
    // Liber special button — only shown when AI housekeeper flag is on
    ...(features.aiHousekeeper
      ? [{ id: 'liber', label: 'Liber', special: true }]
      : []),
    // Community tab — only shown when community flag is on
    ...(features.community
      ? [{ id: 'community', label: 'Community', icon: Users }]
      : []),
    { id: 'profile',   label: 'Profile',   icon: User },
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-0 right-0 z-50 px-4 pointer-events-none flex justify-center lg:hidden">
      {/* Sleek Floating Icon-Only Pill Tab Bar (90vw Spanning) */}
      <nav 
        aria-label="Mobile Navigation"
        className="pointer-events-auto w-[90vw] max-w-md bg-white/90 dark:bg-[#161020]/90 backdrop-blur-xl rounded-full border border-[#EDE7DF]/90 dark:border-[#332742]/90 px-3 sm:px-5 py-2 shadow-[0_12px_36px_-6px_rgba(40,25,60,0.14),0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.7)] transition-all duration-300"
      >
        <div className="flex items-center justify-between w-full relative px-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            if (item.special) {
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-label="Liber Archival Companion"
                  title="Liber Archival Companion"
                  className="relative -top-2 flex items-center justify-center group transition-all duration-200 active:scale-95 focus:outline-none px-0.5"
                >
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 transition-all duration-300 shadow-md ${
                    isActive 
                      ? 'bg-gradient-to-tr from-[#DE9B35] via-[#684C8B] to-[#43335A] ring-4 ring-[#EAE4F2] dark:ring-[#38264E] scale-110 shadow-purple-950/30' 
                      : 'bg-gradient-to-tr from-[#55406E] via-[#664C85] to-[#7B5B9F] group-hover:scale-105 shadow-stone-400/20'
                  }`}>
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/90 dark:border-[#1E1728] flex items-center justify-center bg-[#43335A] relative">
                      <img 
                        src={avatarImg} 
                        alt="Liber" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#DE9B35] rounded-full border border-white dark:border-[#161020] flex items-center justify-center shadow-xs">
                        <Sparkles className="w-1.5 h-1.5 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            }

            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-200 active:scale-90 focus:outline-none ${
                  isActive 
                    ? 'text-[#43335A] dark:text-[#FFDE88]' 
                    : 'text-[#8C8296] dark:text-[#90849C] hover:text-[#43335A] dark:hover:text-stone-200'
                }`}
              >
                {/* Active Circular Highlight */}
                {isActive && (
                  <span className="absolute inset-0 bg-[#F2EDFA] dark:bg-[#2B2038] rounded-full -z-10 scale-100 transition-all duration-200 border border-[#E3D8F0] dark:border-[#3D2D50]" />
                )}

                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive 
                      ? 'stroke-[2.3] scale-105' 
                      : 'stroke-[1.8] group-hover:scale-105'
                  }`}
                />

                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-[#43335A] dark:bg-[#FFDE88] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
