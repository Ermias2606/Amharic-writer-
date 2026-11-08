// components/ToneDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { WritingTone } from '../types';

interface ToneOption {
  value: WritingTone;
  labelEn: string;
  labelAm: string;
  icon: string;
  description: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    value: 'Academic',
    labelEn: 'Academic',
    labelAm: 'አካዳሚክ / ጥናታዊ',
    icon: '🎓',
    description: 'Rigorous, formal scholarly analysis with citations, objective inquiry, and precise terminology.',
  },
  {
    value: 'Philosophical',
    labelEn: 'Philosophical',
    labelAm: 'ፍልስፍናዊ / ጥልቅ',
    icon: '🏛️',
    description: 'Deep meditative prose, questioning assumptions, metaphysical contemplation, and moral reasoning.',
  },
  {
    value: 'Creative',
    labelEn: 'Creative',
    labelAm: 'የፈጠራ / ስነ-ጽሁፋዊ',
    icon: '🎨',
    description: 'Lyrical metaphors, evocative imagery, vivid sensory descriptions, and literary storytelling.',
  },
  {
    value: 'Narrative',
    labelEn: 'Narrative',
    labelAm: 'ተራኪ / ታሪካዊ',
    icon: '📖',
    description: 'Chronological plot-driven storytelling, character perspective, and captivating historical arcs.',
  },
  {
    value: 'Journalistic',
    labelEn: 'Journalistic',
    labelAm: 'ጋዜጠኛዊ / መረጃዊ',
    icon: '📰',
    description: 'Crisp, fact-focused, investigative reporting style with accessible language and clear structure.',
  },
  {
    value: 'Technical',
    labelEn: 'Technical',
    labelAm: 'ቴክኒካዊ / ሳይንሳዊ',
    icon: '🔬',
    description: 'Systematic explanation of systems, mechanisms, formulas, blueprints, and concrete empirical concepts.',
  },
];

interface ToneDropdownProps {
  selectedTone: WritingTone;
  onChange: (tone: WritingTone) => void;
  disabled?: boolean;
}

export const ToneDropdown: React.FC<ToneDropdownProps> = ({
  selectedTone,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = TONE_OPTIONS.find((t) => t.value === selectedTone) || TONE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:border-amber-500 dark:hover:border-amber-500 transition-all flex items-center justify-between text-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="text-xl">{activeOption.icon}</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
              <span className="font-amharic">{activeOption.labelAm}</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({activeOption.labelEn})
              </span>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs sm:max-w-md">
              {activeOption.description}
            </span>
          </div>
        </div>
        <span className="text-gray-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Menu overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-amber-200 dark:border-gray-700 z-50 p-2 max-h-80 overflow-y-auto animate-fade-in space-y-1">
          {TONE_OPTIONS.map((opt) => {
            const isSelected = opt.value === selectedTone;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-colors ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-400 dark:border-amber-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-transparent'
                }`}
              >
                <span className="text-xl mt-0.5">{opt.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 dark:text-white font-amharic">
                      {opt.labelAm}
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold">
                      {opt.labelEn}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ToneDropdown;
