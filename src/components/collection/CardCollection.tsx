'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { OwnedCard, Grade, Faction, GRADE_LABELS, GRADE_NAMES, GRADE_COLORS, MAX_LEVEL } from '@/types/game';
import { getCardById, WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import { SFX } from '@/lib/sound';

interface Props {
  ownedCards: OwnedCard[];
  onEnhance: (instanceId: string) => boolean;
  onBack: () => void;
}

type ViewMode = 'collection' | 'detail';
type FilterPreset = {
  id: string;
  name: string;
  filterType: 'all' | 'warrior' | 'tactic';
  filterGrade: Grade | 0;
  filterFaction: Faction | '전체';
  sortBy: 'grade' | 'level' | 'attack' | 'name';
};
const FILTER_PRESET_KEY = 'collection-filter-presets-v1';

// Grade-based effect colors
const GRADE_EFFECT_COLORS: Record<Grade, { primary: string; glow: string; particle: string }> = {
  1: { primary: '#ffffff', glow: 'rgba(255,255,255,0.4)', particle: '#e0e0e0' },
  2: { primary: '#60a5fa', glow: 'rgba(96,165,250,0.4)', particle: '#3b82f6' },
  3: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.4)', particle: '#8b5cf6' },
  4: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.5)', particle: '#f59e0b' },
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999.17) * 10000;
  return x - Math.floor(x);
}

export default function CardCollection({ ownedCards, onEnhance, onBack }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('collection');
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [filterGrade, setFilterGrade] = useState<Grade | 0>(0);
  const [filterFaction, setFilterFaction] = useState<Faction | '전체'>('전체');
  const [filterType, setFilterType] = useState<'all' | 'warrior' | 'tactic'>('all');
  const [sortBy, setSortBy] = useState<'grade' | 'level' | 'attack' | 'name'>('grade');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(FILTER_PRESET_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as FilterPreset[];
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  });
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
    const filtered = ownedCards.filter((oc) => {
      const card = getCardById(oc.cardId);
      if (!card) return false;
      if (filterType !== 'all' && card.type !== filterType) return false;
      if (filterGrade !== 0 && card.grade !== filterGrade) return false;
      if (filterFaction !== '전체' && card.type === 'warrior' && card.faction !== filterFaction) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const ca = getCardById(a.cardId);
      const cb = getCardById(b.cardId);
      if (!ca || !cb) return 0;
      switch (sortBy) {
        case 'grade': return cb.grade - ca.grade || b.level - a.level;
        case 'level': return b.level - a.level || cb.grade - ca.grade;
        case 'attack': {
          const atkA = ca.type === 'warrior' ? ca.stats.attack + (a.level - 1) : 0;
          const atkB = cb.type === 'warrior' ? cb.stats.attack + (b.level - 1) : 0;
          return atkB - atkA;
        }
        case 'name': return ca.name.localeCompare(cb.name, 'ko');
        default: return 0;
      }
    });
  }, [ownedCards, filterGrade, filterFaction, filterType, sortBy]);

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

  useEffect(() => {
    localStorage.setItem(FILTER_PRESET_KEY, JSON.stringify(presets));
  }, [presets]);

  const resetFilters = useCallback(() => {
    setFilterType('all');
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
    setFilterGrade(preset.filterGrade);
    setFilterFaction(preset.filterFaction);
    setSortBy(preset.sortBy);
    setShowAdvancedFilters(true);
  };

  const deletePreset = (presetId: string) => {
    SFX.buttonClick();
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
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
    const warriorStats = card.type === 'warrior'
      ? {
          attack: card.stats.attack + (selectedCard.level - 1),
          command: card.stats.command + (selectedCard.level - 1),
          intel: card.stats.intel + (selectedCard.level - 1),
          defense: card.stats.defense + Math.floor((selectedCard.level - 1) * 0.5),
        }
      : null;

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
                const dist = 60 + seededRandom(i + 1) * 100;
                const dx = Math.cos((angle * Math.PI) / 180) * dist;
                const dy = Math.sin((angle * Math.PI) / 180) * dist;
                const size = 4 + seededRandom(i + 101) * 6;
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
                const dist = 80 + seededRandom(i + 201) * 60;
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

            {/* Stat effect explanation */}
            {card.type === 'warrior' && (
              <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
                <div className="text-xs text-gray-400 mb-2 text-center">현재 레벨 능력치</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 font-bold">⚔️ 무력 {warriorStats?.attack}</span>
                    <span className="text-gray-400">→ 공격 데미지</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-400 font-bold">🛡️ 통솔 {warriorStats?.command}</span>
                    <span className="text-gray-400">→ HP (×3)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400 font-bold">🧠 지력 {warriorStats?.intel}</span>
                    <span className="text-gray-400">→ 스킬 위력</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 font-bold">🏰 방어 {warriorStats?.defense}</span>
                    <span className="text-gray-400">→ 피해 감소</span>
                  </div>
                </div>
                <div className="text-[11px] text-center text-gray-300 mt-2">
                  예상 최대 HP: <span className="font-bold text-green-300">{(warriorStats?.command || 0) * 3}</span>
                </div>
              </div>
            )}

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
    <div className="min-h-screen ui-page p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
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
        <button onClick={onBack} className="text-gray-300 text-sm hover:text-white min-h-10 px-2">← 뒤로</button>
        <h1 className="text-white font-bold">카드 수집</h1>
        <div className="text-sm text-yellow-400">{collectionRate}%</div>
      </div>

      {/* Collection progress */}
      <div className="ui-panel rounded-lg p-3 mb-4">
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

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([0, 1, 2, 3, 4] as const).map((g) => (
          <button
            key={g}
            onClick={() => setFilterGrade(g)}
            className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterGrade === g ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            {g === 0 ? '등급' : GRADE_LABELS[g]}
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
              {(['전체', '위', '촉', '오', '군벌'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterFaction(f)}
                  className={`px-3 py-2 rounded-full text-xs whitespace-nowrap min-h-9 ${filterFaction === f ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}
                >{f}</button>
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
    </div>
  );
}
