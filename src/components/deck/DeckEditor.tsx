'use client';

import { useState, useMemo } from 'react';
import { OwnedCard, Deck, DeckSlot, Lane } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import CardDetailModal from '@/components/card/CardDetailModal';
import { SFX } from '@/lib/sound';
import { generateId } from '@/lib/uuid';

interface Props {
  ownedCards: OwnedCard[];
  deck: Deck | null;
  onSave: (deck: Deck) => void;
  onCancel: () => void;
}

type Tab = 'warriors' | 'tactics';

function laneToLabel(lane: Lane) {
  return lane === 'front' ? '전위' : lane === 'mid' ? '중위' : '후위';
}

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
  // Filter out stale slots where the owned card no longer exists
  const [warriors, setWarriors] = useState<DeckSlot[]>(
    (deck?.warriors || []).filter((w) => ownedCards.some((c) => c.instanceId === w.instanceId))
  );
  const [tactics, setTactics] = useState<string[]>(
    (deck?.tactics || []).filter((t) => ownedCards.some((c) => c.instanceId === t))
  );
  const [tab, setTab] = useState<Tab>('warriors');
  const [selectedLane, setSelectedLane] = useState<Lane>('front');
  const [selectedOwnedCard, setSelectedOwnedCard] = useState<OwnedCard | null>(null);

  const ownedWarriors = useMemo(() =>
    ownedCards.filter((oc) => getCardById(oc.cardId)?.type === 'warrior'), [ownedCards]);
  const ownedTactics = useMemo(() =>
    ownedCards.filter((oc) => getCardById(oc.cardId)?.type === 'tactic'), [ownedCards]);

  const usedWarriorIds = new Set(warriors.map((w) => w.instanceId));
  const usedTacticIds = new Set(tactics);
  const occupiedLanes = new Set(warriors.map((w) => w.lane));
  const cardIdCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const owned of ownedCards) {
      counts[owned.cardId] = (counts[owned.cardId] || 0) + 1;
    }
    return counts;
  }, [ownedCards]);

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
  const selectedCardData = selectedOwnedCard ? (getCardById(selectedOwnedCard.cardId) ?? null) : null;
  const selectedOwnedCount = selectedOwnedCard ? (cardIdCounts[selectedOwnedCard.cardId] || 0) : 0;

  const detailPrimaryAction = (() => {
    if (!selectedOwnedCard || !selectedCardData) return undefined;

    if (selectedCardData.type === 'warrior') {
      const used = usedWarriorIds.has(selectedOwnedCard.instanceId);
      if (used) {
        return {
          label: '덱에서 제거',
          onClick: () => {
            handleRemoveWarrior(selectedOwnedCard.instanceId);
            setSelectedOwnedCard(null);
          },
          tone: 'danger' as const,
          hint: `현재 무장 ${warriors.length}/3`,
        };
      }

      if (warriors.length >= 3) {
        return {
          label: '무장 슬롯 가득',
          onClick: () => {},
          disabled: true,
          tone: 'neutral' as const,
          hint: '먼저 기존 무장을 제거해주세요.',
        };
      }

      const targetLane = occupiedLanes.has(selectedLane)
        ? (['front', 'mid', 'back'] as Lane[]).find((lane) => !occupiedLanes.has(lane))
        : selectedLane;

      if (!targetLane) {
        return {
          label: '배치 불가',
          onClick: () => {},
          disabled: true,
          tone: 'neutral' as const,
          hint: '배치 가능한 진영이 없습니다.',
        };
      }

      return {
        label: `${laneToLabel(targetLane)}에 배치`,
        onClick: () => {
          handleAddWarrior(selectedOwnedCard.instanceId);
          setSelectedOwnedCard(null);
        },
        tone: 'primary' as const,
        hint: `현재 선택 진영: ${laneToLabel(selectedLane)}`,
      };
    }

    const used = usedTacticIds.has(selectedOwnedCard.instanceId);
    if (used) {
      return {
        label: '덱에서 제거',
        onClick: () => {
          handleRemoveTactic(selectedOwnedCard.instanceId);
          setSelectedOwnedCard(null);
        },
        tone: 'danger' as const,
        hint: `현재 전법 ${tactics.length}/2`,
      };
    }

    if (tactics.length >= 2) {
      return {
        label: '전법 슬롯 가득',
        onClick: () => {},
        disabled: true,
        tone: 'neutral' as const,
        hint: '먼저 기존 전법을 제거해주세요.',
      };
    }

    return {
      label: '전법 슬롯에 추가',
      onClick: () => {
        handleAddTactic(selectedOwnedCard.instanceId);
        setSelectedOwnedCard(null);
      },
      tone: 'primary' as const,
      hint: `현재 전법 ${tactics.length}/2`,
    };
  })();

  return (
    <div className="h-screen bg-gray-900 p-4 overflow-y-auto overscroll-contain pb-20">
      <CardDetailModal
        card={selectedCardData}
        owned={selectedOwnedCard}
        ownedCount={selectedOwnedCount}
        sourceTag="덱 편성"
        onClose={() => setSelectedOwnedCard(null)}
        primaryAction={detailPrimaryAction}
      />

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
                    <WarriorCardView
                      card={card}
                      owned={owned!}
                      size="sm"
                      onClick={() => setSelectedOwnedCard(owned!)}
                    />
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
                    <TacticCardView
                      card={card}
                      owned={owned!}
                      size="sm"
                      onClick={() => setSelectedOwnedCard(owned!)}
                    />
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
        <div className="text-center text-[10px] text-gray-500 mb-3">💡 카드를 탭하면 상세에서 추가/제거할 수 있어요</div>
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
              >
                <WarriorCardView
                  card={card}
                  owned={oc}
                  size="sm"
                  onClick={() => setSelectedOwnedCard(oc)}
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
                  onClick={() => setSelectedOwnedCard(oc)}
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
