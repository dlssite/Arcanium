/**
 * @fileoverview Zustand store for Explore view UI state.
 *
 * Holds only client-side UI state; server data lives in TanStack Query.
 *
 * selectedType — drives the type filter pill and the ?type= API param.
 *                'All' means no filter (all content types).
 * selectedBook — which book's detail modal is open, null = closed.
 * typeFilters  — ordered list of filter pill definitions.
 *
 * Constitution refs: §8.3 (feature-scoped stores), §8.1 (TanStack Query for server state)
 */

import { create } from 'zustand';

/**
 * Type filter pill definitions.
 * `value` maps directly to the ContentType Prisma enum (or 'All' for no filter).
 * `label` is the display string shown in the pill.
 * `iconName` resolves to a lucide-react component in ExploreView.
 *
 * @type {Array<{value: string, label: string, iconName: string}>}
 */
export const EXPLORE_TYPE_FILTERS = [
  { value: 'All',          label: 'All',         iconName: 'LayoutGrid'  },
  { value: 'WEB_NOVEL',    label: 'Web Novels',  iconName: 'ScrollText'  },
  { value: 'LIGHT_NOVEL',  label: 'Light Novels',iconName: 'BookText'    },
  { value: 'MANGA',        label: 'Manga',       iconName: 'BookImage'   },
  { value: 'WEBTOON',      label: 'Webtoon',     iconName: 'Rows'        },
  { value: 'COMIC',        label: 'Comics',      iconName: 'BookOpen'    },
  { value: 'EBOOK',        label: 'Books',       iconName: 'Library'     },
];

export const useExploreStore = create((set) => ({
  // ── UI state ───────────────────────────────────────────────────────────────

  /** Active type filter. 'All' = no filter sent to the API. */
  selectedType: 'All',

  /** Full-text search query sent as ?q= to the API. Empty string = no filter. */
  searchQuery: '',

  /** Book whose detail modal is open. null = closed. */
  selectedBook: null,

  /** Ordered list of filter pill definitions (used by ExploreView). */
  typeFilters: EXPLORE_TYPE_FILTERS,

  // ── Actions ────────────────────────────────────────────────────────────────

  /** @param {string} type — one of the ContentType enum values or 'All' */
  setType: (type) => set({ selectedType: type }),

  /** @param {string} q — search query string */
  setSearchQuery: (q) => set({ searchQuery: q }),

  /** @param {object} book */
  selectBook: (book) => set({ selectedBook: book }),

  clearSelection: () => set({ selectedBook: null }),
}));
