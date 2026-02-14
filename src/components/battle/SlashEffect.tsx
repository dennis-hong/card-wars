import React from 'react';

interface Props {
  style: React.CSSProperties;
  side: 'player' | 'enemy';
}

export default function SlashEffect({ style, side }: Props) {
  return (
    <div style={style} className="pointer-events-none">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: side === 'player'
            ? 'linear-gradient(90deg, transparent, rgba(100,180,255,0.9), rgba(200,230,255,0.95), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,100,100,0.9), rgba(255,200,200,0.95), transparent)',
          animation: 'slashTravel 0.12s ease-out forwards',
          boxShadow: side === 'player'
            ? '0 0 8px rgba(100,180,255,0.6), 0 0 16px rgba(100,180,255,0.3)'
            : '0 0 8px rgba(255,100,100,0.6), 0 0 16px rgba(255,100,100,0.3)',
        }}
      />
    </div>
  );
}
