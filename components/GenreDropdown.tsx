// components/GenreDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { GENRE_GROUPS } from '../constants';

interface GenreDropdownProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  disabled?: boolean;
}

export const GenreDropdown: React.FC<GenreDropdownProps> = ({
  selectedGenres,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter((g) => g !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  };

  const handleSelectAllCategory = (category: string) => {
    const group = GENRE_GROUPS.find((g) => g.category === category);
    if (!group) return;
    const combined = Array.from(new Set([...selectedGenres, ...group.subgenres]));
    onChange(combined);
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:border-amber-500 dark:hover:border-amber-500 transition-all flex items-center justify-between text-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-base">🏷️</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {selectedGenres.length === 0 ? (
              <span className="text-gray-400 font-normal">ዘውግ ይምረጡ... (Choose one or more genres)</span>
            ) : (
              <span>
                {selectedGenres.length} {selectedGenres.length === 1 ? 'ዘውግ' : 'ዘውጎች'} ተመርጠዋል ({selectedGenres.length} selected)
              </span>
            )}
          </span>
        </div>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Selected Tags Pill Strip */}
      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedGenres.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
            >
              <span>{g}</span>
              <button
                type="button"
                onClick={() => handleToggle(g)}
                className="hover:text-red-600 font-bold ml-0.5"
                title="Remove"
              >
                ✕
              </button>
            </span>
          ))}
          {selectedGenres.length > 2 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-red-500 hover:text-red-700 underline px-1"
            >
              ሁሉንም አጽዳ (Clear)
            </button>
          )}
        </div>
      )}

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-amber-200 dark:border-gray-700 z-50 p-3 max-h-80 overflow-y-auto animate-fade-in">
          {/* Search bar */}
          <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
            <input
              type="text"
              placeholder="ዘውጎችን ፈልግ... (Filter genres...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-3">
            {GENRE_GROUPS.map((group) => {
              const filteredSubgenres = group.subgenres.filter((sg) =>
                sg.toLowerCase().includes(search.toLowerCase())
              );
              if (filteredSubgenres.length === 0) return null;

              return (
                <div key={group.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      {group.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllCategory(group.category)}
                      className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      + ሁሉንም ምረጥ
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredSubgenres.map((g) => {
                      const isChecked = selectedGenres.includes(g);
                      return (
                        <label
                          key={g}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 font-semibold text-amber-900 dark:text-amber-200'
                              : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggle(g)}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>{g}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreDropdown;
