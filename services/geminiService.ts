// services/geminiService.ts
// Client-side API client communicating with the server endpoints
import type { Anthology, Chapter, GlossaryTerm, WritingTone, PodcastScript, PodcastTone } from '../types';

async function callGeminiApi<T>(action: string, payload: any): Promise<T> {
  const response = await fetch(`/api/gemini/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error || `Server request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data.data as T;
}

export const generateAnthologyStructure = async (
  genres: string[],
  concepts: string,
  chaptersPerPart: number,
  writingTone: WritingTone,
  partsCount: number,
  format: 'book' | 'short',
  shortType?: string
): Promise<Anthology> => {
  return callGeminiApi<Anthology>('generate-structure', {
    genres,
    concepts,
    chaptersPerPart,
    writingTone,
    partsCount,
    format,
    shortType,
  });
};

export const generateChapterContent = async (
  anthology: Anthology,
  partIndex: number,
  chapterIndex: number
): Promise<{ content: string; footnotes: any[] }> => {
  return callGeminiApi<{ content: string; footnotes: any[] }>('generate-chapter-content', {
    anthology,
    partIndex,
    chapterIndex,
  });
};

export const reviewBook = async (anthology: Anthology): Promise<string> => {
  return callGeminiApi<string>('review-book', {
    anthology,
  });
};

export const modifyChapterContent = async (
  anthology: Anthology,
  partIndex: number,
  chapterIndex: number,
  action: 'expand' | 'review' | 'linguistic-expert'
): Promise<string> => {
  return callGeminiApi<string>('modify-chapter', {
    anthology,
    partIndex,
    chapterIndex,
    action,
  });
};

export const addChapter = async (anthology: Anthology): Promise<Chapter> => {
  return callGeminiApi<Chapter>('add-chapter', {
    anthology,
  });
};

export const refineBook = async (anthology: Anthology): Promise<Anthology> => {
  return callGeminiApi<Anthology>('refine-book', {
    anthology,
  });
};

export const generateGlossary = async (anthology: Anthology): Promise<GlossaryTerm[]> => {
  return callGeminiApi<GlossaryTerm[]>('generate-glossary', {
    anthology,
  });
};

export const generatePodcastScript = async (
  anthology: Anthology,
  tone: PodcastTone
): Promise<PodcastScript> => {
  return callGeminiApi<PodcastScript>('generate-podcast', {
    anthology,
    tone,
  });
};

export const refinePodcastScript = async (
  script: PodcastScript
): Promise<PodcastScript> => {
  return callGeminiApi<PodcastScript>('refine-podcast', {
    script,
  });
};

export const expandShortWriting = async (
  anthology: Anthology,
  expansionStyle: 'elaborate' | 'continue' | 'directed',
  customInstruction?: string
): Promise<string> => {
  return callGeminiApi<string>('expand-short-writing', {
    anthology,
    expansionStyle,
    customInstruction,
  });
};

export const generateImage = async (prompt: string): Promise<string> => {
  return callGeminiApi<string>('generate-image', {
    prompt,
  });
};
