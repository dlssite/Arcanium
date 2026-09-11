/**
 * Feature flags — read from Vite env vars at build time.
 *
 * Constitution §6.2, P2: every major feature must be independently
 * toggleable via environment variables.
 *
 * Usage:
 *   import { features } from '../config/features';
 *   if (features.aiHousekeeper) { ... }
 *
 * All flags default to TRUE when the env var is absent so that local dev
 * works out of the box without a .env file. Set to "false" to disable.
 *
 * Env vars (in apps/web/.env.example):
 *   VITE_FEATURE_FLAG_AI_HOUSEKEEPER   — Liber tab, companion dock, mic button
 *   VITE_FEATURE_FLAG_COMMUNITY        — Community tab
 *   VITE_FEATURE_FLAG_READER           — "Begin Reading" navigation links
 *   VITE_FEATURE_FLAG_VOICE_INPUT      — Mic button inside Liber chat
 */

function flag(name: string, defaultValue = true): boolean {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  return raw !== 'false' && raw !== '0';
}

export const features = {
  /** Show/hide the Liber companion tab, dock, and all AI chat surfaces. */
  aiHousekeeper: flag('VITE_FEATURE_FLAG_AI_HOUSEKEEPER'),

  /** Show/hide the Community tab. */
  community: flag('VITE_FEATURE_FLAG_COMMUNITY'),

  /**
   * Show/hide direct "Begin Reading" navigation to the reader route.
   * When false, BookDetailModal still shows but the "Begin Reading" button is hidden.
   */
  reader: flag('VITE_FEATURE_FLAG_READER'),

  /**
   * Show/hide the mic button in Liber chat.
   * Can be false even when aiHousekeeper is true (voice is an optional layer).
   */
  voiceInput: flag('VITE_FEATURE_FLAG_VOICE_INPUT'),
} as const;

export type Features = typeof features;
