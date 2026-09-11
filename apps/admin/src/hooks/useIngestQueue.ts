/**
 * useIngestQueue — persistent background ingest queue.
 *
 * Jobs are enqueued from the "Add Content" modal, then processed
 * sequentially in the background. The queue state is held in a Zustand
 * store so it survives modal close and can be read from any component.
 */
import { create } from 'zustand';
import { adminApi } from '@arcanium/api-client';
import type { ContentType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface IngestJob {
  id:        string;
  url:       string;
  type:      ContentType;
  status:    JobStatus;
  title:     string | null;   // resolved after success
  chapters:  number | null;   // resolved after success
  error:     string | null;   // resolved after error
  queuedAt:  number;          // Date.now()
  doneAt:    number | null;
}

interface IngestQueueState {
  jobs:       IngestJob[];
  processing: boolean;

  // Add one or more jobs to the queue and kick off processing
  enqueue:    (entries: Array<{ url: string; type: ContentType }>) => void;

  // Called internally — not for external use
  _setJobs:   (updater: (prev: IngestJob[]) => IngestJob[]) => void;
  _setProcessing: (v: boolean) => void;

  // Dismiss completed/errored jobs
  clearDone:  () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useIngestQueueStore = create<IngestQueueState>((set, get) => ({
  jobs:       [],
  processing: false,

  _setJobs:       (updater) => set((s) => ({ jobs: updater(s.jobs) })),
  _setProcessing: (v)       => set({ processing: v }),

  clearDone: () =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.status === 'queued' || j.status === 'running') })),

  enqueue: (entries) => {
    const newJobs: IngestJob[] = entries
      .filter((e) => e.url.trim() !== '')
      .map((e) => ({
        id:       `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        url:      e.url.trim(),
        type:     e.type,
        status:   'queued',
        title:    null,
        chapters: null,
        error:    null,
        queuedAt: Date.now(),
        doneAt:   null,
      }));

    if (newJobs.length === 0) return;

    set((s) => ({ jobs: [...s.jobs, ...newJobs] }));

    // Start processor if not already running
    if (!get().processing) {
      void processQueue(get, set);
    }
  },
}));

// ---------------------------------------------------------------------------
// Queue processor — runs outside React, processes one job at a time
// ---------------------------------------------------------------------------

async function processQueue(
  get: () => IngestQueueState,
  set: (partial: Partial<IngestQueueState> | ((s: IngestQueueState) => Partial<IngestQueueState>)) => void,
): Promise<void> {
  set({ processing: true });

  while (true) {
    const next = get().jobs.find((j) => j.status === 'queued');
    if (!next) break;

    // Mark as running
    set((s) => ({
      jobs: s.jobs.map((j) => j.id === next.id ? { ...j, status: 'running' } : j),
    }));

    try {
      const res = await adminApi.ingest({ url: next.url, type: next.type });

      if (res.error || !res.data) {
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === next.id
              ? { ...j, status: 'error', error: res.error?.message ?? 'Ingest failed', doneAt: Date.now() }
              : j,
          ),
        }));
      } else {
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === next.id
              ? { ...j, status: 'done', title: res.data!.title, chapters: res.data!.chaptersFound, doneAt: Date.now() }
              : j,
          ),
        }));
      }
    } catch (err) {
      set((s) => ({
        jobs: s.jobs.map((j) =>
          j.id === next.id
            ? { ...j, status: 'error', error: err instanceof Error ? err.message : 'Network error', doneAt: Date.now() }
            : j,
        ),
      }));
    }
  }

  set({ processing: false });
}

// ---------------------------------------------------------------------------
// Hook — convenience wrapper for components
// ---------------------------------------------------------------------------

export function useIngestQueue() {
  return useIngestQueueStore();
}
