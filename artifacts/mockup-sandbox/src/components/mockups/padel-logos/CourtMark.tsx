import React from 'react';

export default function CourtMark() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-100 font-sans"
      style={{ fontFamily: '"Outfit", "Inter", sans-serif' }}
    >
      <div 
        className="flex items-center justify-center gap-8 rounded-[24px] shadow-2xl w-[520px] h-[300px]"
        style={{ backgroundColor: '#0f1c3f', boxShadow: '0 25px 50px -12px rgba(15, 28, 63, 0.4)' }}
      >
        {/* Icon Container */}
        <div className="flex items-center justify-center w-[110px] h-[110px] border-[1.5px] border-white/20 rounded-[20px] bg-white/5 relative">
          <svg width="60" height="74" viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Main Court Rectangle */}
            <rect x="10" y="6" width="40" height="60" stroke="white" strokeWidth="2.5" />
            
            {/* Service lines */}
            <line x1="10" y1="24" x2="50" y2="24" stroke="white" strokeWidth="1.5" />
            <line x1="10" y1="48" x2="50" y2="48" stroke="white" strokeWidth="1.5" />
            <line x1="30" y1="24" x2="30" y2="48" stroke="white" strokeWidth="1.5" />
            
            {/* Center Net Line (Teal Accent) */}
            <line x1="2" y1="36" x2="58" y2="36" stroke="#00e5d4" strokeWidth="4" />
            
            {/* Thick Bottom Edge (Glass Wall) */}
            <line x1="10" y1="66" x2="50" y2="66" stroke="white" strokeWidth="7" strokeLinecap="square" />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col text-white pt-2">
          <span className="text-[54px] font-bold leading-[0.8] tracking-[-0.03em]">
            PADEL
          </span>
          <span className="text-[17.5px] font-normal leading-none tracking-[0.38em] mt-[16px] ml-1 opacity-90 text-white">
            EXCHANGE
          </span>
        </div>
      </div>
    </div>
  );
}