// constants.ts
import { GenreGroup, WritingTone, PodcastTone } from './types';

export const GENRE_GROUPS: GenreGroup[] = [
  {
    category: 'Humanities',
    subgenres: ['Philosophy', 'Moral Philosophy', 'Mythology', 'Religion', 'Biography', 'Archaeology', 'History'],
  },
  {
    category: 'Social Sciences',
    subgenres: ['Psychology', 'Anthropology', 'Economics', 'Politics', 'Law'],
  },
  {
    category: 'Natural Sciences',
    subgenres: ['Science', 'Geology', 'Astronomy'],
  },
  {
    category: 'Business & Finance',
    subgenres: ['Management', 'Business', 'Banking'],
  },
  {
    category: 'Fringe & Speculative',
    subgenres: ['Ancient Conspiracy', 'Modern Conspiracy', 'Pseudoarchaeology'],
  },
];

export const WRITING_TONES: WritingTone[] = ['Academic', 'Journalistic', 'Creative', 'Philosophical', 'Narrative', 'Technical'];

export const PODCAST_TONES: PodcastTone[] = [
    'Conversational', 
    'Investigative', 
    'Inspirational', 
    'Dramatic', 
    'Educational',
    'Humorous',
    'Poetic',
    'Historical Documentary'
];

export interface ThematicTemplate {
  name: string;
  prompt: string;
  genre: string;
}

export const THEMATIC_TEMPLATES: ThematicTemplate[] = [
  {
    name: 'Classical Philosophy',
    prompt: 'The core tenets of Stoicism, Epicureanism, and Platonism. Key figures like Socrates, Plato, Aristotle, Seneca, and Marcus Aurelius. Concepts such as the Forms, the Good Life, Virtue, and the nature of reality.',
    genre: 'Philosophy',
  },
  {
    name: 'Modern Science',
    prompt: 'Breakthroughs in 20th and 21st-century science. Focus on Relativity, Quantum Mechanics, and Genetics. Include pioneers like Einstein, Marie Curie, and Watson & Crick. Explain concepts like spacetime, quantum entanglement, and the DNA double helix.',
    genre: 'Science',
  },
  {
    name: 'Ancient Mythology',
    prompt: 'A comparative study of Greek, Egyptian, and Norse mythology. Explore creation myths, the pantheon of gods (Zeus, Ra, Odin), and legendary heroes. Discuss themes of fate, heroism, and the afterlife.',
    genre: 'Mythology',
  },
  {
    name: 'Ethical Frameworks',
    prompt: 'An introduction to key ethical theories: Utilitarianism, Deontology, and Virtue Ethics. Explore moral dilemmas and the works of philosophers like Jeremy Bentham, Immanuel Kant, and Aristotle.',
    genre: 'Moral Philosophy',
  },
  {
    name: 'Political Ideologies',
    prompt: 'A comparative analysis of major political ideologies: Democracy, Socialism, and Authoritarianism. Examine their historical origins, core principles, and real-world applications. Discuss thinkers like John Locke and Karl Marx.',
    genre: 'Politics',
  },
  {
    name: 'Foundations of Law',
    prompt: 'An overview of the foundations of Western law. Discuss the evolution from Roman law to Common Law systems. Key concepts include justice, rights, and the rule of law. Reference foundational texts like the Magna Carta.',
    genre: 'Law',
  },
  {
    name: 'Cosmic Exploration',
    prompt: 'Explore the wonders of our solar system, from rocky inner planets to gas giants. Discuss concepts like black holes, nebulae, and the Big Bang theory. Key figures could include Galileo, Hubble, and Carl Sagan.',
    genre: 'Astronomy',
  },
];