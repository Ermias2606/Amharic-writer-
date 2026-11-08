import React, { useState } from 'react';
import { Anthology } from '../types';
import { ClipboardIcon } from './icons';

interface CitationModalProps {
  anthology: Anthology;
  onClose: () => void;
}

type CitationStyle = 'APA' | 'MLA';

const CitationModal: React.FC<CitationModalProps> = ({ anthology, onClose }) => {
  const [style, setStyle] = useState<CitationStyle>('APA');
  const [isCopied, setIsCopied] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.toLocaleString('default', { month: 'long' });
  const day = today.getDate();
  const mlaMonth = today.toLocaleString('default', { month: 'short' });

  const handleCopy = () => {
    const citations: Record<CitationStyle, string> = {
        APA: `Anthology Generator AI. (${year}). ${anthology.title}. [AI-generated text]. Retrieved ${month} ${day}, ${year}.`,
        MLA: `"${anthology.title}." Amharic Anthology Generator AI, AI-generated text, ${day} ${mlaMonth}. ${year}.`,
    };
    navigator.clipboard.writeText(citations[style]);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-modal-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="citation-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Generate Citation
        </h2>
        
        <div className="mb-4">
          <div className="flex border-b border-gray-200 dark:border-gray-600">
            <button 
              className={`px-4 py-2 text-sm font-medium transition-colors ${style === 'APA' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => { setStyle('APA'); setIsCopied(false); }}
              aria-pressed={style === 'APA'}
            >
              APA
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium transition-colors ${style === 'MLA' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => { setStyle('MLA'); setIsCopied(false); }}
              aria-pressed={style === 'MLA'}
            >
              MLA
            </button>
          </div>
        </div>

        <div className="relative p-4 bg-gray-100 dark:bg-gray-900 rounded-md">
          <p className="text-gray-700 dark:text-gray-300 font-mono text-sm leading-6">
            {style === 'APA' ? (
                <>
                    Anthology Generator AI. ({year}). <i>{anthology.title}</i>. [AI-generated text]. Retrieved {month} {day}, {year}.
                </>
            ) : (
                <>
                    "{anthology.title}." <i>Amharic Anthology Generator AI</i>, AI-generated text, {day} {mlaMonth}. {year}.
                </>
            )}
          </p>
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Copy to clipboard"
            aria-label="Copy citation to clipboard"
          >
            <ClipboardIcon className="w-4 h-4" />
          </button>
        </div>
        {isCopied && <p className="text-green-600 dark:text-green-400 text-xs mt-2 text-right">Copied to clipboard!</p>}

        <div className="mt-6 text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CitationModal;
