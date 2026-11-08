import React from 'react';
import { BookOpenIcon } from './icons';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenLibrary?: () => void;
  draftCount?: number;
}

const Header: React.FC<HeaderProps> = ({ onOpenLibrary, draftCount = 0 }) => {
  return (
    <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-md border-b border-amber-900/15 dark:border-gray-700 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-red-700 flex items-center justify-center text-white shadow-md animate-pulse-gold">
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="font-amharic">የአማርኛ ስብስብ ጀነሬተር</span>
              <span className="hidden sm:inline text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-sans border border-amber-300 dark:border-amber-700">
                AI Anthology
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-sans">
              Comprehensive Ethiopic Books, Short Writings & Narration Scripts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />

          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-bold transition-all shadow-xs"
              title="Open saved drafts library"
            >
              <span>📚</span>
              <span className="hidden md:inline font-amharic">ቤተ-መጽሐፍት</span>
              <span>Library</span>
              {draftCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                  {draftCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
