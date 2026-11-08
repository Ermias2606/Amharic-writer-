// components/TemplateDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { THEMATIC_TEMPLATES, ThematicTemplate } from '../constants';

// Extended templates including authentic Ethiopian heritage topics
const ALL_TEMPLATES: ThematicTemplate[] = [
  {
    name: 'Hatata of Zera Yacob (የዘርአ ያዕቆብ ሐተታ)',
    prompt: 'The rationalist Ethiopian philosophy of Zera Yacob and Walda Heywat from the 17th century. Explore the principle of reason (libbuna / ልቦና), critiques of dogmatic religious doctrines, equality of all humanity, moral ethics, and the contemplation of the Creator through rational inquiry.',
    genre: 'Philosophy',
  },
  {
    name: 'Axum & Medieval Ethiopian Civilization (የአክሱም እና የላሊበላ ታሪክ)',
    prompt: 'The golden ages of the Kingdom of Aksum and the Zagwe dynasty. Detail the Ezana Stone inscriptions, the introduction of Christianity, coin minting, the engineering of the monolithic rock-hewn churches of Lalibela, and trade routes linking the Red Sea to the Mediterranean.',
    genre: 'History',
  },
  {
    name: 'Classical Philosophy',
    prompt: 'The core tenets of Stoicism, Epicureanism, and Platonism. Key figures like Socrates, Plato, Aristotle, Seneca, and Marcus Aurelius. Concepts such as the Forms, the Good Life, Virtue, and the nature of reality.',
    genre: 'Philosophy',
  },
  {
    name: 'Ancient Mythology & Lore (የጥንት አፈ-ታሪክ)',
    prompt: 'A comparative study of Ethiopian oral lore, Greek, Egyptian, and Middle Eastern mythology. Explore creation myths, heroic quests, legendary figures, and ancient metaphysical reflections on life and destiny.',
    genre: 'Mythology',
  },
  {
    name: 'Modern Science & Relativity (ዘመናዊ ሳይንስና ኅዋ)',
    prompt: 'Breakthroughs in 20th and 21st-century science. Focus on Relativity, Quantum Mechanics, and Genetics. Include pioneers like Einstein, Marie Curie, and Watson & Crick. Explain concepts like spacetime, quantum entanglement, and the DNA double helix.',
    genre: 'Science',
  },
  {
    name: 'Ethical Frameworks & Moral Philosophy (የሥነ-ምግባር ፍልስፍና)',
    prompt: 'An introduction to key ethical theories: Utilitarianism, Deontology, and Virtue Ethics. Explore moral dilemmas, collective community solidarity, and works of global and African moral thinkers.',
    genre: 'Moral Philosophy',
  },
  {
    name: 'Cosmic Exploration & Abu Shakir (የከዋክብት ምርምር)',
    prompt: 'Explore the wonders of astronomy, calendar calculation (Hasab / ሐሳብ), Abu Shakir Ethiopic astronomical treatises, black holes, nebulae, and astrophysics.',
    genre: 'Astronomy',
  },
  ...THEMATIC_TEMPLATES.filter(
    (t) => !['Classical Philosophy', 'Ancient Mythology', 'Modern Science', 'Ethical Frameworks', 'Cosmic Exploration'].includes(t.name)
  ),
];

interface TemplateDropdownProps {
  onSelectTemplate: (template: ThematicTemplate) => void;
  disabled?: boolean;
}

export const TemplateDropdown: React.FC<TemplateDropdownProps> = ({
  onSelectTemplate,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
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

  const filteredTemplates = ALL_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.prompt.toLowerCase().includes(search.toLowerCase()) ||
      t.genre.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (template: ThematicTemplate) => {
    setSelectedName(template.name);
    onSelectTemplate(template);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:border-amber-500 dark:hover:border-amber-500 transition-all flex items-center justify-between text-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-base">📜</span>
          <div className="truncate">
            {selectedName ? (
              <span className="font-semibold text-amber-900 dark:text-amber-300">
                {selectedName}
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                የተዘጋጀ ጭብጥ ይምረጡ... (Choose a pre-made template)
              </span>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Menu overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-amber-200 dark:border-gray-700 z-50 p-3 max-h-96 overflow-y-auto animate-fade-in">
          {/* Search */}
          <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              placeholder="ጭብጦችን ፈልግ... (Search templates by name, genre, or keyword)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.name}
                onClick={() => handleSelect(template)}
                className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-300 flex items-center gap-1.5 font-amharic">
                    <span>✨</span>
                    <span>{template.name}</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    {template.genre}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {template.prompt}
                </p>
              </div>
            ))}

            {filteredTemplates.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400">
                ምንም የተገኘ ጭብጥ የለም (No templates matched your search).
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDropdown;
