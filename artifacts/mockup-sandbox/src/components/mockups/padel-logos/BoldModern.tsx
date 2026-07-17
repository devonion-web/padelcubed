import React from 'react';

export default function BoldModern() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap');`}
      </style>
      <div 
        className="relative bg-white rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden"
        style={{ width: '500px', height: '280px' }}
      >
        <div className="relative flex flex-col justify-center">
          {/* Text layer */}
          <div 
            className="flex flex-col text-left font-black"
            style={{ 
              fontFamily: '"Outfit", sans-serif', 
              color: '#0f1c3f',
              lineHeight: 0.85,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase'
            }}
          >
            <span style={{ fontSize: '84px' }}>PADEL</span>
            <span style={{ fontSize: '84px' }}>EXCHANGE</span>
          </div>

          {/* SVG Overlay layer */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-20" 
            style={{ overflow: 'visible' }}
          >
            {/* The diagonal slash */}
            <line 
              x1="-5%" 
              y1="105%" 
              x2="105%" 
              y2="-5%" 
              stroke="#00e5d4" 
              strokeWidth="6" 
              strokeLinecap="round"
            />
            {/* The padel ball at the top tip of the slash */}
            <circle 
              cx="105%" 
              cy="-5%" 
              r="8" 
              fill="#2563eb" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
