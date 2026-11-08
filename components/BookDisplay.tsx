import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Anthology, UpdatingInfo, Chapter } from '../types';
import {
  AlignJustifyIcon, AlignLeftIcon, ArrowsPointingOutIcon, BookmarkIcon,
  DocumentMagnifyingGlassIcon, GlobeAltIcon, MinusIcon, PhotoIcon, PlusCircleIcon,
  PlusIcon, SparklesIcon, WandSparklesIcon, AlignCenterIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardIcon,
  MicrophoneIcon, ArrowDownTrayIcon
} from './icons';
import CitationModal from './CitationModal';
import HaragOrnament from './HaragOrnament';
import AudioNarrationPlayer from './AudioNarrationPlayer';
import InlineChapterEditor from './InlineChapterEditor';
import TableOfContentsDrawer from './TableOfContentsDrawer';
import { toGeezNumeral, computeTextMetrics } from '../utils/geezUtils';
import { exportToEpub, exportToMarkdown, exportToJson } from '../utils/exportUtils';
import { playPageTurnSound, ambientSoundscape } from '../utils/soundEffects';

interface BookDisplayProps {
  anthology: Anthology;
  updatingInfo: UpdatingInfo | null;
  isGeneratingImages: boolean;
  onReviewBook: () => void;
  onModifyChapter: (partIndex: number, chapterIndex: number, action: 'expand' | 'review' | 'linguistic-expert') => void;
  onUpdateChapter?: (partIndex: number, chapterIndex: number, updatedChapter: Chapter) => void;
  onGenerateCovers: () => void;
  onAddChapter: () => void;
  onRefineBook: () => void;
  onExpandShortWriting?: (expansionStyle: 'elaborate' | 'continue' | 'directed', customInstruction?: string) => void;
  onGenerateGlossary: () => void;
  onGeneratePodcastScript: () => void;
  onGenerateChapterContent: (partIndex: number, chapterIndex: number) => void;
  onGenerateAllChapters?: () => void;
}

const ChapterActions: React.FC<{
  partIndex: number;
  chapterIndex: number;
  onModifyChapter: BookDisplayProps['onModifyChapter'];
  onStartEditing?: (partIndex: number, chapterIndex: number) => void;
  onStartAudio?: () => void;
  hasContent?: boolean;
  updatingInfo: UpdatingInfo | null;
}> = ({ partIndex, chapterIndex, onModifyChapter, onStartEditing, onStartAudio, hasContent, updatingInfo }) => {
  const isUpdating = updatingInfo?.type === 'chapter' && updatingInfo.partIndex === partIndex && updatingInfo.chapterIndex === chapterIndex;
  
  const actions: { name: string; icon: React.ReactNode; action: 'expand' | 'review' | 'linguistic-expert' }[] = [
    { name: 'Expand', icon: <ArrowsPointingOutIcon className="w-4 h-4" />, action: 'expand' },
    { name: 'Review & Rewrite', icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" />, action: 'review' },
    { name: 'Linguistic Polish', icon: <SparklesIcon className="w-4 h-4" />, action: 'linguistic-expert' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mt-4 print:hidden">
      {hasContent && onStartAudio && (
        <button
          onClick={onStartAudio}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200 transition-colors border border-amber-300 dark:border-amber-800 font-semibold"
          title="Listen to this chapter with Audio Narration"
        >
          <span>🎙️</span>
          <span>አድምጥ (Listen)</span>
        </button>
      )}

      {hasContent && onStartEditing && (
        <button
          onClick={() => onStartEditing(partIndex, chapterIndex)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border border-blue-200 dark:border-blue-800 font-semibold"
          title="Direct in-line chapter editing"
        >
          <span>✍️</span>
          <span>አርትዕ (Edit)</span>
        </button>
      )}

      {actions.map(({ name, icon, action }) => (
        <button
          key={action}
          onClick={() => onModifyChapter(partIndex, chapterIndex, action)}
          disabled={!!isUpdating}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
          title={name}
        >
          {isUpdating && updatingInfo?.action === action ? (
            <div className="w-4 h-4 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
          ) : (
            icon
          )}
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
};

const CoverImage: React.FC<{ title: string; image?: string; concept: string; isGenerating: boolean; }> = ({ title, image, concept, isGenerating }) => (
    <div className="border dark:border-gray-600 rounded-lg overflow-hidden shadow-lg aspect-[3/4] flex flex-col">
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="font-semibold text-center text-sm">{title}</h3>
      </div>
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
        {isGenerating ? (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">Generating...</p>
          </div>
        ) : image ? (
          <img src={`data:image/jpeg;base64,${image}`} alt={concept} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <PhotoIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">Image not generated</p>
          </div>
        )}
      </div>
    </div>
  );

const parseHtmlToNodes = (htmlString: string, keyPrefix: string): React.ReactNode[] => {
    if (typeof window === 'undefined') {
        return [<div key={keyPrefix} dangerouslySetInnerHTML={{ __html: htmlString }} />];
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${htmlString}</body>`, 'text/html');
    return Array.from(doc.body.children).map((el, index) => {
        const html = el.outerHTML;
        return <div className="html-block" key={`${keyPrefix}-${index}`} dangerouslySetInnerHTML={{ __html: html }} />;
    });
};

const BookDisplay: React.FC<BookDisplayProps> = ({
  anthology,
  updatingInfo,
  isGeneratingImages,
  onReviewBook,
  onModifyChapter,
  onUpdateChapter,
  onGenerateCovers,
  onAddChapter,
  onRefineBook,
  onExpandShortWriting,
  onGenerateGlossary,
  onGeneratePodcastScript,
  onGenerateChapterContent,
  onGenerateAllChapters,
}) => {
    const [viewMode, setViewMode] = useState<'book' | 'scroll'>('scroll');
    const [theme, setTheme] = useState<'biranna' | 'modern' | 'night'>(anthology.theme || 'biranna');
    const [fontFamily, setFontFamily] = useState<'noto-serif' | 'abyssinica' | 'sans'>(anthology.font || 'noto-serif');
    const [useGeezNumerals, setUseGeezNumerals] = useState<boolean>(anthology.useGeezNumerals ?? true);
    const [audioNarration, setAudioNarration] = useState<{ title: string; text: string } | null>(null);
    const [editingChapter, setEditingChapter] = useState<{ partIndex: number; chapterIndex: number } | null>(null);
    const [pages, setPages] = useState<React.ReactNode[][]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isPaginating, setIsPaginating] = useState(true);
    const [showCitationModal, setShowCitationModal] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [textAlign, setTextAlign] = useState<'text-left' | 'text-justify'>('text-left');
    const [isBookCopied, setIsBookCopied] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [isTOCDrawerOpen, setIsTOCDrawerOpen] = useState(false);
    const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);

    useEffect(() => {
        return () => {
            ambientSoundscape.stop();
        };
    }, []);
    
    // States for short writing expansion feature
    const [shortExpandStyle, setShortExpandStyle] = useState<'elaborate' | 'continue' | 'directed'>('elaborate');
    const [shortCustomPrompt, setShortCustomPrompt] = useState<string>('');
    
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const measurementRef = useRef<HTMLDivElement>(null);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const [measurementWidth, setMeasurementWidth] = useState(0);

    const isBookComplete = useMemo(() => {
        if (!anthology) return false;
        if (anthology.format === 'short') return true;
        if (!anthology.parts) return false;
        return anthology.parts.every(part =>
            part.chapters.every(chapter => !!chapter.content)
        );
    }, [anthology]);

    // Compute text metrics (fidel count, word count, reading time)
    const textMetrics = useMemo(() => {
        let fullText = `${anthology.title} ${anthology.preface || ''} ${anthology.summary || ''} `;
        if (anthology.format === 'short') {
            fullText += anthology.shortContent || '';
        } else if (anthology.parts) {
            anthology.parts.forEach(p => {
                p.chapters.forEach(c => {
                    fullText += `${c.title || ''} ${c.content || c.outline || ''} `;
                });
            });
        }
        return computeTextMetrics(fullText);
    }, [anthology]);

    const allBookElements = useMemo<React.ReactNode[]>(() => {
        const elements: React.ReactNode[] = [];
        elements.push(
            <div key="cover" className="flex flex-col h-full">
                <HaragOrnament variant="header" theme={theme} className="mb-2" />
                <h1 className="text-4xl sm:text-5xl font-bold text-center font-serif font-amharic my-6 text-red-900 dark:text-red-400">
                  {anthology.title}
                </h1>
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <CoverImage title="Front Cover" image={anthology.frontCoverImage} concept={anthology.frontCoverConcept} isGenerating={isGeneratingImages && !anthology.frontCoverImage} />
                    <CoverImage title="Back Cover" image={anthology.backCoverImage} concept={anthology.backCoverConcept} isGenerating={isGeneratingImages && !!anthology.frontCoverImage && !anthology.backCoverImage} />
                </div>
                {!anthology.frontCoverImage && !anthology.backCoverImage && (
                    <div className="text-center mt-6">
                        <button onClick={onGenerateCovers} disabled={isGeneratingImages} className="inline-flex items-center gap-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                            {isGeneratingImages ? <><div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div>Generating Images...</> : <><PhotoIcon className="w-5 h-5" />Generate Cover Images</>}
                        </button>
                    </div>
                )}
            </div>
        );

        elements.push(
            <div key="preface-wrapper" className="page-break-before mt-8">
                <HaragOrnament variant="header" theme={theme} />
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold font-amharic text-red-900 dark:text-red-400">መቅድም • Preface</h2>
                    <button
                        onClick={() => setAudioNarration({ title: `${anthology.title} - መቅድም`, text: anthology.preface })}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors"
                        title="Listen to Preface"
                    >
                        <span>🎙️</span>
                        <span>አድምጥ (Listen)</span>
                    </button>
                </div>
            </div>
        );
        elements.push(...parseHtmlToNodes(anthology.preface, 'preface'));

        if (anthology.format === 'short') {
            elements.push(
                <div key="short-format-badge" className="p-4 my-6 bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-amber-600 rounded-r-lg text-sm text-amber-900 dark:text-amber-300">
                    <div className="font-semibold mb-1 flex items-center justify-between">
                        <span>✨ {anthology.shortType || 'Short Writing'} (አጭር ጽሁፍ)</span>
                        {anthology.shortContent && (
                            <button
                                onClick={() => setAudioNarration({ title: anthology.title, text: anthology.shortContent || '' })}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200"
                            >
                                <span>🎙️</span>
                                <span>አድምጥ (Listen)</span>
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ይህ የፈጠራ ስራ ተጠናቋል። ለማስፋት ወይም ለማሻሻል ከታች ያሉትን መሳሪያዎች ይጠቀሙ።</p>
                </div>
            );
            
            if (anthology.shortContent) {
                elements.push(<div key="short-content-title" className="page-break-before text-2xl font-bold font-amharic mt-6 mb-3 text-red-900 dark:text-red-400">Core Content</div>);
                elements.push(...parseHtmlToNodes(anthology.shortContent, 'short-content'));
            } else {
                elements.push(
                    <div key="no-short-content" className="p-4 my-4 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200 rounded">
                        Core content was not generated yet.
                    </div>
                );
            }
        } else if (anthology.parts) {
            anthology.parts.forEach((part, pIndex) => {
                const partNum = useGeezNumerals ? toGeezNumeral(pIndex + 1) : `${pIndex + 1}`;
                elements.push(
                    <div key={`part-header-${pIndex}`} className="page-break-before mt-12 mb-6">
                        <HaragOrnament variant="header" theme={theme} />
                        <div className="text-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                ክፍል {partNum} • Part {pIndex + 1}
                            </span>
                            <h2 className="text-3xl font-bold font-amharic text-red-900 dark:text-red-400 mt-1">{part.title}</h2>
                        </div>
                    </div>
                );

                part.chapters.forEach((chapter, cIndex) => {
                    const chapNum = useGeezNumerals ? toGeezNumeral(cIndex + 1) : `${cIndex + 1}`;
                    const isEditing = editingChapter?.partIndex === pIndex && editingChapter?.chapterIndex === cIndex;

                    if (isEditing) {
                        elements.push(
                            <InlineChapterEditor
                                key={`editor-${pIndex}-${cIndex}`}
                                chapter={chapter}
                                partIndex={pIndex}
                                chapterIndex={cIndex}
                                theme={theme}
                                onCancel={() => setEditingChapter(null)}
                                onSave={(p, c, updated) => {
                                    onUpdateChapter?.(p, c, updated);
                                    setEditingChapter(null);
                                }}
                            />
                        );
                    } else {
                        elements.push(
                            <div key={`chapter-header-${pIndex}-${cIndex}`} id={`part-${pIndex}-chapter-${cIndex}`} className="page-break-before mt-8 mb-4 scroll-mt-20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            ምዕራፍ {chapNum}
                                        </span>
                                        <h3 className="text-2xl font-bold font-amharic text-gray-900 dark:text-gray-100">{chapter.title}</h3>
                                    </div>
                                    {chapter.content && (
                                        <button
                                            onClick={() => setAudioNarration({ title: `ምዕራፍ ${chapNum}: ${chapter.title}`, text: chapter.content || '' })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors"
                                            title="Listen to this chapter"
                                        >
                                            <span>🎙️</span>
                                            <span>አድምጥ</span>
                                        </button>
                                    )}
                                </div>
                                <HaragOrnament variant="divider" theme={theme} className="my-2" />
                            </div>
                        );

                        if (chapter.content) {
                            elements.push(...parseHtmlToNodes(chapter.content, `content-${pIndex}-${cIndex}`));
                            if (chapter.footnotes && chapter.footnotes.length > 0) {
                                elements.push(
                                    <div key={`footnotes-${pIndex}-${cIndex}`} className="mt-8 pt-4 border-t dark:border-gray-600">
                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2">
                                            አောက်ခြေማስታወሻዎች • Footnotes
                                        </h4>
                                        <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600 dark:text-gray-400 font-amharic">
                                            {chapter.footnotes.sort((a, b) => a.id - b.id).map(fn => <li key={fn.id}>{fn.text}</li>)}
                                        </ol>
                                    </div>
                                );
                            }
                            elements.push(
                                <ChapterActions
                                    key={`actions-${pIndex}-${cIndex}`}
                                    partIndex={pIndex}
                                    chapterIndex={cIndex}
                                    onModifyChapter={onModifyChapter}
                                    onStartEditing={() => setEditingChapter({ partIndex: pIndex, chapterIndex: cIndex })}
                                    onStartAudio={() => setAudioNarration({ title: `ምዕራፍ ${chapNum}: ${chapter.title}`, text: chapter.content || '' })}
                                    hasContent={true}
                                    updatingInfo={updatingInfo}
                                />
                            );
                        } else {
                            const isGeneratingContent = updatingInfo?.type === 'chapter-content' && updatingInfo.partIndex === pIndex && updatingInfo.chapterIndex === cIndex;
                            elements.push(
                                <div key={`outline-${pIndex}-${cIndex}`} className="p-4 my-4 border-l-4 border-amber-500 bg-amber-50/70 dark:bg-gray-700/50 rounded-r-lg print:hidden">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">Chapter Outline:</p>
                                    <p className="italic text-gray-600 dark:text-gray-400 font-abyssinica">{chapter.outline}</p>
                                    <div className="mt-4">
                                        <button
                                            onClick={() => onGenerateChapterContent(pIndex, cIndex)}
                                            disabled={isGeneratingContent || !!updatingInfo}
                                            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-amber-700 text-white hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isGeneratingContent ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                                                    <span>Generating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <SparklesIcon className="w-4 h-4" />
                                                    <span>Generate Full Chapter</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                    }
                });
            });
        }
        
        elements.push(
            <div key="summary-wrapper" className="page-break-before mt-10">
                <HaragOrnament variant="header" theme={theme} />
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold font-amharic text-red-900 dark:text-red-400">ማጠቃለያ • Summary</h2>
                    <button
                        onClick={() => setAudioNarration({ title: `${anthology.title} - ማጠቃለያ`, text: anthology.summary })}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors"
                        title="Listen to Summary"
                    >
                        <span>🎙️</span>
                        <span>አድምጥ (Listen)</span>
                    </button>
                </div>
            </div>
        );
        elements.push(...parseHtmlToNodes(anthology.summary, 'summary'));

        if (anthology.glossary && anthology.glossary.length > 0) {
            elements.push(
                <div key="glossary-wrapper" className="page-break-before mt-10">
                    <HaragOrnament variant="header" theme={theme} />
                    <h2 className="text-3xl font-bold font-amharic text-red-900 dark:text-red-400 mb-4">የቃላት መፍቻ • Glossary</h2>
                </div>
            );
            elements.push(
                <div key="glossary-table" className="overflow-x-auto my-4 border rounded-lg border-amber-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-amber-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-amber-900 dark:text-gray-200 uppercase tracking-wider">Term (Amharic)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-amber-900 dark:text-gray-200 uppercase tracking-wider">Definition (English)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {anthology.glossary.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-amharic text-red-900 dark:text-red-400">{item.term}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-700 dark:text-gray-300">{item.definition}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        return elements;
    }, [anthology, theme, useGeezNumerals, editingChapter, isGeneratingImages, onGenerateCovers, onModifyChapter, updatingInfo, onGenerateChapterContent, onUpdateChapter]);

    const handleCopyBook = () => {
        if (!anthology) return;

        const htmlToPlainText = (html: string): string => {
            const tempDiv = document.createElement("div");
            html = html.replace(/<\/p>/gi, "</p>\n").replace(/<br\s*\/?>/gi, "\n");
            tempDiv.innerHTML = html;
            return (tempDiv.textContent || tempDiv.innerText || "").trim();
        };

        const lines: string[] = [];
        lines.push(`Title: ${anthology.title}`);
        lines.push('='.repeat(40));
        lines.push('\nPREFACE\n');
        lines.push(htmlToPlainText(anthology.preface));
        lines.push('\n');

        if (anthology.format === 'short') {
            lines.push('='.repeat(40));
            lines.push(`CONTENT (${anthology.shortType || 'Short Writing'})\n`);
            lines.push(htmlToPlainText(anthology.shortContent ?? ''));
            lines.push('\n');
        } else if (anthology.parts) {
            anthology.parts.forEach((part, pIndex) => {
                lines.push('='.repeat(40));
                lines.push(`PART ${pIndex + 1}: ${part.title}\n`);
                part.chapters.forEach((chapter, cIndex) => {
                    lines.push('-'.repeat(20));
                    lines.push(`Chapter ${cIndex + 1}: ${chapter.title}\n`);
                    if (chapter.content) {
                        lines.push(htmlToPlainText(chapter.content));
                        if (chapter.footnotes && chapter.footnotes.length > 0) {
                            lines.push('\nFootnotes:');
                            chapter.footnotes.sort((a, b) => a.id - b.id).forEach(fn => {
                                lines.push(`  [${fn.id}] ${fn.text}`);
                            });
                        }
                    } else {
                        lines.push(`[Content not yet generated for this chapter. Outline: ${chapter.outline}]`);
                    }
                    lines.push('\n');
                });
            });
        }

        lines.push('='.repeat(40));
        lines.push('SUMMARY\n');
        lines.push(htmlToPlainText(anthology.summary));
        lines.push('\n');

        if (anthology.glossary && anthology.glossary.length > 0) {
            lines.push('='.repeat(40));
            lines.push('GLOSSARY\n');
            anthology.glossary.forEach(item => {
                lines.push(`${item.term}: ${item.definition}`);
            });
            lines.push('\n');
        }

        const fullText = lines.join('\n');
        navigator.clipboard.writeText(fullText).then(() => {
            setIsBookCopied(true);
            setTimeout(() => setIsBookCopied(false), 2500);
        }).catch(err => {
            console.error('Failed to copy book content:', err);
        });
    };

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setShowExportDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const downloadFile = (content: string, filename: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportHtml = () => {
        if (!anthology) return;

        const partsHtml = anthology.format === 'short'
            ? `
                <div class="part page-break">
                    <h2 class="part-title">${anthology.shortType || 'Short Creative Writing'}</h2>
                    <div class="chapter-content">
                        ${anthology.shortContent || ''}
                    </div>
                </div>
            `
            : (anthology.parts || []).map((part, pIndex) => {
                const chaptersHtml = part.chapters.map((chapter, cIndex) => {
                    const hasFootnotes = chapter.footnotes && chapter.footnotes.length > 0;
                    const footnotesListHtml = hasFootnotes 
                        ? `<div class="footnotes-section">
                            <h4>አောက်ခြေማስታወሻዎች / Footnotes</h4>
                            <ol>
                                ${chapter.footnotes.map(fn => `<li>${fn.text}</li>`).join('')}
                            </ol>
                           </div>`
                        : '';

                    return `
                        <div class="chapter page-break">
                            <h3 class="chapter-title">ምዕራፍ ${cIndex + 1}: ${chapter.title}</h3>
                            <div class="chapter-content">
                                ${chapter.content || `<p class="incomplete-tag">[ይዘት ገና አልተፈጠረም - ምዕራፍ ረቂቅ: ${chapter.outline}]</p>`}
                            </div>
                            ${footnotesListHtml}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="part page-break">
                        <h2 class="part-title">${part.title}</h2>
                        ${chaptersHtml}
                    </div>
                `;
            }).join('');

        const glossaryHtml = (anthology.glossary && anthology.glossary.length > 0)
            ? `
                <div class="glossary page-break">
                    <h2 class="section-title">የቃላት መፍቻ / Glossary</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Term (Amharic)</th>
                                <th>Definition (English)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${anthology.glossary.map(item => `
                                <tr>
                                    <td class="term-cell">${item.term}</td>
                                    <td class="definition-cell">${item.definition}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `
            : '';

        const frontCoverBase64 = anthology.frontCoverImage 
            ? `data:image/jpeg;base64,${anthology.frontCoverImage}`
            : null;
        const backCoverBase64 = anthology.backCoverImage 
            ? `data:image/jpeg;base64,${anthology.backCoverImage}`
            : null;

        const coverHtml = (frontCoverBase64 || backCoverBase64)
            ? `
                <div class="covers-container page-break">
                    ${frontCoverBase64 ? `
                        <div class="cover-page front-cover">
                            <div class="cover-label">FRONT COVER</div>
                            <img class="cover-img" src="${frontCoverBase64}" alt="Front Cover image" />
                        </div>
                    ` : ''}
                    ${backCoverBase64 ? `
                        <div class="cover-page back-cover">
                            <div class="cover-label">BACK COVER</div>
                            <img class="cover-img" src="${backCoverBase64}" alt="Back Cover image" />
                        </div>
                    ` : ''}
                </div>
            `
            : '';

        const htmlContent = `
<!DOCTYPE html>
<html lang="am">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${anthology.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Abyssinica+SIL&family=Noto+Serif+Ethiopic:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #fcfbf7;
            --text-color: #1a1a1a;
            --card-bg: #ffffff;
            --border-color: #e5e7eb;
            --primary-color: #4f46e5;
            --secondary-text: #4b5563;
        }

        .dark-mode {
            --bg-color: #111827;
            --text-color: #f9fafb;
            --card-bg: #1f2937;
            --border-color: #374151;
            --primary-color: #6366f1;
            --secondary-text: #9ca3af;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Noto Serif Ethiopic', 'Abyssinica SIL', Georgia, serif;
            line-height: 1.7;
            transition: background-color 0.3s, color 0.3s;
            padding-top: 70px;
        }

        /* Floating action header */
        .action-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--card-bg);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-family: 'Inter', sans-serif;
        }

        .action-bar-title {
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--primary-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 40%;
        }

        .action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid var(--border-color);
            background-color: var(--card-bg);
            color: var(--text-color);
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background-color: var(--primary-color);
            color: #ffffff;
            border-color: transparent;
        }

        .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        /* Main container layout */
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        /* Styling of the components */
        .book-title {
            text-align: center;
            font-size: 2.75rem;
            font-weight: 700;
            margin: 40px 0;
            color: var(--text-color);
            font-family: 'Noto Serif Ethiopic', serif;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 20px;
        }

        .covers-container {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
            margin-bottom: 60px;
        }

        .cover-page {
            flex: 1;
            min-width: 280px;
            max-width: 340px;
            border: 1px solid var(--border-color);
            background-color: var(--card-bg);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            text-align: center;
        }

        .cover-label {
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            color: var(--secondary-text);
            margin-bottom: 12px;
            font-weight: 700;
        }

        .cover-img {
            width: 100%;
            height: auto;
            aspect-ratio: 3/4;
            object-fit: cover;
            border-radius: 4px;
        }

        .section-title {
            font-size: 2rem;
            font-weight: 700;
            margin-top: 50px;
            margin-bottom: 24px;
            border-bottom: 1px dashed var(--border-color);
            padding-bottom: 10px;
        }

        .part-title {
            font-size: 2.25rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-top: 60px;
            margin-bottom: 30px;
            text-align: center;
            border-top: 2px solid var(--border-color);
            padding-top: 30px;
        }

        .chapter {
            margin-bottom: 50px;
        }

        .chapter-title {
            font-size: 1.65rem;
            font-weight: 700;
            margin-bottom: 20px;
            margin-top: 40px;
            color: var(--text-color);
        }

        .chapter-content {
            font-size: 1.125rem;
            line-height: 1.8;
            text-align: justify;
        }

        .chapter-content p {
            margin-bottom: 20px;
            text-indent: 1.5em;
        }

        .chapter-content h2, .chapter-content h3 {
            margin: 30px 0 15px 0;
            text-align: left;
        }

        .chapter-content ul, .chapter-content ol {
            margin-bottom: 20px;
            padding-left: 30px;
        }

        .chapter-content li {
            margin-bottom: 8px;
        }

        .incomplete-tag {
            color: #ef4444;
            font-style: italic;
            text-align: center;
            background-color: rgba(239, 68, 68, 0.1);
            padding: 12px;
            border-radius: 6px;
            border: 1px dashed #ef4444;
        }

        .footnotes-section {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
            color: var(--secondary-text);
            font-size: 0.93rem;
        }

        .footnotes-section h4 {
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .footnotes-section ol {
            padding-left: 20px;
        }

        .footnotes-section li {
            margin-bottom: 6px;
        }

        /* Glossary Table */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
        }

        th, td {
            padding: 14px 18px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        th {
            background-color: var(--border-color);
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--secondary-text);
        }

        .term-cell {
            font-weight: 700;
            color: var(--text-color);
        }

        .definition-cell {
            color: var(--secondary-text);
        }

        /* Printable optimization style rules */
        @media print {
            body {
                background-color: #ffffff !important;
                color: #000000 !important;
                font-size: 11pt !important;
                padding-top: 0 !important;
            }

            .action-bar {
                display: none !important;
            }

            .container {
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
            }

            .page-break {
                page-break-before: always !important;
                break-before: page !important;
            }

            .covers-container {
                display: block !important;
            }

            .cover-page {
                border: none !important;
                box-shadow: none !important;
                page-break-after: always !important;
                break-after: page !important;
                max-width: 100% !important;
                height: 100vh !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
            }

            .cover-img {
                max-height: 80% !important;
                width: auto !important;
                margin: auto !important;
            }

            th {
                background-color: #f3f4f6 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <header class="action-bar no-print">
        <div class="action-bar-title">${anthology.title}</div>
        <div class="action-buttons">
            <button class="btn" onclick="toggleDarkMode()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <span>የጨለማ ሁኔታ / Dark Mode</span>
            </button>
            <button class="btn btn-primary" onclick="window.print()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>ማተም ወይም ፒዲኤፍ ማስቀመጥ / Print as PDF</span>
            </button>
        </div>
    </header>

    <div class="container">
        <h1 class="book-title">${anthology.title}</h1>

        ${coverHtml}

        <div class="preface">
            <h2 class="section-title">መቅድም / Preface</h2>
            <div class="chapter-content">
                ${anthology.preface}
            </div>
        </div>

        ${partsHtml}

        <div class="summary">
            <h2 class="section-title">ማጠቃለያ / Summary</h2>
            <div class="chapter-content">
                ${anthology.summary}
            </div>
        </div>

        ${glossaryHtml}
    </div>

    <script>
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
        }
    </script>
</body>
</html>
        `;

        downloadFile(htmlContent, `${anthology.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anthology.html`, 'text/html');
    };

    const handleExportMarkdown = () => {
        if (!anthology) return;

        const htmlToMarkdown = (html: string): string => {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;
            
            // Basic replacements
            let content = html;
            content = content.replace(/<h[123][^>]*>(.*?)<\/h[123]>/gi, '\n### $1\n');
            content = content.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
            content = content.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
            content = content.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
            content = content.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
            content = content.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
            content = content.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
            content = content.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n');
            content = content.replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1\n');
            content = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1');
            content = content.replace(/<br\s*\/?>/gi, '\n');
            content = content.replace(/<sup>(.*?)<\/sup>/gi, '[^$1]');
            
            tempDiv.innerHTML = content;
            return (tempDiv.textContent || tempDiv.innerText || "").trim().replace(/\n{3,}/g, '\n\n');
        };

        const lines: string[] = [];
        lines.push(`# ${anthology.title}\n`);
        lines.push(`*Generated using Amharic Anthology Generator AI*\n`);
        lines.push(`---\n`);
        lines.push(`## Preface\n`);
        lines.push(htmlToMarkdown(anthology.preface));
        lines.push('\n');

        if (anthology.format === 'short') {
            lines.push(`---\n`);
            lines.push(`## ${anthology.shortType || 'Short Creative Writing'}\n`);
            lines.push(htmlToMarkdown(anthology.shortContent ?? ''));
            lines.push('\n');
        } else if (anthology.parts) {
            anthology.parts.forEach((part, pIndex) => {
                lines.push(`---\n`);
                lines.push(`## Part ${pIndex + 1}: ${part.title}\n`);
                part.chapters.forEach((chapter, cIndex) => {
                    lines.push(`### Chapter ${cIndex + 1}: ${chapter.title}\n`);
                    if (chapter.content) {
                        lines.push(htmlToMarkdown(chapter.content));
                        if (chapter.footnotes && chapter.footnotes.length > 0) {
                            lines.push('\n**Footnotes:**');
                            chapter.footnotes.sort((a, b) => a.id - b.id).forEach(fn => {
                                lines.push(`- [^${fn.id}]: ${fn.text}`);
                            });
                        }
                    } else {
                        lines.push(`*Outline: ${chapter.outline}* (Content not yet generated)`);
                    }
                    lines.push('\n');
                });
            });
        }

        lines.push(`---\n`);
        lines.push(`## Summary\n`);
        lines.push(htmlToMarkdown(anthology.summary));
        lines.push('\n');

        if (anthology.glossary && anthology.glossary.length > 0) {
            lines.push(`---\n`);
            lines.push(`## Glossary\n`);
            lines.push(`| Term (Amharic) | Definition (English) |`);
            lines.push(`| --- | --- |`);
            anthology.glossary.forEach(item => {
                lines.push(`| ${item.term} | ${item.definition} |`);
            });
            lines.push('\n');
        }

        const fullMdContent = lines.join('\n');
        downloadFile(fullMdContent, `${anthology.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anthology.md`, 'text/markdown');
    };

    const handleExportPlainText = () => {
        if (!anthology) return;

        const htmlToPlainText = (html: string): string => {
            const tempDiv = document.createElement("div");
            html = html.replace(/<\/p>/gi, "</p>\n").replace(/<br\s*\/?>/gi, "\n");
            tempDiv.innerHTML = html;
            return (tempDiv.textContent || tempDiv.innerText || "").trim();
        };

        const lines: string[] = [];
        lines.push(`Title: ${anthology.title}`);
        lines.push('='.repeat(40));
        lines.push('\nPREFACE\n');
        lines.push(htmlToPlainText(anthology.preface));
        lines.push('\n');

        if (anthology.format === 'short') {
            lines.push('='.repeat(40));
            lines.push(`CONTENT (${anthology.shortType || 'Short Creative Writing'})\n`);
            lines.push(htmlToPlainText(anthology.shortContent ?? ''));
            lines.push('\n');
        } else if (anthology.parts) {
            anthology.parts.forEach((part, pIndex) => {
                lines.push('='.repeat(40));
                lines.push(`PART ${pIndex + 1}: ${part.title}\n`);
                part.chapters.forEach((chapter, cIndex) => {
                    lines.push('-'.repeat(20));
                    lines.push(`Chapter ${cIndex + 1}: ${chapter.title}\n`);
                    if (chapter.content) {
                        lines.push(htmlToPlainText(chapter.content));
                        if (chapter.footnotes && chapter.footnotes.length > 0) {
                            lines.push('\nFootnotes:');
                            chapter.footnotes.sort((a, b) => a.id - b.id).forEach(fn => {
                                lines.push(`  [${fn.id}] ${fn.text}`);
                            });
                        }
                    } else {
                        lines.push(`[Content not yet generated for this chapter. Outline: ${chapter.outline}]`);
                    }
                    lines.push('\n');
                });
            });
        }

        lines.push('='.repeat(40));
        lines.push('SUMMARY\n');
        lines.push(htmlToPlainText(anthology.summary));
        lines.push('\n');

        if (anthology.glossary && anthology.glossary.length > 0) {
            lines.push('='.repeat(40));
            lines.push('GLOSSARY\n');
            anthology.glossary.forEach(item => {
                lines.push(`${item.term}: ${item.definition}`);
            });
            lines.push('\n');
        }

        const fullText = lines.join('\n');
        downloadFile(fullText, `${anthology.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anthology.txt`, 'text/plain');
    };
    
    useEffect(() => {
      const observer = new ResizeObserver(entries => {
        if (entries[0]) {
          setMeasurementWidth(entries[0].contentRect.width);
        }
      });
      if (pageContainerRef.current) {
        observer.observe(pageContainerRef.current);
      }
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!measurementRef.current || !pageContainerRef.current || allBookElements.length === 0 || measurementWidth === 0) {
            return;
        }

        setIsPaginating(true);
        const pageHeight = pageContainerRef.current.clientHeight - 64; // Vertical padding
        const newPages: React.ReactNode[][] = [];
        let currentPageElements: React.ReactNode[] = [];
        let currentHeight = 0;
        
        const domNodes = Array.from(measurementRef.current.children);
        if (domNodes.length !== allBookElements.length) {
            console.error("Pagination measurement mismatch: DOM nodes and React nodes count do not align.");
            setTimeout(() => { // Use timeout to retry after DOM updates
                if (measurementRef.current?.children.length === allBookElements.length) {
                    setMeasurementWidth(w => w + 1); // Trigger remeasurement
                } else {
                   setPages([allBookElements]);
                   setIsPaginating(false);
                }
            }, 100);
            return;
        }

        domNodes.forEach((node, index) => {
            const el = node as HTMLElement;
            const style = window.getComputedStyle(el);
            const elementHeight = el.offsetHeight + parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);
            const isPageBreakForced = el.classList.contains('page-break-before');

            if ((isPageBreakForced || (currentHeight + elementHeight > pageHeight)) && currentPageElements.length > 0) {
                newPages.push(currentPageElements);
                currentPageElements = [];
                currentHeight = 0;
            }
            
            currentPageElements.push(allBookElements[index]);
            currentHeight += elementHeight;
        });

        if (currentPageElements.length > 0) {
            newPages.push(currentPageElements);
        }
        
        setPages(newPages);
        setCurrentPage(p => Math.min(p, newPages.length - 1));
        setIsPaginating(false);

    }, [allBookElements, fontSize, textAlign, measurementWidth]);

    return (
        <div className="max-w-5xl mx-auto mt-8 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl animate-fade-in border border-gray-200 dark:border-gray-700">
            <header className="border-b pb-4 mb-6 dark:border-gray-600">
                <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 dark:text-white mb-2 font-amharic">{anthology.title}</h1>
                <div className="flex flex-wrap justify-center items-center gap-2 mt-4 print:hidden">
                    {anthology.format !== 'short' && (
                        <button
                            onClick={() => setIsTOCDrawerOpen(true)}
                            className="action-button bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold shadow-xs"
                            title="Open interactive Table of Contents drawer (ማውጫ)"
                        >
                            <span>📑</span>
                            <span>ማውጫ (TOC)</span>
                        </button>
                    )}
                    {!isBookComplete && onGenerateAllChapters && (
                        <button onClick={onGenerateAllChapters} disabled={!!updatingInfo} className="action-button bg-indigo-600 hover:bg-indigo-700 text-white border-transparent dark:bg-indigo-600 dark:hover:bg-indigo-500" title="Generate full content for all pending chapters sequentially">
                            {updatingInfo?.type === 'chapter-content' ? <div className="spinner"></div> : <SparklesIcon className="w-4 h-4"/>} Generate All Chapters
                        </button>
                    )}
                    <button onClick={onRefineBook} disabled={!!updatingInfo || !isBookComplete} className="action-button" title={!isBookComplete ? "Generate all chapters before refining" : "Refine the entire book's text"}>
                        {updatingInfo?.type === 'book-refine' ? <div className="spinner"></div> : <WandSparklesIcon className="w-4 h-4"/>} Refine Book
                    </button>
                    <button onClick={onGeneratePodcastScript} disabled={!!updatingInfo || !isBookComplete} className="action-button" title={!isBookComplete ? "Generate all chapters before creating a podcast script" : "Convert book to a podcast script"}>
                        {updatingInfo?.type === 'generate-podcast' ? <div className="spinner"></div> : <MicrophoneIcon className="w-4 h-4"/>} Podcast Script
                    </button>
                    {anthology.format !== 'short' && (
                        <button onClick={onAddChapter} disabled={!!updatingInfo} className="action-button" title="Add a new chapter to the final part">
                            {updatingInfo?.type === 'add-chapter' ? <div className="spinner"></div> : <PlusCircleIcon className="w-4 h-4"/>} Add Chapter
                        </button>
                    )}
                    <button onClick={onGenerateGlossary} disabled={!!updatingInfo || !isBookComplete} className="action-button" title={!isBookComplete ? "Generate all chapters before creating a glossary" : "Generate a glossary of key terms"}>
                        {updatingInfo?.type === 'generate-glossary' ? <div className="spinner"></div> : <GlobeAltIcon className="w-4 h-4"/>} Glossary
                    </button>
                    <button onClick={() => setShowCitationModal(true)} className="action-button" title="Generate a citation for this work">
                        <BookmarkIcon className="w-4 h-4" /> Cite
                    </button>
                    <button onClick={handleCopyBook} className="action-button" title="Copy the entire content as plain text">
                        <ClipboardIcon className="w-4 h-4" /> {isBookCopied ? 'Copied!' : (anthology.format === 'short' ? 'Copy Writing' : 'Copy Book')}
                    </button>
                    <div className="relative" ref={exportDropdownRef}>
                        <button 
                            onClick={() => setShowExportDropdown(!showExportDropdown)} 
                            className="action-button bg-amber-700 hover:bg-amber-800 text-white border-transparent font-semibold shadow-sm"
                            title="Export to downloadable publishing formats"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" /> {anthology.format === 'short' ? 'Export Writing' : 'Export Book'} ▾
                        </button>
                        {showExportDropdown && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-[100] py-2 origin-top-right">
                                <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Publishing & Digital Formats
                                </div>
                                <button
                                    onClick={() => {
                                        exportToEpub(anthology, useGeezNumerals);
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                                >
                                    <span className="text-xl">📕</span>
                                    <div>
                                        <div className="font-bold text-amber-900 dark:text-amber-300">EPUB E-Book (.epub)</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">For Apple Books, Kindle, Kobo, and mobile readers</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        handleExportHtml();
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                                >
                                    <span className="text-xl">🖨️</span>
                                    <div>
                                        <div className="font-bold">PDF / Print Layout (.html)</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Illuminated styling, print to high-fidelity PDF</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        exportToMarkdown(anthology, useGeezNumerals);
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                                >
                                    <span className="text-xl">📝</span>
                                    <div>
                                        <div className="font-bold">Markdown Document (.md)</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Formatted with headers and inline footnotes</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        exportToJson(anthology);
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                                >
                                    <span className="text-xl">💾</span>
                                    <div>
                                        <div className="font-bold">JSON Backup Data (.json)</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Full structured object for backups and storage</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        handleExportPlainText();
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors border-t border-gray-100 dark:border-gray-700 mt-1"
                                >
                                    <span className="text-xl">📄</span>
                                    <div>
                                        <div className="font-bold">Plain Text (.txt)</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Simple clean structural plain text</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Text & Reading Metrics Badge */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                        <span className="font-bold text-amber-800 dark:text-amber-400">{textMetrics.fidelCount.toLocaleString()}</span>
                        <span>የግዕዝ ፊደላት (Characters)</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <span className="font-bold text-amber-800 dark:text-amber-400">{textMetrics.wordCount.toLocaleString()}</span>
                        <span>ቃላት (Words)</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <span>⏱️ ~</span>
                        <span className="font-bold text-amber-800 dark:text-amber-400">{textMetrics.readingTimeMinutes}</span>
                        <span>ደቂቃ ንባብ (Min Read)</span>
                    </span>
                </div>
            </header>
            
            {/* Enhanced Reader Control Bar */}
            <div className="bg-amber-50/70 dark:bg-gray-900/60 rounded-xl p-2.5 mb-5 border border-amber-200/70 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
                {/* Font Size & Font Family */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 p-0.5">
                        <button onClick={() => setFontSize(s => Math.max(12, s - 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Decrease font size"><MinusIcon className="w-3.5 h-3.5" /></button>
                        <span className="text-xs w-7 text-center font-bold">{fontSize}px</span>
                        <button onClick={() => setFontSize(s => Math.min(26, s + 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Increase font size"><PlusIcon className="w-3.5 h-3.5" /></button>
                    </div>

                    <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as 'noto-serif' | 'abyssinica' | 'sans')}
                        className="text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 font-semibold cursor-pointer"
                        title="Ethiopic Font Family"
                    >
                        <option value="noto-serif">ባህላዊ ብራና (Noto Serif)</option>
                        <option value="abyssinica">ጥንታዊ ፊደል (Abyssinica)</option>
                        <option value="sans">ዘመናዊ ቅርጽ (Modern Sans)</option>
                    </select>
                </div>

                {/* Theme Selector: Biranna / Modern / Night */}
                <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-lg text-xs font-semibold gap-1">
                    <button
                        onClick={() => setTheme('biranna')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                            theme === 'biranna'
                                ? 'bg-[#faf2df] text-[#8b151b] shadow-xs font-bold ring-1 ring-[#c59b27]'
                                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                        }`}
                        title="Ethiopian Biranna Parchment Theme"
                    >
                        <span>📜</span>
                        <span className="hidden sm:inline">ብራና (Parchment)</span>
                    </button>
                    <button
                        onClick={() => setTheme('modern')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                            theme === 'modern'
                                ? 'bg-white text-gray-900 shadow-xs font-bold ring-1 ring-gray-300'
                                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                        }`}
                        title="Modern Clean Theme"
                    >
                        <span>☀️</span>
                        <span className="hidden sm:inline">ዘመናዊ (Modern)</span>
                    </button>
                    <button
                        onClick={() => setTheme('night')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                            theme === 'night'
                                ? 'bg-gray-900 text-amber-300 shadow-xs font-bold ring-1 ring-amber-500/50'
                                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                        }`}
                        title="Night Theme"
                    >
                        <span>🌙</span>
                        <span className="hidden sm:inline">ምሽት (Night)</span>
                    </button>
                </div>

                {/* Ambient Soundscape & Ge'ez Numerals Toggle & View Mode */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const next = !isAmbientPlaying;
                            setIsAmbientPlaying(next);
                            ambientSoundscape.toggle(next);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isAmbientPlaying
                                ? 'bg-amber-800 text-amber-100 border-amber-600 shadow-xs ring-1 ring-amber-400/50'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-amber-500'
                        }`}
                        title="Toggle traditional ambient meditation drone / reading soundscape"
                    >
                        <span>{isAmbientPlaying ? '🔊' : '🔇'}</span>
                        <span className="font-amharic hidden sm:inline">ክራር ዜማ</span>
                        <span>{isAmbientPlaying ? 'Ambient ON' : 'Ambient'}</span>
                    </button>

                    <button
                        onClick={() => setUseGeezNumerals(!useGeezNumerals)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors flex items-center gap-1 ${
                            useGeezNumerals
                                ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                        }`}
                        title="Toggle Ge'ez numerals (፩, ፪, ፫...) for parts and chapters"
                    >
                        <span>{useGeezNumerals ? '፭ ግዕዝ' : '123'}</span>
                        <span className="text-[10px] hidden md:inline">{useGeezNumerals ? 'ቁጥሮች' : 'Western'}</span>
                    </button>

                    <div className="flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-md text-xs font-medium gap-1">
                        <button 
                            onClick={() => {
                                playPageTurnSound();
                                setViewMode('scroll');
                            }} 
                            className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'scroll' ? 'bg-amber-700 text-white shadow-xs font-semibold' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                            📜 Scroll
                        </button>
                        <button 
                            onClick={() => {
                                playPageTurnSound();
                                setViewMode('book');
                            }} 
                            className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'book' ? 'bg-amber-700 text-white shadow-xs font-semibold' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                            📖 Book
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setTextAlign('text-left')} className={`p-1.5 rounded ${textAlign === 'text-left' ? 'bg-amber-200 dark:bg-amber-900/50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><AlignLeftIcon className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setTextAlign('text-justify')} className={`p-1.5 rounded ${textAlign === 'text-justify' ? 'bg-amber-200 dark:bg-amber-900/50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><AlignJustifyIcon className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            <main>
                <div 
                    ref={pageContainerRef} 
                    className={`relative rounded-xl border transition-colors duration-300 ${
                        theme === 'biranna'
                            ? 'bg-[#fbf5e7] text-[#2b1d15] border-[#c59b27]/50 shadow-xl'
                            : theme === 'night'
                            ? 'bg-[#121622] text-gray-100 border-gray-800 shadow-xl'
                            : 'bg-white text-gray-900 border-gray-200 shadow-md'
                    }`} 
                    style={viewMode === 'book' ? { minHeight: '80vh', aspectRatio: '0.707' /* A4 ratio */ } : { minHeight: '50vh' }}
                >
                    {viewMode === 'scroll' ? (
                        <div className={`p-6 sm:p-12 prose prose-base sm:prose-lg dark:prose-invert max-w-none ${fontFamily === 'noto-serif' ? 'font-amharic' : fontFamily === 'abyssinica' ? 'font-abyssinica' : 'font-sans'} ${textAlign}`} style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
                            {allBookElements}
                        </div>
                    ) : (
                        isPaginating ? (
                            <div className="flex items-center justify-center h-full min-h-[80vh]"><div className="spinner mr-2"></div> Paginating book...</div>
                        ) : pages.length > 0 && pages[currentPage] ? (
                            <div className={`p-8 prose prose-sm sm:prose dark:prose-invert max-w-none h-full overflow-hidden font-abyssinica ${textAlign}`} style={{ fontSize: `${fontSize}px` }}>
                                {pages[currentPage]}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">No content to display.</div>
                        )
                    )}
                </div>

                {viewMode === 'book' && pages.length > 1 && !isPaginating && (
                    <div className="flex justify-between items-center mt-4 print:hidden">
                        <button
                            onClick={() => {
                                playPageTurnSound();
                                setCurrentPage(p => Math.max(0, p - 1));
                            }}
                            disabled={currentPage === 0}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            <ChevronLeftIcon className="w-4 h-4" /> Previous
                        </button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Page {currentPage + 1} of {pages.length}
                        </span>
                        <button
                            onClick={() => {
                                playPageTurnSound();
                                setCurrentPage(p => Math.min(pages.length - 1, p + 1));
                            }}
                            disabled={currentPage >= pages.length - 1}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            Next <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </main>

            {anthology.format === 'short' && onExpandShortWriting && (
                <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-gray-900/40 rounded-xl border border-indigo-100 dark:border-indigo-950/60 print:hidden animate-fade-in text-gray-800 dark:text-gray-200">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400">
                        <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        <span>Expand & Grow Writing (ስራውን ማስፋት / ማሳደግ)</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Choose how you would like to expand this creative piece. Select a style or specify custom directed expansions with custom prompts in Amharic or English.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        {[
                            {
                                id: 'elaborate',
                                emoji: '🔍',
                                name: 'Elaborate Scenes & Depth',
                                desc: 'Add rich details, sensory language, and character thoughts.',
                            },
                            {
                                id: 'continue',
                                emoji: '🔮',
                                name: 'Continue Next Section',
                                desc: 'Append a logical continuation, transition, or sequel.',
                            },
                            {
                                id: 'directed',
                                emoji: '✍️',
                                name: 'Directed Custom Expansion',
                                desc: 'Expand based on your specific prompts or story direction.',
                            },
                        ].map((expandOpt) => (
                            <button
                                key={expandOpt.id}
                                type="button"
                                onClick={() => setShortExpandStyle(expandOpt.id as 'elaborate' | 'continue' | 'directed')}
                                className={`text-left p-3 rounded-lg border transition-all duration-200 flex flex-col gap-1 ${
                                    shortExpandStyle === expandOpt.id
                                        ? 'border-indigo-500 bg-indigo-100/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/10'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }`}
                                disabled={updatingInfo !== null}
                            >
                                <span className="text-lg">{expandOpt.emoji}</span>
                                <span className="font-semibold text-sm">{expandOpt.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{expandOpt.desc}</span>
                            </button>
                        ))}
                    </div>

                    {shortExpandStyle === 'directed' && (
                        <div className="mb-4 animate-fade-in">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 mb-2">
                                Directed Expansion Instructions
                            </label>
                            <textarea
                                value={shortCustomPrompt}
                                onChange={(e) => setShortCustomPrompt(e.target.value)}
                                rows={2}
                                placeholder="e.g. 'Add a profound final discussion about the limits of perception' or 'በተጨማሪ ስለ ተፈጥሮ ውበት የሚናገር አንቀጽ ጨምር'"
                                className="block w-full text-sm rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 py-2 px-3"
                                disabled={updatingInfo !== null}
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-indigo-100/50 dark:border-indigo-950/40">
                        <button
                            type="button"
                            onClick={() => onExpandShortWriting(shortExpandStyle, shortExpandStyle === 'directed' ? shortCustomPrompt : '')}
                            disabled={updatingInfo !== null || (shortExpandStyle === 'directed' && !shortCustomPrompt.trim())}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            {updatingInfo?.type === 'short-expand' ? (
                                <>
                                    <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-white rounded-full"></div>
                                    <span>Expanding Writing...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>Expand Writing</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Hidden measurement container */}
            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0">
                <div 
                    ref={measurementRef}
                    className={`p-8 prose prose-sm sm:prose dark:prose-invert max-w-none font-abyssinica ${textAlign}`}
                    style={{ width: `${measurementWidth}px`, fontSize: `${fontSize}px` }}
                >
                    {allBookElements}
                </div>
            </div>

            {showCitationModal && <CitationModal anthology={anthology} onClose={() => setShowCitationModal(false)} />}

            {audioNarration && (
                <AudioNarrationPlayer
                    title={audioNarration.title}
                    textToRead={audioNarration.text}
                    onClose={() => setAudioNarration(null)}
                    theme={theme}
                />
            )}

            {anthology.format !== 'short' && (
                <TableOfContentsDrawer
                    anthology={anthology}
                    isOpen={isTOCDrawerOpen}
                    onClose={() => setIsTOCDrawerOpen(false)}
                    useGeezNumerals={useGeezNumerals}
                    theme={theme}
                    onSelectChapter={(pIdx, cIdx) => {
                        setIsTOCDrawerOpen(false);
                        if (viewMode === 'book') {
                            setViewMode('scroll');
                        }
                        setTimeout(() => {
                            const elem = document.getElementById(`part-${pIdx}-chapter-${cIdx}`);
                            if (elem) {
                                elem.scrollIntoView({ behavior: 'smooth' });
                            }
                        }, 100);
                    }}
                    onListenChapter={(pIdx, cIdx) => {
                        setIsTOCDrawerOpen(false);
                        const chap = anthology.parts?.[pIdx]?.chapters?.[cIdx];
                        if (chap && chap.content) {
                            setAudioNarration({
                                title: `${anthology.parts[pIdx].title} - ${chap.title}`,
                                text: chap.content
                            });
                        }
                    }}
                />
            )}

            <style jsx>{`
                .page-break-before {
                    /* This is a hint for our pagination logic */
                }
                .action-button {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.5rem;
                  padding: 0.5rem 1rem;
                  border: 1px solid #d1d5db; /* gray-300 */
                  font-size: 0.875rem;
                  font-weight: 500;
                  border-radius: 0.375rem;
                  transition: background-color 0.2s;
                  cursor: pointer;
                }
                .dark .action-button {
                  border-color: #4b5563; /* gray-600 */
                }
                .action-button:hover {
                  background-color: #f9fafb; /* gray-50 */
                }
                .dark .action-button:hover {
                  background-color: #374151; /* gray-700 */
                }
                .action-button:disabled {
                  opacity: 0.5;
                  cursor: not-allowed;
                }
                .spinner {
                  width: 1rem;
                  height: 1rem;
                  border-width: 2px;
                  border-style: solid;
                  border-color: transparent;
                  border-top-color: currentColor;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default BookDisplay;