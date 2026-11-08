import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BookDisplay from './components/BookDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import PodcastScriptDisplay from './components/PodcastScriptDisplay';
import LibraryModal from './components/LibraryModal';
import FidelTransliterationHelper from './components/FidelTransliterationHelper';
import GenreDropdown from './components/GenreDropdown';
import TemplateDropdown from './components/TemplateDropdown';
import ToneDropdown from './components/ToneDropdown';
import { GENRE_GROUPS, THEMATIC_TEMPLATES, WRITING_TONES, PODCAST_TONES } from './constants';
import { 
  generateAnthologyStructure,
  generateChapterContent,
  reviewBook, 
  modifyChapterContent, 
  generateImage,
  addChapter,
  refineBook,
  generateGlossary,
  generatePodcastScript,
  refinePodcastScript,
  expandShortWriting
} from './services/geminiService';
import { saveDraftToLibrary, getSavedDrafts } from './utils/libraryStorage';
import { transliterateToAmharic } from './utils/geezUtils';
import type { Anthology, UpdatingInfo, WritingTone, PodcastTone, PodcastScript, Chapter } from './types';

function App() {
  const [genres, setGenres] = useState<string[]>(['Philosophy']);
  const [concepts, setConcepts] = useState<string>('');
  const [anthology, setAnthology] = useState<Anthology | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [updatingInfo, setUpdatingInfo] = useState<UpdatingInfo>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [savedAnthologyExists, setSavedAnthologyExists] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [draftCount, setDraftCount] = useState<number>(0);
  const [isTransliterating, setIsTransliterating] = useState<boolean>(false);

  // New state for chapter/parts limit, format and writing tone
  const [chaptersPerPart, setChaptersPerPart] = useState<number>(3);
  const [partsCount, setPartsCount] = useState<number>(3);
  const [writingFormat, setWritingFormat] = useState<'book' | 'short'>('book');
  const [shortType, setShortType] = useState<string>('Short Story');
  const [writingTone, setWritingTone] = useState<WritingTone>('Academic');

  // New state for podcast feature
  const [showPodcastOptionsModal, setShowPodcastOptionsModal] = useState<boolean>(false);
  const [selectedPodcastTone, setSelectedPodcastTone] = useState<PodcastTone>('Conversational');
  const [podcastScript, setPodcastScript] = useState<PodcastScript | null>(null);

  useEffect(() => {
    try {
      const drafts = getSavedDrafts();
      setDraftCount(drafts.length);
      if (drafts.length > 0 || localStorage.getItem('savedAnthology')) {
        setSavedAnthologyExists(true);
      }
    } catch (e) {
      console.error("Could not access local storage:", e);
    }
  }, []);

  const handleGenreChange = (genre: string, isChecked: boolean) => {
    setGenres(prev => {
      if (isChecked) {
        return [...prev, genre];
      } else {
        return prev.filter(g => g !== genre);
      }
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepts.trim()) {
      setError('Please enter key concepts and topics.');
      return;
    }
    if (genres.length === 0) {
        setError('Please select at least one genre.');
        return;
    }
    setIsLoading(true);
    setAnthology(null);
    setError(null);
    setUpdatingInfo(null);
    setFeedbackMessage(null);
    setPodcastScript(null);

    try {
      const result = await generateAnthologyStructure(
        genres, 
        concepts, 
        chaptersPerPart, 
        writingTone, 
        partsCount, 
        writingFormat, 
        shortType
      );
      // Persist writing tone, format, and layout settings with the anthology object
      result.writingTone = writingTone;
      setAnthology(result);
    } catch (err)      {
      setError((err as Error).message || 'An unknown error occurred during generation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (anthology) {
      try {
        const savedDraft = saveDraftToLibrary(anthology, anthology.id);
        setAnthology(savedDraft.anthology);
        setSavedAnthologyExists(true);
        setDraftCount(getSavedDrafts().length);
        setFeedbackMessage('ስብስቡ በቤተ-መጽሐፍት ውስጥ በተሳካ ሁኔታ ተቀምጧል! (Saved to Library successfully)');
        setTimeout(() => setFeedbackMessage(null), 3000);
      } catch (err) {
        setError('Failed to save anthology. Local storage might be full.');
      }
    }
  };

  const handleSelectDraft = (selected: Anthology) => {
    setAnthology(selected);
    setWritingTone(selected.writingTone || 'Academic');
    setError(null);
    setUpdatingInfo(null);
    setPodcastScript(selected.podcastScript || null);
    setWritingFormat(selected.format || 'book');
    if (selected.format === 'short') {
      setShortType(selected.shortType || 'Short Story');
    }
    setFeedbackMessage(`"${selected.title}" ተከፍቷል! (Loaded draft)`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleLoad = () => {
    const drafts = getSavedDrafts();
    if (drafts.length > 0) {
      setIsLibraryOpen(true);
    } else {
      setError('ምንም የተቀመጠ ስብስብ አልተገኘም (No saved drafts found).');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateChapter = useCallback((partIndex: number, chapterIndex: number, updatedChapter: Chapter) => {
    setAnthology(prev => {
      if (!prev) return null;
      const newParts = JSON.parse(JSON.stringify(prev.parts));
      newParts[partIndex].chapters[chapterIndex] = updatedChapter;
      const updated = { ...prev, parts: newParts };
      saveDraftToLibrary(updated, updated.id);
      return updated;
    });
    setFeedbackMessage('ምዕራፉ በተሳካ ሁኔታ ተሻሽሏል! (Chapter updated successfully)');
    setTimeout(() => setFeedbackMessage(null), 3000);
  }, []);

  const handleGenerateCovers = useCallback(async () => {
    if (!anthology) return;
    setIsGeneratingImages(true);
    setError(null);
    try {
      // Generate front cover first
      const frontImage = await generateImage(anthology.frontCoverConcept);
      // Update state to show the front cover immediately
      setAnthology(prev => prev ? { ...prev, frontCoverImage: frontImage } : null);

      // Then, generate the back cover
      const backImage = await generateImage(anthology.backCoverConcept);
      // Update state again with the back cover
      setAnthology(prev => prev ? { ...prev, backCoverImage: backImage } : null);

    } catch (err) {
       setError((err as Error).message || 'An unknown error occurred while generating covers.');
    } finally {
      setIsGeneratingImages(false);
    }
  }, [anthology]);

  const handleReviewBook = useCallback(async () => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'book-review' });
    setError(null);
    try {
      const reviewText = await reviewBook(anthology);
      setAnthology(prev => (prev ? { ...prev, review: reviewText } : null));
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while reviewing the book.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);

  const handleModifyChapter = useCallback(async (partIndex: number, chapterIndex: number, action: 'expand' | 'review' | 'linguistic-expert') => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'chapter', partIndex, chapterIndex, action });
    setError(null);
    try {
      const newContent = await modifyChapterContent(anthology, partIndex, chapterIndex, action);
      setAnthology(prev => {
        if (!prev) return null;
        const newParts = JSON.parse(JSON.stringify(prev.parts));
        newParts[partIndex].chapters[chapterIndex].content = newContent;
        return { ...prev, parts: newParts };
      });
    } catch (err) {
      setError((err as Error).message || `An unknown error occurred while ${action}ing the chapter.`);
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);
  
  const handleAddChapter = useCallback(async () => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'add-chapter' });
    setError(null);
    try {
      const newChapter = await addChapter(anthology);
      setAnthology(prev => {
        if (!prev) return null;
        const newParts = JSON.parse(JSON.stringify(prev.parts));
        const lastPartIndex = newParts.length - 1;
        newParts[lastPartIndex].chapters.push(newChapter);
        return { ...prev, parts: newParts };
      });
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while adding a chapter.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);

  const handleRefineBook = useCallback(async () => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'book-refine' });
    setError(null);
    try {
      const refinedAnthology = await refineBook(anthology);
      setAnthology(refinedAnthology);
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while refining the book.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);

  const handleExpandShortWriting = useCallback(async (expansionStyle: 'elaborate' | 'continue' | 'directed', customInstruction?: string) => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'short-expand' });
    setError(null);
    try {
      const expandedContent = await expandShortWriting(anthology, expansionStyle, customInstruction);
      setAnthology(prev => {
        if (!prev) return null;
        return {
          ...prev,
          shortContent: expandedContent
        };
      });
      setFeedbackMessage('Writing expanded successfully!');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while expanding short writing.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);

  const handleGenerateGlossary = useCallback(async () => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'generate-glossary' });
    setError(null);
    try {
      const glossaryData = await generateGlossary(anthology);
      setAnthology(prev => (prev ? { ...prev, glossary: glossaryData } : null));
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while generating the glossary.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);
  
  const handleGeneratePodcastScript = async () => {
    if (!anthology) return;
    setShowPodcastOptionsModal(false);
    setUpdatingInfo({ type: 'generate-podcast' });
    setError(null);
    try {
      const script = await generatePodcastScript(anthology, selectedPodcastTone);
      setPodcastScript(script);
      setAnthology(prev => prev ? { ...prev, podcastScript: script } : null);
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while generating the podcast script.');
    } finally {
      setUpdatingInfo(null);
    }
  };
  
  const handleRefinePodcastScript = useCallback(async () => {
    if (!podcastScript) return;
    setUpdatingInfo({ type: 'refine-podcast' });
    setError(null);
    try {
      const refinedScript = await refinePodcastScript(podcastScript);
      setPodcastScript(refinedScript);
      setAnthology(prev => prev ? { ...prev, podcastScript: refinedScript } : null);
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while refining the podcast script.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [podcastScript]);

  const handleGenerateChapterContent = useCallback(async (partIndex: number, chapterIndex: number) => {
    if (!anthology) return;
    setUpdatingInfo({ type: 'chapter-content', partIndex, chapterIndex });
    setError(null);
    try {
      const { content, footnotes } = await generateChapterContent(anthology, partIndex, chapterIndex);
      setAnthology(prev => {
        if (!prev) return null;
        const newAnthology = JSON.parse(JSON.stringify(prev));
        newAnthology.parts[partIndex].chapters[chapterIndex].content = content;
        newAnthology.parts[partIndex].chapters[chapterIndex].footnotes = footnotes;
        return newAnthology;
      });
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while generating chapter content.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);

  const handleGenerateAllChapters = useCallback(async () => {
    if (!anthology) return;
    setError(null);
    try {
      let currentAnthology = JSON.parse(JSON.stringify(anthology));
      for (let pIndex = 0; pIndex < currentAnthology.parts.length; pIndex++) {
        const part = currentAnthology.parts[pIndex];
        for (let cIndex = 0; cIndex < part.chapters.length; cIndex++) {
          const chapter = part.chapters[cIndex];
          if (!chapter.content) {
            setUpdatingInfo({ type: 'chapter-content', partIndex: pIndex, chapterIndex: cIndex });
            const { content, footnotes } = await generateChapterContent(currentAnthology, pIndex, cIndex);
            currentAnthology.parts[pIndex].chapters[cIndex].content = content;
            currentAnthology.parts[pIndex].chapters[cIndex].footnotes = footnotes;
            setAnthology(JSON.parse(JSON.stringify(currentAnthology)));
          }
        }
      }
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred while generating all chapters.');
    } finally {
      setUpdatingInfo(null);
    }
  }, [anthology]);

  return (
    <div className="min-h-screen bg-[#faf6ee] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <Header onOpenLibrary={() => setIsLibraryOpen(true)} draftCount={draftCount} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto p-6 sm:p-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#c59b27]/30 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8b151b] via-[#c59b27] to-[#8b151b]" />
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">📖</span>
              <span className="font-amharic text-[#8b151b] dark:text-amber-400">ስብስብዎን ይፍጠሩ</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">• Create Your Anthology</span>
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-semibold hidden sm:inline-block">
              ኢትዮጵያዊ ብራና • Biranna Manuscript AI
            </span>
          </h2>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                <span>1. Select Genre(s) • ዘውግ ይምረጡ</span>
                <span className="text-xs font-normal text-amber-700 dark:text-amber-400">Multi-select supported</span>
              </label>
              <GenreDropdown
                selectedGenres={genres}
                onChange={setGenres}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="concepts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                2. Enter Key Concepts & Topics (ዋና ርዕሶች እና ጽንሰ-ሀሳቦች)
              </label>
              <FidelTransliterationHelper
                isTransliterating={isTransliterating}
                onToggleTransliteration={(val) => setIsTransliterating(val)}
                onInsertText={(txt) => setConcepts((prev) => (prev ? `${prev} ${txt}` : txt))}
              />
              <textarea
                id="concepts"
                value={concepts}
                onChange={(e) => {
                  const val = e.target.value;
                  setConcepts(isTransliterating ? transliterateToAmharic(val) : val);
                }}
                rows={4}
                placeholder="e.g., 'The philosophy of Stoicism, focusing on Marcus Aurelius...' or 'የኢትዮጵያ ፍልስፍና እና የዘርአ ያዕቆብ አስተምህሮ'"
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white font-amharic"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-6">
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    3. Configure Format, Structure & Tone
                </p>
                
                {/* Format Selection Selector Card */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 mb-2">
                            Writing Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setWritingFormat('book')}
                                className={`py-3 px-4 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                    writingFormat === 'book'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-semibold'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                disabled={isLoading}
                            >
                                <span className="text-xl">📚</span>
                                <span className="text-sm font-medium">Full Anthology Book</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWritingFormat('short')}
                                className={`py-3 px-4 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                    writingFormat === 'short'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-semibold'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                disabled={isLoading}
                            >
                                <span className="text-xl">📄</span>
                                <span className="text-sm font-medium">Short Writing</span>
                            </button>
                        </div>
                    </div>

                    {writingFormat === 'book' ? (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <label htmlFor="partsCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Number of Parts
                                </label>
                                <input
                                    type="number"
                                    id="partsCount"
                                    value={partsCount}
                                    onChange={(e) => setPartsCount(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}
                                    min="1"
                                    max="5"
                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white py-1.5 px-2.5"
                                    disabled={isLoading}
                                    title="Choose between 1 and 5 main Parts for the anthology"
                                />
                            </div>
                            <div>
                                <label htmlFor="chaptersPerPart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Chapters per Part
                                </label>
                                <input
                                    type="number"
                                    id="chaptersPerPart"
                                    value={chaptersPerPart}
                                    onChange={(e) => setChaptersPerPart(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}
                                    min="1"
                                    max="5"
                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white py-1.5 px-2.5"
                                    disabled={isLoading}
                                    title="Choose between 1 and 5 chapters per book part"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="pt-2">
                            <label htmlFor="shortType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Short Writing Style / Genre
                            </label>
                            <select
                                id="shortType"
                                value={shortType}
                                onChange={(e) => setShortType(e.target.value)}
                                className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white py-2 px-3"
                                disabled={isLoading}
                            >
                                <option value="Short Story">Short Story (ትንሽ ታሪክ / ተረት)</option>
                                <option value="Essay">Analytical Essay (በሳል ድርሰት)</option>
                                <option value="Poem">Poetry (ግጥም / ስነ-ጽሁፍ)</option>
                                <option value="Article">Opinion Article (ጽሁፍ / አስተያየት)</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Generates a complete, high-quality, continuous Amharic piece of writing instantly in one click without draft limits.
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Writing Tone • የአጻጻፍ ስልት / ለዛ
                    </label>
                    <ToneDropdown
                        selectedTone={writingTone}
                        onChange={setWritingTone}
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                <span>Or Start with a Pre-Made Thematic Template • ዝግጁ ጭብጥ ይምረጡ</span>
                <span className="text-xs font-normal text-amber-700 dark:text-amber-400">Includes Ethiopian Heritage</span>
              </label>
              <TemplateDropdown
                onSelectTemplate={(template) => {
                  setConcepts(template.prompt);
                  setGenres([template.genre]);
                }}
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-3">
                 <button
                    type="button"
                    onClick={handleSave}
                    disabled={!anthology || isLoading}
                    className="inline-flex items-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Save the current anthology to your browser's storage."
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleLoad}
                    disabled={!savedAnthologyExists || isLoading}
                    className="inline-flex items-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Load the last saved anthology from your browser."
                  >
                    Load
                  </button>
              </div>
              <button
                type="submit"
                disabled={isLoading || !concepts.trim()}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 border border-amber-900/20 shadow-md text-sm font-bold rounded-xl text-white bg-gradient-to-r from-red-700 via-amber-700 to-red-800 hover:from-red-800 hover:to-amber-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 animate-pulse-gold"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                    <span>በመፍጠር ላይ... (Generating...)</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span className="font-amharic">ስብስቡን ፍጠር</span>
                    <span>Generate Anthology</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {feedbackMessage && (
            <div className="max-w-4xl mx-auto mt-6 p-4 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg shadow-md animate-fade-in text-center" role="status">
                <p>{feedbackMessage}</p>
            </div>
        )}

        {error && (
          <div className="max-w-4xl mx-auto mt-6 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg shadow-md animate-fade-in" role="alert">
            <p className="font-bold">An error occurred:</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading && <LoadingSpinner />}
        
        {anthology && !isLoading && (
          <BookDisplay
            anthology={anthology}
            updatingInfo={updatingInfo}
            isGeneratingImages={isGeneratingImages}
            onReviewBook={handleReviewBook}
            onModifyChapter={handleModifyChapter}
            onUpdateChapter={handleUpdateChapter}
            onGenerateCovers={handleGenerateCovers}
            onAddChapter={handleAddChapter}
            onRefineBook={handleRefineBook}
            onExpandShortWriting={handleExpandShortWriting}
            onGenerateGlossary={handleGenerateGlossary}
            onGeneratePodcastScript={() => setShowPodcastOptionsModal(true)}
            onGenerateChapterContent={handleGenerateChapterContent}
            onGenerateAllChapters={handleGenerateAllChapters}
          />
        )}
      </main>

      {showPodcastOptionsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in"
          onClick={() => setShowPodcastOptionsModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Podcast Script Options
            </h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select a Narrative Tone
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  {PODCAST_TONES.map(tone => (
                      <label key={tone} className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-900/50 dark:has-[:checked]:border-indigo-500">
                          <input
                              type="radio"
                              name="podcastTone"
                              value={tone}
                              checked={selectedPodcastTone === tone}
                              onChange={() => setSelectedPodcastTone(tone)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:bg-gray-900 dark:border-gray-600"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{tone}</span>
                      </label>
                  ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => setShowPodcastOptionsModal(false)}
                    className="py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleGeneratePodcastScript}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Generate Script
                </button>
            </div>
          </div>
        </div>
      )}
      
      {podcastScript && (
        <PodcastScriptDisplay 
          script={podcastScript} 
          onClose={() => setPodcastScript(null)}
          onRefineScript={handleRefinePodcastScript}
          isRefining={updatingInfo?.type === 'refine-podcast'}
        />
      )}

      {/* Multi-Draft Library Modal */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => {
          setIsLibraryOpen(false);
          setDraftCount(getSavedDrafts().length);
        }}
        onSelectDraft={handleSelectDraft}
        currentAnthologyId={anthology?.id}
      />

    </div>
  );
}

// FIX: Add default export to make this file a module, resolving the error in index.tsx.
export default App;