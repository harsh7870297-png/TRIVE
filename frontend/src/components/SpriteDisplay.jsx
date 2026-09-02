import React, { useState, useEffect } from 'react';

/**
 * Dynamic Interviewer Pixel-Art Sprite Display
 * Renders expression-based sprites:
 * HR: thinking, very_pleased, happy, awkward, satisfied, disappointed
 * TECHNICAL: thinking, impressed, skeptical, investigating, astonished, exhausted
 * HIRING MANAGER: considering, respect, impressed, questioning, evaluating, unimpressed
 */
export default function SpriteDisplay({ type, expression }) {
  const currentType = type?.toLowerCase() || 'hr';
  const folder = currentType === 'hiring_manager' || currentType === 'critic' ? 'hiring_manager' : currentType;
  const exprName = expression?.toLowerCase() || 'default';

  const initialSrc = `/assets/avatars/${folder}/${exprName}.png`;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(`/assets/avatars/${folder}/${exprName}.png`);
    setHasFailed(false);
  }, [type, expression]);

  const handleError = () => {
    // If specific expression fails to load, fall back to default.png
    if (currentSrc !== `/assets/avatars/${folder}/default.png`) {
      setCurrentSrc(`/assets/avatars/${folder}/default.png`);
    } else {
      setHasFailed(true);
    }
  };

  const bgColors = {
    hr: '#8b5cf6',             // Purple
    technical: '#93c5fd',      // Light Blue
    hiring_manager: '#86efac', // Light Green
    critic: '#86efac'
  };

  const bgColor = bgColors[currentType] || bgColors.hr;
  const displayTitle = currentType === 'hiring_manager' || currentType === 'critic' ? 'HIRING MANAGER' : currentType.toUpperCase();

  return (
    <div 
      className="w-full h-full relative flex items-center justify-center select-none overflow-hidden" 
      style={{ backgroundColor: bgColor }}
    >
      {/* Interviewer Tag Badge on TOP of Sprite */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black text-white font-mono font-bold text-[11px] md:text-xs py-1 px-3 uppercase tracking-wider border border-white/50 shadow-md z-20 whitespace-nowrap">
        {displayTitle} INTERVIEWER
      </div>

      {!hasFailed ? (
        <img
          src={currentSrc}
          alt={`${displayTitle} interviewer (${exprName})`}
          onError={handleError}
          className="w-full h-full object-cover object-top pixelated transition-all duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="text-center font-mono font-bold text-black uppercase text-sm">
            {displayTitle} SPRITE
          </div>
        </div>
      )}
    </div>
  );
}
