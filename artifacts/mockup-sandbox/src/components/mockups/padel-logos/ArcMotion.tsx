import React from 'react';

export default function ArcMotion() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-8">
      <div 
        className="w-[500px] h-[280px] bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center gap-6"
        style={{ fontFamily: "'Outfit', 'Space Grotesk', system-ui, sans-serif" }}
      >
        {/* Logo Mark */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            {/* Motion Arc */}
            <path 
              d="M 15 85 C 0 55, 15 25, 60 10" 
              fill="none" 
              stroke="#00c4cc" 
              strokeWidth="14" 
              strokeLinecap="round" 
            />
            {/* Ball */}
            <circle cx="70" cy="30" r="22" fill="#4169E1" />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center leading-none">
          <span 
            className="text-[44px] font-black tracking-tight" 
            style={{ color: '#0f1c3f' }}
          >
            PADEL
          </span>
          <span 
            className="text-[16px] font-semibold tracking-[0.25em] mt-1.5 ml-1" 
            style={{ color: '#0f1c3f' }}
          >
            EXCHANGE
          </span>
        </div>
      </div>
    </div>
  );
}
