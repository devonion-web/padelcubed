import React from "react";

export default function ExchangeCross() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700&family=Playfair+Display:wght@500;600&display=swap');
      `}} />
      
      {/* Logo Card */}
      <div 
        className="relative flex flex-col items-center justify-center rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          width: '500px', 
          height: '280px', 
          backgroundColor: '#111827',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Subtle texture/gradient overlay for premium feel */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-black via-transparent to-white pointer-events-none mix-blend-overlay"></div>
        
        {/* Top Text */}
        <div 
          className="tracking-[0.3em] text-white/90 mb-3"
          style={{ 
            fontFamily: "'Playfair Display', serif",
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.35em',
            textTransform: 'uppercase'
          }}
        >
          The Padel
        </div>

        {/* Crossed Rackets SVG */}
        <div className="relative mb-3">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Racket 1 (Bottom Left to Top Right) */}
            <g transform="translate(50, 50) rotate(45) translate(-50, -50)">
              {/* Shaft/Handle */}
              <rect x="46" y="55" width="8" height="35" rx="3" fill="#e6c46a" />
              {/* Head */}
              <rect x="34" y="10" width="32" height="48" rx="16" fill="#d4a843" />
              {/* Subtle inner detail / rim */}
              <rect x="36" y="12" width="28" height="44" rx="14" stroke="#e6c46a" strokeWidth="1" opacity="0.5" />
            </g>
            
            {/* Racket 2 (Bottom Right to Top Left) */}
            <g transform="translate(50, 50) rotate(-45) translate(-50, -50)">
              {/* Shaft/Handle */}
              <rect x="46" y="55" width="8" height="35" rx="3" fill="#e6c46a" />
              {/* Head */}
              <rect x="34" y="10" width="32" height="48" rx="16" fill="#d4a843" />
              {/* Subtle inner detail / rim */}
              <rect x="36" y="12" width="28" height="44" rx="14" stroke="#e6c46a" strokeWidth="1" opacity="0.5" />
            </g>
            
            {/* Center subtle glow/dot to anchor the X */}
            <circle cx="50" cy="50" r="3" fill="#111827" />
          </svg>
        </div>

        {/* Bottom Text */}
        <div 
          style={{ 
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: '#ffffff',
            marginLeft: '0.25em' /* Offset tracking to perfectly center visually */
          }}
        >
          EXCHANGE
        </div>
      </div>
    </div>
  );
}
