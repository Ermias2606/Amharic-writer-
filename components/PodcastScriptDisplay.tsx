import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PodcastScript, ScriptLine } from '../types';
import { ClipboardIcon, WandSparklesIcon, ArrowDownTrayIcon, MicrophoneIcon } from './icons';

interface PodcastScriptDisplayProps {
  script: PodcastScript;
  onClose: () => void;
  onRefineScript: () => void;
  isRefining: boolean;
}

const getSpeakerStyle = (speaker: ScriptLine['speaker']): string => {
  switch (speaker) {
    case 'Host':
      return 'font-bold text-indigo-600 dark:text-indigo-400';
    case 'Narrator':
      return 'text-gray-800 dark:text-gray-200';
    case 'Sound Effect':
    case 'Music':
      return 'italic text-gray-500 dark:text-gray-400';
    default:
      return '';
  }
};

// --- LOSSLESS CLIENT-SIDE WAV ENCODER ---
const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = 16-bit Integer PCM (uncompressed)
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferArr = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(bufferArr);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + result.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, result.length * 2, true);
  
  // write PCM audio samples
  let index = 44;
  for (let i = 0; i < result.length; i++) {
    let sample = result[i];
    if (sample > 1) sample = 1;
    else if (sample < -1) sample = -1;
    
    // convert float standard to 16-bit signed integer
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(index, intSample, true);
    index += 2;
  }
  
  return new Blob([view], { type: 'audio/wav' });

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }
};

// --- PRE-DESIGNED SEEKABLE DRAFT PODCAST CLIP PLAYER ---
interface ClipPlayerProps {
  clip: { id: string; name: string; url: string; date: string; duration: number; size: string };
  onDelete: () => void;
  onRename: (newName: string) => void;
  onExportWav: () => void;
  isExportingWav: boolean;
}

const ClipAudioPlayer: React.FC<ClipPlayerProps> = ({ clip, onDelete, onRename, onExportWav, isExportingWav }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [clip.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.warn(err));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleLoop = () => {
    const loopState = !isLooping;
    setIsLooping(loopState);
    if (audioRef.current) {
      audioRef.current.loop = loopState;
    }
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-2xl flex flex-col gap-3 transition duration-200 hover:border-indigo-500/30 animate-fade-in text-left">
      <audio 
        ref={audioRef}
        src={clip.url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
      />
      
      {/* Name and Rename Action */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <input 
            type="text" 
            value={clip.name}
            onChange={(e) => onRename(e.target.value)}
            className="font-bold text-xs text-indigo-300 bg-transparent border-b border-transparent hover:border-gray-800 focus:border-indigo-500 focus:outline-none w-full pb-0.5 truncate"
            title="Click to rename this audio take"
          />
          <div className="text-[9px] text-gray-500 flex gap-2 mt-1 font-mono">
            <span>{clip.date}</span>
            <span>•</span>
            <span>{clip.size}</span>
            <span>•</span>
            <span>PCM Studio Cut</span>
          </div>
        </div>
        
        <button 
          type="button"
          onClick={onDelete}
          className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-gray-900 transition"
          title="Discard this take track"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Progress slider bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeekChange}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-gray-800 accent-indigo-500 active:accent-indigo-400 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / (duration || 1)) * 100}%, #1f2937 ${(currentTime / (duration || 1)) * 100}%, #1f2937 100%)`
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono mt-0.5">
          <span>{formatSecs(currentTime)}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>

      {/* Audio Play/Pause, Pitch/Speed rate pills, loop repeat, downloads */}
      <div className="flex items-center justify-between gap-1 border-t border-gray-900/60 pt-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-md ${
              isPlaying ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-0.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={toggleLoop}
            className={`px-1.5 py-0.5 text-[8.5px] rounded font-bold border transition ${
              isLooping 
                ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-300' 
                : 'bg-transparent border-gray-800 text-gray-400 hover:text-white'
            }`}
            title="Loop Playback"
          >
            🔁 Loop
          </button>

          <div className="flex items-center bg-gray-900 border border-gray-800 rounded px-1 py-0.5">
            <span className="text-[7.5px] text-gray-500 uppercase mr-1 font-mono font-bold">Speed:</span>
            {[1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-1 py-0.5 text-[8px] font-mono rounded font-medium transition ${
                  playbackRate === rate 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Export Formats */}
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={onExportWav}
            disabled={isExportingWav}
            className={`text-[8.5px] font-bold py-1 px-2 rounded flex items-center gap-1 transition ${
              isExportingWav 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-950 text-indigo-300 border border-indigo-900 hover:border-indigo-500 hover:bg-indigo-900/40'
            }`}
            title="Export Lossless 16-bit WAV audio"
          >
            {isExportingWav ? (
              <>
                <svg className="animate-spin h-2.5 w-2.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span>📥 WAV</span>
              </>
            )}
          </button>

          <a
            href={clip.url}
            download={`${clip.name.replace(/\s+/g, '_')}.webm`}
            className="text-[8.5px] bg-gray-905 border border-gray-800 text-gray-400 hover:text-white px-2 py-1 rounded font-bold transition flex items-center"
            title="Export raw fast container stream (WebM/MP4)"
          >
            <span>Raw</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const PodcastScriptDisplay: React.FC<PodcastScriptDisplayProps> = ({ script, onClose, onRefineScript, isRefining }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // --- TELEPROMPTER & RECORDER SYSTEMS ---
  const [isTeleprompter, setIsTeleprompter] = useState(false);
  const [fontSize, setFontSize] = useState<number>(32); // Font size for reading comfort
  const [scrollSpeed, setScrollSpeed] = useState<number>(3); // 1 to 10 speed modifier
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [mirrorText, setMirrorText] = useState<boolean>(false);
  const [speakerFilter, setSpeakerFilter] = useState<string>('All');
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [soundClips, setSoundClips] = useState<Array<{
    id: string;
    name: string;
    url: string;
    date: string;
    duration: number;
    size: string;
  }>>([]);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);

  // WAV exporting feedback loader
  const [isExportingWavId, setIsExportingWavId] = useState<string | null>(null);

  // Recording and telemetry refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const teleprompterRef = useRef<HTMLDivElement>(null);
  const scrollAnimFrameRef = useRef<number | null>(null);
  const micAnalyserFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Visualizer canvas pointer
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Script text modes & Custom entries
  const [scriptMode, setScriptMode] = useState<'generated' | 'custom'>('generated');
  const [customScriptText, setCustomScriptText] = useState<string>(
    "🎙️ Host: Welcome back to our customized Amharic podcast take!\n" +
    "🎙️ Co-Host: In this episode, we are trying out the new live-synthesized studio background music.\n" +
    "✨ Sound Effect: [The Washint flute sound swells with warm reverby acoustics]\n" +
    "🎙️ Narrator: This reading has real-time noise reduction filters turned on to block room echoes and humming."
  );

  // Custom audio configuration details & progressive fine-tuning filters
  const [isNoiseReduction, setIsNoiseReduction] = useState<boolean>(true);
  const [hpFrequency, setHpFrequency] = useState<number>(85); // 40Hz to 250Hz voice low-cut
  const [lpFrequency, setLpFrequency] = useState<number>(8000); // 4000Hz to 12000Hz voice high-cut
  const [micGainValue, setMicGainValue] = useState<number>(1.2); // input master mic booster

  const [bgmPreset, setBgmPreset] = useState<string>('none');
  const [bgmVolume, setBgmVolume] = useState<number>(0.15); // ranges from 0.0 to 1.0

  // BGM real-time monitoring preview
  const [isBgmPlayingPreview, setIsBgmPlayingPreview] = useState<boolean>(false);
  const bgmPreviewCtxRef = useRef<AudioContext | null>(null);


  // Music synthesis variables
  const bgmNodesRef = useRef<any[]>([]);
  const bgmGainRef = useRef<GainNode | null>(null);

  const stopBgmSynth = () => {
    if (bgmNodesRef.current && bgmNodesRef.current.length > 0) {
      bgmNodesRef.current.forEach((node: any) => {
        try {
          node.stop();
        } catch (e) {}
        try {
          node.disconnect();
        } catch (e) {}
      });
      const nodesObj = bgmNodesRef.current as any;
      if (nodesObj.beatTimer) {
        clearTimeout(nodesObj.beatTimer);
      }
      bgmNodesRef.current = [];
    }
  };

  const startBgmSynth = (audioCtx: AudioContext, destination: AudioNode, presetName: string, level: number) => {
    stopBgmSynth();
    if (presetName === 'none') return;

    const musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(level, audioCtx.currentTime);
    musicGain.connect(destination);

    const nodes: any[] = [];

    if (presetName === 'zen') {
      const freqs = [110, 164.81, 220, 277.18, 329.63];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 15, audioCtx.currentTime);

        const targetVolume = (0.15 / freqs.length) * (idx === 0 ? 1.5 : 1.0);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 3);

        const pulseVolume = () => {
          if (audioCtx.state === 'closed') return;
          try {
            const swellTime = 4 + Math.random() * 4;
            gainNode.gain.linearRampToValueAtTime(targetVolume * 0.4, audioCtx.currentTime + swellTime / 2);
            gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + swellTime);
            setTimeout(pulseVolume, swellTime * 1050);
          } catch (e) {}
        };
        setTimeout(pulseVolume, 100);

        osc.connect(gainNode);
        const lpFilter = audioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(600, audioCtx.currentTime);

        gainNode.connect(lpFilter);
        lpFilter.connect(musicGain);

        osc.start();
        nodes.push(osc, gainNode, lpFilter);
      });
    } else if (presetName === 'cosmic') {
      const freqs = [87.31, 130.81, 174.61, 220.00, 261.63, 329.63];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 20, audioCtx.currentTime);

        const targetVolume = 0.15 / freqs.length;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 4);

        osc.connect(gainNode);

        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.Q.setValueAtTime(3.0, audioCtx.currentTime);
        bandpass.frequency.setValueAtTime(300 + Math.random() * 800, audioCtx.currentTime);

        gainNode.connect(bandpass);
        bandpass.connect(musicGain);

        osc.start();
        nodes.push(osc, gainNode, bandpass);
      });
    } else if (presetName === 'lofi') {
      const chord = [131.81, 196.00, 246.94, 293.66, 392.00];

      const oscTape = audioCtx.createOscillator();
      const tapeGain = audioCtx.createGain();
      oscTape.type = 'sawtooth';
      oscTape.frequency.setValueAtTime(45, audioCtx.currentTime);
      tapeGain.gain.setValueAtTime(0.005, audioCtx.currentTime);

      const lpTape = audioCtx.createBiquadFilter();
      lpTape.type = 'lowpass';
      lpTape.frequency.setValueAtTime(90, audioCtx.currentTime);
      oscTape.connect(tapeGain);
      tapeGain.connect(lpTape);
      lpTape.connect(musicGain);
      oscTape.start();
      nodes.push(oscTape, tapeGain, lpTape);

      let beatTimer: any;
      const playChordNotes = () => {
        if (audioCtx.state === 'closed') return;
        try {
          chord.forEach((freq, i) => {
            const oscNode = audioCtx.createOscillator();
            const noteGain = audioCtx.createGain();

            oscNode.type = 'sine';
            oscNode.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);

            noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
            noteGain.gain.setValueAtTime(0.0001, audioCtx.currentTime + i * 0.11);
            noteGain.gain.linearRampToValueAtTime(0.035, audioCtx.currentTime + i * 0.12 + 0.1);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 4);

            const hpNoise = audioCtx.createBiquadFilter();
            hpNoise.type = 'highpass';
            hpNoise.frequency.setValueAtTime(350, audioCtx.currentTime);

            oscNode.connect(noteGain);
            noteGain.connect(hpNoise);
            hpNoise.connect(musicGain);

            oscNode.start();
            oscNode.stop(audioCtx.currentTime + 5);
          });

          beatTimer = setTimeout(playChordNotes, 6000);
        } catch (e) {}
      };

      playChordNotes();
      (nodes as any).beatTimer = beatTimer;
    }

    bgmNodesRef.current = nodes;
    bgmGainRef.current = musicGain;
  };

  const handleBgmVolumeChange = (newVolume: number) => {
    setBgmVolume(newVolume);
    if (bgmGainRef.current && audioCtxRef.current) {
      try {
        bgmGainRef.current.gain.setValueAtTime(newVolume, audioCtxRef.current.currentTime);
      } catch (e) {}
    }
    if (bgmGainRef.current && bgmPreviewCtxRef.current) {
      try {
        bgmGainRef.current.gain.setValueAtTime(newVolume, bgmPreviewCtxRef.current.currentTime);
      } catch (e) {}
    }
  };

  const toggleBgmPreview = () => {
    if (isBgmPlayingPreview) {
      stopBgmSynth();
      if (bgmPreviewCtxRef.current) {
        bgmPreviewCtxRef.current.close().catch(() => {});
        bgmPreviewCtxRef.current = null;
      }
      setIsBgmPlayingPreview(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        bgmPreviewCtxRef.current = audioCtx;
        
        startBgmSynth(audioCtx, audioCtx.destination, bgmPreset, bgmVolume);
        setIsBgmPlayingPreview(true);
      } catch (err) {
        console.warn("Failed to play background music preview:", err);
      }
    }
  };

  const handleExportWav = async (clipId: string, clipUrl: string, clipName: string) => {
    setIsExportingWavId(clipId);
    try {
      const response = await fetch(clipUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const decodeCtx = new AudioContextClass();
      
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
      const wavBlob = bufferToWav(audioBuffer);
      
      const wavUrl = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = wavUrl;
      link.download = `${clipName.replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(wavUrl);
      }, 1550);
    } catch (e) {
      console.warn("Lossless browser WAV compilation block: falls back to raw container stream", e);
      const link = document.createElement('a');
      link.href = clipUrl;
      link.download = `${clipName.replace(/\s+/g, '_')}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExportingWavId(null);
    }
  };

  // Parse all unique speakers in script
  const uniqueSpeakers = useMemo(() => {
    const list = new Set<string>();
    script.episodes.forEach(ep => {
      ep.segments.forEach(seg => {
        seg.script.forEach(line => {
          if (line.speaker) list.add(line.speaker);
        });
      });
    });
    return Array.from(list);
  }, [script]);

  // Flattened lines for linear teleprompter scrolling
  const flattenedLines = useMemo(() => {
    const linesList: Array<{ speaker: string; text: string; episodeTitle: string; segmentTitle: string }> = [];
    script.episodes.forEach((episode) => {
      episode.segments.forEach((segment) => {
        segment.script.forEach((line) => {
          linesList.push({
            speaker: line.speaker,
            text: line.line,
            episodeTitle: episode.episodeTitle,
            segmentTitle: segment.segmentTitle
          });
        });
      });
    });
    return linesList;
  }, [script]);

  // Custom script parser representing individual lines block
  const customFlattenedLines = useMemo(() => {
    const result: Array<{ speaker: string; text: string; episodeTitle: string; segmentTitle: string }> = [];
    const lines = customScriptText.split('\n');
    lines.forEach((l) => {
      const trimmed = l.trim();
      if (!trimmed) return;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0 && colonIndex < 35) {
        let speaker = trimmed.substring(0, colonIndex).trim();
        const text = trimmed.substring(colonIndex + 1).trim();
        speaker = speaker.replace(/[🎙️✨🔊🎵]/g, '').trim();
        
        result.push({
          speaker: speaker || "Speaker",
          text,
          episodeTitle: "Custom Take",
          segmentTitle: "Input Script"
        });
      } else {
        result.push({
          speaker: "Narrator",
          text: trimmed,
          episodeTitle: "Custom Take",
          segmentTitle: "Input Script"
        });
      }
    });
    return result;
  }, [customScriptText]);

  // Select script content based on config
  const activeTeleprompterLines = useMemo(() => {
    return scriptMode === 'generated' ? flattenedLines : customFlattenedLines;
  }, [scriptMode, flattenedLines, customFlattenedLines]);

  // General click outsides and lifecycle cleanups
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Stop ongoing scrolling animation
      if (scrollAnimFrameRef.current) cancelAnimationFrame(scrollAnimFrameRef.current);
      // Stop sound analysers and close contexts
      if (micAnalyserFrameRef.current) cancelAnimationFrame(micAnalyserFrameRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      stopBgmSynth();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      if (bgmPreviewCtxRef.current && bgmPreviewCtxRef.current.state !== 'closed') {
        bgmPreviewCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Keyboard support: Space bar toggles scrolling in teleprompter mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTeleprompter) return;
      // Don't flag space if user is renaming a custom recording take
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsScrolling(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTeleprompter]);

  // Handle auto-scrolling with requestAnimationFrame to ensure fluid frame rates
  useEffect(() => {
    if (isScrolling && teleprompterRef.current) {
      let lastTime = performance.now();
      
      const animateScroll = (time: number) => {
        if (!teleprompterRef.current) return;
        
        const delta = time - lastTime;
        lastTime = time;
        
        // Compute pixel step size relative to scroll speed settings (scale 1-10)
        // Speed 1 = ~6px/sec, Speed 5 = ~30px/sec, Speed 10 = ~90px/sec
        const pxPerMs = (scrollSpeed * 9) / 1000;
        const scrollDelta = delta * pxPerMs;
        
        teleprompterRef.current.scrollTop += scrollDelta;
        
        const container = teleprompterRef.current;
        const reachedLimit = container.scrollTop + container.clientHeight >= container.scrollHeight - 3;
        
        if (reachedLimit) {
          setIsScrolling(false);
        } else {
          scrollAnimFrameRef.current = requestAnimationFrame(animateScroll);
        }
      };
      
      scrollAnimFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (scrollAnimFrameRef.current) {
        cancelAnimationFrame(scrollAnimFrameRef.current);
      }
    }
    
    return () => {
      if (scrollAnimFrameRef.current) {
        cancelAnimationFrame(scrollAnimFrameRef.current);
      }
    };
  }, [isScrolling, scrollSpeed]);

  // --- RECORDING STUDIO METHODS ---
  const startRecording = async () => {
    try {
      setRecorderError(null);
      chunksRef.current = [];
      setRecordingSeconds(0);
      
      // If BGM monitoring is active, stop it before capture
      if (isBgmPlayingPreview) {
        stopBgmSynth();
        if (bgmPreviewCtxRef.current) {
          bgmPreviewCtxRef.current.close().catch(() => {});
          bgmPreviewCtxRef.current = null;
        }
        setIsBgmPlayingPreview(false);
      }
      
      // Request mic stream (will prompt browser settings)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      
      // Mixed destination node so we can merge mic + generated BGM
      const mixedDestination = audioCtx.createMediaStreamDestination();
      
      // 1. Amplification Boost Gain Node
      const micBoostGain = audioCtx.createGain();
      micBoostGain.gain.setValueAtTime(micGainValue, audioCtx.currentTime);
      source.connect(micBoostGain);
      
      // Sound processing chain for microphone (Noise Reduction Filter parameters)
      let micOutputNode: AudioNode = micBoostGain;
      
      if (isNoiseReduction) {
        // Highpass Filter (Cut low-frequency microphone rumbles below hpFrequency)
        const hpFilter = audioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(hpFrequency, audioCtx.currentTime);
        
        // Lowpass Filter (Cut high-frequency hiss/noise above lpFrequency)
        const lpFilter = audioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(lpFrequency, audioCtx.currentTime);
        
        // Dynamics Compressor (Smooth vocal peaks and prevent voice blowout peaking)
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
        compressor.knee.setValueAtTime(15, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.2, audioCtx.currentTime);
        
        micBoostGain.connect(hpFilter);
        hpFilter.connect(lpFilter);
        lpFilter.connect(compressor);
        
        micOutputNode = compressor;
      }
      
      // Connect sound-filtered Microphone to the mixed recording destination
      micOutputNode.connect(mixedDestination);
      
      // Boot live analyser on mic output so visualizer displays voice details
      try {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Small fft for fast bar updates
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        micOutputNode.connect(analyser);
        
        const canvas = visualizerCanvasRef.current;
        const canvasCtx = canvas ? canvas.getContext('2d') : null;
        
        const updateVisualizer = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
            setMicLevel(0);
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          // Scale from average amplitude (0-255) to percentage height (0-100)
          setMicLevel(Math.min(100, Math.floor((avg / 128) * 100)));
          
          if (canvas && canvasCtx) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 1.6;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
              barHeight = dataArray[i];
              const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
              gradient.addColorStop(0, '#10b981'); // Emerald base
              gradient.addColorStop(0.5, '#6366f1'); // Indigo body
              gradient.addColorStop(1, '#ec4899'); // Rose peaks
              
              canvasCtx.fillStyle = gradient;
              const actualHeight = (barHeight / 255) * canvas.height;
              
              canvasCtx.beginPath();
              // Check for native support or fallback
              if (canvasCtx.roundRect) {
                canvasCtx.roundRect(x, canvas.height - actualHeight, barWidth - 2.5, actualHeight, 2);
              } else {
                canvasCtx.rect(x, canvas.height - actualHeight, barWidth - 2.5, actualHeight);
              }
              canvasCtx.fill();
              
              x += barWidth;
            }
          }
          
          micAnalyserFrameRef.current = requestAnimationFrame(updateVisualizer);
        };
        micAnalyserFrameRef.current = requestAnimationFrame(updateVisualizer);
      } catch (err) {
        console.warn("Failed to boot real-time mic volume tracking:", err);
      }
      
      // Start real-time synthesized background music if not 'none'
      if (bgmPreset !== 'none') {
        startBgmSynth(audioCtx, mixedDestination, bgmPreset, bgmVolume);
      }
      
      let options = { mimeType: 'audio/webm' };
      let mediaRecorder: MediaRecorder;
      try {
        // Record the mixed, background-music combined, noise-reduced stream!
        mediaRecorder = new MediaRecorder(mixedDestination.stream, options);
      } catch (e) {
        console.warn("audio/webm is not supported, trying standard mixed stream:", e);
        mediaRecorder = new MediaRecorder(mixedDestination.stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const sizeString = (blob.size / (1024 * 1024)).toFixed(2) + " MB";
        
        const newClip = {
          id: Date.now().toString(),
          name: `Draft Take ${soundClips.length + 1} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
          url,
          date: new Date().toLocaleDateString(),
          duration: recordingSeconds,
          size: sizeString
        };
        
        setSoundClips(prev => [newClip, ...prev]);
        setMicLevel(0);
        stopBgmSynth();
      };
      
      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      
      // Auto-start scrolling so speaking synchronicity triggers automatically!
      setIsScrolling(true);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setRecorderError(
        "Could not capture microphone streams. Ensure browser permissions are allowed on this page. If the app is rendered inside an iframe, please click the 'Open in New Tab' icon to enable the recorder."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        setIsScrolling(true); // resume walking the teleprompter
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        setIsScrolling(false); // suspend teleprompter
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setIsScrolling(false);
      
      stopBgmSynth();
      
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (micAnalyserFrameRef.current) cancelAnimationFrame(micAnalyserFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    }
  };

  const deleteClip = (id: string) => {
    setSoundClips(prev => {
      const clip = prev.find(c => c.id === id);
      if (clip) {
        URL.revokeObjectURL(clip.url);
      }
      return prev.filter(c => c.id !== id);
    });
  };

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatScriptForCopy = (): string => {
    const lines: string[] = [];
    lines.push(`Podcast Title: ${script.podcastTitle}`);
    lines.push('='.repeat(40));

    script.episodes.forEach((episode, eIndex) => {
      lines.push(`\nEPISODE ${eIndex + 1}: ${episode.episodeTitle}\n`);
      episode.segments.forEach((segment, sIndex) => {
        lines.push(`-- Segment ${sIndex + 1}: ${segment.segmentTitle} --\n`);
        segment.script.forEach(line => {
          lines.push(`${line.speaker.toUpperCase()}: ${line.line}`);
        });
        lines.push('');
      });
    });

    return lines.join('\n');
  };

  const handleCopy = () => {
    const scriptText = formatScriptForCopy();
    navigator.clipboard.writeText(scriptText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    }).catch(err => {
        console.error('Failed to copy script:', err);
    });
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPlainText = () => {
    const content = formatScriptForCopy();
    downloadFile(content, `${script.podcastTitle.replace(/\s+/g, '_')}_script.txt`, 'text/plain;charset=utf-8');
  };

  const handleExportMarkdown = () => {
    const lines: string[] = [];
    lines.push(`# ${script.podcastTitle}\n`);
    lines.push(`*Generated Podcast Script*\n`);
    lines.push(`---\n`);

    script.episodes.forEach((episode, eIndex) => {
      lines.push(`## Episode ${eIndex + 1}: ${episode.episodeTitle}\n`);
      episode.segments.forEach((segment, sIndex) => {
        lines.push(`### Segment ${sIndex + 1}: ${segment.segmentTitle}\n`);
        segment.script.forEach(line => {
          if (line.speaker === 'Sound Effect' || line.speaker === 'Music') {
            lines.push(`**[${line.speaker}]:** *${line.line}*\n`);
          } else {
            lines.push(`**${line.speaker}:** ${line.line}\n`);
          }
        });
        lines.push('');
      });
    });

    const content = lines.join('\n');
    downloadFile(content, `${script.podcastTitle.replace(/\s+/g, '_')}_script.md`, 'text/markdown;charset=utf-8');
  };

  const handleExportHtml = () => {
    const episodesHtml = script.episodes.map((episode, eIndex) => {
      const segmentsHtml = episode.segments.map((segment, sIndex) => {
        const linesHtml = segment.script.map(line => {
          let speakerClass = 'speaker-other';
          if (line.speaker === 'Host') speakerClass = 'speaker-host';
          else if (line.speaker === 'Co-Host') speakerClass = 'speaker-cohost';
          else if (line.speaker === 'Narrator') speakerClass = 'speaker-narrator';
          else if (line.speaker === 'Sound Effect' || line.speaker === 'Music') speakerClass = 'speaker-audio';

          return `
            <div class="script-line ${speakerClass}">
              <div class="line-speaker">${line.speaker}</div>
              <div class="line-content">${line.line}</div>
            </div>
          `;
        }).join('');

        return `
          <div class="segment">
            <h4 class="segment-title">Segment ${sIndex + 1}: ${segment.segmentTitle}</h4>
            <div class="segment-lines">
              ${linesHtml}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="episode page-break">
          <h3 class="episode-title">Episode ${eIndex + 1}: ${episode.episodeTitle}</h3>
          ${segmentsHtml}
        </div>
      `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="am">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${script.podcastTitle} - Script</title>
    <link href="https://fonts.googleapis.com/css2?family=Abyssinica+SIL&family=Noto+Serif+Ethiopic:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f8fafc;
            --text-color: #0f172a;
            --card-bg: #ffffff;
            --border-color: #e2e8f0;
            --primary-color: #4f46e5;
            --host-color: #4f46e5;
            --cohost-color: #0d9488;
            --narrator-color: #334155;
            --audio-color: #b45309;
            --audio-bg: #fef3c7;
        }

        .dark-mode {
            --bg-color: #0f172a;
            --text-color: #f8fafc;
            --card-bg: #1e293b;
            --border-color: #334155;
            --primary-color: #818cf8;
            --host-color: #818cf8;
            --cohost-color: #2dd4bf;
            --narrator-color: #cbd5e1;
            --audio-color: #f59e0b;
            --audio-bg: #78350f;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            padding-top: 70px;
            transition: background-color 0.3s, color 0.3s;
        }

        .action-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--card-bg);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .action-bar-title {
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--primary-color);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 50%;
        }

        .action-buttons {
            display: flex;
            gap: 12px;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: 1px solid var(--border-color);
            background-color: var(--card-bg);
            color: var(--text-color);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .btn-primary {
            background-color: var(--primary-color);
            color: #ffffff;
            border-color: transparent;
        }

        .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        .script-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .script-header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 20px;
        }

        .script-title {
            font-size: 2.25rem;
            color: var(--text-color);
            margin-bottom: 8px;
        }

        .script-meta {
            font-size: 0.875rem;
            color: #64748b;
        }

        .episode {
            margin-top: 40px;
            border-top: 1px solid var(--border-color);
            padding-top: 30px;
        }

        .episode-title {
            font-size: 1.75rem;
            color: var(--primary-color);
            margin-bottom: 24px;
        }

        .segment {
            margin-bottom: 32px;
        }

        .segment-title {
            font-size: 1.25rem;
            color: var(--text-color);
            margin-bottom: 16px;
            font-weight: 600;
            border-left: 3px solid var(--primary-color);
            padding-left: 10px;
        }

        .segment-lines {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .script-line {
            display: flex;
            gap: 16px;
            padding: 8px 12px;
            border-radius: 6px;
            background-color: rgba(0, 0, 0, 0.01);
        }

        .line-speaker {
            font-weight: 700;
            width: 120px;
            flex-shrink: 0;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 0.05em;
        }

        .line-content {
            flex-grow: 1;
            font-family: 'Noto Serif Ethiopic', 'Abyssinica SIL', serif;
            font-size: 1.05rem;
        }

        .speaker-host .line-speaker {
            color: var(--host-color);
        }
        
        .speaker-cohost .line-speaker {
            color: var(--cohost-color);
        }

        .speaker-narrator .line-speaker {
            color: var(--narrator-color);
        }

        .speaker-audio {
            background-color: var(--audio-bg);
            border-left: 3px solid var(--audio-color);
        }

        .speaker-audio .line-speaker {
            color: var(--audio-color);
        }

        .speaker-audio .line-content {
            font-style: italic;
            color: var(--audio-color);
        }

        @media print {
            body {
                padding-top: 0;
                background-color: #ffffff;
                color: #000000;
            }
            .action-bar {
                display: none;
            }
            .script-card {
                border: none;
                box-shadow: none;
                padding: 0;
            }
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="action-bar">
        <div class="action-bar-title">${script.podcastTitle}</div>
        <div class="action-buttons">
            <button class="btn" onclick="toggleDarkMode()">🌓 Toggle Theme</button>
            <button class="btn btn-primary" onclick="window.print()">🖨️ Print / PDF</button>
        </div>
    </div>

    <div class="container">
        <div class="script-card">
            <div class="script-header">
                <h1 class="script-title">${script.podcastTitle}</h1>
                <div class="script-meta">ተንቀሳቃሽ የፖድካስት ስክሪፕት / Professional Podcast Script</div>
            </div>
            ${episodesHtml}
        </div>
    </div>

    <script>
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
        }
    </script>
</body>
</html>
    `;

    downloadFile(htmlContent, `${script.podcastTitle.replace(/\s+/g, '_')}_script.html`, 'text/html;charset=utf-8');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-65 flex justify-center items-center z-50 animate-fade-in p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="podcast-script-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl h-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER AREA */}
        <header className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3 justify-between items-center bg-gray-50 dark:bg-gray-800/80 flex-shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full">
              Podcast Studio Desk
            </span>
            <h2 id="podcast-script-title" className="text-lg font-bold text-gray-900 dark:text-white font-amharic flex items-center gap-2 mt-1">
              🎙️ {script.podcastTitle}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Teleprompter Toggle Tab */}
            <button
              onClick={() => {
                // stop recording if switching back to script text view to prevent hot-mics
                if (isTeleprompter && isRecording) stopRecording();
                setIsTeleprompter(!isTeleprompter);
              }}
              className={`flex items-center gap-2 py-2 px-3.5 border shadow-sm text-xs font-semibold rounded-lg transition-all duration-200 ${
                isTeleprompter 
                  ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-750'
                  : 'border-rose-300 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/30 text-rose-705 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/50'
              }`}
              title="Open automated readable scrolling teleprompter with layout recording mechanisms"
            >
              <MicrophoneIcon className={`w-4 h-4 ${isTeleprompter ? 'animate-bounce text-white' : 'text-rose-600 dark:text-rose-450'}`} />
              <span>{isTeleprompter ? '📖 Read Script Text' : '🎤 Open Recording Teleprompter'}</span>
            </button>
            
            {!isTeleprompter && (
              <>
                <button
                  onClick={onRefineScript}
                  disabled={isRefining}
                  className="flex items-center gap-1.5 py-2 px-3 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  title="Refine the script for better narrative flow"
                >
                  {isRefining ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <WandSparklesIcon className="w-3.5 h-3.5" />
                      <span>Refine Script</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 py-2 px-3 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-705 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50"
                >
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
                
                {/* Export Dropdown */}
                <div className="relative" ref={exportDropdownRef}>
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="flex items-center gap-1.5 py-2 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                  {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100] py-1 text-left">
                      <button
                        onClick={() => {
                          handleExportHtml();
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                      >
                        <span className="text-base">📖</span>
                        <div>
                          <div className="font-semibold">HTML Table Read (.html)</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Colored roles, print options, responsive dark theme</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          handleExportMarkdown();
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                      >
                        <span className="text-base">📝</span>
                        <div>
                          <div className="font-semibold">Markdown (.md)</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Formatted role blocks standard markdown files</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          handleExportPlainText();
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                      >
                        <span className="text-base">📄</span>
                        <div>
                          <div className="font-semibold">Plain Text (.txt)</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Simplest plain text representation</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-850 dark:bg-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        </header>

        {/* WORKSPACE DIVIDER CHECKPOINT */}
        {isTeleprompter ? (
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-gray-950 text-white select-none">
            
            {/* LEFT SIDE: TELEPROMPTER READ WINDOW */}
            <div className="flex-1 flex flex-col border-r border-gray-800/80 h-full relative overflow-hidden">
              
              {/* Teleprompter Settings Dock */}
              <div className="bg-gray-900 border-b border-gray-800/80 p-3 flex flex-wrap gap-4 items-center justify-between text-xs text-gray-300 flex-shrink-0">
                
                {/* Font zooming adjustments */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Font Comfort:</span>
                  <button 
                    type="button"
                    onClick={() => setFontSize(p => Math.max(16, p - 4))}
                    className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center font-bold text-xs"
                    title="Shrink script text size"
                  >
                    A-
                  </button>
                  <span className="font-mono font-semibold min-w-[32px] text-center">{fontSize}px</span>
                  <button 
                    type="button"
                    onClick={() => setFontSize(p => Math.min(64, p + 4))}
                    className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center font-bold text-xs"
                    title="Enlarge script text size"
                  >
                    A+
                  </button>
                </div>

                {/* Auto scrolling speed rate */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Scroll Speed:</span>
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={scrollSpeed}
                    onChange={(e) => setScrollSpeed(Number(e.target.value))}
                    className="w-24 h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="font-mono text-indigo-400 font-semibold min-w-[20px] text-right">{scrollSpeed}x</span>
                </div>

                {/* Role Specific Highlight filter */}
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="text-gray-400">My Character:</span>
                  <select
                    value={speakerFilter}
                    onChange={(e) => setSpeakerFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Characters</option>
                    {uniqueSpeakers.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>

                {/* Mirror Toggle */}
                <button
                  type="button"
                  onClick={() => setMirrorText(!mirrorText)}
                  className={`px-3 py-1 rounded border transition flex items-center gap-1 ${
                    mirrorText 
                      ? 'bg-amber-500/20 border-amber-600 text-amber-200 font-bold' 
                      : 'bg-gray-800 hover:bg-gray-750 border-gray-700 text-gray-300'
                  }`}
                  title="Horizontally reverse the view (perfect for physical reflecting teleprompter glasses)"
                >
                  <span>⇄ Mirror HUD</span>
                </button>
              </div>

              {/* TELEPROMPTER STAGE */}
              <div className="flex-1 relative bg-black overflow-hidden flex flex-col justify-center items-center">
                
                {/* Physical Eye Tracker lines to prevent reading exhaustion */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-amber-500 font-extrabold text-2xl animate-pulse">
                  ▶
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-amber-500 font-extrabold text-2xl animate-pulse">
                  ◀
                </div>
                <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-20 pointer-events-none border-y border-dashed border-amber-500/15 bg-amber-500/5 z-0 rounded-2xl" />

                {/* Scrolling Box Area */}
                <div
                  ref={teleprompterRef}
                  className={`w-full h-full overflow-y-auto px-12 py-[30vh] font-abyssinica flex-grow select-none bg-black transition-all duration-300 ${
                    mirrorText ? 'transform -scale-x-100' : ''
                  }`}
                >
                  <div className="max-w-3xl mx-auto space-y-12">
                    {activeTeleprompterLines.length === 0 ? (
                      <p className="text-gray-500 text-sm">Empty script content. Generate draft podcast versions first or enter custom text in the editor sidebar.</p>
                    ) : (
                      activeTeleprompterLines.map((lineItem, idx) => {
                        const isPrimary = speakerFilter === 'All' || lineItem.speaker === speakerFilter;
                        
                        return (
                          <div 
                            key={idx}
                            className={`transition-all duration-300 text-center ${
                              isPrimary 
                                ? 'opacity-100 scale-100 font-bold' 
                                : 'opacity-20 scale-95 hover:opacity-40'
                            }`}
                            style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                          >
                            <span className="text-indigo-400 uppercase tracking-widest font-sans font-extrabold text-xs mb-2 block">
                              {lineItem.speaker} <span className="text-[10px] text-gray-550 font-normal">({lineItem.episodeTitle})</span>
                            </span>
                            <p className={
                              lineItem.speaker === 'Sound Effect' || lineItem.speaker === 'Music'
                                ? 'text-yellow-500 italic'
                                : 'text-white font-amharic'
                            }>
                              {lineItem.text}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Scroller bottom quick launcher deck */}
              <div className="bg-gray-900 border-t border-gray-800/80 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScrolling(!isScrolling)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      isScrolling
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <span>{isScrolling ? '⏸ Pause Scrolling' : '▶ Play Auto-Scroll'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScrolling(false);
                      if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
                    }}
                    className="bg-gray-800 hover:bg-gray-755 text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    🔄 Reset / Rewind
                  </button>
                </div>
                
                <span className="text-[10px] text-gray-500 italic font-mono hidden sm:inline-block">
                  Press [Spacebar] on your keyboard to instantly play or pause!
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: INTEGRATED AUDIO RECORDING CONTROL DESK */}
            <div className="w-full md:w-96 bg-gray-900 flex flex-col h-full overflow-hidden text-gray-200 shrink-0">
              
              {/* Reading Source Script input panel */}
              <div className="p-4 border-b border-gray-800/80 flex flex-col gap-3 flex-shrink-0 bg-gray-900/60">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">READING SOURCE</span>
                <div className="grid grid-cols-2 gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                  <button
                    type="button"
                    onClick={() => setScriptMode('generated')}
                    className={`py-1 text-[11px] font-semibold rounded-md transition ${scriptMode === 'generated' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    ✨ Compiled Script
                  </button>
                  <button
                    type="button"
                    onClick={() => setScriptMode('custom')}
                    className={`py-1 text-[11px] font-semibold rounded-md transition ${scriptMode === 'custom' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    ✏️ Custom Input
                  </button>
                </div>
                {scriptMode === 'custom' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <textarea
                      value={customScriptText}
                      onChange={(e) => setCustomScriptText(e.target.value)}
                      className="w-full h-32 bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans leading-relaxed resize-none"
                      placeholder="Paste or write your custom script lines here... Speakers parse like 'Host: Hello'!"
                    />
                    <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                      <span>{customScriptText.length} characters</span>
                      <span>{customScriptText.split(/\s+/).filter(Boolean).length} words</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STUDIO MIXING OPTIONS & NOISE REDUCTION */}
              <div className="p-4 border-b border-gray-800/80 flex flex-col gap-3 bg-gray-900/30 flex-shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">STUDIO MIXING CONSOLE</span>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-400 font-medium">Procedural BG Music Theme:</label>
                    {bgmPreset !== 'none' && (
                      <button
                        type="button"
                        onClick={toggleBgmPreview}
                        className={`text-[9px] px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                          isBgmPlayingPreview 
                            ? 'bg-rose-950 text-rose-350 border border-rose-900' 
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-900 hover:border-indigo-500'
                        }`}
                      >
                        {isBgmPlayingPreview ? '⏹ Stop Demo' : '🎵 Demo Theme'}
                      </button>
                    )}
                  </div>
                  <select
                    value={bgmPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBgmPreset(val);
                      if (isBgmPlayingPreview) {
                        stopBgmSynth();
                        if (bgmPreviewCtxRef.current) {
                          bgmPreviewCtxRef.current.close().catch(() => {});
                          bgmPreviewCtxRef.current = null;
                        }
                        setIsBgmPlayingPreview(false);
                      }
                    }}
                    className="bg-gray-950 border border-gray-800 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="none">🔇 Default (No BG Music)</option>
                    <option value="zen">🌸 Zen Ethio-Drone (Warm Pad)</option>
                    <option value="cosmic">✨ Cosmic Lounge Pad (Ethereal Sweep)</option>
                    <option value="lofi">🎵 Lofi Echo Beat (Chords Sequencer)</option>
                  </select>
                </div>

                {bgmPreset !== 'none' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>BGM Volume Level:</span>
                      <span className="font-mono text-indigo-400 font-semibold">{Math.round(bgmVolume * 100 * 2.5)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.4"
                      step="0.01"
                      value={bgmVolume}
                      onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/40">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-300 font-semibold">Voice Processing chain</span>
                    <span className="text-[9px] text-gray-500 leading-tight">Apply active dynamic filters & boosters</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNoiseReduction(!isNoiseReduction)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isNoiseReduction ? 'bg-emerald-600' : 'bg-gray-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isNoiseReduction ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isNoiseReduction && (
                  <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 flex flex-col gap-2.5 animate-fade-in text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>🎙️ Mic Input Boost:</span>
                        <span className="font-mono text-emerald-400 font-semibold">{Math.round(micGainValue * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={micGainValue}
                        onChange={(e) => setMicGainValue(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Low rumble cut (Highpass):</span>
                        <span className="font-mono text-indigo-400 font-semibold">{hpFrequency} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="250"
                        step="5"
                        value={hpFrequency}
                        onChange={(e) => setHpFrequency(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>High hiss cut (Lowpass):</span>
                        <span className="font-mono text-indigo-400 font-semibold">{lpFrequency} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="4000"
                        max="12000"
                        step="100"
                        value={lpFrequency}
                        onChange={(e) => setLpFrequency(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Studio Mic Panel */}
              <div className="p-4 border-b border-gray-800/80 flex flex-col gap-3 flex-shrink-0 bg-gray-900/60">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  RECORDING CONSOLE
                </h4>

                {recorderError && (
                  <div className="p-3 text-xs bg-rose-950/40 border border-rose-900/60 text-rose-350 rounded-lg font-sans">
                    {recorderError}
                  </div>
                )}

                {/* Live Timer and Level Meter */}
                <div className="bg-gray-950 border border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                  {isRecording && !isPaused && (
                    <div className="absolute inset-0 bg-red-950/5 pointer-events-none animate-pulse" />
                  )}

                  {/* Frequency Level Bar Visualizer representation */}
                  <div className="w-full h-10 mb-2.5 flex items-center justify-center relative bg-gray-900/40 rounded-xl overflow-hidden border border-gray-850">
                    <canvas 
                      ref={visualizerCanvasRef}
                      width={320}
                      height={40}
                      className="w-full h-full block"
                    />
                    {!isRecording && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-gray-500 font-mono tracking-widest uppercase">
                        🎤 Connect Mic & Record
                      </span>
                    )}
                  </div>

                  {/* High accuracy timestamp recorder */}
                  <span className="text-2xl font-mono font-bold tracking-widest text-emerald-500 bg-emerald-950/20 border border-emerald-950 px-4 py-1.5 rounded-xl">
                    {formatTime(recordingSeconds)}
                  </span>

                  <div className="text-[9px] text-gray-400 mt-2 flex items-center gap-1.5 tracking-wider uppercase font-mono">
                    <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? (isPaused ? 'bg-amber-500' : 'bg-red-500 animate-ping') : 'bg-gray-700'}`}></span>
                    <span>{isRecording ? (isPaused ? 'Capture Paused' : 'Recording Audio Live') : 'Mic Standby'}</span>
                  </div>
                </div>

                {/* Recorder Trigger Buttons */}
                <div className="flex gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:translate-y-0.5"
                    >
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                      <span>Start Record</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={pauseRecording}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-3 rounded-lg text-xs"
                      >
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-3 rounded-lg text-xs"
                      >
                        ⏹ Stop & Save
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* SAVED TAKES LOGS */}
              <div className="flex-grow overflow-y-auto p-4 flex flex-col bg-gray-900/40">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Draft Audios Take ({soundClips.length})
                  </h5>
                  {soundClips.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        soundClips.forEach(clip => URL.revokeObjectURL(clip.url));
                        setSoundClips([]);
                      }} 
                      className="text-[10px] text-rose-400 hover:text-rose-500 underline animate-fade-in font-semibold"
                    >
                      Clear Takes
                    </button>
                  )}
                </div>

                {soundClips.length === 0 ? (
                  <div className="flex-1 border border-dashed border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl mb-1">🎙️</span>
                    <p className="text-xs font-semibold text-gray-500">No audio takes recorded</p>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      Mixed voice and background sound cuts will save here. Perform a reading to start!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {soundClips.map((clip) => (
                      <ClipAudioPlayer
                        key={clip.id}
                        clip={clip}
                        onDelete={() => deleteClip(clip.id)}
                        onRename={(newName) => {
                          setSoundClips(prev => prev.map(c => c.id === clip.id ? { ...c, name: newName } : c));
                        }}
                        onExportWav={() => handleExportWav(clip.id, clip.url, clip.name)}
                        isExportingWav={isExportingWavId === clip.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        ) : (
          <main className="p-6 overflow-y-auto flex-grow">
            {script.episodes.map((episode, eIndex) => (
              <div key={eIndex} className="mb-8 last:mb-0">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 pb-2 border-b-2 border-indigo-500 font-amharic">
                  Episode {eIndex + 1}: {episode.episodeTitle}
                </h3>
                {episode.segments.map((segment, sIndex) => (
                  <div key={sIndex} className="mb-6 last:mb-0">
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 font-amharic">
                      {segment.segmentTitle}
                    </h4>
                    <div className="space-y-4 pl-4 border-l-2 dark:border-gray-600">
                      {segment.script.map((line, lIndex) => (
                        <div key={lIndex}>
                          <p className={`${getSpeakerStyle(line.speaker)}`}>
                              <span className="font-amharic">{line.speaker}: </span>
                              <span className="font-abyssinica">{line.line}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </main>
        )}
      </div>
    </div>
  );
};

export default PodcastScriptDisplay;
