// utils/geezUtils.ts
/**
 * Utilities for Ge'ez (Ethiopic) numerals, Fidel phonetic transliteration,
 * and Amharic text metrics.
 */

// Ge'ez numeral mappings
const GEEZ_ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];
const GEEZ_TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'];
const GEEZ_HUNDRED = '፻';
const GEEZ_TEN_THOUSAND = '፼';

/**
 * Converts any positive integer to traditional Ge'ez numerals.
 * e.g., 1 -> ፩, 12 -> ፲፪, 25 -> ፳፭, 100 -> ፻, 105 -> ፻፭
 */
export function toGeezNumeral(num: number): string {
  if (num <= 0 || !Number.isInteger(num)) {
    return num.toString();
  }

  if (num < 10) {
    return GEEZ_ONES[num];
  }

  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${GEEZ_TENS[tens]}${GEEZ_ONES[ones]}`;
  }

  if (num < 10000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsStr = hundreds === 1 ? '' : toGeezNumeral(hundreds);
    const remainderStr = remainder === 0 ? '' : toGeezNumeral(remainder);
    return `${hundredsStr}${GEEZ_HUNDRED}${remainderStr}`;
  }

  // Over 10,000 uses ፼ (ten-thousand multiplier)
  const myriads = Math.floor(num / 10000);
  const remainder = num % 10000;
  const myriadsStr = myriads === 1 ? '' : toGeezNumeral(myriads);
  const remainderStr = remainder === 0 ? '' : toGeezNumeral(remainder);
  return `${myriadsStr}${GEEZ_TEN_THOUSAND}${remainderStr}`;
}

/**
 * Phonetic transliteration mapping from common Latin keyboard keystrokes
 * to Amharic Fidel (Ethiopic syllables).
 * Covers common vowels, consonants, diphthongs and punctuation.
 */
const FIDEL_TABLE: Record<string, string> = {
  // Consonants with 7 orders: [1st, 2nd (u), 3rd (i), 4th (a), 5th (e), 6th (sixth/none), 7th (o)]
  // h
  'he': 'ሀ', 'hu': 'ሁ', 'hi': 'ሂ', 'ha': 'ሃ', 'hie': 'ሄ', 'h': 'ህ', 'ho': 'ሆ',
  // l
  'le': 'ለ', 'lu': 'ሉ', 'li': 'ሊ', 'la': 'ላ', 'lie': 'ሌ', 'l': 'ል', 'lo': 'ሎ',
  // hh (ሐ)
  'hhe': 'ሐ', 'hhu': 'ሑ', 'hhi': 'ሒ', 'hha': 'ሓ', 'hhie': 'ሔ', 'hh': 'ሕ', 'hho': 'ሖ',
  // m
  'me': 'መ', 'mu': 'ሙ', 'mi': 'ሚ', 'ma': 'ማ', 'mie': 'ሜ', 'm': 'ም', 'mo': 'ሞ',
  // s (ሠ)
  'sze': 'ሠ', 'szu': 'ሡ', 'szi': 'ሢ', 'sza': 'ሣ', 'szie': 'ሤ', 'sz': 'ሥ', 'szo': 'ሦ',
  // r
  're': 'ረ', 'ru': 'ሩ', 'ri': 'ሪ', 'ra': 'ራ', 'rie': 'ሬ', 'r': 'ር', 'ro': 'ሮ',
  // s (ሰ)
  'se': 'ሰ', 'su': 'ሱ', 'si': 'ሲ', 'sa': 'ሳ', 'sie': 'ሴ', 's': 'ስ', 'so': 'ሶ',
  // sh (ሸ)
  'she': 'ሸ', 'shu': 'ሹ', 'shi': 'ሺ', 'sha': 'ሻ', 'shie': 'ሼ', 'sh': 'ሽ', 'sho': 'ሾ',
  // q (ቀ)
  'qe': 'ቀ', 'qu': 'ቁ', 'qi': 'ቂ', 'qa': 'ቃ', 'qie': 'ቄ', 'q': 'ቅ', 'qo': 'ቆ',
  // b
  'be': 'በ', 'bu': 'ቡ', 'bi': 'ቢ', 'ba': 'ባ', 'bie': 'ቤ', 'b': 'ብ', 'bo': 'ቦ',
  // t
  'te': 'ተ', 'tu': 'ቱ', 'ti': 'ቲ', 'ta': 'ታ', 'tie': 'ቴ', 't': 'ት', 'to': 'ቶ',
  // ch (ቸ)
  'che': 'ቸ', 'chu': 'ቹ', 'chi': 'ቺ', 'cha': 'ቻ', 'chie': 'ቼ', 'ch': 'ች', 'cho': 'ቾ',
  // h (ኀ)
  'xhe': 'ኀ', 'xhu': 'ኁ', 'xhi': 'ኂ', 'xha': 'ኃ', 'xhie': 'ኄ', 'xh': 'ኅ', 'xho': 'ኆ',
  // n
  'ne': 'ነ', 'nu': 'ኑ', 'ni': 'ኒ', 'na': 'ና', 'nie': 'ኔ', 'n': 'ን', 'no': 'ኖ',
  // gn / ny (ኘ)
  'gne': 'ኘ', 'gnu': 'ኙ', 'gni': 'ኚ', 'gna': 'ኛ', 'gnie': 'ኜ', 'gn': 'ኝ', 'gno': 'ኞ',
  'nye': 'ኘ', 'nyu': 'ኙ', 'nyi': 'ኚ', 'nya': 'ኛ', 'nyie': 'ኜ', 'ny': 'ኝ', 'nyo': 'ኞ',
  // vowels (አ)
  'a': 'አ', 'u': 'ኡ', 'i': 'ኢ', 'aa': 'ኣ', 'ee': 'ኤ', 'e': 'እ', 'o': 'ኦ',
  // k
  'ke': 'ከ', 'ku': 'ኩ', 'ki': 'ኪ', 'ka': 'ካ', 'kie': 'ኬ', 'k': 'ክ', 'ko': 'ኮ',
  // w
  'we': 'ወ', 'wu': 'ዉ', 'wi': 'ዊ', 'wa': 'ዋ', 'wie': 'ዌ', 'w': 'ው', 'wo': 'ዎ',
  // ' (ዐ)
  '`e': 'ዐ', '`u': 'ዑ', '`i': 'ዒ', '`a': 'ዓ', '`ie': 'ዔ', '`': 'ዕ', '`o': 'ዖ',
  // z
  'ze': 'ዘ', 'zu': 'ዙ', 'zi': 'ዚ', 'za': 'ዛ', 'zie': 'ዜ', 'z': 'ዝ', 'zo': 'ዞ',
  // zh (ዠ)
  'zhe': 'ዠ', 'zhu': 'ዡ', 'zhi': 'ዢ', 'zha': 'ዣ', 'zhie': 'ዤ', 'zh': 'ዥ', 'zho': 'ዦ',
  // y
  'ye': 'የ', 'yu': 'ዩ', 'yi': 'ዪ', 'ya': 'ያ', 'yie': 'ዬ', 'y': 'ይ', 'yo': 'ዮ',
  // d
  'de': 'ደ', 'du': 'ዱ', 'di': 'ዲ', 'da': 'ዳ', 'die': 'ዴ', 'd': 'ድ', 'do': 'ዶ',
  // j
  'je': 'ጀ', 'ju': 'ጁ', 'ji': 'ጂ', 'ja': 'ጃ', 'jie': 'ጄ', 'j': 'ጅ', 'jo': 'ጆ',
  // g
  'ge': 'ገ', 'gu': 'ጉ', 'gi': 'ጊ', 'ga': 'ጋ', 'gie': 'ጌ', 'g': 'ግ', 'go': 'ጎ',
  // t' (ጠ)
  'tte': 'ጠ', 'ttu': 'ጡ', 'tti': 'ጢ', 'tta': 'ጣ', 'ttie': 'ጤ', 'tt': 'ጥ', 'tto': 'ጦ',
  // ch' (ጨ)
  'cce': 'ጨ', 'ccu': 'ጩ', 'cci': 'ጪ', 'cca': 'ጫ', 'ccie': 'ጬ', 'cc': 'ጭ', 'cco': 'ጮ',
  // p' (ጰ)
  'ppe': 'ጰ', 'ppu': 'ጱ', 'ppi': 'ጲ', 'ppa': 'ጳ', 'ppie': 'ጴ', 'pp': 'ጵ', 'ppo': 'ጶ',
  // ts' (ጸ)
  'tse': 'ጸ', 'tsu': 'ጹ', 'tsi': 'ጺ', 'tsa': 'ጻ', 'tsie': 'ጼ', 'ts': 'ጽ', 'tso': 'ጾ',
  // ts'' (ፀ)
  'tzo': 'ፆ', 'tze': 'ፀ', 'tzu': 'ፁ', 'tzi': 'ፂ', 'tza': 'ፃ', 'tzie': 'ፄ', 'tz': 'ፅ',
  // f
  'fe': 'ፈ', 'fu': 'ፉ', 'fi': 'ፊ', 'fa': 'ፋ', 'fie': 'ፌ', 'f': 'ፍ', 'fo': 'ፎ',
  // p
  'pe': 'ፐ', 'pu': 'ፑ', 'pi': 'ፒ', 'pa': 'ፓ', 'pie': 'ፔ', 'p': 'ፕ', 'po': 'ፖ',
  // Punctuation
  ':': '፡',
  '::': '።',
  ',': '፣',
  ';': '፤',
  '--': '—',
};

// Sort mapping keys descending by length so greedy matching works ('she' matches before 'sh' or 's')
const SORTED_KEYS = Object.keys(FIDEL_TABLE).sort((a, b) => b.length - a.length);

/**
 * Transliterates Latin phonetic text into Amharic Fidel.
 * Supports standard English keyboard input (e.g., "selam" -> "ሰላም").
 */
export function transliterateToAmharic(input: string): string {
  let result = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    let matched = false;
    // Try matching longest key first
    for (const key of SORTED_KEYS) {
      if (input.substring(i, i + key.length).toLowerCase() === key) {
        result += FIDEL_TABLE[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += input[i];
      i++;
    }
  }

  return result;
}

/**
 * Common sample Amharic concepts / topics for quick 1-click inspiration
 */
export const QUICK_AMHARIC_SUGGESTIONS = [
  { am: 'ስነ-ምግባር እና ጥበብ (Stoic & Virtue Ethics)', en: 'Stoic Ethics and Wisdom' },
  { am: 'የጥንታዊት ኢትዮጵያ ስልጣኔ እና ፍልስፍና (Axumite & Zera Yacob Philosophy)', en: 'Axumite Era & Zera Yacob' },
  { am: 'የህዋ ሚስጥራት እና የስነ-ፈለክ ጥናት (Cosmos & Quantum Astronomy)', en: 'Cosmic Wonders and Quantum Physics' },
  { am: 'የሰው ልጅ ንቃተ-ህሊና እና ስነ-ልቦና (Human Consciousness & Psychology)', en: 'Human Consciousness & Psychology' },
  { am: 'ስነ-ግጥም እና ጥልቅ የፍቅር ፍልስፍና (Poetic Romance & Philosophical Love)', en: 'Poetic Metaphors of Love' },
  { am: 'የመሪነት ጥበብ እና የንግስና ታሪክ (Art of Leadership & Royal Chronicles)', en: 'Leadership Wisdom & History' }
];

/**
 * Computes metrics for Amharic / Ge'ez text:
 * - Total Fidel character count (excluding whitespace)
 * - Word count
 * - Estimated reading time (in minutes, ~130 words per minute for complex Ethiopic text)
 */
export function computeTextMetrics(text: string): {
  fidelCount: number;
  wordCount: number;
  readingTimeMinutes: number;
} {
  const clean = text.replace(/<[^>]*>/g, ' ').trim();
  if (!clean) {
    return { fidelCount: 0, wordCount: 0, readingTimeMinutes: 0 };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Count Ethiopic characters (Unicode range 0x1200 - 0x137F, 0x1380 - 0x139F, 0x2D80 - 0x2DDF)
  const fidelMatches = clean.match(/[\u1200-\u139F\u2D80-\u2DDF]/g);
  const fidelCount = fidelMatches ? fidelMatches.length : clean.replace(/\s+/g, '').length;

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 130));

  return {
    fidelCount,
    wordCount,
    readingTimeMinutes
  };
}
