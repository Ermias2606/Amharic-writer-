// types.ts
export interface GenreGroup {
  category: string;
  subgenres: string[];
}

export interface Footnote {
  id: number;
  text: string;
}

export interface Chapter {
  title: string;
  outline?: string;
  content?: string; // HTML content, now optional
  footnotes?: Footnote[]; // Now optional
}

export interface Part {
  title: string;
  chapters: Chapter[];
}

export interface GlossaryTerm {
  term: string; // Amharic term
  definition: string; // English definition
}

export type WritingTone = 'Academic' | 'Journalistic' | 'Creative' | 'Philosophical' | 'Narrative' | 'Technical';

export type PodcastTone = 'Conversational' | 'Investigative' | 'Inspirational' | 'Dramatic' | 'Educational' | 'Humorous' | 'Poetic' | 'Historical Documentary';

export interface ScriptLine {
  speaker: 'Host' | 'Narrator' | 'Sound Effect' | 'Music';
  line: string;
}

export interface PodcastSegment {
  segmentTitle: string; // From Chapter title
  script: ScriptLine[];
}

export interface PodcastEpisode {
  episodeTitle: string; // From Part title
  segments: PodcastSegment[];
}

export interface PodcastScript {
  podcastTitle: string; // From Anthology title
  episodes: PodcastEpisode[];
}

export type BookTheme = 'biranna' | 'modern' | 'night';
export type EthiopicFont = 'noto-serif' | 'abyssinica' | 'sans';

export interface Anthology {
  id?: string;
  title: string;
  preface: string; // HTML content
  parts: Part[];
  summary: string; // HTML content
  review?: string;
  glossary?: GlossaryTerm[];
  frontCoverConcept: string;
  backCoverConcept: string;
  frontCoverImage?: string;
  backCoverImage?: string;
  writingTone?: WritingTone;
  podcastScript?: PodcastScript;
  format?: 'book' | 'short';
  shortContent?: string; // For short writing
  shortType?: string; // 'Short Story' | 'Essay' | 'Poem' | 'Article'
  partsCount?: number;
  chaptersPerPart?: number;
  theme?: BookTheme;
  font?: EthiopicFont;
  useGeezNumerals?: boolean;
}

export type UpdatingInfo = {
  type: 'chapter';
  partIndex: number;
  chapterIndex: number;
  action?: 'expand' | 'review' | 'linguistic-expert';
} | {
  type: 'chapter-content';
  partIndex: number;
  chapterIndex: number;
} | {
  type: 'book-review' | 'add-chapter' | 'book-refine' | 'generate-glossary' | 'generate-podcast' | 'refine-podcast' | 'short-expand';
} | null;