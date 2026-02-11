'use client';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  flipping?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-24 h-36',
  md: 'w-40 h-56',
  lg: 'w-52 h-72',
};

export default function CardBack({ size = 'md', onClick, flipping }: Props) {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg overflow-hidden cursor-pointer select-none
        border-2 border-amber-700 shadow-lg
        transition-all duration-300
        ${SIZE_CLASSES[size]}
        ${flipping ? 'animate-spin scale-0' : 'hover:scale-105'}
      `}
      style={{
        background: 'linear-gradient(135deg, #2d1810, #4a2820, #2d1810)',
      }}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-2 border border-amber-600/30 rounded" />
      <div className="absolute inset-4 border border-amber-600/20 rounded" />

      {/* Center logo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-amber-500/80 tracking-wider">W</div>
        <div className="text-[8px] text-amber-600/60 tracking-widest mt-1">CARD WARS</div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-1 left-1 text-amber-700/40 text-xs">✦</div>
      <div className="absolute top-1 right-1 text-amber-700/40 text-xs">✦</div>
      <div className="absolute bottom-1 left-1 text-amber-700/40 text-xs">✦</div>
      <div className="absolute bottom-1 right-1 text-amber-700/40 text-xs">✦</div>
    </div>
  );
}
