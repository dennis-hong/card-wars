'use client';

import { useState, useMemo } from 'react';
import { OwnedCard, Grade, Faction, GRADE_LABELS, GRADE_NAMES, MAX_LEVEL } from '@/types/game';
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

type ViewMode = 'collection' | 'detail' | 'enhance';

export default function CardCollection({ ownedCards, onEnhance, onMerge, onBack }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('collection');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [filterGrade, setFilterGrade] = useState<Grade | 0>(0);
  const [filterFaction, setFilterFaction] = useState<Faction | '전체'>('전체');
  const [filterType, setFilterType] = useState<'all' | 'warrior' | 'tactic'>('all');
  const [showEnhanceEffect, setShowEnhanceEffect] = useState(false);

  const allCardIds = useMemo(() => {
    const cards = [...WARRIOR_CARDS, ...TACTIC_CARDS];
    return new Set(cards.map((c) => c.id));
  }, []);

  const ownedCardIds = useMemo(() => {
    return new Set(ownedCards.map((c) => c.cardId));
  }, [ownedCards]);

  const collectionRate = Math.round((ownedCardIds.size / allCardIds.size) * 100);

  // Count duplicates per cardId (how many extra copies beyond the first)
  const duplicateCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const oc of ownedCards) {
      counts[oc.cardId] = (counts[oc.cardId] || 0) + 1;
    }
    // Convert to "extra copies" (total - 1)
    for (const k of Object.keys(counts)) {
      counts[k] = counts[k] - 1;
    }
    return counts;
  }, [ownedCards]);

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
    const success = onEnhance(selectedCard.instanceId);
    if (success) {
      SFX.enhance();
      setShowEnhanceEffect(true);
      setTimeout(() => setShowEnhanceEffect(false), 600);
      // Refresh selected card
      const updated = ownedCards.find((c) => c.instanceId === selectedCard.instanceId);
      if (updated) setSelectedCard({ ...updated, level: updated.level + 1, duplicates: updated.duplicates - 1 });
    }
  };

  const handleMerge = (sourceId: string) => {
    if (!selectedCard) return;
    SFX.enhance();
    onMerge(selectedCard.instanceId, sourceId);
    setSelectedCard({ ...selectedCard, duplicates: selectedCard.duplicates + 1 });
  };

  // Duplicates of same card for merging
  const duplicates = useMemo(() => {
    if (!selectedCard) return [];
    return ownedCards.filter(
      (c) => c.cardId === selectedCard.cardId && c.instanceId !== selectedCard.instanceId
    );
  }, [selectedCard, ownedCards]);

  if (viewMode === 'detail' && selectedCard) {
    const card = getCardById(selectedCard.cardId);
    if (!card) return null;

    const totalDuplicates = selectedCard.duplicates + duplicates.length;

    return (
      <div className="min-h-screen bg-gray-900 p-4 relative">
        {/* Enhance level-up effect overlay */}
        {showEnhanceEffect && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div
              className="text-center"
              style={{ animation: 'enhanceBurst 0.6s ease-out forwards' }}
            >
              <div className="text-5xl mb-2">⬆️</div>
              <div className="text-2xl font-black text-yellow-300" style={{ textShadow: '0 0 20px rgba(253,224,71,0.8)' }}>
                LEVEL UP!
              </div>
            </div>
            <div
              className="absolute inset-0"
              style={{ animation: 'enhanceFlash 0.6s ease-out forwards' }}
            />
          </div>
        )}

        <style jsx>{`
          @keyframes enhanceBurst {
            0% { opacity: 0; transform: scale(0.3); }
            30% { opacity: 1; transform: scale(1.2); }
            70% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.1) translateY(-20px); }
          }
          @keyframes enhanceFlash {
            0% { background: rgba(253,224,71,0.3); }
            100% { background: transparent; }
          }
        `}</style>

        <button
          onClick={() => setViewMode('collection')}
          className="text-gray-400 text-sm hover:text-white mb-4"
        >
          ← 뒤로
        </button>

        <div className="flex flex-col items-center">
          {/* Card display */}
          <div className="mb-6">
            {card.type === 'warrior' ? (
              <WarriorCardView card={card} owned={selectedCard} size="lg" showDetails />
            ) : (
              <TacticCardView card={card} owned={selectedCard} size="lg" />
            )}
          </div>

          {/* Card info */}
          <div className="bg-gray-800/50 rounded-xl p-4 w-full max-w-sm">
            <div className="text-white font-bold text-lg text-center mb-2">{card.name}</div>
            <div className="text-center text-sm text-gray-400 mb-3">
              {GRADE_LABELS[card.grade]} {GRADE_NAMES[card.grade]}
              {card.type === 'warrior' && ` | ${card.faction}`}
            </div>

            {/* Level & enhancement */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
              <div className="flex justify-between text-sm text-gray-300">
                <span>레벨</span>
                <span className="text-yellow-400">{selectedCard.level} / {MAX_LEVEL[card.grade]}</span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(selectedCard.level / MAX_LEVEL[card.grade]) * 100}%` }}
                />
              </div>
            </div>

            {/* Duplicates & merge section */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>보유 중복</span>
                <span className="font-bold">
                  {totalDuplicates > 0 ? (
                    <span className="text-purple-400">x{totalDuplicates + 1}</span>
                  ) : (
                    <span className="text-gray-500">없음</span>
                  )}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mb-2">
                흡수됨: {selectedCard.duplicates}개 / 미합성: {duplicates.length}장
              </div>
              {duplicates.length > 0 && (
                <div className="mt-1">
                  <div className="flex gap-1 flex-wrap">
                    {duplicates.map((d) => (
                      <button
                        key={d.instanceId}
                        onClick={() => handleMerge(d.instanceId)}
                        className="px-2 py-1 bg-purple-700 text-white text-xs rounded hover:bg-purple-600 transition-colors"
                      >
                        Lv.{d.level} 합성
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enhance button */}
            <button
              onClick={handleEnhance}
              disabled={selectedCard.duplicates < 1 || selectedCard.level >= MAX_LEVEL[card.grade]}
              className={`w-full py-3 rounded-lg font-bold transition-all ${
                selectedCard.duplicates >= 1 && selectedCard.level < MAX_LEVEL[card.grade]
                  ? 'bg-yellow-600 text-white hover:bg-yellow-500 hover:shadow-lg hover:shadow-yellow-500/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedCard.level >= MAX_LEVEL[card.grade]
                ? '최대 레벨!'
                : selectedCard.duplicates < 1
                ? duplicates.length > 0
                  ? '먼저 중복 카드를 합성하세요'
                  : '중복 카드 필요'
                : `⬆️ 강화 (중복 1개 소모 → Lv.${selectedCard.level + 1})`}
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

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">
          ← 뒤로
        </button>
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
        >
          전체
        </button>
        <button
          onClick={() => setFilterType('warrior')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterType === 'warrior' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          무장
        </button>
        <button
          onClick={() => setFilterType('tactic')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterType === 'tactic' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          전법
        </button>
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
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Card grid */}
      <div className="flex flex-wrap gap-2 justify-center">
        {filteredCards.map((oc) => {
          const card = getCardById(oc.cardId);
          if (!card) return null;

          const dupCount = duplicateCountMap[oc.cardId] || 0;
          return card.type === 'warrior' ? (
            <WarriorCardView
              key={oc.instanceId}
              card={card}
              owned={oc}
              size="sm"
              onClick={() => handleSelectCard(oc)}
              showDetails
              duplicateCount={dupCount}
            />
          ) : (
            <TacticCardView
              key={oc.instanceId}
              card={card as import('@/types/game').TacticCard}
              owned={oc}
              size="sm"
              onClick={() => handleSelectCard(oc)}
              duplicateCount={dupCount}
            />
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          해당하는 카드가 없습니다.
        </div>
      )}
    </div>
  );
}
