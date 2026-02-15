'use client';

import { useEffect, useMemo, useState } from 'react';
import { Deck, Lane, OwnedCard, WarriorCard, TacticCard } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';

interface Props {
  deck: Deck;
  inventory: OwnedCard[];
  onSave: (nextDeck: Deck) => void;
}

type DeckSlot = { instanceId: string; lane: Lane } | null;

function toLane(index: number): Lane {
  if (index <= 0) return 'front';
  if (index === 1) return 'mid';
  return 'back';
}

function getWarriorCards(inventory: OwnedCard[]) {
  return inventory.filter((owned) => {
    const card = getCardById(owned.cardId);
    return card?.type === 'warrior';
  });
}

function getTacticCards(inventory: OwnedCard[]) {
  return inventory.filter((owned) => {
    const card = getCardById(owned.cardId);
    return card?.type === 'tactic';
  });
}

export default function DeckFormation({ deck, inventory, onSave }: Props) {
  const [warriorSlots, setWarriorSlots] = useState<DeckSlot[]>([null, null, null]);
  const [tacticSlots, setTacticSlots] = useState<string[]>([]);

  useEffect(() => {
    setWarriorSlots([
      deck.warriors[0] ? { instanceId: deck.warriors[0].instanceId, lane: deck.warriors[0].lane } : null,
      deck.warriors[1] ? { instanceId: deck.warriors[1].instanceId, lane: deck.warriors[1].lane } : null,
      deck.warriors[2] ? { instanceId: deck.warriors[2].instanceId, lane: deck.warriors[2].lane } : null,
    ]);
    setTacticSlots([...deck.tactics]);
  }, [deck]);

  const availableWarriors = useMemo(() => getWarriorCards(inventory), [inventory]);
  const availableTactics = useMemo(() => getTacticCards(inventory), [inventory]);

  const selectedWarriorIds = useMemo(() => warriorSlots.map((slot) => slot?.instanceId).filter(Boolean) as string[], [warriorSlots]);
  const selectedTacticIds = useMemo(() => [...tacticSlots], [tacticSlots]);

  const warriorReady = selectedWarriorIds.length === 3;
  const tacticReady = selectedTacticIds.length >= 2;

  const nextDeck = useMemo(() => {
    const warriors: { instanceId: string; lane: Lane }[] = [];
    selectedWarriorIds.forEach((instanceId, idx) => {
      warriors.push({ instanceId, lane: toLane(idx) });
    });
    return {
      ...deck,
      warriors,
      tactics: selectedTacticIds.slice(0, 2),
    };
  }, [deck, selectedTacticIds, selectedWarriorIds]);

  function toggleWarrior(instanceId: string) {
    setWarriorSlots((prev) => {
      const next = [...prev];
      const findIdx = next.findIndex((slot) => slot?.instanceId === instanceId);
      if (findIdx >= 0) {
        next[findIdx] = null;
      } else {
        const empty = next.findIndex((slot) => !slot);
        if (empty >= 0) {
          next[empty] = { instanceId, lane: toLane(empty) };
        } else {
          next.shift();
          next.push({ instanceId, lane: toLane(2) });
        }
      }
      return next.map((slot, idx) => (slot ? { ...slot, lane: toLane(idx) } : slot));
    });
  }

  function toggleTactic(instanceId: string) {
    setTacticSlots((prev) => {
      if (prev.includes(instanceId)) return prev.filter((item) => item !== instanceId);
      if (prev.length >= 2) return prev;
      return [...prev, instanceId];
    });
  }

  function cardName(instanceId: string) {
    const owned = inventory.find((item) => item.instanceId === instanceId);
    const card = owned ? getCardById(owned.cardId) : null;
    return card?.name ?? '알 수 없음';
  }

  const warriorCards = availableWarriors.map((owned) => {
    const card = getCardById(owned.cardId);
    if (!card || card.type !== 'warrior') return null;
    return { owned, card };
  }).filter((entry): entry is { owned: OwnedCard; card: WarriorCard } => !!entry);

  const tacticCards = availableTactics.map((owned) => {
    const card = getCardById(owned.cardId);
    if (!card || card.type !== 'tactic') return null;
    return { owned, card };
  }).filter((entry): entry is { owned: OwnedCard; card: TacticCard } => !!entry);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h2 className="text-white text-lg font-black mb-2">현재 편성</h2>
        <div className="space-y-1 text-sm">
          <div>
            무장: {warriorReady ? `${selectedWarriorIds.length} / 3` : `${selectedWarriorIds.length} / 3`}
          </div>
          <div className="text-gray-300">
            {selectedWarriorIds.length > 0 ? selectedWarriorIds.map(cardName).join(' · ') : '무장 미선택'}
          </div>
          <div>
            전법: {tacticReady ? `${selectedTacticIds.length} / 2` : `${selectedTacticIds.length} / 2`}
          </div>
          <div className="text-gray-300">
            {selectedTacticIds.length > 0 ? selectedTacticIds.map(cardName).join(' · ') : '전법 미선택'}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h2 className="text-white font-bold mb-2">무장 후보 (3선택)</h2>
        {warriorCards.length === 0 && <div className="text-gray-400 text-sm">무장 인벤토리가 없습니다.</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {warriorCards.map(({ owned, card }) => (
            <WarriorCardView
              key={owned.instanceId}
              card={card}
              owned={owned}
              size="sm"
              selected={selectedWarriorIds.includes(owned.instanceId)}
              onClick={() => toggleWarrior(owned.instanceId)}
              duplicateCount={owned.duplicates}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h2 className="text-white font-bold mb-2">전법 후보 (2선택)</h2>
        {tacticCards.length === 0 && <div className="text-gray-400 text-sm">전법 인벤토리가 없습니다.</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tacticCards.map(({ owned, card }) => (
            <TacticCardView
              key={owned.instanceId}
              card={card}
              owned={owned}
              size="sm"
              selected={selectedTacticIds.includes(owned.instanceId)}
              onClick={() => toggleTactic(owned.instanceId)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave({
          ...nextDeck,
          warriors: nextDeck.warriors.slice(0, 3),
          tactics: nextDeck.tactics.slice(0, 2),
        })}
        disabled={!warriorReady || !tacticReady}
        className={`w-full py-3 rounded-xl font-bold ${
          !warriorReady || !tacticReady
            ? 'bg-gray-700 text-gray-400'
            : 'ui-btn ui-btn-primary'
        }`}
      >
        전투 편성 확정
      </button>

      {!warriorReady && <p className="text-xs text-yellow-300">무장 3장, 전법 2장을 모두 선택해야 합니다.</p>}
      {!tacticReady && <p className="text-xs text-yellow-300">전법 2장까지 선택 가능합니다.</p>}

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="font-bold text-sm mb-2">최대 강함 제한</h3>
        <div className="text-xs text-gray-300">
          레벨은 부스터에서 자동 반영됩니다. 예: {selectedWarriorIds[0] ? `Lv.${Math.max(1, inventory.find((item) => item.instanceId === selectedWarriorIds[0])?.level || 1)}` : ''}
        </div>
      </div>
    </div>
  );
}
