// components/TableOfContentsDrawer.tsx
import React from 'react';
import type { Anthology } from '../types';
import { toGeezNumeral } from '../utils/geezUtils';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  anthology: Anthology;
  useGeezNumerals?: boolean;
  onSelectChapter?: (partIndex: number, chapterIndex: number) => void;
  onPlayAudio?: (title: string, text: string) => void;
}

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  anthology,
  useGeezNumerals = true,
  onSelectChapter,
  onPlayAudio,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-amber-300 dark:border-gray-700 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-amber-50/60 dark:bg-gray-900/60">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <div>
              <h3 className="font-bold text-base font-amharic text-gray-900 dark:text-white">
                የመጽሐፉ ማውጫ • Table of Contents
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 truncate max-w-xs font-semibold">
                {anthology.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Content Navigation List */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4">
          {/* Preface Link */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-amber-50/60 dark:hover:bg-gray-700/50 transition-colors">
            <span className="font-bold text-sm font-amharic text-red-900 dark:text-red-400">
              መቅድም (Preface)
            </span>
            {onPlayAudio && (
              <button
                onClick={() => onPlayAudio(`${anthology.title} - መቅድም`, anthology.preface)}
                className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold"
                title="Listen to Preface"
              >
                🎙️ አድምጥ
              </button>
            )}
          </div>

          {anthology.format === 'short' ? (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-gray-700 bg-amber-50/40 dark:bg-gray-700/30">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                {anthology.shortType || 'አጭር ጽሁፍ'}
              </span>
              <h4 className="font-bold text-sm font-amharic mt-1">{anthology.title}</h4>
            </div>
          ) : (
            anthology.parts?.map((part, pIndex) => {
              const partNum = useGeezNumerals ? toGeezNumeral(pIndex + 1) : `${pIndex + 1}`;

              return (
                <div key={pIndex} className="space-y-1.5">
                  <div className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-400 pb-1 border-b border-amber-200/60 dark:border-gray-700">
                    ክፍል {partNum}: {part.title}
                  </div>

                  <div className="pl-2 space-y-1">
                    {part.chapters.map((chapter, cIndex) => {
                      const chapNum = useGeezNumerals ? toGeezNumeral(cIndex + 1) : `${cIndex + 1}`;
                      const isComplete = !!chapter.content;

                      return (
                        <div
                          key={cIndex}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-xs transition-colors"
                        >
                          <div
                            onClick={() => {
                              onSelectChapter?.(pIndex, cIndex);
                              onClose();
                            }}
                            className="cursor-pointer flex-grow pr-2"
                          >
                            <span className="font-bold text-gray-500 mr-1.5">
                              ምዕራፍ {chapNum}:
                            </span>
                            <span className="font-amharic font-semibold text-gray-900 dark:text-gray-100">
                              {chapter.title}
                            </span>
                            {!isComplete && (
                              <span className="ml-1.5 text-[10px] text-amber-600 italic">
                                [ረቂቅ]
                              </span>
                            )}
                          </div>

                          {isComplete && onPlayAudio && (
                            <button
                              onClick={() =>
                                onPlayAudio(
                                  `ምዕራፍ ${chapNum}: ${chapter.title}`,
                                  chapter.content || ''
                                )
                              }
                              className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold flex-shrink-0"
                              title="Listen"
                            >
                              🎙️
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Summary Link */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-amber-50/60 dark:hover:bg-gray-700/50 transition-colors">
            <span className="font-bold text-sm font-amharic text-red-900 dark:text-red-400">
              ማጠቃለያ (Summary)
            </span>
            {onPlayAudio && (
              <button
                onClick={() => onPlayAudio(`${anthology.title} - ማጠቃለያ`, anthology.summary)}
                className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold"
                title="Listen to Summary"
              >
                🎙️ አድምጥ
              </button>
            )}
          </div>

          {/* Glossary Link if present */}
          {anthology.glossary && anthology.glossary.length > 0 && (
            <div className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-sm font-amharic text-red-900 dark:text-red-400">
              የቃላት መፍቻ (Glossary) ({anthology.glossary.length} ቃላት)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableOfContentsDrawer;
