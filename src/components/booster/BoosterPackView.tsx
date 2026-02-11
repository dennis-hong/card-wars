'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PackType, PACK_INFO, Card, Grade, GRADE_COLORS, GRADE_NAMES, BoosterPack } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import { SFX } from '@/lib/sound';

// ============================================================
// Types
// ============================================================

interface Props {
  packs: BoosterPack[];
  onOpen: (packId: string) => Card[] | null;
  onComplete: () => void;
  ownedCardIds?: Set<string>; // card IDs already owned before this session
}

type Phase = 'select' | 'tearing' | 'revealing' | 'summary';

// ============================================================
// Particle System
// ============================================================

function Particles({ grade, active }: { grade: Grade; active: boolean }) {
  if (!active) return null;

  if (grade === 2) {
    // Blue particles for rare
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-blue-400"
            style={{
              left: `${8 + (i * 7.5)}%`,
              animation: `particleFloat ${1.2 + Math.random() * 0.8}s ease-out ${i * 0.1}s infinite`,
              ['--px' as string]: `${(Math.random() - 0.5) * 30}px`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
    );
  }

  if (grade === 3) {
    // Purple/violet particles for hero
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${5 + (i * 6)}%`,
              width: `${3 + Math.random() * 3}px`,
              height: `${3 + Math.random() * 3}px`,
              background: i % 2 === 0 ? '#aa44ff' : '#cc88ff',
              animation: `particleFloat ${1 + Math.random() * 1}s ease-out ${i * 0.08}s infinite`,
              ['--px' as string]: `${(Math.random() - 0.5) * 40}px`,
            }}
          />
        ))}
      </div>
    );
  }

  if (grade === 4) {
    // Rainbow particles for legendary
    const colors = ['#ff4444', '#ff8800', '#ffff00', '#44ff44', '#4488ff', '#8844ff', '#ff44ff'];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              bottom: `${Math.random() * 30}%`,
              left: `${Math.random() * 90 + 5}%`,
              width: `${3 + Math.random() * 4}px`,
              height: `${3 + Math.random() * 4}px`,
              background: colors[i % colors.length],
              animation: `rainbowParticle ${1.5 + Math.random() * 1}s ease-out ${i * 0.06}s infinite`,
              ['--px' as string]: `${(Math.random() - 0.5) * 60}px`,
              ['--py' as string]: `${-80 - Math.random() * 60}px`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

// ============================================================
// Light Burst Effect
// ============================================================

function LightBurst({ grade, active }: { grade: Grade; active: boolean }) {
  if (!active || grade < 3) return null;

  if (grade === 3) {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
        <div
          className="absolute w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(170,68,255,0.5) 0%, transparent 70%)',
            animation: 'heroLightBurst 0.8s ease-out forwards',
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
      <div
        className="absolute w-full h-full rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,200,0,0.6) 0%, rgba(255,100,0,0.3) 30%, transparent 70%)',
          animation: 'legendGoldBurst 1s ease-out forwards',
        }}
      />
    </div>
  );
}

// ============================================================
// Hologram Overlay (Grade 3)
// ============================================================

function HoloOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-lg z-10 opacity-30"
      style={{
        background: 'linear-gradient(135deg, #ff00ff33, #00ffff33, #ff00ff33, #00ffff33)',
        backgroundSize: '200% 200%',
        animation: 'holoShift 2s ease-in-out infinite',
        mixBlendMode: 'screen',
      }}
    />
  );
}

// ============================================================
// Card Reveal Wrapper (3D flip + grade effects)
// ============================================================

function CardRevealSlot({
  card,
  index,
  revealed,
  onReveal,
  legendaryFocused,
}: {
  card: Card;
  index: number;
  revealed: boolean;
  onReveal: (index: number) => void;
  legendaryFocused: boolean;
}) {
  const cardData = getCardById(card.id);
  const isLegend = card.grade === 4;
  const isHero = card.grade === 3;
  const isRare = card.grade === 2;

  return (
    <div
      className="relative"
      style={{
        animation: `cardDeal 0.5s cubic-bezier(0.2, 0, 0.2, 1) ${index * 0.12}s both`,
        zIndex: legendaryFocused && isLegend ? 50 : revealed ? 10 : 1,
      }}
    >
      {/* Light burst behind card */}
      {revealed && <LightBurst grade={card.grade} active={revealed} />}

      {/* Shake wrapper for hero/legend */}
      <div
        style={
          revealed && isHero
            ? { animation: 'heroShake 0.4s ease-in-out' }
            : revealed && isLegend
            ? { animation: 'legendShake 0.6s ease-in-out' }
            : undefined
        }
      >
        {/* Legendary zoom */}
        <div
          style={
            revealed && isLegend && legendaryFocused
              ? { animation: 'legendZoomIn 0.5s ease-out forwards', transformOrigin: 'center center' }
              : undefined
          }
        >
          {/* 3D flip container */}
          <div
            className="card-flip-container cursor-pointer w-40 h-56"
            onClick={() => !revealed && onReveal(index)}
          >
            <div className={`card-flip-inner ${revealed ? 'flipped' : ''}`}>
              {/* Back face */}
              <div className="card-flip-back">
                <div
                  className="relative w-40 h-56 rounded-lg overflow-hidden border-2 border-amber-700 shadow-lg select-none hover:scale-105 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #2d1810, #4a2820, #2d1810)',
                  }}
                >
                  <div className="absolute inset-2 border border-amber-600/30 rounded" />
                  <div className="absolute inset-4 border border-amber-600/20 rounded" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-amber-500/80 tracking-wider">W</div>
                    <div className="text-[8px] text-amber-600/60 tracking-widest mt-1">CARD WARS</div>
                  </div>
                  <div className="absolute top-1 left-1 text-amber-700/40 text-xs">&#x2726;</div>
                  <div className="absolute top-1 right-1 text-amber-700/40 text-xs">&#x2726;</div>
                  <div className="absolute bottom-1 left-1 text-amber-700/40 text-xs">&#x2726;</div>
                  <div className="absolute bottom-1 right-1 text-amber-700/40 text-xs">&#x2726;</div>
                  {/* Tap hint shimmer */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s infinite',
                    }}
                  />
                </div>
              </div>

              {/* Front face (revealed card) */}
              <div className="card-flip-front">
                <div
                  className="relative"
                  style={
                    revealed && isLegend
                      ? { animation: 'rainbowBorder 2s linear infinite', borderRadius: '8px', border: '3px solid #ffaa00' }
                      : revealed && isRare
                      ? { animation: 'rareGlow 1.5s ease-in-out infinite', borderRadius: '8px' }
                      : undefined
                  }
                >
                  {/* Hologram overlay for hero */}
                  <HoloOverlay active={revealed && isHero} />

                  {/* Particles */}
                  <Particles grade={card.grade} active={revealed} />

                  {/* Grade 1: Subtle shine sweep */}
                  {revealed && card.grade === 1 && (
                    <div
                      className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-lg"
                    >
                      <div
                        className="absolute top-0 w-8 h-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                          animation: 'gradeShine 1.5s ease-in-out forwards',
                        }}
                      />
                    </div>
                  )}

                  {cardData && cardData.type === 'warrior' ? (
                    <WarriorCardView card={cardData} size="md" showDetails />
                  ) : cardData ? (
                    <TacticCardView card={cardData} size="md" />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sealed Pack (Fan Display)
// ============================================================

function SealedPack({
  pack,
  index,
  total,
  isActive,
  onClick,
}: {
  pack: BoosterPack;
  index: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const info = PACK_INFO[pack.type];

  // Fan-spread calculation
  const fanAngle = total === 1 ? 0 : -15 + (index / (total - 1)) * 30;
  const fanX = total === 1 ? 0 : -60 + (index / (total - 1)) * 120;
  const fanY = Math.abs(fanAngle) * 0.8;

  const baseTransform = `translateX(${fanX}px) translateY(${fanY}px) rotate(${fanAngle}deg)`;

  return (
    <div
      className="absolute transition-all duration-500 ease-out"
      style={{
        transform: isActive
          ? 'translateY(-30px) rotate(0deg) scale(1.12)'
          : baseTransform,
        zIndex: isActive ? 20 : total - Math.abs(index - Math.floor(total / 2)),
        filter: isActive ? 'brightness(1.1)' : 'brightness(0.75)',
        ['--fan-transform' as string]: baseTransform,
      }}
    >
      <div
        onClick={onClick}
        className={`relative w-44 h-60 rounded-xl cursor-pointer select-none transition-all duration-300 ${
          isActive ? 'hover:scale-105' : 'hover:brightness-90'
        }`}
        style={{
          background: `linear-gradient(135deg, ${info.color}33, ${info.color}66, ${info.color}33)`,
          border: `3px solid ${info.color}`,
          boxShadow: isActive
            ? `0 0 30px ${info.color}66, 0 10px 40px rgba(0,0,0,0.5)`
            : `0 0 10px ${info.color}22`,
        }}
      >
        {/* Pack shimmer */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: isActive ? 'shimmer 2s infinite' : 'none',
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-4xl mb-2">🎴</div>
          <div className="text-lg font-bold">{info.name}</div>
          <div className="text-sm opacity-70">카드 {info.cardCount}장</div>
          {isActive && (
            <div className="mt-3 text-xs animate-pulse opacity-70">탭하여 개봉!</div>
          )}
        </div>

        {/* Pack type indicator dot */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ background: info.color, boxShadow: `0 0 6px ${info.color}` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Tearing Animation
// ============================================================

function TearingOverlay({ packType, onDone }: { packType: PackType; onDone: () => void }) {
  const info = PACK_INFO[packType];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(onDone, 200);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Darkened backdrop */}
      <div className="absolute inset-0 bg-black/60" style={{ animation: 'fadeIn 0.3s ease-out' }} />

      {/* Pack being torn */}
      <div className="relative">
        <div
          className="relative w-52 h-72 rounded-xl overflow-hidden"
          style={{
            border: `3px solid ${info.color}`,
            background: `linear-gradient(135deg, ${info.color}33, ${info.color}66, ${info.color}33)`,
          }}
        >
          {/* Left half tears away */}
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              background: `linear-gradient(135deg, ${info.color}44, ${info.color}77)`,
              clipPath: `polygon(0 0, ${50 - progress * 0.5}% 0, ${45 - progress * 0.5}% 100%, 0 100%)`,
              transform: `translateX(${-progress * 0.5}px) rotate(${-progress * 0.1}deg)`,
            }}
          />
          {/* Right half tears away */}
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              background: `linear-gradient(135deg, ${info.color}44, ${info.color}77)`,
              clipPath: `polygon(${50 + progress * 0.5}% 0, 100% 0, 100% 100%, ${55 + progress * 0.5}% 100%)`,
              transform: `translateX(${progress * 0.5}px) rotate(${progress * 0.1}deg)`,
            }}
          />
          {/* Center glow emerging */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: progress / 100 }}
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: `radial-gradient(circle, ${info.color}cc, ${info.color}44, transparent)`,
                transform: `scale(${0.5 + progress / 100})`,
                filter: `blur(${4 - progress * 0.03}px)`,
              }}
            />
          </div>

          {/* Sparkle particles */}
          {progress > 30 && (
            <div className="absolute inset-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-sm"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animation: `particleFloat ${0.6 + Math.random() * 0.6}s ease-out forwards`,
                    ['--px' as string]: `${(Math.random() - 0.5) * 40}px`,
                  }}
                >
                  ✨
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pack name */}
        <div className="text-center mt-4 text-white font-bold text-lg" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {info.name} 개봉 중...
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Summary Screen
// ============================================================

function SummaryScreen({
  cards,
  ownedCardIds,
  onDone,
  remainingPacks,
}: {
  cards: Card[];
  ownedCardIds: Set<string>;
  onDone: () => void;
  remainingPacks: number;
}) {
  // Sort by grade descending
  const sorted = [...cards].sort((a, b) => b.grade - a.grade);
  const bestGrade = sorted[0]?.grade || 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80"
      style={{ animation: 'fadeIn 0.4s ease-out' }}
    >
      {/* Title */}
      <div
        className="text-2xl font-bold mb-6 text-center"
        style={{
          color: GRADE_COLORS[bestGrade as Grade],
          textShadow: `0 0 20px ${GRADE_COLORS[bestGrade as Grade]}66`,
          animation: 'slideUp 0.5s ease-out',
        }}
      >
        획득한 카드
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap justify-center gap-3 max-w-lg mb-8">
        {sorted.map((card, i) => {
          const cardData = getCardById(card.id);
          if (!cardData) return null;
          const isNew = !ownedCardIds.has(card.id);
          const isHighGrade = card.grade >= 3;

          return (
            <div
              key={i}
              className="relative"
              style={{
                animation: `summaryCardIn 0.4s ease-out ${i * 0.1}s both`,
              }}
            >
              {/* Highlight glow for high grade */}
              {isHighGrade && (
                <div
                  className="absolute -inset-1 rounded-lg z-0"
                  style={{
                    background: `radial-gradient(circle, ${GRADE_COLORS[card.grade as Grade]}44, transparent)`,
                    animation: 'pulseGlow 2s ease-in-out infinite',
                  }}
                />
              )}

              <div className="relative z-10">
                {cardData.type === 'warrior' ? (
                  <WarriorCardView card={cardData} size="md" showDetails />
                ) : (
                  <TacticCardView card={cardData} size="md" />
                )}
              </div>

              {/* NEW / DUP badge */}
              <div
                className={`absolute -top-2 -right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isNew
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
                style={isNew ? { animation: 'newBadge 1s ease-in-out infinite' } : undefined}
              >
                {isNew ? 'NEW!' : '중복'}
              </div>

              {/* Grade label */}
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: `${GRADE_COLORS[card.grade as Grade]}cc`,
                  color: '#fff',
                }}
              >
                {GRADE_NAMES[card.grade as Grade]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grade breakdown */}
      <div className="flex gap-4 mb-6 text-xs">
        {([4, 3, 2, 1] as Grade[]).map((g) => {
          const count = cards.filter((c) => c.grade === g).length;
          if (count === 0) return null;
          return (
            <div key={g} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: GRADE_COLORS[g] }}
              />
              <span className="text-gray-300">
                {GRADE_NAMES[g]} x{count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Done / Next button */}
      <button
        onClick={onDone}
        className="px-8 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-yellow-400 transition-all active:scale-95"
        style={{ animation: 'slideUp 0.5s ease-out 0.5s both' }}
      >
        {remainingPacks > 0 ? `다음 팩 개봉 (${remainingPacks}개 남음)` : '확인'}
      </button>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function BoosterPackView({ packs, onOpen, onComplete, ownedCardIds = new Set() }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [tearingPackId, setTearingPackId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const [legendaryFocused, setLegendaryFocused] = useState<number | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [goldFlash, setGoldFlash] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unopened = packs.filter((p) => !p.opened);

  // Tap a pack → start tearing immediately
  const handleTapPack = (pack: BoosterPack) => {
    if (phase !== 'select') return;
    SFX.packOpen();
    setTearingPackId(pack.id);
    setPhase('tearing');
  };

  // Tear done callback
  const handleTearDone = useCallback(() => {
    if (!tearingPackId) return;
    const result = onOpen(tearingPackId);
    if (result) {
      setCards(result);
      setRevealedIndexes(new Set());
      setLegendaryFocused(null);
      setPhase('revealing');
    }
  }, [tearingPackId, onOpen]);

  // Handle revealing a single card
  const handleRevealCard = useCallback((index: number) => {
    if (phase !== 'revealing' || revealedIndexes.has(index)) return;
    const card = cards[index];

    SFX.cardFlip();
    setTimeout(() => SFX.gradeReveal(card.grade), 300);

    // Grade-specific screen effects
    if (card.grade === 3) {
      setTimeout(() => {
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 400);
      }, 350);
    }

    if (card.grade === 4) {
      setTimeout(() => {
        setGoldFlash(true);
        setShakeScreen(true);
        setLegendaryFocused(index);
        setTimeout(() => {
          setShakeScreen(false);
          setGoldFlash(false);
        }, 600);
        // Auto-dismiss legendary focus after 2s
        setTimeout(() => setLegendaryFocused(null), 2500);
      }, 350);
    }

    setRevealedIndexes((prev) => {
      const next = new Set([...prev, index]);
      // Check if all revealed
      if (next.size === cards.length) {
        setTimeout(() => setPhase('summary'), card.grade >= 3 ? 2000 : 1000);
      }
      return next;
    });
  }, [phase, revealedIndexes, cards]);

  // Reveal all remaining
  const handleRevealAll = useCallback(() => {
    if (phase !== 'revealing') return;
    const unrevealed = cards
      .map((_, i) => i)
      .filter((i) => !revealedIndexes.has(i));

    unrevealed.forEach((idx, seqIdx) => {
      setTimeout(() => {
        handleRevealCard(idx);
      }, seqIdx * 400);
    });
  }, [phase, cards, revealedIndexes, handleRevealCard]);

  // Summary done — continue to next pack or exit
  const handleSummaryDone = () => {
    // Check remaining unopened packs (after the one we just opened)
    const remaining = packs.filter((p) => !p.opened);
    if (remaining.length > 0) {
      // Reset to select phase for next pack
      setTearingPackId(null);
      setCards([]);
      setRevealedIndexes(new Set());
      setLegendaryFocused(null);
      setPhase('select');
    } else {
      onComplete();
    }
  };

  // ─── Render ───

  // Tearing overlay
  if (phase === 'tearing' && tearingPackId) {
    const pack = packs.find((p) => p.id === tearingPackId);
    if (!pack) return null;
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <TearingOverlay packType={pack.type} onDone={handleTearDone} />
      </div>
    );
  }

  // Card reveal phase
  if (phase === 'revealing') {
    return (
      <div
        ref={containerRef}
        className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4"
        style={shakeScreen ? { animation: cards.some(c => c.grade === 4 && revealedIndexes.has(cards.indexOf(c))) ? 'legendShake 0.6s ease-in-out' : 'heroShake 0.4s ease-in-out' } : undefined}
      >
        {/* Gold flash overlay for legendary */}
        {goldFlash && (
          <div
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,200,0,0.4), rgba(255,150,0,0.2), transparent)',
              animation: 'goldFlash 0.6s ease-out forwards',
            }}
          />
        )}

        {/* Header */}
        <div className="text-lg font-bold text-white mb-6" style={{ animation: 'slideUp 0.3s ease-out' }}>
          카드를 탭하여 공개!
        </div>

        {/* Cards row */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {cards.map((card, i) => (
            <CardRevealSlot
              key={i}
              card={card}
              index={i}
              revealed={revealedIndexes.has(i)}
              onReveal={handleRevealCard}
              legendaryFocused={legendaryFocused === i}
            />
          ))}
        </div>

        {/* Reveal all button */}
        {revealedIndexes.size < cards.length && (
          <button
            onClick={handleRevealAll}
            className="px-6 py-2.5 bg-amber-600/80 text-white rounded-xl text-sm font-bold hover:bg-amber-500 transition-all active:scale-95"
            style={{ animation: 'slideUp 0.4s ease-out 0.6s both' }}
          >
            전체 공개
          </button>
        )}

        {/* Progress indicator */}
        <div className="mt-4 text-xs text-gray-500">
          {revealedIndexes.size} / {cards.length} 공개됨
        </div>
      </div>
    );
  }

  // Summary phase
  if (phase === 'summary') {
    // Count remaining unopened packs (excluding the one just opened, which is now marked opened)
    const remaining = packs.filter((p) => !p.opened);
    return (
      <SummaryScreen
        cards={cards}
        ownedCardIds={ownedCardIds}
        onDone={handleSummaryDone}
        remainingPacks={remaining.length}
      />
    );
  }

  // Pack selection phase — tap a pack to open it directly
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center p-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <button
          onClick={onComplete}
          className="text-gray-400 text-sm hover:text-white transition-colors"
        >
          &#8592; 뒤로
        </button>
        <h1 className="text-white font-bold text-lg">부스터팩</h1>
        <div className="text-sm text-gray-400">{unopened.length}개</div>
      </div>

      {unopened.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
          <div className="text-4xl mb-4">📦</div>
          <div>미개봉 부스터팩이 없습니다</div>
          <div className="text-sm mt-2">전투에서 승리하면 부스터팩을 획득할 수 있습니다!</div>
        </div>
      ) : (
        <>
          {/* Fan-spread pack display — tap to open directly */}
          <div
            className="relative flex-1 flex items-center justify-center"
            style={{ minHeight: '320px' }}
          >
            <div className="relative" style={{ width: '280px', height: '260px' }}>
              {unopened.map((pack, i) => (
                <SealedPack
                  key={pack.id}
                  pack={pack}
                  index={i}
                  total={unopened.length}
                  isActive={unopened.length === 1 || i === 0}
                  onClick={() => handleTapPack(pack)}
                />
              ))}
            </div>
          </div>

          {/* Hint text */}
          <div className="mb-8 text-sm text-gray-400 animate-pulse">
            팩을 탭하여 개봉하세요!
          </div>
        </>
      )}
    </div>
  );
}
