// components/LibraryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  getSavedDrafts,
  deleteDraftFromLibrary,
  exportLibraryBackup,
  SavedDraft,
} from '../utils/libraryStorage';
import type { Anthology } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft: (anthology: Anthology) => void;
  currentAnthologyId?: string;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectDraft,
  currentAnthologyId,
}) => {
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDrafts(getSavedDrafts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('ይህን ረቂቅ መሰረዝ ይፈልጋሉ? (Are you sure you want to delete this draft?)')) {
      const updated = deleteDraftFromLibrary(id);
      setDrafts(updated);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          localStorage.setItem('amharic_anthologies_library_v2', JSON.stringify(imported));
          setDrafts(imported);
          alert(`በተሳካ ሁኔታ ${imported.length} ረቂቆች ተጭነዋል! (${imported.length} drafts imported)`);
        } else {
          alert('Invalid backup format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const filtered = drafts.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.shortType && d.shortType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
              <h2 className="text-xl font-bold font-amharic text-gray-900 dark:text-white">
                የእኔ ስብስቦች ቤተ-መጽሐፍት • My Anthologies Library
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              በአሳሽዎ የተቀመጡ {drafts.length} ረቂቆች ({drafts.length} saved drafts in browser)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLibraryBackup}
              disabled={drafts.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition-colors disabled:opacity-40"
              title="Download all drafts as JSON backup"
            >
              ⬇ Backup All
            </button>
            <label className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer">
              ⬆ Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="በርዕስ ወይም በአይነት ፈልግ... (Search drafts by title or type...)"
            className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-amharic focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Drafts Grid */}
        <div className="p-6 overflow-y-auto flex-grow">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-4xl block mb-2">📖</span>
              <p className="font-semibold text-sm">ምንም የተቀመጠ ረቂቅ አልተገኘም (No drafts found)</p>
              <p className="text-xs mt-1 text-gray-500">
                አዲስ ስብስብ ፈጥረው "Save" ሲጫኑ በዚህ ዝርዝር ውስጥ ይቀመጣል።
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((draft) => {
                const isSelected = currentAnthologyId === draft.id;
                const formattedDate = new Date(draft.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={draft.id}
                    onClick={() => {
                      onSelectDraft(draft.anthology);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all hover:shadow-md flex gap-4 ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-500/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-400'
                    }`}
                  >
                    {/* Cover thumbnail */}
                    <div className="w-20 h-28 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center">
                      {draft.coverImage ? (
                        <img
                          src={`data:image/jpeg;base64,${draft.coverImage}`}
                          alt="Cover thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-gray-400">📜</span>
                      )}
                    </div>

                    {/* Metadata & Controls */}
                    <div className="flex-grow flex flex-col justify-between overflow-hidden">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            {draft.format === 'short'
                              ? draft.shortType || 'Short'
                              : `${draft.partsCount} ክፍሎች (Parts)`}
                          </span>
                          <span className="text-[11px] text-gray-400">{formattedDate}</span>
                        </div>

                        <h3 className="font-bold text-base font-amharic text-gray-900 dark:text-white line-clamp-2 leading-snug">
                          {draft.title}
                        </h3>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {draft.fidelCount.toLocaleString()}
                          </span>{' '}
                          ፊደላት • {draft.chaptersCount} ምዕራፎች
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleDelete(draft.id, e)}
                            className="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Delete draft"
                          >
                            🗑
                          </button>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                            ክፈት (Open) →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryModal;
