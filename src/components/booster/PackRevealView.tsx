'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import { BOOSTER_ANIMATION_PRESETS } from '@/lib/animation-presets';

interface CardRevealSlotProps {
  card: Card;
  index: number;
  revealed: boolean;
  dimmed: boolean;
  compact: boolean;
  onReveal: (index: number) => void;
}

function seeded(seed: number) {
  const x = Math.sin(seed * 81.31) * 10000;
  return x - Math.floor(x);
}

function CardRevealSlot({
  card,
  index,
  revealed,
  dimmed,
  compact,
  onReveal,
}: CardRevealSlotProps) {
  const cardData = getCardById(card.id);
  const tone = BOOSTER_ANIMATION_PRESETS.cardGradeTone[card.grade];
  const isRareOrHigher = card.grade >= 2;
  const isSSOrHigher = card.grade >= 3;
  const isLegendary = card.grade === 4;

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
        style={{ width: compact ? 136 : 160, height: compact ? 194 : 224, perspective: 1200 }}
        onClick={() => !revealed && onReveal(index)}
        whileHover={!revealed ? { y: -6, scale: 1.02 } : { y: -2 }}
        whileTap={!revealed ? { scale: 0.96 } : undefined}
      >
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 24, mass: 0.92 }}
        >
          <div
            className="absolute inset-0 rounded-xl border border-amber-700/70 overflow-hidden"
            style={{
              background: 'linear-gradient(155deg, #1f1309, #432615 55%, #1f1309)',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_14%,rgba(255,255,255,0.16),transparent_42%),radial-gradient(circle_at_82%_86%,rgba(255,255,255,0.08),transparent_46%)]" />
            <div className="absolute inset-0 flex items-center justify-center text-amber-300/80 text-2xl font-black tracking-[0.35em]">CW</div>
            <motion.div
              className="absolute -inset-y-6 w-14"
              style={{
                background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)',
              }}
              animate={{ x: ['-120%', '180%'] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div
            className="absolute inset-0"
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
            }}
          >
            <div
              className="absolute -inset-2 rounded-2xl pointer-events-none"
              style={{
                background: isRareOrHigher
                  ? 'radial-gradient(circle, rgba(250,204,21,0.62) 0%, rgba(250,204,21,0.22) 40%, transparent 70%)'
                  : `radial-gradient(circle, ${tone}55 0%, transparent 70%)`,
                filter: 'blur(10px)',
                opacity: 1,
              }}
            />

            <motion.div
              className="absolute -inset-1 rounded-2xl pointer-events-none"
              style={{
                border: isRareOrHigher ? '1px solid rgba(250, 204, 21, 0.75)' : `1px solid ${tone}`,
                boxShadow: isRareOrHigher
                  ? '0 0 24px rgba(250,204,21,0.55), 0 0 36px rgba(245,158,11,0.34)'
                  : `0 0 20px ${tone}70`,
              }}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: [0.25, 1, 0.35], scale: [0.88, 1.03, 1] }}
              transition={{ duration: isLegendary ? 1.1 : 0.8, ease: 'easeOut' }}
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
                  background: isRareOrHigher
                    ? 'linear-gradient(135deg, transparent 0%, rgba(250,204,21,0.12) 40%, transparent 100%)'
                    : 'linear-gradient(135deg, transparent 0%, rgba(148,163,184,0.15) 50%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />

              {isSSOrHigher && (
                <motion.div
                  className="absolute inset-0 pointer-events-none holo-foil"
                  style={{ opacity: isLegendary ? 0.65 : 0.45 }}
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: isLegendary ? 1.8 : 2.4, repeat: Infinity, ease: 'linear' }}
                />
              )}

              {isSSOrHigher && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: isLegendary
                      ? 'conic-gradient(from 180deg, rgba(255,177,0,0.00), rgba(255,177,0,0.58), rgba(255,255,255,0.00), rgba(255,177,0,0.48), rgba(255,177,0,0.00))'
                      : 'conic-gradient(from 180deg, rgba(168,85,247,0.00), rgba(168,85,247,0.48), rgba(255,255,255,0.00), rgba(99,102,241,0.40), rgba(168,85,247,0.00))',
                    mixBlendMode: 'screen',
                  }}
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={{ opacity: [0.2, 0.8, 0.35], rotate: [0, 50, 110] }}
                  transition={{ duration: isLegendary ? 1.15 : 0.9, ease: 'easeOut' }}
                />
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute left-2 bottom-2 px-2 py-1 rounded-full text-[10px] font-black tracking-wider"
          style={{ color: '#fff', background: `${tone}dd` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 8 }}
        >
          {BOOSTER_ANIMATION_PRESETS.gradeLabel[card.grade]}
        </motion.div>

        {isLegendary && revealed && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 18 }).map((_, i) => (
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
    </motion.div>
  );
}

interface PackRevealViewProps {
  cards: Card[];
  compact: boolean;
  revealedIndexes: Set<number>;
  focusIndex: number | null;
  flashTone: string | null;
  revealAllMode: boolean;
  onRevealCard: (index: number) => void;
  onRevealAll: () => void;
}

const impactShake = BOOSTER_ANIMATION_PRESETS.impactShake;

export default function PackRevealView({
  cards,
  compact,
  revealedIndexes,
  focusIndex,
  flashTone,
  revealAllMode,
  onRevealCard,
  onRevealAll,
}: PackRevealViewProps) {
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
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={JSON.stringify({ revealCount: revealedIndexes.size })}
        variants={impactShake}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full flex flex-col items-center"
      >
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
              onReveal={onRevealCard}
            />
          ))}
        </div>

        {revealedIndexes.size < cards.length && (
          <motion.button
            onClick={onRevealAll}
            className="ui-btn px-6 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 bg-white/10 backdrop-blur-sm"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.93 }}
          >
            {revealAllMode ? '전체 공개 완료' : '전체 공개'}
          </motion.button>
        )}

        <div className="mt-4 text-xs text-white/55 tracking-wider">
          {revealedIndexes.size} / {cards.length} REVEALED
        </div>
      </motion.div>
    </div>
  );
}
