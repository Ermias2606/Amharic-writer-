// components/FidelTransliterationHelper.tsx
import React, { useState } from 'react';
import { transliterateToAmharic, QUICK_AMHARIC_SUGGESTIONS } from '../utils/geezUtils';

interface FidelTransliterationHelperProps {
  onInsertText: (text: string) => void;
  isTransliterating: boolean;
  onToggleTransliteration: (enabled: boolean) => void;
}

export const FidelTransliterationHelper: React.FC<FidelTransliterationHelperProps> = ({
  onInsertText,
  isTransliterating,
  onToggleTransliteration,
}) => {
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [quickTestText, setQuickTestText] = useState('');

  return (
    <div className="space-y-2 mb-2">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Real-time phonetic transliteration toggle */}
          <button
            type="button"
            onClick={() => onToggleTransliteration(!isTransliterating)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border transition-all ${
              isTransliterating
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200'
            }`}
            title="Automatically convert English letters to Amharic Fidel as you type (e.g. selam -> ሰላም)"
          >
            <span>{isTransliterating ? '✓' : '⌨'}</span>
            <span>የፊደል መለወጫ (Phonetic Fidel): {isTransliterating ? 'በርቷል (ON)' : 'ጠፍቷል (OFF)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHelperModal(true)}
            className="text-amber-700 dark:text-amber-400 font-medium hover:underline text-xs"
          >
            💡 የፊደል መመሪያ (Guide)
          </button>
        </div>

        <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">
          {isTransliterating ? 'ምሳሌ፡ "selam" ሲተይቡ "ሰላም" ይሆናል' : 'ፊደል በቀላሉ በእንግሊዝኛ ቁልፍ ለመጻፍ አብሩ'}
        </span>
      </div>

      {/* Quick Amharic Topic Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">
          ፈጣን ርዕሶች:
        </span>
        {QUICK_AMHARIC_SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsertText(item.am)}
            className="px-2.5 py-1 text-xs font-amharic rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-amber-500 hover:text-amber-700 transition-colors whitespace-nowrap shadow-xs flex-shrink-0"
            title={item.en}
          >
            {item.am}
          </button>
        ))}
      </div>

      {/* Modal Guide */}
      {showHelperModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowHelperModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <h3 className="font-bold text-base font-amharic text-gray-900 dark:text-white">
                የፊደል አጻጻፍ መመሪያ • Latin to Fidel Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                የፊደል መለወጫው ሲበራ በእንግሊዝኛ ቁልፍ ሰሌዳ የተለመዱ የላቲን ቃላትን ሲተይቡ በራስ-ሰር ወደ አማርኛ ፊደል
                ይለወጣሉ፦
              </p>

              <div className="grid grid-cols-2 gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 font-mono text-[11px]">
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">se-la-m</span> → ሰላም
                </div>
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">fi-k-r</span> → ፍቅር
                </div>
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">ta-ri-k</span> → ታሪክ
                </div>
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">ti-b-e-b</span> → ጥበብ
                </div>
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">i-t-yo-p-ya</span> → ኢትዮጵያ
                </div>
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">::</span> → ። (ነጥብ)
                </div>
              </div>

              {/* Quick Scratchpad */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                  እዚህ ይሞክሩ (Try typing phonetically here):
                </label>
                <input
                  type="text"
                  placeholder="Type 'selam' or 'ethiopia'..."
                  value={quickTestText}
                  onChange={(e) => setQuickTestText(transliterateToAmharic(e.target.value))}
                  className="w-full px-3 py-1.5 border rounded-md font-amharic bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm"
                />
                {quickTestText && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onInsertText(quickTestText);
                        setShowHelperModal(false);
                      }}
                      className="px-3 py-1 bg-amber-700 text-white rounded text-xs font-semibold"
                    >
                      ወደ ጽሁፍ አስገባ (Insert)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FidelTransliterationHelper;
