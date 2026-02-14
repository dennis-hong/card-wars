'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, OwnedCard, Grade, Faction, GRADE_LABELS, GRADE_COLORS, MAX_LEVEL } from '@/types/game';
import { ALL_CARDS, getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import CardDetailModal from '@/components/card/CardDetailModal';
import { SFX } from '@/lib/sound';
import { CARD_SLOT_SIZE_CLASSES } from '@/lib/display-constants';
import {
  buildOwnedByCardId,
  buildOwnedCardIdSet,
  buildOwnedCardCounts,
  canEnhanceOwnedCard,
  calculateEnhanceFuel,
} from '@/lib/card-utils';

interface Props {
  ownedCards: OwnedCard[];
  onEnhance: (instanceId: string) => boolean;
  onBack: () => void;
}

type OwnershipFilter = 'all' | 'owned' | 'missing';
type SortBy = 'grade' | 'level' | 'attack' | 'name';

type FilterPreset = {
  id: string;
  name: string;
  filterType: 'all' | 'warrior' | 'tactic';
  ownership: OwnershipFilter;
  filterGrade: Grade | 0;
  filterFaction: Faction | '전체';
  sortBy: SortBy;
};

const FILTER_PRESET_KEY = 'collection-filter-presets-v1';

function normalizePreset(raw: Partial<FilterPreset>, index: number): FilterPreset {
  const filterType = raw.filterType === 'warrior' || raw.filterType === 'tactic' ? raw.filterType : 'all';
  const ownership = raw.ownership === 'owned' || raw.ownership === 'missing' ? raw.ownership : 'all';
  const filterGrade = raw.filterGrade === 1 || raw.filterGrade === 2 || raw.filterGrade === 3 || raw.filterGrade === 4 ? raw.filterGrade : 0;
  const filterFaction = raw.filterFaction === '위' || raw.filterFaction === '촉' || raw.filterFaction === '오' || raw.filterFaction === '군벌' ? raw.filterFaction : '전체';
  const sortBy = raw.sortBy === 'level' || raw.sortBy === 'attack' || raw.sortBy === 'name' ? raw.sortBy : 'grade';
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `preset-${Date.now()}-${index}`,
    name: rawName.length > 0 ? rawName.slice(0, 12) : `프리셋 ${index + 1}`,
    filterType,
    ownership,
    filterGrade,
    filterFaction,
    sortBy,
  };
}

function LockedCardSlot({ card, size = 'sm' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const gradeColor = GRADE_COLORS[card.grade as Grade];

  return (
    <div
      className={`relative ${CARD_SLOT_SIZE_CLASSES[size]} rounded-lg overflow-hidden border border-slate-600/70 shadow-lg bg-slate-950/90`}
      style={{ background: `linear-gradient(140deg, #0b0f1a, ${gradeColor}24)` }}
      aria-label={`${card.name} 미보유`}
    >
      <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.16), transparent 55%)' }} />
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
      <div className="relative p-1.5 text-center border-b border-slate-600/60 bg-black/25">
        <div className="text-[11px] font-bold text-slate-100 truncate">{card.name}</div>
        <div className="flex justify-between items-center text-[9px] text-slate-300/80 px-1">
          <span>{card.type === 'warrior' ? card.faction : '전법'}</span>
          <span>{GRADE_LABELS[card.grade as Grade]}</span>
        </div>
      </div>

      <div className="relative mx-2 mt-1 aspect-square rounded border border-slate-700/70 bg-black/60 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/80" />
        <span className="text-4xl text-slate-100/20">{card.type === 'warrior' ? '⚔️' : '전법'}</span>
        <div className="absolute inset-0 bg-black/55" />
        <span className="absolute text-2xl">🔒</span>
      </div>

      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] rounded-full border border-amber-400/40 bg-amber-900/30 text-amber-100 whitespace-nowrap">
        미보유
      </div>
    </div>
  );
}

export default function CardCollection({ ownedCards, onEnhance, onBack }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'warrior' | 'tactic'>('all');
  const [ownership, setOwnership] = useState<OwnershipFilter>('all');
  const [filterGrade, setFilterGrade] = useState<Grade | 0>(0);
  const [filterFaction, setFilterFaction] = useState<Faction | '전체'>('전체');
  const [sortBy, setSortBy] = useState<SortBy>('grade');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(FILTER_PRESET_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Partial<FilterPreset>[];
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 6).map((preset, index) => normalizePreset(preset, index));
    } catch {
      return [];
    }
  });

  const ownedCardIds = useMemo(() => buildOwnedCardIdSet(ownedCards), [ownedCards]);
  const cardIdCounts = useMemo(() => buildOwnedCardCounts(ownedCards), [ownedCards]);
  const ownedByCardId = useMemo(() => buildOwnedByCardId(ownedCards), [ownedCards]);

  const collectionRate = Math.round((ownedCardIds.size / ALL_CARDS.length) * 100);
  const missingCount = ALL_CARDS.length - ownedCardIds.size;

  const canEnhance = useCallback((owned: OwnedCard): boolean => {
    return canEnhanceOwnedCard(owned, cardIdCounts);
  }, [cardIdCounts]);

  const getEnhanceFuel = useCallback((owned: OwnedCard): number => {
    return calculateEnhanceFuel(owned, cardIdCounts);
  }, [cardIdCounts]);

  const filteredCards = useMemo(() => {
    const getOwnedLevel = (cardId: string) => ownedByCardId.get(cardId)?.[0]?.level ?? 0;
    const getAttack = (card: Card) => {
      if (card.type !== 'warrior') return -1;
      const level = getOwnedLevel(card.id);
      return card.stats.attack + Math.max(0, level - 1);
    };

    const list = ALL_CARDS.filter((card) => {
      if (filterType !== 'all' && card.type !== filterType) return false;
      if (filterGrade !== 0 && card.grade !== filterGrade) return false;
      if (filterFaction !== '전체' && card.type === 'warrior' && card.faction !== filterFaction) return false;

      const isOwned = ownedCardIds.has(card.id);
      if (ownership === 'owned' && !isOwned) return false;
      if (ownership === 'missing' && isOwned) return false;
      return true;
    });

    list.sort((a, b) => {
      const ownedA = ownedCardIds.has(a.id) ? 1 : 0;
      const ownedB = ownedCardIds.has(b.id) ? 1 : 0;

      switch (sortBy) {
        case 'grade':
          return b.grade - a.grade || ownedB - ownedA || a.name.localeCompare(b.name, 'ko');
        case 'level':
          return getOwnedLevel(b.id) - getOwnedLevel(a.id) || b.grade - a.grade || a.name.localeCompare(b.name, 'ko');
        case 'attack':
          return getAttack(b) - getAttack(a) || b.grade - a.grade || a.name.localeCompare(b.name, 'ko');
        case 'name':
          return a.name.localeCompare(b.name, 'ko');
        default:
          return 0;
      }
    });

    return list;
  }, [filterType, ownership, filterGrade, filterFaction, sortBy, ownedByCardId, ownedCardIds]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return getCardById(selectedCardId) ?? null;
  }, [selectedCardId]);

  const selectedOwned = useMemo(() => {
    if (!selectedCardId) return null;
    return ownedByCardId.get(selectedCardId)?.[0] ?? null;
  }, [selectedCardId, ownedByCardId]);

  const selectedFuel = selectedOwned ? getEnhanceFuel(selectedOwned) : 0;
  const selectedMaxLevel = selectedCard ? MAX_LEVEL[selectedCard.grade as Grade] : 1;
  const selectedIsMaxLevel = selectedOwned ? selectedOwned.level >= selectedMaxLevel : false;
  const selectedCanEnhance = selectedOwned ? canEnhance(selectedOwned) : false;

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setOwnership('all');
    setFilterGrade(0);
    setFilterFaction('전체');
    setSortBy('grade');
    setShowAdvancedFilters(false);
  }, []);

  const saveCurrentPreset = () => {
    const name = prompt('프리셋 이름을 입력하세요 (최대 12자)');
    if (!name) return;

    const trimmed = name.trim().slice(0, 12);
    if (!trimmed) return;

    const preset: FilterPreset = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      filterType,
      ownership,
      filterGrade,
      filterFaction,
      sortBy,
    };

    setPresets((prev) => [preset, ...prev].slice(0, 6));
    SFX.buttonClick();
  };

  const applyPreset = (preset: FilterPreset) => {
    SFX.buttonClick();
    setFilterType(preset.filterType);
    setOwnership(preset.ownership);
    setFilterGrade(preset.filterGrade);
    setFilterFaction(preset.filterFaction);
    setSortBy(preset.sortBy);
    setShowAdvancedFilters(true);
  };

  const deletePreset = (presetId: string) => {
    SFX.buttonClick();
    setPresets((prev) => prev.filter((preset) => preset.id !== presetId));
  };

  const closeDetail = () => {
    SFX.buttonClick();
    setSelectedCardId(null);
  };

  const handleSelectCard = (cardId: string) => {
    if (!ownedCardIds.has(cardId)) return;
    SFX.buttonClick();
    setSelectedCardId(cardId);
  };

  const handleEnhance = () => {
    if (!selectedOwned) return;
    const success = onEnhance(selectedOwned.instanceId);
    if (success) {
      SFX.enhance();
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_PRESET_KEY, JSON.stringify(presets));
    } catch {
      // ignore localStorage errors
    }
  }, [presets]);

  return (
    <div className="h-screen ui-page p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
      <style jsx>{`
        @keyframes enhanceBadgePulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-gray-300 text-sm hover:text-white min-h-10 px-2">← 뒤로</button>
        <h1 className="text-white font-bold">카드 도감</h1>
        <div className="text-sm text-yellow-400">{collectionRate}%</div>
      </div>

      <div className="ui-panel rounded-lg p-3 mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>수집 진행도</span>
          <span>{ownedCardIds.size}/{ALL_CARDS.length}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-gray-300">
          <span>보유 {ownedCardIds.size}종</span>
          <span>미보유 {missingCount}종</span>
        </div>
      </div>

      <div className="ui-panel rounded-lg p-3 mb-4 text-[11px] text-gray-300">
        미보유 카드는 실루엣으로 표시됩니다. 보유 카드만 눌러 상세/강화를 진행할 수 있습니다.
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterType === 'all' ? 'bg-white text-black' : 'bg-gray-700 text-gray-200'}`}
        >전체</button>
        <button
          onClick={() => setFilterType('warrior')}
          className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterType === 'warrior' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
        >무장</button>
        <button
          onClick={() => setFilterType('tactic')}
          className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterType === 'tactic' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}
        >전법</button>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setOwnership('all')}
          className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${ownership === 'all' ? 'bg-slate-200 text-black' : 'bg-gray-700 text-gray-200'}`}
        >전체 상태</button>
        <button
          onClick={() => setOwnership('owned')}
          className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${ownership === 'owned' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-200'}`}
        >보유</button>
        <button
          onClick={() => setOwnership('missing')}
          className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${ownership === 'missing' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-200'}`}
        >미보유</button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([0, 1, 2, 3, 4] as const).map((grade) => (
          <button
            key={grade}
            onClick={() => setFilterGrade(grade)}
            className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterGrade === grade ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            {grade === 0 ? '등급' : GRADE_LABELS[grade]}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
          className="text-xs text-blue-300 hover:text-blue-200 font-semibold min-h-9 px-1"
        >
          {showAdvancedFilters ? '고급 필터 숨기기' : '고급 필터 보기'}
        </button>
      </div>

      <div className="ui-panel rounded-xl p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-200 font-semibold">필터 프리셋</div>
          <button
            onClick={saveCurrentPreset}
            className="ui-btn ui-btn-neutral px-2.5 py-1.5 text-[11px]"
          >
            현재 필터 저장
          </button>
        </div>
        {presets.length === 0 ? (
          <div className="text-[11px] text-gray-400">저장된 프리셋이 없습니다.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-1">
                <button
                  onClick={() => applyPreset(preset)}
                  className="ui-btn px-2.5 py-1.5 text-[11px] bg-slate-700 text-slate-100 border border-slate-500/40"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="ui-btn px-1.5 py-1 text-[10px] bg-red-900/70 text-red-100 border border-red-600/40"
                  aria-label={`${preset.name} 삭제`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdvancedFilters && (
        <div className="ui-panel rounded-xl p-3 mb-4 space-y-3">
          {filterType !== 'tactic' && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['전체', '위', '촉', '오', '군벌'] as const).map((faction) => (
                <button
                  key={faction}
                  onClick={() => setFilterFaction(faction)}
                  className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterFaction === faction ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}
                >{faction}</button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-gray-300">정렬:</span>
            {([['grade', '등급'], ['level', '레벨'], ['attack', '무력'], ['name', '이름']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold min-h-8 ${sortBy === key ? 'bg-amber-600 text-white' : 'bg-gray-700/70 text-gray-200'}`}
              >{label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {filteredCards.map((card) => {
          const owned = ownedByCardId.get(card.id)?.[0] ?? null;
          const isOwned = !!owned;
          const isEnhanceable = owned ? canEnhance(owned) : false;
          const duplicateCount = Math.max((cardIdCounts[card.id] || 0) - 1, 0);

          return (
            <div key={card.id} className="relative">
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

              {isOwned ? (
                card.type === 'warrior' ? (
                  <WarriorCardView
                    card={card}
                    owned={owned}
                    size="sm"
                    onClick={() => handleSelectCard(card.id)}
                    duplicateCount={duplicateCount}
                  />
                ) : (
                  <TacticCardView
                    card={card}
                    owned={owned}
                    size="sm"
                    onClick={() => handleSelectCard(card.id)}
                    duplicateCount={duplicateCount}
                  />
                )
              ) : (
                <LockedCardSlot card={card} size="sm" />
              )}
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="ui-panel rounded-xl p-5 text-center text-gray-300 mt-8 max-w-sm mx-auto">
          <div className="font-semibold text-gray-100 mb-2">해당하는 카드가 없습니다.</div>
          <div className="text-xs text-gray-300 mb-4">필터를 초기화하거나 다른 카테고리를 선택해보세요.</div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                SFX.buttonClick();
                resetFilters();
              }}
              className="ui-btn ui-btn-primary px-3 py-2 text-xs"
            >
              필터 초기화
            </button>
            <button
              onClick={() => {
                SFX.buttonClick();
                onBack();
              }}
              className="ui-btn ui-btn-neutral px-3 py-2 text-xs"
            >
              메인으로
            </button>
          </div>
        </div>
      )}

      <CardDetailModal
        card={selectedCard}
        owned={selectedOwned}
        ownedCount={selectedCard ? cardIdCounts[selectedCard.id] || 0 : 0}
        sourceTag="컬렉션"
        onClose={closeDetail}
        secondaryAction={selectedCard ? { label: '닫기', onClick: closeDetail, tone: 'neutral' } : undefined}
        primaryAction={selectedCard && selectedOwned ? {
          label: selectedIsMaxLevel
            ? '최대 레벨'
            : selectedCanEnhance
            ? `강화 (Lv.${selectedOwned.level} → Lv.${selectedOwned.level + 1})`
            : '중복 카드 필요',
          onClick: handleEnhance,
          disabled: !selectedCanEnhance,
          tone: selectedCanEnhance ? 'accent' : 'neutral',
          hint: selectedIsMaxLevel
            ? '최대 레벨에 도달했습니다.'
            : selectedCanEnhance
            ? `강화 재료 ${selectedFuel}장 보유`
            : '같은 카드를 더 모으면 강화할 수 있습니다.',
        } : undefined}
      />
    </div>
  );
}
