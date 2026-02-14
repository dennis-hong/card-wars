'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { BoosterPack, Card, PACK_INFO, GRADE_COLORS, GRADE_NAMES } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';

interface SealedPackCardProps {
  pack: BoosterPack;
  index: number;
  total: number;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
}

function SealedPackCard({
  pack,
  index,
  total,
  active,
  compact,
  onSelect,
}: SealedPackCardProps) {
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

interface PackDetailPanelProps {
  pack: BoosterPack;
  compact: boolean;
  onOpen: () => void;
}

function PackDetailPanel({ pack, compact, onOpen }: PackDetailPanelProps) {
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

interface LastObtained {
  cards: Card[];
  ownedBefore: Set<string>;
}

interface PackSelectionViewProps {
  packs: BoosterPack[];
  activePack: BoosterPack | null;
  compact: boolean;
  lastObtained: LastObtained | null;
  onBack: () => void;
  onSelectPack: (packId: string) => void;
  onOpenActive: () => void;
  onRecentCardClick: (card: Card, isNew: boolean) => void;
}

export default function PackSelectionView({
  packs,
  activePack,
  compact,
  lastObtained,
  onBack,
  onSelectPack,
  onOpenActive,
  onRecentCardClick,
}: PackSelectionViewProps) {
  const recentObtainedCards = useMemo(() => {
    if (!lastObtained) return [];
    return [...lastObtained.cards].sort((a, b) => b.grade - a.grade);
  }, [lastObtained]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,#1a2f5f_0%,#0a1124_48%,#060a14_100%)] flex flex-col items-center p-4">
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 sm:mb-8 pt-1">
        <button onClick={onBack} className="text-white/65 text-sm hover:text-white transition-colors">&larr; 뒤로</button>
        <h1 className="text-white font-extrabold text-lg tracking-wide">부스터 오픈</h1>
        <div className="text-sm text-white/70">{packs.length}개</div>
      </div>

      {lastObtained && recentObtainedCards.length > 0 && (
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
                  onClick={() => onRecentCardClick(card, isNew)}
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

      {packs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-white/65">
          <div className="text-4xl mb-4">📦</div>
          <div>미개봉 부스터팩이 없습니다</div>
          <div className="text-sm mt-2">전투 승리 시 부스터팩을 획득할 수 있습니다.</div>
        </div>
      ) : (
        <>
          <div className="relative flex-1 flex items-center justify-center w-full" style={{ minHeight: compact ? 300 : 370 }}>
            <div className="relative" style={{ width: compact ? 290 : 360, height: compact ? 250 : 300 }}>
              {packs.map((pack, i) => (
                <SealedPackCard
                  key={pack.id}
                  pack={pack}
                  index={i}
                  total={packs.length}
                  active={activePack?.id === pack.id}
                  compact={compact}
                  onSelect={() => onSelectPack(pack.id)}
                />
              ))}
            </div>
          </div>

          <div className="w-full max-w-xl mb-8">
            {activePack && <PackDetailPanel pack={activePack} compact={compact} onOpen={onOpenActive} />}
          </div>

          <div className="mb-5 text-xs tracking-[0.14em] text-white/45">PACK SELECT • OPEN • REVEAL</div>
        </>
      )}
    </div>
  );
}
