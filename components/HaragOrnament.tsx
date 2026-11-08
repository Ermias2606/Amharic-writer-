// components/HaragOrnament.tsx
import React from 'react';

interface HaragOrnamentProps {
  variant?: 'header' | 'divider' | 'knot' | 'frame';
  className?: string;
  theme?: 'biranna' | 'modern' | 'night';
}

/**
 * Traditional Ethiopian Manuscript Illuminated Ribbon Ornament (ሐረግ - Harag)
 * Used in historical Biranna (parchment) manuscripts to crown chapters and section dividers.
 */
export const HaragOrnament: React.FC<HaragOrnamentProps> = ({
  variant = 'divider',
  className = '',
  theme = 'biranna'
}) => {
  const isNight = theme === 'night';
  const redColor = isNight ? '#e05353' : '#9e1b21'; // Traditional crimson rubrication
  const goldColor = isNight ? '#e5b84c' : '#b8861b'; // Ochre gold
  const inkColor = isNight ? '#d1d5db' : '#2b1d15'; // Lampblack ink

  if (variant === 'knot') {
    return (
      <div className={`flex justify-center items-center my-3 ${className}`}>
        <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Central Ge'ez cross knot */}
          <path d="M24 2L28 8L34 12L28 16L24 22L20 16L14 12L20 8L24 2Z" fill={redColor} stroke={goldColor} strokeWidth="1" />
          <circle cx="24" cy="12" r="2.5" fill={goldColor} />
          <circle cx="10" cy="12" r="2" fill={inkColor} />
          <circle cx="38" cy="12" r="2" fill={inkColor} />
          <line x1="2" y1="12" x2="8" y2="12" stroke={goldColor} strokeWidth="1.5" />
          <line x1="40" y1="12" x2="46" y2="12" stroke={goldColor} strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={`w-full flex justify-center items-center my-4 overflow-hidden select-none ${className}`}>
        <svg
          className="w-full max-w-xl h-10"
          viewBox="0 0 600 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Top and Bottom Gold Guard Rails */}
          <line x1="10" y1="4" x2="590" y2="4" stroke={goldColor} strokeWidth="2" strokeDasharray="6 3" />
          <line x1="10" y1="36" x2="590" y2="36" stroke={goldColor} strokeWidth="2" strokeDasharray="6 3" />

          {/* Repeating Intertwined Harag Diamond Knots */}
          {[60, 120, 180, 240, 300, 360, 420, 480, 540].map((cx, i) => (
            <g key={i}>
              {/* Outer interlacing diamond */}
              <polygon
                points={`${cx},10 ${cx + 18},20 ${cx},30 ${cx - 18},20`}
                fill={i % 2 === 0 ? redColor : goldColor}
                stroke={inkColor}
                strokeWidth="1.2"
              />
              {/* Inner cross motif */}
              <circle cx={cx} cy="20" r="3" fill={i % 2 === 0 ? goldColor : redColor} />
              {/* Connector loops */}
              <line x1={cx - 30} y1="20" x2={cx - 18} y2="20" stroke={inkColor} strokeWidth="2" />
            </g>
          ))}

          {/* Central Crown Rosette */}
          <circle cx="300" cy="20" r="12" fill={goldColor} stroke={inkColor} strokeWidth="1.5" />
          <polygon
            points="300,10 304,18 312,20 304,22 300,30 296,22 288,20 296,18"
            fill={redColor}
          />
          <circle cx="300" cy="20" r="2.5" fill="#fff" />
        </svg>
      </div>
    );
  }

  // Default: Elegant Chapter Divider
  return (
    <div className={`w-full flex items-center justify-center gap-3 my-6 select-none opacity-85 ${className}`}>
      <div className="h-0.5 flex-grow max-w-[120px] bg-gradient-to-r from-transparent to-amber-700/60 dark:to-amber-500/60" />
      <svg width="180" height="28" viewBox="0 0 180 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left wing knots */}
        <polygon points="30,8 40,14 30,20 20,14" fill={redColor} stroke={goldColor} strokeWidth="1" />
        <line x1="0" y1="14" x2="20" y2="14" stroke={goldColor} strokeWidth="1.5" strokeDasharray="2 2" />
        
        {/* Center Illuminated Rosette */}
        <g transform="translate(90, 14)">
          <circle cx="0" cy="0" r="9" fill={goldColor} stroke={inkColor} strokeWidth="1.2" />
          <path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill={redColor} />
          <circle cx="0" cy="0" r="2" fill="#fff" />
          {/* 4 dots around center (traditional Ge'ez paragraph marker ፨) */}
          <circle cx="-13" cy="0" r="1.5" fill={redColor} />
          <circle cx="13" cy="0" r="1.5" fill={redColor} />
        </g>

        {/* Right wing knots */}
        <polygon points="150,8 160,14 150,20 140,14" fill={redColor} stroke={goldColor} strokeWidth="1" />
        <line x1="160" y1="14" x2="180" y2="14" stroke={goldColor} strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      <div className="h-0.5 flex-grow max-w-[120px] bg-gradient-to-l from-transparent to-amber-700/60 dark:to-amber-500/60" />
    </div>
  );
};

export default HaragOrnament;
