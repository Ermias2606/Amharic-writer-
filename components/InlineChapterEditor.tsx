// components/InlineChapterEditor.tsx
import React, { useState } from 'react';
import type { Chapter, Footnote } from '../types';

interface InlineChapterEditorProps {
  chapter: Chapter;
  partIndex: number;
  chapterIndex: number;
  onSave: (partIndex: number, chapterIndex: number, updatedChapter: Chapter) => void;
  onCancel: () => void;
  theme?: 'biranna' | 'modern' | 'night';
}

export const InlineChapterEditor: React.FC<InlineChapterEditorProps> = ({
  chapter,
  partIndex,
  chapterIndex,
  onSave,
  onCancel,
  theme = 'biranna',
}) => {
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content || '');
  const [footnotes, setFootnotes] = useState<Footnote[]>(chapter.footnotes || []);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const insertTag = (tagOpen: string, tagClose: string) => {
    setContent((prev) => `${prev}${tagOpen}${tagClose}`);
  };

  const handleAddFootnote = () => {
    const nextId = footnotes.length > 0 ? Math.max(...footnotes.map((f) => f.id)) + 1 : 1;
    setFootnotes([...footnotes, { id: nextId, text: '' }]);
    // Also inject <sup> tag into content
    setContent((prev) => `${prev}<sup>${nextId}</sup>`);
  };

  const handleUpdateFootnoteText = (id: number, text: string) => {
    setFootnotes(footnotes.map((f) => (f.id === id ? { ...f, text } : f)));
  };

  const handleRemoveFootnote = (id: number) => {
    setFootnotes(footnotes.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    onSave(partIndex, chapterIndex, {
      ...chapter,
      title,
      content,
      footnotes,
    });
  };

  const isNight = theme === 'night';

  return (
    <div
      className={`p-6 rounded-xl border shadow-xl my-4 transition-all ${
        isNight
          ? 'bg-gray-800 border-gray-700 text-gray-100'
          : 'bg-white border-amber-300 text-gray-900'
      }`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <h3 className="font-bold text-base text-amber-800 dark:text-amber-400">
            ምዕራፍ አርትዕ • In-line Chapter Editor
          </h3>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'edit'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            አርትዕ (Edit)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            ቅድመ-ዕይታ (Preview)
          </button>
        </div>
      </div>

      {/* Chapter Title Input */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
          የምዕራፉ ርዕስ (Chapter Title)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg font-amharic text-lg font-bold bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      {activeTab === 'edit' ? (
        <div>
          {/* Quick Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-100 dark:bg-gray-900 rounded-t-lg border-t border-x border-gray-300 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => insertTag('<p>', '</p>')}
              className="px-2 py-1 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 font-mono"
              title="Add Paragraph"
            >
              &lt;p&gt;
            </button>
            <button
              type="button"
              onClick={() => insertTag('<h3>', '</h3>')}
              className="px-2 py-1 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 font-bold"
              title="Add Subheading"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => insertTag('<b>', '</b>')}
              className="px-2 py-1 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertTag('<i>', '</i>')}
              className="px-2 py-1 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertTag('<ul>\n  <li>', '</li>\n</ul>')}
              className="px-2 py-1 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              onClick={handleAddFootnote}
              className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-200 font-semibold"
              title="Insert Footnote Reference"
            >
              + Footnote <sup>N</sup>
            </button>
          </div>

          {/* HTML Text Area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full p-3 font-amharic leading-relaxed text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-b-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
            placeholder="የምዕራፉን ይዘት በHTML ይጻፉ..."
          />

          {/* Footnotes Manager */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                አောက်ခြေማስታወሻዎች (Footnotes) ({footnotes.length})
              </h4>
              <button
                type="button"
                onClick={handleAddFootnote}
                className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline"
              >
                + ማስታወሻ ጨምር (Add)
              </button>
            </div>

            {footnotes.length === 0 ? (
              <p className="text-xs text-gray-500 italic">ምንም አောက်ခြေማስታወሻ አልተጨመረም (No footnotes yet)</p>
            ) : (
              <div className="space-y-2">
                {footnotes.map((fn) => (
                  <div key={fn.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      {fn.id}
                    </span>
                    <input
                      type="text"
                      value={fn.text}
                      onChange={(e) => handleUpdateFootnoteText(fn.id, e.target.value)}
                      placeholder="የማስታወሻው ዝርዝር መግለጫ..."
                      className="flex-grow text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-amharic"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFootnote(fn.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-1"
                      title="Remove footnote"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live WYSIWYG Preview */
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[300px]">
          <h2 className="text-2xl font-bold font-amharic text-red-800 dark:text-red-400 mb-4">{title}</h2>
          <div
            className="prose dark:prose-invert font-amharic max-w-none text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {footnotes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                አောက်ခြေማስታወሻዎች:
              </h4>
              <ol className="list-decimal pl-5 text-xs text-gray-600 dark:text-gray-400 space-y-1 font-amharic">
                {footnotes.map((fn) => (
                  <li key={fn.id}>{fn.text}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ተመለስ (Cancel)
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-700 hover:bg-amber-800 text-white shadow transition-colors flex items-center gap-1.5"
        >
          <span>አስቀምጥ (Save Changes)</span>
        </button>
      </div>
    </div>
  );
};

export default InlineChapterEditor;
