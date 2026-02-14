'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PackType, PACK_INFO, Card, Grade, GRADE_COLORS, GRADE_NAMES, BoosterPack, OwnedCard } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import CardDetailModal from '@/components/card/CardDetailModal';
import { SFX } from '@/lib/sound';

interface Props {
  packs: BoosterPack[];
  onOpen: (packId: string) => Card[] | null;
  onComplete: () => void;
  ownedCardIds?: Set<string>;
  ownedCards?: OwnedCard[];
}

type Phase = 'select' | 'tearing' | 'revealing' | 'summary';
type TearStage = 'charge' | 'rip' | 'burst';

const impactShake = {
  initial: { x: 0, y: 0 },
  animate: {
    x: [0, -4, 4, -3, 3, 0],
    y: [0, -2, 2, 1, -1, 0],
    transition: { duration: 0.35, ease: 'easeInOut' as const },
  },
};

function gradeTone(grade: Grade) {
  if (grade === 4) return '#ffb100';
  if (grade === 3) return '#a855f7';
  if (grade === 2) return '#3b82f6';
  return '#94a3b8';
}

function gradeLabel(grade: Grade) {
  if (grade === 4) return 'LEGEND';
  if (grade === 3) return 'HERO';
  if (grade === 2) return 'RARE';
  return 'COMMON';
}

function cinematicDelay(grade: Grade) {
  if (grade === 4) return 1900;
  if (grade === 3) return 1200;
  return 700;
}

function revealSfxDelay(grade: Grade) {
  if (grade === 4) return 250;
  if (grade === 3) return 220;
  if (grade === 2) return 190;
  return 170;
}

function seeded(seed: number) {
  const x = Math.sin(seed * 999.97) * 10000;
  return x - Math.floor(x);
}

function SealedPackCard({
  pack,
  index,
  total,
  active,
  compact,
  onSelect,
}: {
  pack: BoosterPack;
  index: number;
  total: number;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  const info = PACK_INFO[pack.type];
  const fanAngle = total === 1 ? 0 : (compact ? -13 : -17) + (index / (total - 1)) * (compact ? 26 : 34);
  const fanX = total === 1 ? 0 : (compact ? -42 : -60) + (index / (total - 1)) * (compact ? 84 : 120);
  const fanY = Math.abs(fanAngle) * (compact ? 0.55 : 0.7);
  const centerX = compact ? 66 : 84;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="absolute rounded-2xl overflow-hidden text-left"
      style={{
        border: `1px solid ${info.color}`,
        transformStyle: 'preserve-3d',
        width: compact ? 156 : 192,
        height: compact ? 218 : 256,
      }}
      initial={{ opacity: 0, y: 50, scale: 0.8, rotate: fanAngle }}
      animate={{
        opacity: 1,
        x: centerX + fanX,
        y: active ? fanY - (compact ? 24 : 34) : fanY,
        scale: active ? (compact ? 1.08 : 1.12) : 0.93,
        rotate: active ? 0 : fanAngle,
        filter: active ? 'brightness(1.1)' : 'brightness(0.72) saturate(0.85)',
      }}
      whileHover={{
        y: active ? fanY - (compact ? 28 : 40) : fanY - 8,
        scale: active ? (compact ? 1.1 : 1.14) : 0.97,
      }}
      whileTap={{ scale: active ? 1.08 : 0.93 }}
      transition={{ type: 'spring', stiffness: 230, damping: 22 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(145deg, ${info.color}33 0%, rgba(12,18,33,0.75) 45%, ${info.color}20 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 20% 12%, rgba(255,255,255,0.2), transparent 45%), radial-gradient(circle at 80% 88%, rgba(255,255,255,0.14), transparent 45%)',
        }}
      />
      <motion.div
        className="absolute -inset-y-8 w-20"
        style={{
          background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.24) 50%, transparent 80%)',
        }}
        animate={{ x: active ? ['-120%', '160%'] : '-120%' }}
        transition={{ duration: 1.5, repeat: active ? Infinity : 0, ease: 'linear' }}
      />
      <div className={`absolute inset-0 ${compact ? 'p-3.5' : 'p-5'} flex flex-col justify-between`}>
        <div className={`text-right ${compact ? 'text-[9px]' : 'text-[11px]'} tracking-[0.24em] text-white/70`}>CARD WARS</div>
        <div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs'} tracking-[0.18em] text-white/65`}>BOOSTER</div>
          <div className={`mt-1 ${compact ? 'text-xl' : 'text-2xl'} font-black text-white`}>{info.name}</div>
          <div className={`mt-1 ${compact ? 'text-[11px]' : 'text-xs'} text-white/75`}>{info.cardCount} Cards</div>
        </div>
        <div className={`flex items-center justify-between ${compact ? 'text-[10px]' : 'text-[11px]'} text-white/75`}>
          <span>Guarantee</span>
          <span className="font-bold" style={{ color: GRADE_COLORS[info.guaranteed] }}>
            {GRADE_NAMES[info.guaranteed]}
          </span>
        </div>
      </div>
      <div
        className="absolute inset-0 border border-white/20 rounded-2xl pointer-events-none"
        style={{ boxShadow: active ? `0 0 38px ${info.color}44` : `0 0 14px ${info.color}33` }}
      />
    </motion.button>
  );
}

function PackDetailPanel({ pack, compact, onOpen }: { pack: BoosterPack; compact: boolean; onOpen: () => void }) {
  const info = PACK_INFO[pack.type];
  return (
    <motion.div
      key={pack.id}
      className={`w-full max-w-xl rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md ${compact ? 'p-3.5' : 'p-4'}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28 }}
    >
      <div className={`flex ${compact ? 'flex-col items-start' : 'items-center justify-between'} gap-4`}>
        <div>
          <div className="text-[11px] tracking-[0.2em] text-white/55">SELECTED PACK</div>
          <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-extrabold text-white mt-0.5`}>{info.name}</h2>
          <div className="text-sm text-white/70 mt-1">보장 등급: <span style={{ color: GRADE_COLORS[info.guaranteed] }}>{GRADE_NAMES[info.guaranteed]}</span></div>
        </div>
        <motion.button
          type="button"
          className={`ui-btn ${compact ? 'w-full px-4 py-2.5' : 'px-5 py-2.5'} text-sm font-extrabold text-white`}
          style={{
            background: `linear-gradient(135deg, ${info.color} 0%, #f8fafc 220%)`,
            boxShadow: `0 14px 34px ${info.color}55`,
          }}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpen}
        >
          지금 개봉
        </motion.button>
      </div>
    </motion.div>
  );
}

function TearingOverlay({ packType, compact, onDone }: { packType: PackType; compact: boolean; onDone: () => void }) {
  const info = PACK_INFO[packType];
  const [stage, setStage] = useState<TearStage>('charge');

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('rip'), 340),
      setTimeout(() => setStage('burst'), 840),
      setTimeout(onDone, 1260),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, rgba(15,23,42,0.72), rgba(2,6,23,0.95))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />

      <AnimatePresence>
        {stage === 'burst' && (
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle, ${info.color}55 0%, transparent 62%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <div
        className="relative"
        style={{ width: compact ? 192 : 224, height: compact ? 248 : 288 }}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl border"
          style={{
            borderColor: `${info.color}`,
            background: `linear-gradient(150deg, ${info.color}44 0%, rgba(9,12,22,0.95) 50%, ${info.color}30 100%)`,
          }}
          animate={
            stage === 'charge'
              ? { scale: [1, 0.98, 1.04], opacity: 1 }
              : stage === 'rip'
              ? { scale: [1.04, 0.98], opacity: [1, 0.25, 0] }
              : { scale: 0.96, opacity: 0 }
          }
          transition={{
            duration: stage === 'charge' ? 0.33 : 0.38,
            repeat: stage === 'charge' ? Infinity : 0,
            ease: 'easeOut',
          }}
        />

        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl border-r border-white/18"
          style={{ background: `linear-gradient(120deg, ${info.color}66, rgba(7,10,19,0.85))` }}
          animate={
            stage === 'rip'
              ? { x: -92, rotate: -15, opacity: [1, 1, 0.3] }
              : stage === 'burst'
              ? { x: -150, rotate: -24, opacity: 0 }
              : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: stage === 'charge' ? 0.2 : 0.45, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl border-l border-white/18"
          style={{ background: `linear-gradient(240deg, ${info.color}66, rgba(7,10,19,0.85))` }}
          animate={
            stage === 'rip'
              ? { x: 92, rotate: 15, opacity: [1, 1, 0.3] }
              : stage === 'burst'
              ? { x: 150, rotate: 24, opacity: 0 }
              : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: stage === 'charge' ? 0.2 : 0.45, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2"
          style={{ background: `linear-gradient(180deg, transparent, #fff, transparent)` }}
          animate={
            stage === 'charge'
              ? { opacity: [0.2, 0.65, 0.2], scaleY: [0.6, 1.1, 0.7] }
              : stage === 'rip'
              ? { opacity: [0.8, 1, 0.4], scaleY: [1, 1.2, 0.6] }
              : { opacity: 0 }
          }
          transition={{ duration: 0.42 }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${info.color}cc 0%, ${info.color}44 45%, transparent 70%)` }}
          animate={
            stage === 'burst'
              ? { scale: [0.4, 1.35, 2], opacity: [0.4, 0.95, 0] }
              : stage === 'rip'
              ? { scale: [0.2, 0.8], opacity: [0.1, 0.5] }
              : { scale: 0.1, opacity: 0.2 }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />

        {stage !== 'charge' && (
          <div className="absolute inset-0">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-sm"
                style={{
                  width: compact ? 5 : 6,
                  height: compact ? 2 : 3,
                  background: i % 2 ? '#ffffff' : info.color,
                }}
                initial={{ x: -2, y: -2, opacity: 0 }}
                animate={{
                  x: (seeded(i + 1) - 0.5) * (compact ? 220 : 280),
                  y: (seeded(i + 101) - 0.5) * (compact ? 190 : 240),
                  rotate: seeded(i + 301) * 420,
                  opacity: stage === 'burst' ? [0, 1, 0] : [0, 0.7, 0],
                }}
                transition={{ duration: 0.58, ease: 'easeOut', delay: i * 0.015 }}
              />
            ))}
          </div>
        )}
      </div>

      <motion.div
        className={`absolute ${compact ? 'bottom-[20%] text-sm' : 'bottom-[22%] text-base'} text-white/90 font-bold tracking-wide`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {info.name} OPENING...
      </motion.div>
    </div>
  );
}

function CardRevealSlot({
  card,
  index,
  revealed,
  dimmed,
  compact,
  onReveal,
}: {
  card: Card;
  index: number;
  revealed: boolean;
  dimmed: boolean;
  compact: boolean;
  onReveal: (index: number) => void;
}) {
  const cardData = getCardById(card.id);
  const tone = gradeTone(card.grade);
  const isHeroOrHigher = card.grade >= 3;

  if (!cardData) return null;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 60, rotate: -8, scale: 0.85 }}
      animate={{ opacity: dimmed ? 0.42 : 1, y: 0, rotate: 0, scale: dimmed ? 0.95 : 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 180, damping: 20 }}
    >
      <motion.div
        className="relative cursor-pointer"
        style={{ width: compact ? 136 : 160, height: compact ? 194 : 224 }}
        onClick={() => !revealed && onReveal(index)}
        whileHover={!revealed ? { y: -5 } : undefined}
      >
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="back"
              className="absolute inset-0 rounded-xl border border-amber-700/70 overflow-hidden"
              style={{
                background: 'linear-gradient(155deg, #1f1309, #432615 55%, #1f1309)',
              }}
              initial={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90, scale: 0.96 }}
              transition={{ duration: 0.32, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_14%,rgba(255,255,255,0.16),transparent_42%),radial-gradient(circle_at_82%_86%,rgba(255,255,255,0.08),transparent_46%)]" />
              <div className="absolute inset-0 flex items-center justify-center text-amber-300/80 text-2xl font-black tracking-[0.35em]">CW</div>
              <motion.div
                className="absolute -inset-y-6 w-14"
                style={{ background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)' }}
                animate={{ x: ['-120%', '180%'] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="front"
              className="absolute inset-0"
              initial={{ opacity: 0, rotateY: 90, scale: 0.96 }}
              animate={{
                opacity: 1,
                rotateY: 0,
                scale: card.grade >= 3 ? [1, 1.04, 1] : 1,
              }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
            >
              <div
                className="absolute -inset-2 rounded-2xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${tone}70 0%, transparent 70%)`,
                  filter: 'blur(10px)',
                  opacity: 1,
                }}
              />

              <div className="relative rounded-lg overflow-hidden">
                {cardData.type === 'warrior' ? (
                  <WarriorCardView card={cardData} size="md" showDetails />
                ) : (
                  <TacticCardView card={cardData} size="md" />
                )}

                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: isHeroOrHigher
                      ? `linear-gradient(135deg, transparent 0%, ${tone}22 40%, transparent 100%)`
                      : 'linear-gradient(135deg, transparent 0%, rgba(148,163,184,0.15) 50%, transparent 100%)',
                    mixBlendMode: 'screen',
                  }}
                />

                {card.grade >= 3 && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: card.grade === 4
                        ? 'conic-gradient(from 180deg, rgba(255,177,0,0.00), rgba(255,177,0,0.55), rgba(255,255,255,0.00), rgba(255,177,0,0.45), rgba(255,177,0,0.00))'
                        : 'conic-gradient(from 180deg, rgba(168,85,247,0.00), rgba(168,85,247,0.48), rgba(255,255,255,0.00), rgba(99,102,241,0.40), rgba(168,85,247,0.00))',
                      mixBlendMode: 'screen',
                    }}
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: [0.2, 0.8, 0.35], rotate: [0, 50, 110] }}
                    transition={{ duration: card.grade === 4 ? 1.15 : 0.9, ease: 'easeOut' }}
                  />
                )}
              </div>

              <motion.div
                className="absolute left-2 bottom-2 px-2 py-1 rounded-full text-[10px] font-black tracking-wider"
                style={{ color: '#fff', background: `${tone}dd` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {gradeLabel(card.grade)}
              </motion.div>

              {card.grade === 4 && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute left-1/2 top-1/2 rounded-full"
                      style={{
                        width: 4,
                        height: 4,
                        background: i % 2 ? '#fff7d0' : '#ffb100',
                      }}
                      initial={{ x: 0, y: 0, opacity: 0 }}
                      animate={{
                        x: (seeded(i + 11) - 0.5) * 170,
                        y: (seeded(i + 151) - 0.5) * 220,
                        scale: [1, 1.25, 0.7],
                        opacity: [0, 0.9, 0],
                      }}
                      transition={{ duration: 0.95, delay: i * 0.012, ease: 'easeOut' }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function SummaryScreen({
  cards,
  ownedBefore,
  onCardClick,
  onDone,
  remainingPacks,
}: {
  cards: Card[];
  ownedBefore: Set<string>;
  onCardClick: (card: Card, isNew: boolean) => void;
  onDone: () => void;
  remainingPacks: number;
}) {
  const sorted = [...cards].sort((a, b) => b.grade - a.grade);
  const bestGrade = sorted[0]?.grade || 1;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="text-2xl font-bold mb-6 text-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: GRADE_COLORS[bestGrade as Grade] }}
      >
        획득한 카드
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3 max-w-lg mb-8">
        {sorted.map((card, i) => {
          const cardData = getCardById(card.id);
          if (!cardData) return null;
          const isNew = !ownedBefore.has(card.id);

          return (
            <motion.div
              key={`${card.id}-${i}`}
              className="relative cursor-pointer"
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 180, damping: 20 }}
              onClick={() => onCardClick(card, isNew)}
            >
              {cardData.type === 'warrior' ? (
                <WarriorCardView card={cardData} size="md" showDetails />
              ) : (
                <TacticCardView card={cardData} size="md" />
              )}
              <div
                className={`absolute -top-2 -right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold ${isNew ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-200'}`}
              >
                {isNew ? 'NEW' : 'DUP'}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        onClick={onDone}
        className="ui-btn px-8 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold rounded-xl"
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {remainingPacks > 0 ? `다음 팩 개봉 (${remainingPacks}개 남음)` : '확인'}
      </motion.button>
    </motion.div>
  );
}

export default function BoosterPackView({ packs, onOpen, onComplete, ownedCardIds = new Set(), ownedCards = [] }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [tearingPackId, setTearingPackId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [impactKey, setImpactKey] = useState(0);
  const [flashTone, setFlashTone] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [revealAllMode, setRevealAllMode] = useState(false);
  const [lastObtained, setLastObtained] = useState<{ cards: Card[]; ownedBefore: Set<string> } | null>(null);
  const [detailCard, setDetailCard] = useState<{ card: Card; isNew: boolean } | null>(null);
  const preOpenOwnedRef = useRef<Set<string>>(new Set(ownedCardIds));

  const unopened = useMemo(() => packs.filter((p) => !p.opened), [packs]);
  const recentObtainedCards = useMemo(
    () => (lastObtained ? [...lastObtained.cards].sort((a, b) => b.grade - a.grade) : []),
    [lastObtained]
  );
  const ownedCardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const owned of ownedCards) {
      counts[owned.cardId] = (counts[owned.cardId] || 0) + 1;
    }
    return counts;
  }, [ownedCards]);
  const representativeOwned = useMemo(() => {
    const byId: Record<string, OwnedCard> = {};
    for (const owned of ownedCards) {
      const current = byId[owned.cardId];
      if (!current || owned.level > current.level) {
        byId[owned.cardId] = owned;
      }
    }
    return byId;
  }, [ownedCards]);

  useEffect(() => {
    const sync = () => setCompact(window.innerWidth < 640);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (unopened.length === 0) {
      setActivePackId(null);
      return;
    }
    if (!activePackId || !unopened.some((p) => p.id === activePackId)) {
      setActivePackId(unopened[0].id);
    }
  }, [unopened, activePackId]);

  const activePack = useMemo(
    () => unopened.find((p) => p.id === activePackId) ?? unopened[0] ?? null,
    [unopened, activePackId]
  );

  const startOpen = useCallback((pack: BoosterPack) => {
    if (phase !== 'select') return;
    preOpenOwnedRef.current = new Set(ownedCardIds);
    setDetailCard(null);
    SFX.packOpen();
    setTearingPackId(pack.id);
    setPhase('tearing');
  }, [phase, ownedCardIds]);

  const handleTearDone = useCallback(() => {
    if (!tearingPackId) return;
    const result = onOpen(tearingPackId);
    if (!result) return;
    const ownedBefore = new Set(preOpenOwnedRef.current);
    setLastObtained({ cards: result, ownedBefore });
    setCards(result);
    setRevealedIndexes(new Set());
    setFocusIndex(null);
    setFlashTone(null);
    setRevealAllMode(false);
    setPhase('revealing');
  }, [tearingPackId, onOpen]);

  const handleRevealCard = useCallback((index: number) => {
    if (phase !== 'revealing' || revealAllMode || revealedIndexes.has(index)) return;

    const card = cards[index];
    SFX.cardFlip();
    setTimeout(() => SFX.gradeReveal(card.grade), revealSfxDelay(card.grade));

    const tone = gradeTone(card.grade);
    setFlashTone(tone);
    setImpactKey((k) => k + 1);

    if (card.grade >= 3) {
      setFocusIndex(index);
      setTimeout(() => setFocusIndex(null), cinematicDelay(card.grade));
    }

    setTimeout(() => setFlashTone(null), 240);

    setRevealedIndexes((prev) => {
      const next = new Set([...prev, index]);
      if (next.size === cards.length) {
        setTimeout(() => setPhase('summary'), card.grade >= 3 ? 1200 : 700);
      }
      return next;
    });
  }, [phase, revealAllMode, revealedIndexes, cards]);

  const handleRevealAll = useCallback(() => {
    if (phase !== 'revealing' || revealAllMode) return;
    const pending = cards
      .map((card, i) => ({ card, i }))
      .filter(({ i }) => !revealedIndexes.has(i));
    if (pending.length === 0) return;

    setRevealAllMode(true);
    const highest = pending.reduce((best, curr) => (curr.card.grade > best.card.grade ? curr : best));

    // One-shot global reveal effect to avoid repeated flashes and shake flicker.
    SFX.cardFlip();
    setTimeout(() => SFX.gradeReveal(highest.card.grade), revealSfxDelay(highest.card.grade));
    setFocusIndex(null);
    setImpactKey((k) => k + 1);
    setFlashTone(gradeTone(highest.card.grade));
    setTimeout(() => setFlashTone(null), 260);

    setRevealedIndexes((prev) => {
      const next = new Set(prev);
      pending.forEach(({ i }) => next.add(i));
      return next;
    });

    setTimeout(() => setPhase('summary'), highest.card.grade >= 3 ? 1000 : 700);
  }, [phase, revealAllMode, cards, revealedIndexes]);

  const handleSummaryDone = useCallback(() => {
    setDetailCard(null);
    const remaining = packs.filter((p) => !p.opened);
    if (remaining.length > 0) {
      setTearingPackId(null);
      setCards([]);
      setRevealedIndexes(new Set());
      setFocusIndex(null);
      setRevealAllMode(false);
      setPhase('select');
      return;
    }
    onComplete();
  }, [packs, onComplete]);

  if (phase === 'tearing' && tearingPackId) {
    const pack = packs.find((p) => p.id === tearingPackId);
    if (!pack) return null;
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#1b315f_0%,#0a1228_58%,#040812_100%)]">
        <TearingOverlay packType={pack.type} compact={compact} onDone={handleTearDone} />
      </div>
    );
  }

  if (phase === 'revealing') {
    const legendaryFocused = focusIndex !== null && cards[focusIndex]?.grade === 4;

    return (
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-20%,#2a3f74_0%,#0b1328_45%,#050811_100%)] flex flex-col items-center justify-center p-3 sm:p-4">
        <AnimatePresence>
          {flashTone && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(circle at center, ${flashTone}55, transparent 64%)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {legendaryFocused && (
            <motion.div
              className="absolute inset-0 pointer-events-none bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        <motion.div key={impactKey} variants={impactShake} initial="initial" animate="animate" className="relative z-10 w-full flex flex-col items-center">
          <motion.div
            className={`${compact ? 'text-base mb-4' : 'text-lg mb-5'} font-bold text-white tracking-wide`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            카드를 탭하여 공개
          </motion.div>

          <div className={`flex flex-wrap justify-center ${compact ? 'gap-2.5 mb-5' : 'gap-4 mb-7'}`}>
            {cards.map((card, i) => (
              <CardRevealSlot
                key={`${card.id}-${i}`}
                card={card}
                index={i}
                revealed={revealedIndexes.has(i)}
                dimmed={focusIndex !== null && focusIndex !== i}
                compact={compact}
                onReveal={handleRevealCard}
              />
            ))}
          </div>

          {revealedIndexes.size < cards.length && (
            <motion.button
              onClick={handleRevealAll}
              className="ui-btn px-6 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 bg-white/10 backdrop-blur-sm"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {revealAllMode ? '전체 공개 완료' : '전체 공개'}
            </motion.button>
          )}

          <div className="mt-4 text-xs text-white/55 tracking-wider">{revealedIndexes.size} / {cards.length} REVEALED</div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'summary') {
    const remaining = packs.filter((p) => !p.opened);
    return (
      <>
        <SummaryScreen
          cards={cards}
          ownedBefore={preOpenOwnedRef.current}
          onCardClick={(card, isNew) => setDetailCard({ card, isNew })}
          onDone={handleSummaryDone}
          remainingPacks={remaining.length}
        />
        <CardDetailModal
          card={detailCard?.card ?? null}
          owned={detailCard ? representativeOwned[detailCard.card.id] : undefined}
          ownedCount={detailCard ? ownedCardCounts[detailCard.card.id] || 0 : 0}
          isNew={detailCard?.isNew}
          sourceTag="부스터 획득"
          onClose={() => setDetailCard(null)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,#1a2f5f_0%,#0a1124_48%,#060a14_100%)] flex flex-col items-center p-4">
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 sm:mb-8 pt-1">
        <button onClick={onComplete} className="text-white/65 text-sm hover:text-white transition-colors">&#8592; 뒤로</button>
        <h1 className="text-white font-extrabold text-lg tracking-wide">부스터 오픈</h1>
        <div className="text-sm text-white/70">{unopened.length}개</div>
      </div>

      {phase === 'select' && lastObtained && recentObtainedCards.length > 0 && (
        <div className="w-full max-w-5xl mb-4 sm:mb-5">
          <div className="text-xs tracking-[0.16em] text-white/55 mb-2">LAST OBTAINED</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentObtainedCards.map((card, i) => {
              const cardData = getCardById(card.id);
              if (!cardData) return null;
              const isNew = !lastObtained.ownedBefore.has(card.id);
              return (
                <button
                  key={`${card.id}-recent-${i}`}
                  type="button"
                  onClick={() => setDetailCard({ card, isNew })}
                  className="relative shrink-0 rounded-lg border border-white/15 bg-black/20 p-1"
                >
                  {cardData.type === 'warrior' ? (
                    <WarriorCardView card={cardData} size="sm" showDetails />
                  ) : (
                    <TacticCardView card={cardData} size="sm" />
                  )}
                  <span
                    className={`absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                      isNew ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-200'
                    }`}
                  >
                    {isNew ? 'NEW' : 'DUP'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {unopened.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-white/65">
          <div className="text-4xl mb-4">📦</div>
          <div>미개봉 부스터팩이 없습니다</div>
          <div className="text-sm mt-2">전투 승리 시 부스터팩을 획득할 수 있습니다.</div>
        </div>
      ) : (
        <>
          <div className="relative flex-1 flex items-center justify-center w-full" style={{ minHeight: compact ? 300 : 370 }}>
            <div className="relative" style={{ width: compact ? 290 : 360, height: compact ? 250 : 300 }}>
              {unopened.map((pack, i) => (
                <SealedPackCard
                  key={pack.id}
                  pack={pack}
                  index={i}
                  total={unopened.length}
                  active={activePack?.id === pack.id}
                  compact={compact}
                  onSelect={() => setActivePackId(pack.id)}
                />
              ))}
            </div>
          </div>

          <div className="w-full max-w-xl mb-8">
            <AnimatePresence mode="wait">
              {activePack && (
                <PackDetailPanel
                  key={activePack.id}
                  pack={activePack}
                  compact={compact}
                  onOpen={() => startOpen(activePack)}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="mb-5 text-xs tracking-[0.14em] text-white/45">PACK SELECT • OPEN • REVEAL</div>
        </>
      )}

      <CardDetailModal
        card={detailCard?.card ?? null}
        owned={detailCard ? representativeOwned[detailCard.card.id] : undefined}
        ownedCount={detailCard ? ownedCardCounts[detailCard.card.id] || 0 : 0}
        isNew={detailCard?.isNew}
        sourceTag="부스터 획득"
        onClose={() => setDetailCard(null)}
      />
    </div>
  );
}
