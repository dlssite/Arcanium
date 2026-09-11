import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Headphones, 
  Volume2,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  X,
} from 'lucide-react';
import { useUser } from '../../hooks/useUser.js';
import { useReaderStore } from '../../stores/useReaderStore.ts';
import { useLogout } from '../../AppRouter.tsx';
import { useExploreStore } from '../../stores/useExploreStore.js';

export default function DesktopHeader({ 
  activeTab,
  theme,
  setTheme
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, hasUnreadNotifications, clearNotifications } = useUser();
  const logout = useLogout();
  const navigate = useNavigate();

  // Search
  const setSearchQuery = useExploreStore((s) => s.setSearchQuery);
  const storeSearch    = useExploreStore((s) => s.searchQuery);
  const [localSearch, setLocalSearch] = useState(storeSearch);
  const debounceRef = useRef(null);

  // Keep local input in sync when store is cleared externally (e.g. leaving Explore)
  useEffect(() => { setLocalSearch(storeSearch); }, [storeSearch]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setLocalSearch(val);
    // Debounce: update store + navigate after 350ms of no typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val);
      if (val.trim()) navigate('/explore');
    }, 350);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      setSearchQuery(localSearch);
      if (localSearch.trim()) navigate('/explore');
    }
    if (e.key === 'Escape') {
      clearTimeout(debounceRef.current);
      setLocalSearch('');
      setSearchQuery('');
    }
  }

  function clearSearch() {
    clearTimeout(debounceRef.current);
    setLocalSearch('');
    setSearchQuery('');
  }

  // isPlaying now comes from useReaderStore — no props needed
  const isPlaying = useReaderStore((s) => s.isPlaying);
  const togglePlaying = useReaderStore((s) => s.togglePlaying);

  const pageTitles = {
    home: 'Dashboard',
    explore: 'Discover',
    liber: 'Liber the Librarian',
    community: 'Community',
    profile: 'Scholar Profile & Library',
  };

  const currentTitle = pageTitles[activeTab] || 'Dashboard';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#15101C]/95 backdrop-blur-md border-b border-[#ECE7DF] dark:border-[#2E243A] px-6 lg:px-8 py-3.5 flex items-center justify-between select-none transition-colors duration-200">
      {/* Left: Clean Page Title Only */}
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#2E233D] dark:text-[#F1ECF7] tracking-tight leading-none">
            {currentTitle}
          </h1>
        </div>

        {/* Search Omnibar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="bg-white dark:bg-[#1E1728] rounded-full border border-[#ECE7DF] dark:border-[#352B44] px-4 py-2 flex items-center gap-2.5 shadow-2xs focus-within:border-[#51406B] dark:focus-within:border-[#8E72B8] focus-within:ring-2 focus-within:ring-purple-900/10 transition-all">
            <Search className="w-4 h-4 text-[#8C8296] dark:text-[#9A8FA7] flex-shrink-0" />
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search manuscripts, scrolls, authors, or topics..."
              aria-label="Search"
              className="w-full bg-transparent text-xs text-[#2D223B] dark:text-[#F1ECF7] outline-none placeholder-[#A096AA] dark:placeholder-[#7E748B]"
            />
            {localSearch ? (
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="text-[#8C8296] dark:text-[#9A8FA7] hover:text-[#43335A] dark:hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-block bg-stone-100 dark:bg-[#2B2138] text-[10px] text-[#80778B] dark:text-[#A79CB4] font-mono px-2 py-0.5 rounded border border-stone-200 dark:border-[#3A2F4B] flex-shrink-0">
                ⌘K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] shadow-2xs flex items-center justify-center text-[#43335A] dark:text-[#FFDE88] hover:bg-stone-50 dark:hover:bg-[#281F36] active:scale-95 transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#FFDE88] animate-soft-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-[#43335A]" />
          )}
        </button>


        {/* Audio Player Quick Button (Icon-Only) */}
        <button
          onClick={togglePlaying}
          title={isPlaying ? 'Pause Narration' : 'Play Audio Narration'}
          aria-label={isPlaying ? 'Pause Narration' : 'Play Audio Narration'}
          className={`w-10 h-10 rounded-full border shadow-2xs flex items-center justify-center active:scale-95 transition-all ${
            isPlaying 
              ? 'bg-[#43335A] text-white border-transparent shadow-purple-950/20' 
              : 'bg-white dark:bg-[#1E1728] text-[#43335A] dark:text-[#E2D9EC] border-[#ECE7DF] dark:border-[#352B44] hover:bg-stone-50 dark:hover:bg-[#281F36]'
          }`}
        >
          {isPlaying ? (
            <Volume2 className="w-4 h-4 animate-pulse text-[#FFDE88]" />
          ) : (
            <Headphones className="w-4 h-4 text-[#8C8296] dark:text-[#9A8FA7]" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              if (!showNotifications && hasUnreadNotifications) clearNotifications();
            }}
            aria-label="Notifications"
            className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] shadow-2xs flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] hover:bg-stone-50 dark:hover:bg-[#281F36] active:scale-95 transition-all relative"
          >
            <Bell className="w-4 h-4 stroke-[2]" />
            {hasUnreadNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#1E1728]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1E1728] rounded-2xl shadow-xl border border-[#ECE7DF] dark:border-[#352B44] p-3.5 z-50 animate-fadeIn text-[#2D223B] dark:text-[#F1ECF7]">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-[#2C2237]">
                <span className="text-xs font-bold">Archival Notices</span>
                {hasUnreadNotifications && (
                  <span className="text-[10px] text-[#80778B] dark:text-[#9E93AA]">New</span>
                )}
              </div>
              <div className="divide-y divide-stone-100 dark:divide-[#2C2237] text-xs mt-1">
                <div className="py-2">
                  <p className="font-semibold text-[#43335A] dark:text-[#D1BEE6]">Liber recommended a tome</p>
                  <p className="text-[11px] text-[#80778B] dark:text-[#9E93AA] mt-0.5">"The Memory Stars" is ready in your queue.</p>
                </div>
                <div className="py-2">
                  <p className="font-semibold text-[#DE9B35]">28 Day Reading Streak!</p>
                  <p className="text-[11px] text-[#80778B] dark:text-[#9E93AA] mt-0.5">Keep reading today to reach milestone 30.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu((v) => !v); setShowNotifications(false); }}
            aria-label="User menu"
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] shadow-2xs hover:border-[#D6CFDF] dark:hover:border-[#53436B] active:scale-95 transition-all"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white dark:border-[#2E243A] ring-1 ring-[#43335A]/20 flex-shrink-0">
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            </div>
            <ChevronDown className={`w-3 h-3 text-[#8C8296] dark:text-[#9A8FA7] transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              {/* Click-outside overlay */}
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} aria-hidden="true" />
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1E1728] rounded-2xl shadow-xl border border-[#ECE7DF] dark:border-[#352B44] overflow-hidden z-50 animate-fadeIn">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-[#ECE7DF] dark:border-[#2C2237]">
                  <p className="text-xs font-bold text-[#2D223B] dark:text-[#F1ECF7] truncate">{user.displayName}</p>
                  <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] truncate mt-0.5">{user.email}</p>
                </div>
                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    onClick={() => { setShowUserMenu(false); /* navigate to profile handled by sidebar */ }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-[#2D223B] dark:text-[#F1ECF7] hover:bg-[#FAF8F5] dark:hover:bg-[#281F36] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[#8C8296] dark:text-[#9A8FA7]" />
                    Profile
                  </button>
                  <div className="my-1 mx-3 h-px bg-[#ECE7DF] dark:bg-[#2C2237]" />
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
