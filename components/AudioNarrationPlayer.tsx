// components/AudioNarrationPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';

interface AudioNarrationPlayerProps {
  title: string;
  textToRead: string;
  onClose?: () => void;
  theme?: 'biranna' | 'modern' | 'night';
}

export const AudioNarrationPlayer: React.FC<AudioNarrationPlayerProps> = ({
  title,
  textToRead,
  onClose,
  theme = 'biranna',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(0.95);
  const [progress, setProgress] = useState(0);
  const [currentSentence, setCurrentSentence] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const currentSentenceIdxRef = useRef(0);

  // Parse HTML into clean sentences for chunked audio reading
  useEffect(() => {
    const cleanText = textToRead.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    // Split on Amharic sentence terminator (።) or Latin period/question/exclamation
    const rawSentences = cleanText
      .split(/(?<=[።.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    sentencesRef.current = rawSentences.length > 0 ? rawSentences : [cleanText];
    currentSentenceIdxRef.current = 0;
    setProgress(0);
    if (sentencesRef.current.length > 0) {
      setCurrentSentence(sentencesRef.current[0]);
    }

    // Stop previous narration when text changes
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [textToRead]);

  // Load available speech voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Prefer Amharic voice if installed
      const amVoice = voices.find((v) => v.lang.startsWith('am') || v.lang.includes('ETH'));
      if (amVoice) {
        setSelectedVoice(amVoice);
      } else if (voices.length > 0) {
        // Fallback to default or natural voice
        setSelectedVoice(voices[0]);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakNextSentence = () => {
    if (!('speechSynthesis' in window)) return;

    if (currentSentenceIdxRef.current >= sentencesRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      currentSentenceIdxRef.current = 0;
      setProgress(100);
      return;
    }

    const sentence = sentencesRef.current[currentSentenceIdxRef.current];
    setCurrentSentence(sentence);

    const calculatedProgress = Math.round(
      (currentSentenceIdxRef.current / Math.max(1, sentencesRef.current.length)) * 100
    );
    setProgress(calculatedProgress);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utteranceRef.current = utterance;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = selectedVoice?.lang || 'am-ET';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      currentSentenceIdxRef.current += 1;
      speakNextSentence();
    };

    utterance.onerror = (e) => {
      // SpeechSynthesis can error on manual cancel; ignore non-fatal
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech Synthesis is not supported in this browser.');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      window.speechSynthesis.cancel();
      setIsPlaying(true);
      setIsPaused(false);
      speakNextSentence();
    }
  };

  const handlePause = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    currentSentenceIdxRef.current = 0;
    setProgress(0);
    if (sentencesRef.current.length > 0) {
      setCurrentSentence(sentencesRef.current[0]);
    }
  };

  const handleSkipNext = () => {
    if (currentSentenceIdxRef.current < sentencesRef.current.length - 1) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      currentSentenceIdxRef.current += 1;
      if (isPlaying) {
        speakNextSentence();
      } else {
        setCurrentSentence(sentencesRef.current[currentSentenceIdxRef.current]);
        setProgress(Math.round((currentSentenceIdxRef.current / sentencesRef.current.length) * 100));
      }
    }
  };

  const handleSkipPrev = () => {
    if (currentSentenceIdxRef.current > 0) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      currentSentenceIdxRef.current -= 1;
      if (isPlaying) {
        speakNextSentence();
      } else {
        setCurrentSentence(sentencesRef.current[currentSentenceIdxRef.current]);
        setProgress(Math.round((currentSentenceIdxRef.current / sentencesRef.current.length) * 100));
      }
    }
  };

  const isNight = theme === 'night';
  const isBiranna = theme === 'biranna';

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl rounded-2xl shadow-2xl p-4 z-50 border backdrop-blur-md transition-all duration-300 ${
        isNight
          ? 'bg-gray-900/95 border-amber-900/40 text-gray-100'
          : isBiranna
          ? 'bg-[#faf3e3]/95 border-[#c59b27]/40 text-[#2c1e14]'
          : 'bg-white/95 border-gray-200 text-gray-900'
      }`}
    >
      {/* Top Header & Title */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xl">🎙️</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              የድምጽ ንባብ • Audio Narration
            </div>
            <h4 className="text-sm font-bold truncate max-w-md font-amharic">{title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rate Selector */}
          <select
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="text-xs rounded px-1.5 py-0.5 bg-black/5 dark:bg-white/10 border-0 cursor-pointer font-medium"
            title="Playback Speed"
          >
            <option value="0.75">0.75x</option>
            <option value="0.95">1.0x (ተፈጥሯዊ)</option>
            <option value="1.2">1.2x</option>
            <option value="1.5">1.5x</option>
          </select>

          {onClose && (
            <button
              onClick={() => {
                handleStop();
                onClose();
              }}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 transition-colors"
              title="Close player"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Current Active Sentence Preview */}
      <div className="mb-3 px-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-amharic leading-relaxed line-clamp-2 italic text-amber-900 dark:text-amber-200 min-h-[38px] flex items-center">
        {currentSentence || 'ንባብ ለመጀመር Play ይጫኑ... (Click Play to start narration)'}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
        <div
          className="bg-gradient-to-r from-amber-600 to-red-700 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 font-mono">
          {currentSentenceIdxRef.current + 1} / {sentencesRef.current.length} ዓረፍተ-ነገሮች
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSkipPrev}
            disabled={currentSentenceIdxRef.current === 0}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="ቀዳሚ (Previous)"
          >
            ⏮
          </button>

          {isPlaying ? (
            <button
              onClick={handlePause}
              className="w-10 h-10 rounded-full bg-amber-700 hover:bg-amber-800 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              title="አፍታ ቆም (Pause)"
            >
              ⏸
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="w-10 h-10 rounded-full bg-amber-700 hover:bg-amber-800 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 pl-0.5"
              title="አጫውት (Play Narration)"
            >
              ▶
            </button>
          )}

          <button
            onClick={handleSkipNext}
            disabled={currentSentenceIdxRef.current >= sentencesRef.current.length - 1}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="ቀጣይ (Next)"
          >
            ⏭
          </button>

          <button
            onClick={handleStop}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-xs text-red-600 transition-colors"
            title="አቁም (Stop)"
          >
            ⏹
          </button>
        </div>

        <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{progress}%</div>
      </div>
    </div>
  );
};

export default AudioNarrationPlayer;
