// server/geminiBackend.ts
import { GoogleGenAI, Type } from "@google/genai";
import type { Anthology, Chapter, GlossaryTerm, WritingTone, PodcastScript, PodcastTone } from '../types';

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const getSystemInstruction = (tone: WritingTone | undefined): string => {
  const selectedTone = tone || 'Academic';
  switch (selectedTone) {
    case 'Journalistic':
      return `You are a world-class investigative journalist and author, skilled at making complex topics accessible and engaging for a broad audience. Your writing is clear, concise, fact-driven, and tells a compelling story with a strong narrative drive. Your word choice is impactful and direct. You generate content only in Amharic unless specified otherwise.`;
    case 'Creative':
      return `You are a masterful storyteller and creative writer, weaving narratives with imaginative language and evocative descriptions. Your prose is artistic, with a natural rhythm and flow, using literary devices to create a rich, immersive experience. Your word selection is poetic and original. You generate content only in Amharic unless specified otherwise.`;
    case 'Philosophical':
      return `You are a profound philosopher and thinker, adept at exploring complex, abstract concepts with intellectual rigor and clarity. Your writing builds arguments logically, guiding the reader through intricate lines of thought. Your language is precise and deliberate, encouraging deep reflection. You generate content only in Amharic unless specified otherwise.`;
    case 'Narrative':
      return `You are a skilled narrator, focusing on building a clear storyline with a distinct beginning, middle, and end. You excel at pacing and creating a seamless narrative flow that keeps the reader engaged. You structure information to tell a coherent and compelling story. You generate content only in Amharic unless specified otherwise.`;
    case 'Technical':
      return `You are an expert technical writer, specializing in explaining complex scientific and technical subjects with precision, clarity, and objectivity. Your writing is structured, with a clear hierarchy of information and logical connections between sections. You use accurate, unambiguous terminology consistently. You generate content only in Amharic unless specified otherwise.`;
    case 'Academic':
    default:
      return `You are a world-class academic, author, and historian specializing in creating comprehensive, engaging, and linguistically precise anthologies in the Amharic language. Your writing is clear, well-structured, and adheres to the highest academic standards. You excel at creating a logical flow between concepts and use a sophisticated, precise vocabulary. You generate content only in Amharic unless specified otherwise.`;
  }
};

// Schemas for structured data extraction
const footnoteSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.NUMBER, description: "The sequential identifier for the footnote, e.g., 1." },
    text: { type: Type.STRING, description: "The content of the footnote in Amharic." },
  },
  required: ['id', 'text'],
};

const chapterSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the chapter in Amharic." },
    content: { type: Type.STRING, description: "The content of the chapter in Amharic, formatted as an HTML string. Use tags like <p>, <h2>, <h3>, <b>, <i>, <u>, <ul>, <ol>, and <li> for structure and emphasis. For citations, use <sup> tags with a number (e.g., <sup>1</sup>) that corresponds to a footnote." },
    footnotes: {
      type: Type.ARRAY,
      items: footnoteSchema,
      description: "An array of footnotes cited in the chapter content."
    },
  },
  required: ['title', 'content', 'footnotes'],
};

const chapterStructureSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the chapter in Amharic." },
    outline: { type: Type.STRING, description: "A brief, one or two-sentence outline of what this chapter will cover, in Amharic." }
  },
  required: ['title', 'outline'],
};

const partStructureSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the part in Amharic." },
    chapters: {
      type: Type.ARRAY,
      items: chapterStructureSchema,
      description: "An array of chapters within this part."
    }
  },
  required: ['title', 'chapters']
};

const anthologyStructureSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The main title of the anthology in Amharic." },
    preface: { type: Type.STRING, description: "The preface of the book in Amharic, formatted as an HTML string." },
    parts: {
      type: Type.ARRAY,
      items: partStructureSchema,
      description: "The main parts of the book."
    },
    summary: { type: Type.STRING, description: "A concluding summary of the book in Amharic, formatted as an HTML string." },
    frontCoverConcept: { type: Type.STRING, description: "A detailed, visually descriptive concept for the front cover image, in English. This should be a prompt for an image generation model." },
    backCoverConcept: { type: Type.STRING, description: "A detailed, visually descriptive concept for the back cover image, in English. This should be a prompt for an image generation model." }
  },
  required: ['title', 'preface', 'parts', 'summary', 'frontCoverConcept', 'backCoverConcept'],
};

const shortWritingSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the short writing in Amharic." },
    preface: { type: Type.STRING, description: "An introductory section or prologue in Amharic, formatted as an HTML string." },
    shortContent: { type: Type.STRING, description: "The full body content of the short writing in Amharic, formatted as an HTML string." },
    summary: { type: Type.STRING, description: "A short concluding summary or postscript in Amharic, formatted as an HTML string." },
    frontCoverConcept: { type: Type.STRING, description: "A detailed, visually descriptive concept for the front cover image, in English." },
    backCoverConcept: { type: Type.STRING, description: "A detailed, visually descriptive concept for the back cover image, in English." }
  },
  required: ['title', 'preface', 'shortContent', 'summary', 'frontCoverConcept', 'backCoverConcept'],
};

const glossarySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      term: { type: Type.STRING, description: "A key Amharic term found in the text." },
      definition: { type: Type.STRING, description: "A concise English definition of the term." },
    },
    required: ['term', 'definition'],
  }
};

const scriptLineSchema = {
  type: Type.OBJECT,
  properties: {
    speaker: { type: Type.STRING, description: `The speaker or audio element: 'Host', 'Narrator', 'Sound Effect', 'Music'.` },
    line: { type: Type.STRING, description: `The narration, dialogue, or description of the audio cue in Amharic.` },
  },
  required: ['speaker', 'line'],
};

const podcastSegmentSchema = {
  type: Type.OBJECT,
  properties: {
    segmentTitle: { type: Type.STRING, description: `The title for this segment.` },
    script: {
      type: Type.ARRAY,
      items: scriptLineSchema,
      description: `An array of script lines that make up this segment.`
    }
  },
  required: ['segmentTitle', 'script'],
};

const podcastEpisodeSchema = {
  type: Type.OBJECT,
  properties: {
    episodeTitle: { type: Type.STRING, description: `The title for this episode.` },
    segments: {
      type: Type.ARRAY,
      items: podcastSegmentSchema,
      description: `An array of segments that make up this episode.`
    }
  },
  required: ['episodeTitle', 'segments'],
};

const podcastScriptSchema = {
  type: Type.OBJECT,
  properties: {
    podcastTitle: { type: Type.STRING, description: `The overall title for the podcast series.` },
    episodes: {
      type: Type.ARRAY,
      items: podcastEpisodeSchema,
      description: `An array of episodes that make up the podcast series.`
    }
  },
  required: ['podcastTitle', 'episodes'],
};

const plainTextFilter = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

export function createBirannaCoverSvgBase64(concept: string): string {
  const cleanTitle = concept.replace(/[<>&"]/g, ' ').substring(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <radialGradient id="parchment" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#fff8eb"/>
        <stop offset="65%" stop-color="#f5e8cf"/>
        <stop offset="100%" stop-color="#e3cb9f"/>
      </radialGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffd56b"/>
        <stop offset="50%" stop-color="#c59b27"/>
        <stop offset="100%" stop-color="#7a5a08"/>
      </linearGradient>
    </defs>
    <rect width="600" height="800" fill="url(#parchment)"/>
    <rect x="24" y="24" width="552" height="752" fill="none" stroke="#9e1b21" stroke-width="8" rx="8"/>
    <rect x="36" y="36" width="528" height="728" fill="none" stroke="url(#gold)" stroke-width="3" rx="6"/>
    <rect x="44" y="44" width="512" height="712" fill="none" stroke="#9e1b21" stroke-width="1.5" stroke-dasharray="6 3"/>
    <g transform="translate(60, 64)">
      <rect x="0" y="0" width="480" height="28" fill="#9e1b21" rx="4"/>
      <line x1="10" y1="14" x2="470" y2="14" stroke="#ffd56b" stroke-width="2" stroke-dasharray="8 4"/>
      <circle cx="240" cy="14" r="8" fill="#b8861b" stroke="#fff" stroke-width="1.5"/>
    </g>
    <g transform="translate(300, 200)">
      <circle cx="0" cy="0" r="100" fill="#fffaf0" stroke="#9e1b21" stroke-width="4"/>
      <circle cx="0" cy="0" r="92" fill="none" stroke="url(#gold)" stroke-width="2.5"/>
      <path d="M-65,0 L65,0 M0,-65 L0,65" stroke="#9e1b21" stroke-width="8" stroke-linecap="round"/>
      <path d="M-45,-45 L45,45 M-45,45 L45,-45" stroke="#c59b27" stroke-width="4" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="18" fill="#9e1b21" stroke="#ffd56b" stroke-width="3"/>
    </g>
    <g transform="translate(300, 390)">
      <rect x="-220" y="0" width="440" height="96" fill="#fff9ef" rx="8" stroke="#9e1b21" stroke-width="2"/>
      <text x="0" y="38" font-family="serif" font-size="22" font-weight="bold" fill="#9e1b21" text-anchor="middle">
        የኢትዮጵያ ጥንታዊ ስብስብ
      </text>
      <text x="0" y="70" font-family="serif" font-size="13" font-weight="600" fill="#7a5a08" text-anchor="middle">
        ETHIOPIC ANTHOLOGY COLLECTION
      </text>
    </g>
    <g transform="translate(300, 520)">
      <rect x="-210" y="0" width="420" height="85" fill="#fffaf0" rx="6" stroke="#c59b27" stroke-width="1.2"/>
      <text x="0" y="32" font-family="serif" font-size="14" font-weight="bold" fill="#9e1b21" text-anchor="middle">
        የብራና ጥበብና ፍልስፍና
      </text>
      <text x="0" y="60" font-family="sans-serif" font-size="11" fill="#665" text-anchor="middle">
        ${cleanTitle}
      </text>
    </g>
    <g transform="translate(60, 690)">
      <rect x="0" y="0" width="480" height="24" fill="#9e1b21" rx="4"/>
      <line x1="10" y1="12" x2="470" y2="12" stroke="#ffd56b" stroke-width="2" stroke-dasharray="8 4"/>
      <circle cx="240" cy="12" r="6" fill="#b8861b"/>
    </g>
    <text x="300" y="746" font-family="sans-serif" font-size="11" fill="#887" text-anchor="middle">
      ፳፻፲፰ • Ethiopian Manuscript AI Design
    </text>
  </svg>`;

  return Buffer.from(svg).toString('base64');
}

export async function serverGenerateStructure(params: {
  genres: string[];
  concepts: string;
  chaptersPerPart: number;
  writingTone: WritingTone;
  partsCount: number;
  format: 'book' | 'short';
  shortType?: string;
}): Promise<Anthology> {
  const { genres, concepts, chaptersPerPart, writingTone, partsCount, format, shortType } = params;

  if (format === 'short') {
    const prompt = `Generate a single complete short creative or academic piece of writing of type "${shortType || 'Short Story'}" in Amharic.
    - **Goal**: Build an elegant, full, beautiful, and complete short writing piece directly.
    - **Genres**: ${genres.join(', ')}
    - **Key Concepts**: ${concepts}
    - **Writing Tone**: ${writingTone}
    - **Type**: This must be a "${shortType || 'Short Story'}" and contain full content of around 400-800 words.
    
    Provide a title, an introduction/preface (HTML), the complete core body writing (shortContent - HTML containing prose, narrative, or structured text with proper style tags like <p>, <h2>, <h3>, <b>, <i>, <ul>, etc.), a concluding takeaway/summary (HTML), and descriptive prompt descriptions for front and back imagery. Ensure the writing is written entirely in Amharic (except descriptions).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(writingTone),
        responseMimeType: "application/json",
        responseSchema: shortWritingSchema,
      },
    });

    const json = JSON.parse(response.text || '{}');
    return {
      ...json,
      format: 'short',
      shortType: shortType || 'Short Story',
      writingTone,
      parts: [],
    };
  }

  const prompt = `Generate the comprehensive outline and structure for an anthology book written entirely in Amharic based on the following specifications:
  - **Genres**: ${genres.join(', ')}
  - **Key Concepts & Topics**: ${concepts}
  - **Structure**: Exactly ${partsCount || 3} main Parts, and exactly ${chaptersPerPart || 3} Chapters per Part.
  - **Writing Tone**: ${writingTone}

  Provide:
  1. A compelling title in Amharic.
  2. A thoughtful preface in Amharic (as an HTML string).
  3. The structured parts and chapters (with title and 1-2 sentence outline for each chapter).
  4. A concluding summary in Amharic (as an HTML string).
  5. Descriptive front and back cover concept prompts (in English).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
      responseMimeType: "application/json",
      responseSchema: anthologyStructureSchema,
    },
  });

  const json = JSON.parse(response.text || '{}');
  return {
    ...json,
    format: 'book',
    chaptersPerPart,
    partsCount,
    writingTone,
  };
}

export async function serverGenerateChapterContent(params: {
  anthology: Anthology;
  partIndex: number;
  chapterIndex: number;
}): Promise<{ content: string; footnotes: any[] }> {
  const { anthology, partIndex, chapterIndex } = params;
  const part = anthology.parts[partIndex];
  const chapter = part.chapters[chapterIndex];
  const writingTone = anthology.writingTone || 'Academic';

  const prompt = `Write the full, comprehensive content for the following chapter of an Amharic anthology book.
  - **Anthology Title**: ${anthology.title}
  - **Part Title**: ${part.title}
  - **Chapter Title**: ${chapter.title}
  - **Chapter Outline**: ${chapter.outline}
  - **Writing Tone**: ${writingTone}

  Write an in-depth, beautifully articulated chapter in Amharic (approx 500-1000 words). Format the content as an HTML string using <p>, <h2>, <h3>, <b>, <i>, <ul>, <ol>, <li>, and <sup> for footnotes. Return any footnotes cited in the footnotes array.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: "HTML content in Amharic" },
          footnotes: { type: Type.ARRAY, items: footnoteSchema }
        },
        required: ['content', 'footnotes']
      }
    }
  });

  return JSON.parse(response.text || '{"content":"","footnotes":[]}');
}

export async function serverReviewBook(anthology: Anthology): Promise<string> {
  const writingTone = anthology.writingTone || 'Academic';
  const textSummary = `${anthology.title} - ${plainTextFilter(anthology.preface || '')} - ${plainTextFilter(anthology.summary || '')}`;
  const prompt = `Provide a comprehensive scholarly review and literary critique in Amharic of this work (${writingTone} tone):\n${textSummary}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
    }
  });

  return response.text || '';
}

export async function serverModifyChapter(params: {
  anthology: Anthology;
  partIndex: number;
  chapterIndex: number;
  action: 'expand' | 'review' | 'linguistic-expert';
}): Promise<string> {
  const { anthology, partIndex, chapterIndex, action } = params;
  const part = anthology.parts[partIndex];
  const chapter = part.chapters[chapterIndex];
  const writingTone = anthology.writingTone || 'Academic';

  let instruction = '';
  if (action === 'expand') {
    instruction = 'Expand the following Amharic chapter content with richer depth, explanations, and cultural or historical examples while maintaining the established tone. Return only the new full chapter content as an HTML string.';
  } else if (action === 'review') {
    instruction = 'Review and rewrite the following Amharic chapter to elevate prose clarity, structure, and readability. Return only the new full chapter content as an HTML string.';
  } else {
    instruction = 'Act as a master Amharic linguist and editor. Polish this chapter to publication-grade perfection, refining idioms, syntax, and rhetoric. Return only the new full chapter content as an HTML string.';
  }

  const prompt = `${instruction}
  - Book: ${anthology.title}
  - Chapter: ${chapter.title}
  - Content:
  ${chapter.content || chapter.outline}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
    }
  });

  return response.text || '';
}

export async function serverAddChapter(anthology: Anthology): Promise<Chapter> {
  const lastPart = anthology.parts[anthology.parts.length - 1];
  const writingTone = anthology.writingTone || 'Academic';

  const prompt = `Generate a new sequential chapter for the anthology "${anthology.title}" in Part "${lastPart.title}".
  Write the chapter in Amharic with title, full HTML content, and footnotes.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
      responseMimeType: "application/json",
      responseSchema: chapterSchema,
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function serverRefineBook(anthology: Anthology): Promise<Anthology> {
  const writingTone = anthology.writingTone || 'Academic';

  if (anthology.format === 'short') {
    const prompt = `Refine and elevate the entire text of this short Amharic piece:\n${JSON.stringify({ title: anthology.title, preface: anthology.preface, shortContent: anthology.shortContent, summary: anthology.summary })}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(writingTone),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            preface: { type: Type.STRING },
            shortContent: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ['title', 'preface', 'shortContent', 'summary'],
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return { ...anthology, ...parsed };
  }

  const prompt = `Refine and elevate the preface, parts, and summary of this Amharic anthology:\n${JSON.stringify({ title: anthology.title, preface: anthology.preface, parts: anthology.parts, summary: anthology.summary })}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          preface: { type: Type.STRING },
          parts: anthologyStructureSchema.properties.parts,
          summary: { type: Type.STRING },
        },
        required: ['title', 'preface', 'parts', 'summary'],
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return { ...anthology, ...parsed };
}

export async function serverGenerateGlossary(anthology: Anthology): Promise<GlossaryTerm[]> {
  const sample = plainTextFilter(`${anthology.title} ${anthology.preface || ''} ${anthology.summary || ''}`).substring(0, 8000);
  const prompt = `Extract 10-15 essential Amharic terms from this text and provide concise English definitions:\n${sample}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: glossarySchema,
    }
  });

  return JSON.parse(response.text || '[]');
}

export async function serverGeneratePodcast(params: {
  anthology: Anthology;
  tone: PodcastTone;
}): Promise<PodcastScript> {
  const { anthology, tone } = params;
  const prompt = `Convert this Amharic anthology into an audio podcast script in Amharic with tone "${tone}". Provide host/narrator lines and music cues. Title: ${anthology.title}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: `You are an expert podcast scriptwriter and producer. Generate content in Amharic.`,
      responseMimeType: "application/json",
      responseSchema: podcastScriptSchema,
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function serverRefinePodcast(script: PodcastScript): Promise<PodcastScript> {
  const prompt = `Refine and improve this Amharic podcast script for dynamic audio delivery:\n${JSON.stringify(script)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: `You are an expert podcast script editor. Output in Amharic.`,
      responseMimeType: "application/json",
      responseSchema: podcastScriptSchema,
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function serverExpandShortWriting(params: {
  anthology: Anthology;
  expansionStyle: 'elaborate' | 'continue' | 'directed';
  customInstruction?: string;
}): Promise<string> {
  const { anthology, expansionStyle, customInstruction } = params;
  const writingTone = anthology.writingTone || 'Academic';

  let prompt = '';
  if (expansionStyle === 'elaborate') {
    prompt = `Elaborate on scenes, descriptions, and depth for this Amharic text. Return complete HTML only: ${anthology.shortContent}`;
  } else if (expansionStyle === 'continue') {
    prompt = `Write a seamless sequel/continuation section for this Amharic piece. Return complete combined HTML: ${anthology.shortContent}`;
  } else {
    prompt = `Expand this Amharic writing with instruction "${customInstruction || ''}". Return complete HTML: ${anthology.shortContent}`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(writingTone),
    }
  });

  return response.text || '';
}

export async function serverGenerateImage(concept: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: concept,
      config: {
        imageConfig: {
          aspectRatio: '3:4',
        },
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
  } catch (err) {
    console.warn("Direct image generation unavailable, generating illuminated Ethiopian manuscript cover:", err);
  }

  return createBirannaCoverSvgBase64(concept);
}
