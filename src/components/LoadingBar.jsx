"use client";

import React from 'react';

const LoadingBar = ({ fullScreen = true, className = "", size = "md" }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-16 h-16 md:w-20 md:h-20",
  };

  const content = (
    <div className={`relative flex flex-col items-center justify-center gap-2 ${className}`}>
      {/* Deep Glow */}
      <div className={`absolute inset-0 rounded-full bg-gold/20 animate-pulse ${size === 'sm' ? 'blur-[15px]' : 'blur-[60px] md:blur-[100px]'}`}></div>
      <img
        src="/web.gif"
        alt="Loading..."
        className={`relative ${sizeClasses[size]} pointer-events-none brightness-110 object-contain`}
      />
      {size !== 'sm' && (
        <span className="text-gold text-[10px] font-black animate-pulse drop-shadow-[0_0_8px_rgba(201,162,39,0.5)]">
          جاري التحميل
        </span>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[100] pointer-events-none animate-in fade-in zoom-in duration-150">
      {/* Top Progress Line */}
      <div className="fixed top-0 left-0 h-[4px] bg-gold shadow-[0_0_15px_#c9a227] animate-progress-fast w-full origin-left transition-transform"></div>
      {content}
    </div>
  );
};

export default LoadingBar;
