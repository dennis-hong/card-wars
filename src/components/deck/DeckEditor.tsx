'use client';

import { useState, useMemo } from 'react';
import { OwnedCard, Deck, DeckSlot, Lane, Card } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import { SFX } from '@/lib/sound';
import { generateId } from '@/lib/uuid';

interface Props {
  ownedCards: OwnedCard[];
  deck: Deck | null;
  onSave: (deck: Deck) => void;
  onCancel: () => void;
}

type Tab = 'warriors' | 'tactics';

export default function DeckEditor({ ownedCards, deck, onSave, onCancel }: Props) {
  const [deckName, setDeckName] = useState(deck?.name || '새 덱');
  const [warriors, setWarriors] = useState<DeckSlot[]>(
    deck?.warriors || []
  );
  const [tactics, setTactics] = useState<string[]>(
    deck?.tactics || []
  );
  const [tab, setTab] = useState<Tab>('warriors');
  const [selectedLane, setSelectedLane] = useState<Lane>('front');

  const ownedWarriors = useMemo(() =>
    ownedCards.filter((oc) => {
      const card = getCardById(oc.cardId);
      return card?.type === 'warrior';
    }), [ownedCards]);

  const ownedTactics = useMemo(() =>
    ownedCards.filter((oc) => {
      const card = getCardById(oc.cardId);
      return card?.type === 'tactic';
    }), [ownedCards]);

  const usedWarriorIds = new Set(warriors.map((w) => w.instanceId));
  const usedTacticIds = new Set(tactics);

  const occupiedLanes = new Set(warriors.map((w) => w.lane));

  const handleAddWarrior = (instanceId: string) => {
    if (warriors.length >= 3) return;
    if (usedWarriorIds.has(instanceId)) return;

    // Determine lane: use selectedLane if empty, otherwise first empty lane
    let targetLane: Lane = selectedLane;
    if (occupiedLanes.has(selectedLane)) {
      const emptyLane = (['front', 'mid', 'back'] as Lane[]).find(
        (l) => !occupiedLanes.has(l)
      );
      if (!emptyLane) return; // all lanes full
      targetLane = emptyLane;
    }

    SFX.buttonClick();
    setWarriors([...warriors, { instanceId, lane: targetLane }]);
    // Auto-advance selectedLane to next empty lane
    const nextEmpty = (['front', 'mid', 'back'] as Lane[]).find(
      (l) => l !== targetLane && !occupiedLanes.has(l)
    );
    if (nextEmpty) setSelectedLane(nextEmpty);
  };

  const handleRemoveWarrior = (instanceId: string) => {
    SFX.buttonClick();
    setWarriors(warriors.filter((w) => w.instanceId !== instanceId));
  };

  const handleChangeLane = (instanceId: string, lane: Lane) => {
    SFX.buttonClick();
    setWarriors(warriors.map((w) =>
      w.instanceId === instanceId ? { ...w, lane } : w
    ));
  };

  const handleAddTactic = (instanceId: string) => {
    if (tactics.length >= 2) return;
    if (usedTacticIds.has(instanceId)) return;
    SFX.buttonClick();
    setTactics([...tactics, instanceId]);
  };

  const handleRemoveTactic = (instanceId: string) => {
    SFX.buttonClick();
    setTactics(tactics.filter((t) => t !== instanceId));
  };

  const handleSave = () => {
    if (warriors.length !== 3 || tactics.length !== 2) return;

    // Validate unique lanes
    const lanes = warriors.map((w) => w.lane);
    const uniqueLanes = new Set(lanes);
    if (uniqueLanes.size !== 3) {
      alert('무장을 각각 다른 진영(전위/중위/후위)에 배치해주세요!');
      return;
    }

    SFX.buttonClick();
    onSave({
      id: deck?.id || generateId(),
      name: deckName,
      warriors,
      tactics,
    });
  };

  const isValid = warriors.length === 3 && tactics.length === 2 &&
    new Set(warriors.map((w) => w.lane)).size === 3;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-gray-400 text-sm hover:text-white">
          ← 뒤로
        </button>
        <input
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="bg-transparent text-white text-center font-bold border-b border-gray-600 focus:border-yellow-400 outline-none"
          maxLength={20}
        />
        <button
          onClick={handleSave}
          disabled={!isValid}
          className={`px-4 py-1 rounded-lg text-sm font-bold transition-colors ${
            isValid ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-700 text-gray-500'
          }`}
        >
          저장
        </button>
      </div>

      {/* Current Deck Slots */}
      <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
        <div className="text-sm text-gray-400 mb-2">덱 구성 (무장 3 + 전법 2)</div>

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
                className={`
                  rounded-lg p-2 text-center border-2 border-dashed min-h-[100px]
                  flex flex-col items-center justify-center
                  ${slot ? 'border-blue-500/50 bg-blue-900/20' : 'border-gray-600/50'}
                  ${selectedLane === lane ? 'ring-2 ring-yellow-400' : ''}
                `}
                onClick={() => setSelectedLane(lane)}
              >
                <div className="text-[10px] text-gray-500 mb-1">{laneLabel}</div>
                {card && card.type === 'warrior' ? (
                  <div className="relative">
                    <WarriorCardView card={card} owned={owned!} size="sm" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveWarrior(slot!.instanceId); }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">빈 슬롯</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tactic slots */}
        <div className="flex gap-2 justify-center">
          {[0, 1].map((i) => {
            const tid = tactics[i];
            const owned = tid ? ownedCards.find((c) => c.instanceId === tid) : null;
            const card = owned ? getCardById(owned.cardId) : null;

            return (
              <div
                key={i}
                className={`
                  rounded-lg p-2 text-center border-2 border-dashed min-w-[100px]
                  flex flex-col items-center justify-center
                  ${card ? 'border-purple-500/50 bg-purple-900/20' : 'border-gray-600/50'}
                `}
              >
                <div className="text-[10px] text-gray-500 mb-1">전법 {i + 1}</div>
                {card && card.type === 'tactic' ? (
                  <div className="relative">
                    <TacticCardView card={card} owned={owned!} size="sm" />
                    <button
                      onClick={() => handleRemoveTactic(tid)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
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
          className={`flex-1 py-2 text-sm font-bold transition-colors ${
            tab === 'warriors' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'
          }`}
        >
          무장 ({ownedWarriors.length})
        </button>
        <button
          onClick={() => setTab('tactics')}
          className={`flex-1 py-2 text-sm font-bold transition-colors ${
            tab === 'tactics' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500'
          }`}
        >
          전법 ({ownedTactics.length})
        </button>
      </div>

      {/* Lane selector (when adding warriors) */}
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
              >
                {laneLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Card list */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tab === 'warriors' ? (
          ownedWarriors.map((oc) => {
            const card = getCardById(oc.cardId);
            if (!card || card.type !== 'warrior') return null;
            const used = usedWarriorIds.has(oc.instanceId);
            return (
              <div key={oc.instanceId} className={used ? 'opacity-30' : ''}>
                <WarriorCardView
                  card={card}
                  owned={oc}
                  size="sm"
                  onClick={() => {
                    if (used) {
                      handleRemoveWarrior(oc.instanceId);
                    } else {
                      handleAddWarrior(oc.instanceId);
                    }
                  }}
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
                  onClick={() => {
                    if (used) {
                      handleRemoveTactic(oc.instanceId);
                    } else {
                      handleAddTactic(oc.instanceId);
                    }
                  }}
                  selected={used}
                />
              </div>
            );
          })
        )}
      </div>

      {ownedWarriors.length === 0 && tab === 'warriors' && (
        <div className="text-center text-gray-500 mt-8">
          무장 카드가 없습니다. 부스터팩을 개봉해주세요!
        </div>
      )}
      {ownedTactics.length === 0 && tab === 'tactics' && (
        <div className="text-center text-gray-500 mt-8">
          전법 카드가 없습니다. 부스터팩을 개봉해주세요!
        </div>
      )}
    </div>
  );
}
