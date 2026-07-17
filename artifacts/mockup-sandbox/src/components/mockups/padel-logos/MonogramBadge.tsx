import React from 'react';

export default function MonogramBadge() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@400;500;600&display=swap');
      `}} />
      
      {/* Logo Card */}
      <div 
        className="relative flex flex-col items-center justify-center rounded-3xl shadow-2xl overflow-hidden border border-white/10"
        style={{ 
          width: '500px', 
          height: '280px', 
          backgroundColor: '#4169E1' 
        }}
      >
        {/* Badge / Crest */}
        <svg 
          width="120" 
          height="132" 
          viewBox="0 0 100 110" 
          className="mb-6 drop-shadow-md"
          style={{ filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.2))' }}
        >
          {/* Hexagon Background */}
          <polygon 
            points="50 5, 93.3 30, 93.3 80, 50 105, 6.7 80, 6.7 30" 
            fill="#0f1c3f" 
            stroke="#d4a843" 
            strokeWidth="2" 
            strokeLinejoin="round"
          />
          
          {/* Subtle Padel Court Lines */}
          <g stroke="#ffffff" strokeWidth="1" strokeOpacity="0.08" fill="none">
            {/* Outer court bounds */}
            <rect x="25" y="20" width="50" height="70" />
            {/* Net */}
            <line x1="25" y1="55" x2="75" y2="55" strokeWidth="1.5" />
            {/* Service lines */}
            <line x1="25" y1="37.5" x2="75" y2="37.5" />
            <line x1="25" y1="72.5" x2="75" y2="72.5" />
            {/* Center service line */}
            <line x1="50" y1="37.5" x2="50" y2="72.5" />
          </g>
          
          {/* PE Monogram */}
          <text 
            x="51" 
            y="69" 
            fontFamily="'Cormorant Garamond', serif" 
            fontSize="46" 
            fontWeight="700" 
            fill="#ffffff" 
            textAnchor="middle" 
          >
            P<tspan dx="-4">E</tspan>
          </text>
        </svg>

        {/* Wordmark */}
        <h1 
          className="text-white uppercase tracking-[0.35em] text-[15px] font-medium ml-[0.35em]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          The Padel Exchange
        </h1>
      </div>
    </div>
  );
}
