'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('INIT_SYSTEM');
  const [isComplete, setIsComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  // Determine if dark mode
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const messages = [
    'ESTABLISHING_CONNECTION',
    'PARSING_USER_DATA',
    'BUILDING_CHARTS',
    'OPTIMIZING_LAYOUT',
    'READY_TO_LAUNCH'
  ];

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';

  // Glitch text effect
  const glitchText = (targetText: string) => {
    if (!typewriterRef.current) return;
    
    let iteration = 0;
    if (glitchIntervalRef.current) {
      clearInterval(glitchIntervalRef.current);
    }
    
    glitchIntervalRef.current = setInterval(() => {
      if (!typewriterRef.current) return;
      
      typewriterRef.current.textContent = targetText
        .split('')
        .map((letter, index) => {
          if (index < iteration) {
            return targetText[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');
      
      if (iteration >= targetText.length) {
        if (glitchIntervalRef.current) {
          clearInterval(glitchIntervalRef.current);
        }
      }
      
      iteration += 1 / 2;
    }, 30);
  };

  // Initialize
  useEffect(() => {
    setMounted(true);
    glitchText(messages[0]);
  }, []);

  // Progress logic
  useEffect(() => {
    if (!mounted) return;

    let currentProgress = 0;

    progressIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 3;
      if (currentProgress > 100) currentProgress = 100;

      setProgress(currentProgress);

      // Update message based on progress
      let nextMsgIndex = 0;
      if (currentProgress > 20) nextMsgIndex = 1;
      if (currentProgress > 50) nextMsgIndex = 2;
      if (currentProgress > 75) nextMsgIndex = 3;
      if (currentProgress > 95) nextMsgIndex = 4;

      const nextMessage = messages[nextMsgIndex];
      if (nextMessage !== currentMessage) {
        setCurrentMessage(nextMessage);
        glitchText(nextMessage);
      }

      if (currentProgress === 100) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        setTimeout(() => {
          setIsComplete(true);
        }, 800);
      }
    }, 80);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (glitchIntervalRef.current) {
        clearInterval(glitchIntervalRef.current);
      }
    };
  }, [mounted, currentMessage]);

  if (isComplete) return null;
  if (!mounted) return null;

  return (
    <>
      {/* Ambient Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1000]">
        <div className={`orb orb-1 ${isDark ? 'orb-dark' : 'orb-light'}`}></div>
        <div className={`orb orb-2 ${isDark ? 'orb-dark' : 'orb-light'}`}></div>
      </div>

      {/* Preloader */}
      <div
        id="preloader"
        className={`preloader-container ${isDark ? 'preloader-dark' : 'preloader-light'} ${isComplete ? 'loader-exit-zoom' : ''}`}
      >
        {/* 3D Card Wrapper */}
        <div className="card-container relative mb-12">
          {/* Glassy Card Backing */}
          <div className={`absolute inset-0 backdrop-blur-md rounded-xl shadow-2xl border transform translate-z-[-10px] ${
            isDark 
              ? 'bg-zinc-900/60 border-white/10' 
              : 'bg-white/60 border-black/10'
          }`}></div>
          
          {/* Icon Container */}
          <div className={`relative w-32 h-40 rounded-xl shadow-lg border flex items-center justify-center overflow-hidden ${
            isDark 
              ? 'bg-black border-zinc-800' 
              : 'bg-white border-gray-300'
          }`}>
            
            {/* The Scanner Beam */}
            <div className={`scan-beam ${isDark ? 'scan-beam-dark' : 'scan-beam-light'}`}></div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className={`particle ${isDark ? 'dark' : 'light'}`} style={{ left: '20%', animationDelay: '0s' }}></div>
              <div className={`particle ${isDark ? 'dark' : 'light'}`} style={{ left: '70%', animationDelay: '1.2s' }}></div>
              <div className={`particle ${isDark ? 'dark' : 'light'}`} style={{ left: '50%', animationDelay: '0.5s' }}></div>
              <div className={`particle ${isDark ? 'dark' : 'light'}`} style={{ left: '80%', animationDelay: '2.1s' }}></div>
              <div className={`particle ${isDark ? 'dark' : 'light'}`} style={{ left: '30%', animationDelay: '1.8s' }}></div>
            </div>

            {/* The Document SVG */}
            <svg className="w-20 h-20 relative z-10" viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g strokeLinecap="round" strokeLinejoin="round">
                {/* Header Line */}
                <line 
                  x1="12" 
                  y1="15" 
                  x2="32" 
                  y2="15" 
                  strokeWidth="3" 
                  className={`reveal-path delay-1 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`}
                />
                
                {/* Mini Avatar Circle */}
                <circle 
                  cx="50" 
                  cy="15" 
                  r="4" 
                  strokeWidth="2" 
                  className={`reveal-path delay-1 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`}
                />

                {/* Chart Line */}
                <path 
                  d="M12 40 L20 32 L28 36 L40 20 L52 28" 
                  strokeWidth="2.5" 
                  className={`reveal-path delay-2 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`}
                />
                
                {/* Bar Chart Area (Bottom) */}
                <line x1="12" y1="55" x2="12" y2="65" strokeWidth="3" className={`reveal-path delay-3 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`} />
                <line x1="20" y1="50" x2="20" y2="65" strokeWidth="3" className={`reveal-path delay-3 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`} />
                <line x1="28" y1="58" x2="28" y2="65" strokeWidth="3" className={`reveal-path delay-3 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`} />
                <line x1="36" y1="45" x2="36" y2="65" strokeWidth="3" className={`reveal-path delay-3 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`} />
                <line x1="44" y1="52" x2="44" y2="65" strokeWidth="3" className={`reveal-path delay-3 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`} />
                <line x1="52" y1="60" x2="52" y2="65" strokeWidth="3" className={`reveal-path delay-3 ${isDark ? 'stroke-dark reveal-anim' : 'stroke-light reveal-anim'}`} />
              </g>
            </svg>
          </div>
          
          {/* Reflection/Gloss */}
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-tr pointer-events-none ${
            isDark ? 'from-white/10' : 'from-black/5'
          } to-transparent`}></div>
        </div>

        {/* Text & Status */}
        <div className="text-center z-10">
          <h2 className={`text-2xl font-semibold tracking-tight mb-2 ${
            isDark ? 'text-white' : 'text-black'
          }`}>
            Work Report
          </h2>
          <div className="h-6 flex items-center justify-center">
            <span 
              ref={typewriterRef}
              className={`mono-text text-xs font-medium uppercase tracking-widest ${
                isDark ? 'text-zinc-400' : 'text-gray-600'
              }`}
            >
              {currentMessage}
            </span>
            <span className={`animate-pulse ml-1 ${isDark ? 'text-white' : 'text-black'}`}>_</span>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="absolute bottom-10">
          <div className={`w-12 h-1 rounded-full overflow-hidden ${
            isDark ? 'bg-zinc-800' : 'bg-gray-200'
          }`}>
            <div 
              className={`h-full transition-all duration-200 ${
                isDark ? 'bg-white' : 'bg-black'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className={`text-[10px] text-center mt-2 font-mono ${
            isDark ? 'text-zinc-500' : 'text-gray-500'
          }`}>
            {Math.floor(progress)}%
          </p>
        </div>
      </div>
    </>
  );
}
