import React, { useMemo } from 'react';

interface FallingLeaf {
  id: number;
  left: string;
  size: number;
  opacity: number;
  fallDuration: number;
  swayDuration: number;
  swayType: 1 | 2 | 3 | 4;
  delay: number;
  className?: string;
}

// 1. Single Classic Leaf Component: Clean, elegant, pleasing salad-green leaf
const ClassicLeafSvg: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="filter drop-shadow-[0_2px_5px_rgba(16,185,129,0.28)]"
    >
      <defs>
        <linearGradient id={`classicLeafGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />   {/* Light salad lime */}
          <stop offset="55%" stopColor="#2ECC71" />  {/* Salad / apple green */}
          <stop offset="100%" stopColor="#10B981" /> {/* Fresh emerald */}
        </linearGradient>
      </defs>

      {/* Small natural stem */}
      <path
        d="M7 29 C9 26 12 24 14 22"
        stroke="#16A34A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Classic neat leaf shape (universal oval-pointed eco leaf) */}
      <path
        d="M13 23 C8 15 14 6 29 4 C31 19 22 26 13 23 Z"
        fill={`url(#classicLeafGrad-${size})`}
        stroke="#15803D"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Subtle central spine */}
      <path
        d="M14 22 C18 17 22 12 27 6"
        stroke="#166534"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />

      {/* Delicate natural side veins */}
      <path
        d="M19 16 L23 18"
        stroke="#166534"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M17 19 L14 16"
        stroke="#166534"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
    </svg>
  );
};

export const AnimatedEcoBackground: React.FC = () => {
  // Uniform classic leaves drifting continuously across the screen
  const leaves: FallingLeaf[] = useMemo(
    () => [
      { id: 1, left: '3%', size: 30, opacity: 0.88, fallDuration: 18, swayDuration: 4.2, swayType: 1, delay: -2.5 },
      { id: 2, left: '9%', size: 34, opacity: 0.92, fallDuration: 21, swayDuration: 4.8, swayType: 2, delay: -11.0 },
      { id: 3, left: '16%', size: 26, opacity: 0.84, fallDuration: 16, swayDuration: 3.8, swayType: 3, delay: -6.4 },
      { id: 4, left: '23%', size: 32, opacity: 0.90, fallDuration: 19, swayDuration: 4.5, swayType: 4, delay: -15.8 },
      { id: 5, left: '30%', size: 28, opacity: 0.86, fallDuration: 17, swayDuration: 4.0, swayType: 1, delay: -8.2, className: 'hidden sm:block' },
      { id: 6, left: '38%', size: 36, opacity: 0.94, fallDuration: 22, swayDuration: 5.0, swayType: 2, delay: -3.9 },
      { id: 7, left: '45%', size: 26, opacity: 0.82, fallDuration: 15, swayDuration: 3.6, swayType: 3, delay: -13.2 },
      { id: 8, left: '52%', size: 32, opacity: 0.89, fallDuration: 20, swayDuration: 4.6, swayType: 4, delay: -9.5, className: 'hidden md:block' },
      { id: 9, left: '60%', size: 28, opacity: 0.85, fallDuration: 16, swayDuration: 3.9, swayType: 1, delay: -5.6 },
      { id: 10, left: '68%', size: 36, opacity: 0.92, fallDuration: 23, swayDuration: 5.2, swayType: 2, delay: -18.4 },
      { id: 11, left: '76%', size: 26, opacity: 0.84, fallDuration: 17, swayDuration: 4.1, swayType: 3, delay: -12.1 },
      { id: 12, left: '83%', size: 34, opacity: 0.90, fallDuration: 21, swayDuration: 4.7, swayType: 4, delay: -7.8 },
      { id: 13, left: '90%', size: 28, opacity: 0.86, fallDuration: 18, swayDuration: 4.3, swayType: 1, delay: -14.6 },
      { id: 14, left: '96%', size: 32, opacity: 0.90, fallDuration: 20, swayDuration: 4.5, swayType: 2, delay: -2.1 },
      { id: 15, left: '12%', size: 24, opacity: 0.80, fallDuration: 15, swayDuration: 3.7, swayType: 3, delay: -19.0, className: 'hidden lg:block' },
      { id: 16, left: '86%', size: 30, opacity: 0.88, fallDuration: 19, swayDuration: 4.4, swayType: 4, delay: -10.2, className: 'hidden xl:block' },
    ],
    []
  );

  return (
    <div 
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* 3. Красивые узорные переплетающиеся линии в ВЕРХНИХ УГЛАХ экрана (Corner Wave Patterns) */}

      {/* TOP-LEFT CORNER WAVE PATTERN */}
      <div className="absolute top-0 left-0 w-[420px] h-[340px] pointer-events-none animate-corner-wave-left">
        <svg
          viewBox="0 0 420 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="cornerLineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#2ECC71" stopOpacity="0.60" />
              <stop offset="100%" stopColor="#86EFAC" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cornerLineGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#34D399" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cornerLineGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.70" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.50" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gracefully Intertwining Curved Pattern Lines */}
          <path
            d="M-20,40 C60,10 130,90 210,40 C280,-10 330,60 410,20"
            stroke="url(#cornerLineGrad1)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M-15,65 C70,30 140,115 225,55 C295,5 345,70 420,30"
            stroke="url(#cornerLineGrad2)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M-10,95 C80,55 150,140 240,70 C310,10 360,80 430,40"
            stroke="url(#cornerLineGrad1)"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          <path
            d="M-5,130 C90,85 160,170 255,100 C325,40 375,105 440,60"
            stroke="url(#cornerLineGrad3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M0,170 C100,120 180,210 280,135 C350,70 400,130 450,85"
            stroke="url(#cornerLineGrad2)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M10,220 C110,165 195,255 305,170 C375,105 420,150 460,110"
            stroke="url(#cornerLineGrad1)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* TOP-RIGHT CORNER WAVE PATTERN */}
      <div className="absolute top-0 right-0 w-[420px] h-[340px] pointer-events-none animate-corner-wave-right">
        <svg
          viewBox="0 0 420 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="cornerRightGrad1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#2ECC71" stopOpacity="0.60" />
              <stop offset="100%" stopColor="#86EFAC" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cornerRightGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#34D399" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cornerRightGrad3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.70" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.50" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gracefully Intertwining Mirrored Curved Pattern Lines */}
          <path
            d="M440,40 C360,10 290,90 210,40 C140,-10 90,60 10,20"
            stroke="url(#cornerRightGrad1)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M435,65 C350,30 280,115 195,55 C125,5 75,70 0,30"
            stroke="url(#cornerRightGrad2)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M430,95 C340,55 270,140 180,70 C110,10 60,80 -10,40"
            stroke="url(#cornerRightGrad1)"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          <path
            d="M425,130 C330,85 260,170 165,100 C95,40 45,105 -20,60"
            stroke="url(#cornerRightGrad3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M420,170 C320,120 240,210 140,135 C70,70 20,130 -30,85"
            stroke="url(#cornerRightGrad2)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M410,220 C310,165 225,255 115,170 C45,105 0,150 -40,110"
            stroke="url(#cornerRightGrad1)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 1. Falling Uniform Classic Leaves Layer */}
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className={`absolute top-0 pointer-events-none will-change-transform ${leaf.className || ''}`}
          style={{
            left: leaf.left,
            animationName: 'leaf-fall-track',
            animationDuration: `${leaf.fallDuration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDelay: `${leaf.delay}s`,
          }}
        >
          {/* Inner swaying & rotating wrapper */}
          <div
            className="will-change-transform"
            style={{
              animationName: `leaf-sway-type-${leaf.swayType}`,
              animationDuration: `${leaf.swayDuration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              opacity: leaf.opacity,
            }}
          >
            <ClassicLeafSvg size={leaf.size} />
          </div>
        </div>
      ))}
    </div>
  );
};
