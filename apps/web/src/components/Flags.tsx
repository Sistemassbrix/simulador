import React from 'react';

export function FlagUS({ width = 24, height = 16, className = '' }: { width?: number; height?: number; className?: string }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 7410 3900"
      className={className}
      style={{
        borderRadius: '3px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0
      }}
      aria-label="English"
    >
      <rect width="7410" height="3900" fill="#b22234" />
      <path
        d="M0,450H7410M0,1050H7410M0,1650H7410M0,2250H7410M0,2850H7410M0,3450H7410"
        stroke="#ffffff"
        strokeWidth="300"
      />
      <rect width="2964" height="2100" fill="#3c3b6e" />
      <g fill="#ffffff">
        {Array.from({ length: 9 }).map((_, r) => {
          const isEven = r % 2 === 0;
          const count = isEven ? 6 : 5;
          const y = 105 + r * 210;
          return Array.from({ length: count }).map((_, c) => {
            const x = isEven ? 247 + c * 494 : 494 + c * 494;
            return (
              <polygon
                key={`${r}-${c}`}
                points="0,-80 24,-24 80,-24 36,12 52,68 0,36 -52,68 -36,12 -80,-24 -24,-24"
                transform={`translate(${x},${y}) scale(0.68)`}
              />
            );
          });
        })}
      </g>
    </svg>
  );
}

export function FlagES({ width = 24, height = 16, className = '' }: { width?: number; height?: number; className?: string }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 750 500"
      className={className}
      style={{
        borderRadius: '3px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0
      }}
      aria-label="Español"
    >
      <rect width="750" height="500" fill="#c60b1e" />
      <rect width="750" height="250" y="125" fill="#ffc400" />
      {/* Coat of arms simplified silhouette */}
      <g transform="translate(190, 185) scale(0.85)">
        <rect x="0" y="10" width="80" height="90" rx="20" fill="#c60b1e" stroke="#fff" strokeWidth="4" />
        <circle cx="40" cy="55" r="18" fill="#ffc400" />
        <path d="M10,0 L70,0 L60,14 L20,14 Z" fill="#ffc400" />
      </g>
    </svg>
  );
}
