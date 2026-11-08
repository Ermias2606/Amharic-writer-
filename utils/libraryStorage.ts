// utils/libraryStorage.ts
import type { Anthology } from '../types';
import { computeTextMetrics } from './geezUtils';

export interface SavedDraft {
  id: string;
  title: string;
  format: 'book' | 'short';
  shortType?: string;
  genres: string[];
  createdAt: number;
  updatedAt: number;
  fidelCount: number;
  wordCount: number;
  partsCount: number;
  chaptersCount: number;
  coverImage?: string;
  anthology: Anthology;
}

const STORAGE_KEY = 'amharic_anthologies_library_v2';
const LEGACY_STORAGE_KEY = 'savedAnthology';

/**
 * Load all saved drafts from browser storage.
 * Automatically migrates old single-anthology format if present.
 */
export function getSavedDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let drafts: SavedDraft[] = raw ? JSON.parse(raw) : [];

    // Check for legacy single-item save to migrate
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw && drafts.length === 0) {
      try {
        const legacyAnthology = JSON.parse(legacyRaw) as Anthology;
        const migrated = createDraftFromAnthology(legacyAnthology);
        drafts = [migrated];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
      } catch (e) {
        console.warn('Failed to migrate legacy anthology save', e);
      }
    }

    return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Error reading saved drafts:', err);
    return [];
  }
}

/**
 * Helper to build a SavedDraft structure from an Anthology.
 */
export function createDraftFromAnthology(anthology: Anthology): SavedDraft {
  let fullText = `${anthology.title} ${anthology.preface || ''} ${anthology.summary || ''} `;
  let chaptersCount = 0;

  if (anthology.format === 'short') {
    fullText += anthology.shortContent || '';
    chaptersCount = 1;
  } else if (anthology.parts) {
    anthology.parts.forEach((p) => {
      chaptersCount += p.chapters?.length || 0;
      p.chapters?.forEach((c) => {
        fullText += `${c.title || ''} ${c.content || c.outline || ''} `;
      });
    });
  }

  const metrics = computeTextMetrics(fullText);

  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: anthology.title || 'ያልተሰየመ ጽሁፍ (Untitled)',
    format: anthology.format || 'book',
    shortType: anthology.shortType,
    genres: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fidelCount: metrics.fidelCount,
    wordCount: metrics.wordCount,
    partsCount: anthology.parts?.length || (anthology.format === 'short' ? 1 : 0),
    chaptersCount,
    coverImage: anthology.frontCoverImage,
    anthology,
  };
}

/**
 * Save or update an anthology in the library.
 */
export function saveDraftToLibrary(anthology: Anthology, existingDraftId?: string): SavedDraft {
  const drafts = getSavedDrafts();
  const now = Date.now();

  let fullText = `${anthology.title} ${anthology.preface || ''} ${anthology.summary || ''} `;
  let chaptersCount = 0;

  if (anthology.format === 'short') {
    fullText += anthology.shortContent || '';
    chaptersCount = 1;
  } else if (anthology.parts) {
    anthology.parts.forEach((p) => {
      chaptersCount += p.chapters?.length || 0;
      p.chapters?.forEach((c) => {
        fullText += `${c.title || ''} ${c.content || c.outline || ''} `;
      });
    });
  }

  const metrics = computeTextMetrics(fullText);

  let targetDraft: SavedDraft;
  const existingIndex = drafts.findIndex((d) => d.id === existingDraftId || d.title === anthology.title);

  if (existingIndex >= 0) {
    targetDraft = {
      ...drafts[existingIndex],
      title: anthology.title || drafts[existingIndex].title,
      format: anthology.format || drafts[existingIndex].format,
      shortType: anthology.shortType || drafts[existingIndex].shortType,
      updatedAt: now,
      fidelCount: metrics.fidelCount,
      wordCount: metrics.wordCount,
      partsCount: anthology.parts?.length || (anthology.format === 'short' ? 1 : 0),
      chaptersCount,
      coverImage: anthology.frontCoverImage || drafts[existingIndex].coverImage,
      anthology,
    };
    drafts[existingIndex] = targetDraft;
  } else {
    targetDraft = {
      id: `draft_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: anthology.title || 'ያልተሰየመ ጽሁፍ (Untitled)',
      format: anthology.format || 'book',
      shortType: anthology.shortType,
      genres: [],
      createdAt: now,
      updatedAt: now,
      fidelCount: metrics.fidelCount,
      wordCount: metrics.wordCount,
      partsCount: anthology.parts?.length || (anthology.format === 'short' ? 1 : 0),
      chaptersCount,
      coverImage: anthology.frontCoverImage,
      anthology,
    };
    drafts.unshift(targetDraft);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  // Also keep legacy key synced for backward compatibility
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(anthology));

  return targetDraft;
}

/**
 * Delete a draft by ID.
 */
export function deleteDraftFromLibrary(id: string): SavedDraft[] {
  const drafts = getSavedDrafts().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  return drafts;
}

/**
 * Export full library as downloadable JSON backup file.
 */
export function exportLibraryBackup(): void {
  const drafts = getSavedDrafts();
  const blob = new Blob([JSON.stringify(drafts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amharic-anthology-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
