'use client';

import { useState, useMemo, useCallback } from 'react';
import { OwnedCard, Grade, Faction, GRADE_LABELS, GRADE_NAMES, GRADE_COLORS, MAX_LEVEL } from '@/types/game';
import { getCardById, WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import { SFX } from '@/lib/sound';

interface Props {
  ownedCards: OwnedCard[];
  onEnhance: (instanceId: string) => boolean;
  onMerge: (targetId: string, sourceId: string) => void;
  onBack: () => void;
}

type ViewMode = 'collection' | 'detail';

// Grade-based effect colors
const GRADE_EFFECT_COLORS: Record<Grade, { primary: string; glow: string; particle: string }> = {
  1: { primary: '#ffffff', glow: 'rgba(255,255,255,0.4)', particle: '#e0e0e0' },
  2: { primary: '#60a5fa', glow: 'rgba(96,165,250,0.4)', particle: '#3b82f6' },
  3: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.4)', particle: '#8b5cf6' },
  4: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.5)', particle: '#f59e0b' },
};

export default function CardCollection({ ownedCards, onEnhance, onMerge, onBack }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('collection');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [filterGrade, setFilterGrade] = useState<Grade | 0>(0);
  const [filterFaction, setFilterFaction] = useState<Faction | '전체'>('전체');
  const [filterType, setFilterType] = useState<'all' | 'warrior' | 'tactic'>('all');
  const [enhanceEffect, setEnhanceEffect] = useState<{ grade: Grade; oldLevel: number; newLevel: number } | null>(null);
  const [cardFloat, setCardFloat] = useState(false);

  const allCardIds = useMemo(() => {
    const cards = [...WARRIOR_CARDS, ...TACTIC_CARDS];
    return new Set(cards.map((c) => c.id));
  }, []);

  const ownedCardIds = useMemo(() => new Set(ownedCards.map((c) => c.cardId)), [ownedCards]);

  const collectionRate = Math.round((ownedCardIds.size / allCardIds.size) * 100);

  // Count duplicates per cardId
  const cardIdCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const oc of ownedCards) {
      counts[oc.cardId] = (counts[oc.cardId] || 0) + 1;
    }
    return counts;
  }, [ownedCards]);

  // Check if a card can be enhanced
  const canEnhance = useCallback((oc: OwnedCard): boolean => {
    const cardData = getCardById(oc.cardId);
    if (!cardData) return false;
    if (oc.level >= MAX_LEVEL[cardData.grade as Grade]) return false;
    const extraCopies = (cardIdCounts[oc.cardId] || 1) - 1;
    return oc.duplicates > 0 || extraCopies > 0;
  }, [cardIdCounts]);

  const filteredCards = useMemo(() => {
    return ownedCards.filter((oc) => {
      const card = getCardById(oc.cardId);
      if (!card) return false;
      if (filterType !== 'all' && card.type !== filterType) return false;
      if (filterGrade !== 0 && card.grade !== filterGrade) return false;
      if (filterFaction !== '전체' && card.type === 'warrior' && card.faction !== filterFaction) return false;
      return true;
    });
  }, [ownedCards, filterGrade, filterFaction, filterType]);

  const handleSelectCard = (owned: OwnedCard) => {
    SFX.buttonClick();
    setSelectedCard(owned);
    setViewMode('detail');
  };

  const handleEnhance = () => {
    if (!selectedCard) return;
    const cardData = getCardById(selectedCard.cardId);
    if (!cardData) return;
    const oldLevel = selectedCard.level;
    const success = onEnhance(selectedCard.instanceId);
    if (success) {
      SFX.enhance();
      // Trigger effect
      setCardFloat(true);
      setEnhanceEffect({ grade: cardData.grade as Grade, oldLevel, newLevel: oldLevel + 1 });
      setTimeout(() => {
        setCardFloat(false);
        setEnhanceEffect(null);
      }, 1500);
      // Refresh selected card - level up, recalculate
      setSelectedCard(prev => prev ? { ...prev, level: prev.level + 1 } : prev);
    }
  };

  // Total available for enhance (stored dupes + extra copies)
  const getEnhanceFuel = (oc: OwnedCard): number => {
    const extraCopies = (cardIdCounts[oc.cardId] || 1) - 1;
    return oc.duplicates + extraCopies;
  };

  // ─── Detail View ───
  if (viewMode === 'detail' && selectedCard) {
    const card = getCardById(selectedCard.cardId);
    if (!card) return null;

    const fuel = getEnhanceFuel(selectedCard);
    const maxLvl = MAX_LEVEL[card.grade as Grade];
    const isMaxLevel = selectedCard.level >= maxLvl;
    const enhanceable = !isMaxLevel && fuel > 0;
    const effectColors = GRADE_EFFECT_COLORS[card.grade as Grade];

    return (
      <div className="min-h-screen bg-gray-900 p-4 relative overflow-hidden">
        {/* ═══ ENHANCE EFFECT OVERLAY ═══ */}
        {enhanceEffect && (
          <>
            {/* Full screen flash */}
            <div
              className="fixed inset-0 z-50 pointer-events-none"
              style={{
                animation: 'enhanceFlash 0.8s ease-out forwards',
                background: `radial-gradient(circle, ${effectColors.glow}, transparent 70%)`,
              }}
            />

            {/* Particles */}
            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i / 20) * 360;
                const dist = 60 + Math.random() * 100;
                const dx = Math.cos((angle * Math.PI) / 180) * dist;
                const dy = Math.sin((angle * Math.PI) / 180) * dist;
                const size = 4 + Math.random() * 6;
                return (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: size,
                      height: size,
                      background: effectColors.particle,
                      boxShadow: `0 0 ${size * 2}px ${effectColors.primary}`,
                      animation: `particleBurst 0.8s ease-out ${i * 0.02}s forwards`,
                      ['--dx' as string]: `${dx}px`,
                      ['--dy' as string]: `${dy}px`,
                    }}
                  />
                );
              })}

              {/* Star particles for legendary */}
              {enhanceEffect.grade === 4 && Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * 360;
                const dist = 80 + Math.random() * 60;
                const dx = Math.cos((angle * Math.PI) / 180) * dist;
                const dy = Math.sin((angle * Math.PI) / 180) * dist;
                return (
                  <div
                    key={`star-${i}`}
                    className="absolute text-2xl"
                    style={{
                      animation: `particleBurst 1s ease-out ${i * 0.05}s forwards`,
                      ['--dx' as string]: `${dx}px`,
                      ['--dy' as string]: `${dy}px`,
                    }}
                  >
                    ✨
                  </div>
                );
              })}
            </div>

            {/* LEVEL UP text */}
            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <div style={{ animation: 'levelUpText 1.2s ease-out forwards' }}>
                <div
                  className="text-5xl font-black tracking-wider"
                  style={{
                    color: effectColors.primary,
                    textShadow: `0 0 30px ${effectColors.glow}, 0 0 60px ${effectColors.glow}, 0 4px 8px rgba(0,0,0,0.8)`,
                  }}
                >
                  LEVEL UP!
                </div>
                <div
                  className="text-center text-2xl font-bold mt-2"
                  style={{
                    color: effectColors.primary,
                    textShadow: `0 0 20px ${effectColors.glow}`,
                    animation: 'levelCounter 0.6s ease-out 0.3s forwards',
                    opacity: 0,
                  }}
                >
                  Lv.{enhanceEffect.oldLevel} → Lv.{enhanceEffect.newLevel}
                </div>
              </div>
            </div>

            {/* Hologram ring for legendary */}
            {enhanceEffect.grade === 4 && (
              <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
                <div
                  className="w-48 h-48 rounded-full border-4"
                  style={{
                    borderColor: effectColors.primary,
                    boxShadow: `0 0 40px ${effectColors.glow}, inset 0 0 40px ${effectColors.glow}`,
                    animation: 'holoRing 1s ease-out forwards',
                  }}
                />
              </div>
            )}
          </>
        )}

        <style jsx>{`
          @keyframes enhanceFlash {
            0% { opacity: 0; }
            15% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes particleBurst {
            0% { opacity: 1; transform: translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
          }
          @keyframes levelUpText {
            0% { opacity: 0; transform: scale(0.3) translateY(20px); }
            20% { opacity: 1; transform: scale(1.2) translateY(-10px); }
            40% { transform: scale(1) translateY(0); }
            75% { opacity: 1; }
            100% { opacity: 0; transform: scale(1.05) translateY(-30px); }
          }
          @keyframes levelCounter {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardFloat {
            0% { transform: translateY(0); filter: brightness(1); }
            30% { transform: translateY(-15px); filter: brightness(1.3); }
            100% { transform: translateY(0); filter: brightness(1); }
          }
          @keyframes holoRing {
            0% { opacity: 0; transform: scale(0.3); }
            30% { opacity: 1; transform: scale(1.1); }
            70% { opacity: 0.6; transform: scale(1.3); }
            100% { opacity: 0; transform: scale(1.6); }
          }
          @keyframes enhancePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.4); }
            50% { box-shadow: 0 0 20px 4px rgba(251,191,36,0.6); }
          }
        `}</style>

        <button
          onClick={() => setViewMode('collection')}
          className="text-gray-400 text-sm hover:text-white mb-4"
        >
          ← 뒤로
        </button>

        <div className="flex flex-col items-center">
          {/* Card display with float effect */}
          <div
            className="mb-6"
            style={{ animation: cardFloat ? 'cardFloat 1s ease-out' : 'none' }}
          >
            {card.type === 'warrior' ? (
              <WarriorCardView card={card} owned={selectedCard} size="lg" showDetails />
            ) : (
              <TacticCardView card={card as import('@/types/game').TacticCard} owned={selectedCard} size="lg" />
            )}
          </div>

          {/* Card info */}
          <div className="bg-gray-800/50 rounded-xl p-4 w-full max-w-sm">
            <div className="text-white font-bold text-lg text-center mb-2">{card.name}</div>
            <div className="text-center text-sm text-gray-400 mb-3">
              {GRADE_LABELS[card.grade as Grade]} {GRADE_NAMES[card.grade as Grade]}
              {card.type === 'warrior' && ` | ${card.faction}`}
            </div>

            {/* Level bar */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
              <div className="flex justify-between text-sm text-gray-300">
                <span>레벨</span>
                <span className="text-yellow-400">{selectedCard.level} / {maxLvl}</span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(selectedCard.level / maxLvl) * 100}%` }}
                />
              </div>
            </div>

            {/* Enhance fuel info */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-3 text-center">
              <div className="text-xs text-gray-400 mb-1">강화 재료 (중복 카드)</div>
              <div className="text-lg font-bold" style={{ color: fuel > 0 ? GRADE_COLORS[card.grade as Grade] : '#6b7280' }}>
                {fuel > 0 ? `${fuel}장 보유` : '없음'}
              </div>
            </div>

            {/* ═══ BIG ENHANCE BUTTON ═══ */}
            <button
              onClick={handleEnhance}
              disabled={!enhanceable || !!enhanceEffect}
              className={`w-full py-4 rounded-xl font-black text-xl transition-all relative overflow-hidden ${
                enhanceable
                  ? 'text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              style={enhanceable ? {
                background: `linear-gradient(135deg, ${GRADE_COLORS[card.grade as Grade]}, ${effectColors.primary})`,
                animation: 'enhancePulse 2s infinite',
              } : undefined}
            >
              {enhanceable && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              )}
              <span className="relative z-10">
                {isMaxLevel
                  ? '⭐ 최대 레벨!'
                  : enhanceable
                  ? `⬆️ 강화! (Lv.${selectedCard.level} → ${selectedCard.level + 1})`
                  : '중복 카드 필요'}
              </span>
            </button>

            {/* Skills list */}
            {card.type === 'warrior' && card.skills.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-gray-400 mb-2">스킬</div>
                {card.skills.map((s) => (
                  <div key={s.name} className="bg-gray-700/50 rounded-lg p-2 mb-1">
                    <div className="text-sm text-white">
                      <span className={
                        s.type === 'ultimate' ? 'text-yellow-400' :
                        s.type === 'passive' ? 'text-blue-400' : 'text-green-400'
                      }>
                        [{s.type === 'ultimate' ? '궁극' : s.type === 'passive' ? '패시브' : '액티브'}]
                      </span>{' '}
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Collection Grid ───
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <style jsx>{`
        @keyframes enhanceBadgePulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 뒤로</button>
        <h1 className="text-white font-bold">카드 수집</h1>
        <div className="text-sm text-yellow-400">{collectionRate}%</div>
      </div>

      {/* Collection progress */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>수집 진행도</span>
          <span>{ownedCardIds.size}/{allCardIds.size}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterType === 'all' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}
        >전체</button>
        <button
          onClick={() => setFilterType('warrior')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterType === 'warrior' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >무장</button>
        <button
          onClick={() => setFilterType('tactic')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterType === 'tactic' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >전법</button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([0, 1, 2, 3, 4] as const).map((g) => (
          <button
            key={g}
            onClick={() => setFilterGrade(g)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterGrade === g ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {g === 0 ? '등급' : GRADE_LABELS[g]}
          </button>
        ))}
      </div>

      {filterType !== 'tactic' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['전체', '위', '촉', '오', '군벌'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFaction(f)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterFaction === f ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >{f}</button>
          ))}
        </div>
      )}

      {/* Card grid with enhance badges */}
      <div className="flex flex-wrap gap-2 justify-center">
        {filteredCards.map((oc) => {
          const card = getCardById(oc.cardId);
          if (!card) return null;
          const isEnhanceable = canEnhance(oc);
          const dupCount = (cardIdCounts[oc.cardId] || 1) - 1;

          return (
            <div key={oc.instanceId} className="relative">
              {/* Enhanceable badge */}
              {isEnhanceable && (
                <div
                  className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{
                    background: `linear-gradient(135deg, ${GRADE_COLORS[card.grade as Grade]}, #fbbf24)`,
                    animation: 'enhanceBadgePulse 1.5s infinite',
                    boxShadow: `0 0 8px ${GRADE_COLORS[card.grade as Grade]}`,
                  }}
                >
                  ⬆️
                </div>
              )}
              {card.type === 'warrior' ? (
                <WarriorCardView
                  card={card}
                  owned={oc}
                  size="sm"
                  onClick={() => handleSelectCard(oc)}
                  showDetails
                  duplicateCount={dupCount}
                />
              ) : (
                <TacticCardView
                  card={card as import('@/types/game').TacticCard}
                  owned={oc}
                  size="sm"
                  onClick={() => handleSelectCard(oc)}
                  duplicateCount={dupCount}
                />
              )}
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center text-gray-500 mt-8">해당하는 카드가 없습니다.</div>
      )}
    </div>
  );
}
