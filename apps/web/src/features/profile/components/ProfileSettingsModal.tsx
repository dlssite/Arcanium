import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, User, Link, AlignLeft, ImageIcon, Venus, Mars, Sparkles } from 'lucide-react';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { useUser } from '../../../hooks/useUser.js';
import type { DefaultAvatar } from '@arcanium/types';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDER_OPTIONS: { value: Gender; label: string; icon: React.ReactNode }[] = [
  { value: 'MALE',   label: 'Male',   icon: <Mars   className="w-3.5 h-3.5" /> },
  { value: 'FEMALE', label: 'Female', icon: <Venus  className="w-3.5 h-3.5" /> },
  { value: 'OTHER',  label: 'Other',  icon: <Sparkles className="w-3 h-3" /> },
];

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: Props) {
  const { save, isSaving, saveError, clearError, refreshProfile, defaultAvatars, defaultAvatarsLoading } = useProfileSettings();
  // Always read from the live store so we get the latest server data after refresh
  const { user } = useUser();

  const [displayName, setDisplayName]   = useState('');
  const [avatarUrl,   setAvatarUrl]     = useState('');
  const [bio,         setBio]           = useState('');
  const [gender,      setGender]        = useState<Gender | null>(null);
  const [avatarTab,   setAvatarTab]     = useState<'url' | 'preset'>('preset');
  const [urlError,    setUrlError]      = useState<string | null>(null);
  const [saved,       setSaved]         = useState(false);

  // When modal opens: trigger a background refetch, then seed form from store
  useEffect(() => {
    if (isOpen) {
      refreshProfile();
      setDisplayName(user.displayName ?? '');
      setAvatarUrl((user as any).avatarUrl ?? '');
      setBio((user as any).bio ?? '');
      setGender((user as any).gender ?? null);
      setAvatarTab(defaultAvatars.length > 0 ? 'preset' : 'url');
      setUrlError(null);
      clearError();
      setSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  function validateUrl(val: string): boolean {
    if (!val) return true; // empty = keep existing / null
    try { new URL(val); return true; } catch { return false; }
  }

  async function handleSave() {
    if (!displayName.trim()) return;
    if (avatarTab === 'url' && avatarUrl && !validateUrl(avatarUrl)) {
      setUrlError('Please enter a valid URL (https://...)');
      return;
    }
    setUrlError(null);

    const body: Record<string, unknown> = {
      displayName: displayName.trim(),
      bio:         bio.trim() || null,
      avatarUrl:   avatarUrl || null,
      gender:      gender,
    };

    await save(body as any);
    setSaved(true);
    setTimeout(onClose, 800);
  }

  function pickPreset(avatar: DefaultAvatar) {
    setAvatarUrl(avatar.url);
    setUrlError(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet — slides up on mobile, centred on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="fixed z-[90] bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center pointer-events-none"
      >
        <div className="pointer-events-auto w-full sm:w-[480px] sm:max-w-[96vw] bg-[#FAF8F5] dark:bg-[#15101C] rounded-t-3xl sm:rounded-3xl border border-[#ECE7DF] dark:border-[#2E243A] shadow-[0_-12px_48px_-8px_rgba(40,25,60,0.22)] sm:shadow-2xl max-h-[92vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
            <div>
              <h2 className="font-serif font-bold text-lg text-[#2D223B] dark:text-[#F1ECF7] tracking-wide">Edit Profile</h2>
              <p className="text-xs text-[#8C8296] dark:text-[#9A8FA7] mt-0.5">Changes are saved to your archive identity</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-xl bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#8C8296] hover:text-[#43335A] dark:hover:text-white transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-5">

            {/* Avatar preview */}
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-[#2C2237] ring-4 ring-[#43335A]/15 shadow-md"
                    onError={() => { setUrlError('Could not load image from that URL'); }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#F2EDFA] dark:bg-[#2B2038] border-4 border-white dark:border-[#2C2237] ring-4 ring-[#43335A]/15 flex items-center justify-center">
                    <User className="w-8 h-8 text-[#8C8296] dark:text-[#9A8FA7]" />
                  </div>
                )}
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-xs font-semibold text-[#5A4E66] dark:text-[#A89DB5] uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 inline mr-1 opacity-70" />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                placeholder="Your archive name…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#B0A6BB] dark:placeholder-[#4D4060] focus:outline-none focus:border-[#43335A] dark:focus:border-[#725499] transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-[#5A4E66] dark:text-[#A89DB5] uppercase tracking-wider mb-1.5">
                <AlignLeft className="w-3 h-3 inline mr-1 opacity-70" />
                Bio <span className="text-[#B0A6BB] font-normal normal-case tracking-normal">({bio.length}/300)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="A short note about your reading life…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#B0A6BB] dark:placeholder-[#4D4060] focus:outline-none focus:border-[#43335A] dark:focus:border-[#725499] transition-colors resize-none"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-[#5A4E66] dark:text-[#A89DB5] uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 inline mr-1 opacity-70" />
                Gender
              </label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(gender === opt.value ? null : opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      gender === opt.value
                        ? 'bg-[#43335A] dark:bg-[#55406E] text-white border-[#43335A] dark:border-[#725499] shadow-[0_2px_10px_rgba(67,50,88,0.3)]'
                        : 'bg-white dark:bg-[#1E1728] border-[#ECE7DF] dark:border-[#352B44] text-[#645970] dark:text-[#A69CAF] hover:border-[#43335A] dark:hover:border-[#725499] hover:text-[#43335A] dark:hover:text-white'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-[#B0A6BB] dark:text-[#4D4060]">Optional — tap again to deselect</p>
            </div>

            {/* Avatar picker */}
            <div>
              <label className="block text-xs font-semibold text-[#5A4E66] dark:text-[#A89DB5] uppercase tracking-wider mb-1.5">
                <ImageIcon className="w-3 h-3 inline mr-1 opacity-70" />
                Avatar
              </label>

              {/* Tab toggle */}
              <div className="flex gap-1 p-1 bg-[#F2EDFA] dark:bg-[#1E1728] rounded-xl mb-3">
                {(['preset', 'url'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAvatarTab(tab)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      avatarTab === tab
                        ? 'bg-white dark:bg-[#2B2038] text-[#43335A] dark:text-[#F1ECF7] shadow-sm'
                        : 'text-[#8C8296] dark:text-[#9A8FA7] hover:text-[#43335A] dark:hover:text-white'
                    }`}
                  >
                    {tab === 'preset' ? 'Choose Preset' : 'Paste URL'}
                  </button>
                ))}
              </div>

              {/* Preset grid */}
              {avatarTab === 'preset' && (
                defaultAvatarsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[#8C8296]" />
                  </div>
                ) : defaultAvatars.length === 0 ? (
                  <p className="text-xs text-center text-[#9A8FA7] dark:text-[#6D6282] py-4 italic">
                    No preset avatars yet — an admin can add some.
                  </p>
                ) : (
                  <div className="grid grid-cols-5 gap-2.5">
                    {defaultAvatars.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => pickPreset(a)}
                        title={a.label || undefined}
                        className={`relative aspect-square rounded-full overflow-hidden transition-all active:scale-95 ${
                          avatarUrl === a.url
                            ? 'ring-[3px] ring-[#43335A] dark:ring-[#FFDE88] ring-offset-2 ring-offset-[#FAF8F5] dark:ring-offset-[#15101C] scale-105'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={a.url} alt={a.label || 'Avatar'} className="w-full h-full object-cover" />
                        {avatarUrl === a.url && (
                          <div className="absolute inset-0 bg-[#43335A]/30 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* URL input */}
              {avatarTab === 'url' && (
                <div>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B0A6BB] dark:text-[#4D4060]" />
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => { setAvatarUrl(e.target.value); setUrlError(null); }}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#B0A6BB] dark:placeholder-[#4D4060] focus:outline-none focus:border-[#43335A] dark:focus:border-[#725499] transition-colors"
                    />
                  </div>
                  {urlError && (
                    <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-400">{urlError}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-[#B0A6BB] dark:text-[#4D4060]">
                    Direct image link — leave empty to keep your current avatar
                  </p>
                </div>
              )}
            </div>

            {/* API error */}
            {saveError && (
              <p className="text-xs text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50">
                {saveError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-[#ECE7DF] dark:border-[#2E243A] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#ECE7DF] dark:border-[#352B44] text-sm font-semibold text-[#645970] dark:text-[#A69CAF] hover:bg-stone-50 dark:hover:bg-[#1E1728] transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !displayName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#43335A] to-[#55406E] text-white text-sm font-bold shadow-[0_4px_14px_rgba(67,50,88,0.3)] hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <><Check className="w-4 h-4" /> Saved!</>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
