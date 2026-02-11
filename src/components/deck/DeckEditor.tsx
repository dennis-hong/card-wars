'use client';

import { useState, useMemo } from 'react';
import { OwnedCard, Deck, DeckSlot, Lane, Card, WarriorCard, GRADE_LABELS, GRADE_NAMES, GRADE_COLORS, FACTION_COLORS } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import { SFX } from '@/lib/sound';
import { generateId } from '@/lib/uuid';
import { getWarriorImage } from '@/lib/warrior-images';

interface Props {
  ownedCards: OwnedCard[];
  deck: Deck | null;
  onSave: (deck: Deck) => void;
  onCancel: () => void;
}

type Tab = 'warriors' | 'tactics';

// Synergy preview helper
function getSynergyPreview(warriors: DeckSlot[], ownedCards: OwnedCard[]): { faction: string; count: number; effect: string; level: 'minor' | 'major' }[] {
  const factions: string[] = [];
  for (const w of warriors) {
    const owned = ownedCards.find(c => c.instanceId === w.instanceId);
    if (!owned) continue;
    const card = getCardById(owned.cardId);
    if (card?.type === 'warrior') factions.push(card.faction);
  }
  const counts: Record<string, number> = {};
  for (const f of factions) counts[f] = (counts[f] || 0) + 1;
  const effectMap: Record<string, [string, string]> = {
    '위': ['방어+1', '방어+2'], '촉': ['무력+1', '무력+2'],
    '오': ['지력+1', '지력+2'], '군벌': ['통솔+1', '통솔+2'],
  };
  const synergies: { faction: string; count: number; effect: string; level: 'minor' | 'major' }[] = [];
  for (const [f, c] of Object.entries(counts)) {
    if (c >= 3) synergies.push({ faction: f, count: c, effect: effectMap[f]?.[1] || '', level: 'major' });
    else if (c >= 2) synergies.push({ faction: f, count: c, effect: effectMap[f]?.[0] || '', level: 'minor' });
  }
  return synergies;
}

export default function DeckEditor({ ownedCards, deck, onSave, onCancel }: Props) {
  const [deckName, setDeckName] = useState(deck?.name || '새 덱');
  const [warriors, setWarriors] = useState<DeckSlot[]>(deck?.warriors || []);
  const [tactics, setTactics] = useState<string[]>(deck?.tactics || []);
  const [tab, setTab] = useState<Tab>('warriors');
  const [selectedLane, setSelectedLane] = useState<Lane>('front');
  const [previewCard, setPreviewCard] = useState<{ owned: OwnedCard; card: WarriorCard } | null>(null);

  const ownedWarriors = useMemo(() =>
    ownedCards.filter((oc) => getCardById(oc.cardId)?.type === 'warrior'), [ownedCards]);
  const ownedTactics = useMemo(() =>
    ownedCards.filter((oc) => getCardById(oc.cardId)?.type === 'tactic'), [ownedCards]);

  const usedWarriorIds = new Set(warriors.map((w) => w.instanceId));
  const usedTacticIds = new Set(tactics);
  const occupiedLanes = new Set(warriors.map((w) => w.lane));

  // Synergy preview
  const synergyPreview = useMemo(() => getSynergyPreview(warriors, ownedCards), [warriors, ownedCards]);

  const handleAddWarrior = (instanceId: string) => {
    if (warriors.length >= 3 || usedWarriorIds.has(instanceId)) return;
    let targetLane: Lane = selectedLane;
    if (occupiedLanes.has(selectedLane)) {
      const emptyLane = (['front', 'mid', 'back'] as Lane[]).find(l => !occupiedLanes.has(l));
      if (!emptyLane) return;
      targetLane = emptyLane;
    }
    SFX.buttonClick();
    setWarriors([...warriors, { instanceId, lane: targetLane }]);
    const nextEmpty = (['front', 'mid', 'back'] as Lane[]).find(l => l !== targetLane && !occupiedLanes.has(l));
    if (nextEmpty) setSelectedLane(nextEmpty);
  };

  const handleRemoveWarrior = (instanceId: string) => {
    SFX.buttonClick();
    setWarriors(warriors.filter((w) => w.instanceId !== instanceId));
  };

  const handleAddTactic = (instanceId: string) => {
    if (tactics.length >= 2 || usedTacticIds.has(instanceId)) return;
    SFX.buttonClick();
    setTactics([...tactics, instanceId]);
  };

  const handleRemoveTactic = (instanceId: string) => {
    SFX.buttonClick();
    setTactics(tactics.filter((t) => t !== instanceId));
  };

  const handleLongPress = (oc: OwnedCard) => {
    const card = getCardById(oc.cardId);
    if (card?.type === 'warrior') {
      setPreviewCard({ owned: oc, card });
    }
  };

  const handleSave = () => {
    if (warriors.length !== 3 || tactics.length > 2) return;
    const lanes = warriors.map((w) => w.lane);
    if (new Set(lanes).size !== 3) {
      alert('무장을 각각 다른 진영(전위/중위/후위)에 배치해주세요!');
      return;
    }
    SFX.buttonClick();
    onSave({ id: deck?.id || generateId(), name: deckName, warriors, tactics });
  };

  const isValid = warriors.length === 3 && tactics.length <= 2 && new Set(warriors.map((w) => w.lane)).size === 3;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Card Preview Popup */}
      {previewCard && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewCard(null)}>
          <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl p-5 max-w-xs w-full border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Portrait */}
            {(() => {
              const img = getWarriorImage(previewCard.card.id);
              return img ? (
                <div className="w-full h-40 rounded-xl overflow-hidden mb-4 border-2" style={{ borderColor: GRADE_COLORS[previewCard.card.grade] }}>
                  <img src={img} alt={previewCard.card.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-32 rounded-xl bg-black/30 flex items-center justify-center mb-4 text-5xl">
                  {previewCard.card.grade === 4 ? '🌟' : '⚔️'}
                </div>
              );
            })()}

            {/* Name & Info */}
            <div className="text-center mb-3">
              <div className="text-xl font-black text-white">{previewCard.card.name}</div>
              <div className="text-sm" style={{ color: FACTION_COLORS[previewCard.card.faction] }}>{previewCard.card.faction}</div>
              <div className="text-xs text-gray-400">{GRADE_LABELS[previewCard.card.grade]} {GRADE_NAMES[previewCard.card.grade]} | Lv.{previewCard.owned.level}</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4 bg-black/30 rounded-lg p-3">
              <div className="text-center">
                <div className="text-xs text-gray-400">⚔️ 무력</div>
                <div className="text-lg font-bold text-red-400">{previewCard.card.stats.attack}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">🛡️ 통솔</div>
                <div className="text-lg font-bold text-green-400">{previewCard.card.stats.command}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">🧠 지력</div>
                <div className="text-lg font-bold text-blue-400">{previewCard.card.stats.intel}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">🏰 방어</div>
                <div className="text-lg font-bold text-yellow-400">{previewCard.card.stats.defense}</div>
              </div>
            </div>

            {/* Skills */}
            {previewCard.card.skills.length > 0 && (
              <div className="space-y-2 mb-4">
                {previewCard.card.skills.map(s => (
                  <div key={s.name} className="bg-white/5 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">
                      <span className={s.type === 'ultimate' ? 'text-yellow-400' : s.type === 'passive' ? 'text-blue-400' : 'text-green-400'}>
                        [{s.type === 'ultimate' ? '궁극' : s.type === 'passive' ? '패시브' : '액티브'}]
                      </span> {s.name}
                    </div>
                    <div className="text-xs text-gray-400">{s.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {!usedWarriorIds.has(previewCard.owned.instanceId) && warriors.length < 3 ? (
                <button
                  onClick={() => { handleAddWarrior(previewCard.owned.instanceId); setPreviewCard(null); }}
                  className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg active:scale-95"
                >
                  + 덱에 추가
                </button>
              ) : usedWarriorIds.has(previewCard.owned.instanceId) ? (
                <button
                  onClick={() => { handleRemoveWarrior(previewCard.owned.instanceId); setPreviewCard(null); }}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg active:scale-95"
                >
                  덱에서 제거
                </button>
              ) : null}
              <button
                onClick={() => setPreviewCard(null)}
                className="flex-1 py-2 bg-gray-700 text-white font-bold rounded-lg active:scale-95"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-gray-400 text-sm hover:text-white">← 뒤로</button>
        <input
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="bg-transparent text-white text-center font-bold border-b border-gray-600 focus:border-yellow-400 outline-none"
          maxLength={20}
        />
        <button
          onClick={handleSave}
          disabled={!isValid}
          className={`px-4 py-1 rounded-lg text-sm font-bold transition-colors ${isValid ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-700 text-gray-500'}`}
        >
          저장
        </button>
      </div>

      {/* Current Deck Slots */}
      <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
        <div className="text-sm text-gray-400 mb-2">덱 구성 (무장 3필수 + 전법 0~2)</div>

        {/* Warriors in lanes */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['front', 'mid', 'back'] as Lane[]).map((lane) => {
            const slot = warriors.find((w) => w.lane === lane);
            const owned = slot ? ownedCards.find((c) => c.instanceId === slot.instanceId) : null;
            const card = owned ? getCardById(owned.cardId) : null;
            const laneLabel = lane === 'front' ? '전위' : lane === 'mid' ? '중위' : '후위';
            return (
              <div
                key={lane}
                className={`rounded-lg p-2 text-center border-2 border-dashed min-h-[100px] flex flex-col items-center justify-center
                  ${slot ? 'border-blue-500/50 bg-blue-900/20' : 'border-gray-600/50'}
                  ${selectedLane === lane ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => setSelectedLane(lane)}
              >
                <div className="text-[10px] text-gray-500 mb-1">{laneLabel}</div>
                {card && card.type === 'warrior' ? (
                  <div className="relative">
                    <WarriorCardView card={card} owned={owned!} size="sm" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveWarrior(slot!.instanceId); }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">빈 슬롯</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Synergy Preview */}
        {synergyPreview.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 justify-center">
            {synergyPreview.map((syn, i) => (
              <div key={i} className={`text-[11px] px-2 py-1 rounded-full font-bold border ${
                syn.level === 'major'
                  ? 'bg-yellow-900/50 border-yellow-500/50 text-yellow-300'
                  : 'bg-gray-700/50 border-gray-500/50 text-gray-300'
              }`}>
                {syn.level === 'major' ? '🔥' : '✨'} {syn.faction} {syn.level === 'major' ? '대' : '소'}시너지: {syn.effect}
              </div>
            ))}
          </div>
        )}

        {/* Tactic slots */}
        <div className="flex gap-2 justify-center">
          {[0, 1].map((i) => {
            const tid = tactics[i];
            const owned = tid ? ownedCards.find((c) => c.instanceId === tid) : null;
            const card = owned ? getCardById(owned.cardId) : null;
            return (
              <div
                key={i}
                className={`rounded-lg p-2 text-center border-2 border-dashed min-w-[100px] flex flex-col items-center justify-center
                  ${card ? 'border-purple-500/50 bg-purple-900/20' : 'border-gray-600/50'}`}
              >
                <div className="text-[10px] text-gray-500 mb-1">전법 {i + 1}</div>
                {card && card.type === 'tactic' ? (
                  <div className="relative">
                    <TacticCardView card={card} owned={owned!} size="sm" />
                    <button
                      onClick={() => handleRemoveTactic(tid)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">빈 슬롯</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex mb-4">
        <button
          onClick={() => setTab('warriors')}
          className={`flex-1 py-2 text-sm font-bold transition-colors ${tab === 'warriors' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}
        >무장 ({ownedWarriors.length})</button>
        <button
          onClick={() => setTab('tactics')}
          className={`flex-1 py-2 text-sm font-bold transition-colors ${tab === 'tactics' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500'}`}
        >전법 ({ownedTactics.length})</button>
      </div>

      {/* Lane selector */}
      {tab === 'warriors' && warriors.length < 3 && (
        <div className="flex gap-2 justify-center mb-3">
          <div className="text-xs text-gray-400">배치할 진영:</div>
          {(['front', 'mid', 'back'] as Lane[]).map((lane) => {
            const occupied = warriors.some((w) => w.lane === lane);
            const laneLabel = lane === 'front' ? '전위' : lane === 'mid' ? '중위' : '후위';
            return (
              <button
                key={lane}
                disabled={occupied}
                onClick={() => setSelectedLane(lane)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  occupied ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                  selectedLane === lane ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >{laneLabel}</button>
            );
          })}
        </div>
      )}

      {/* Tip */}
      {tab === 'warriors' && (
        <div className="text-center text-[10px] text-gray-500 mb-3">💡 카드를 길게 누르면 상세 정보를 볼 수 있어요</div>
      )}

      {/* Card list */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tab === 'warriors' ? (
          ownedWarriors.map((oc) => {
            const card = getCardById(oc.cardId);
            if (!card || card.type !== 'warrior') return null;
            const used = usedWarriorIds.has(oc.instanceId);
            return (
              <div
                key={oc.instanceId}
                className={used ? 'opacity-30' : ''}
                onContextMenu={(e) => { e.preventDefault(); handleLongPress(oc); }}
                onTouchStart={() => {
                  const timer = setTimeout(() => handleLongPress(oc), 500);
                  const clear = () => { clearTimeout(timer); document.removeEventListener('touchend', clear); };
                  document.addEventListener('touchend', clear, { once: true });
                }}
              >
                <WarriorCardView
                  card={card}
                  owned={oc}
                  size="sm"
                  onClick={() => used ? handleRemoveWarrior(oc.instanceId) : handleAddWarrior(oc.instanceId)}
                  selected={used}
                  showDetails
                />
              </div>
            );
          })
        ) : (
          ownedTactics.map((oc) => {
            const card = getCardById(oc.cardId);
            if (!card || card.type !== 'tactic') return null;
            const used = usedTacticIds.has(oc.instanceId);
            return (
              <div key={oc.instanceId} className={used ? 'opacity-30' : ''}>
                <TacticCardView
                  card={card}
                  owned={oc}
                  size="sm"
                  onClick={() => used ? handleRemoveTactic(oc.instanceId) : handleAddTactic(oc.instanceId)}
                  selected={used}
                />
              </div>
            );
          })
        )}
      </div>

      {ownedWarriors.length === 0 && tab === 'warriors' && (
        <div className="text-center text-gray-500 mt-8">무장 카드가 없습니다. 부스터팩을 개봉해주세요!</div>
      )}
      {ownedTactics.length === 0 && tab === 'tactics' && (
        <div className="text-center text-gray-500 mt-8">전법 카드가 없습니다. 부스터팩을 개봉해주세요!</div>
      )}
    </div>
  );
}
