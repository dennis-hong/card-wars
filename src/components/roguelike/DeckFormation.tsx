'use client';

import { useMemo, useState } from 'react';
import { Deck, Lane, OwnedCard, WarriorCard, TacticCard } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import CardDetailModal from '@/components/card/CardDetailModal';

interface Props {
  deck: Deck;
  inventory: OwnedCard[];
  onSave: (nextDeck: Deck) => void;
  actionLabel?: string;
}

type DeckSlot = { instanceId: string; lane: Lane } | null;

function toLane(index: number): Lane {
  if (index <= 0) return 'front';
  if (index === 1) return 'mid';
  return 'back';
}

const LANES: Record<Lane, string> = {
  front: '전위',
  mid: '중위',
  back: '후위',
};

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

export default function DeckFormation({
  deck,
  inventory,
  onSave,
  actionLabel,
}: Props) {
  const [warriorSlots, setWarriorSlots] = useState<DeckSlot[]>(() => [
    deck.warriors[0] ? { instanceId: deck.warriors[0].instanceId, lane: deck.warriors[0].lane } : null,
    deck.warriors[1] ? { instanceId: deck.warriors[1].instanceId, lane: deck.warriors[1].lane } : null,
    deck.warriors[2] ? { instanceId: deck.warriors[2].instanceId, lane: deck.warriors[2].lane } : null,
  ]);
  const [tacticSlots, setTacticSlots] = useState<string[]>(() => [...deck.tactics]);
  const [detailTarget, setDetailTarget] = useState<{ owned: OwnedCard; card: WarriorCard | TacticCard } | null>(null);

  const availableWarriors = useMemo(() => getWarriorCards(inventory), [inventory]);
  const availableTactics = useMemo(() => getTacticCards(inventory), [inventory]);

  const selectedWarriorIds = useMemo(() => warriorSlots.map((slot) => slot?.instanceId).filter(Boolean) as string[], [warriorSlots]);
  const selectedTacticIds = useMemo(() => [...tacticSlots], [tacticSlots]);

  const warriorReady = selectedWarriorIds.length === 3;
  const tacticReady = true; // 전법 없어도 진행 가능

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

  const selectedWarriorCards = selectedWarriorIds
    .map((instanceId) => {
      const owned = inventory.find((item) => item.instanceId === instanceId);
      if (!owned) return null;
      const card = getCardById(owned.cardId);
      if (!card || card.type !== 'warrior') return null;
      return { owned, card };
    })
    .filter((entry): entry is { owned: OwnedCard; card: WarriorCard } => !!entry);

  const selectedTacticCards = selectedTacticIds
    .map((instanceId) => {
      const owned = inventory.find((item) => item.instanceId === instanceId);
      if (!owned) return null;
      const card = getCardById(owned.cardId);
      if (!card || card.type !== 'tactic') return null;
      return { owned, card };
    })
    .filter((entry): entry is { owned: OwnedCard; card: TacticCard } => !!entry);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h2 className="text-white text-lg font-black mb-2">현재 편성</h2>
        <div className="grid grid-cols-3 gap-2">
          {warriorSlots.map((slot, index) => {
            const lane = LANES[toLane(index)];
            const warrior = slot ? selectedWarriorCards.find((entry) => entry.owned.instanceId === slot.instanceId) : null;
            if (!slot || !warrior) {
              return (
                <div
                  key={`slot-${index}`}
                  className="rounded-lg border border-dashed border-white/20 p-1 bg-black/20 min-h-[10rem] flex items-center justify-center text-xs text-gray-400"
                >
                  {lane}
                </div>
              );
            }

            return (
              <div key={slot.instanceId} className="space-y-1">
                <WarriorCardView
                  card={warrior.card}
                  owned={warrior.owned}
                  size="sm"
                  selected={false}
                  onClick={() => setDetailTarget({ owned: warrior.owned, card: warrior.card })}
                />
                <div className="text-center text-[11px] text-amber-300 font-bold">{LANES[slot.lane]}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-2">
          <div className="text-white text-xs mb-1">
            무장: {selectedWarriorCards.length} / 3
          </div>
          <div className="text-white text-xs mb-2">
            전법: {selectedTacticCards.length} / 2
          </div>
          <div className="flex justify-center">
            {selectedTacticCards.length === 0 && <div className="text-gray-400 text-xs">전법 미선택</div>}
            {selectedTacticCards.length > 0 && (
              <div className="grid w-fit grid-cols-2 gap-3">
                {selectedTacticCards.map(({ owned, card }) => (
                  <div key={`summary-${owned.instanceId}`} className="flex justify-center">
                    <TacticCardView
                      card={card}
                      owned={owned}
                      size="sm"
                      selected={false}
                      onClick={() => setDetailTarget({ owned, card })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h2 className="text-white font-bold mb-2">무장 후보 (3선택)</h2>
        {warriorCards.length === 0 && <div className="text-gray-400 text-sm">무장 인벤토리가 없습니다.</div>}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {warriorCards.map(({ owned, card }) => (
            <div key={owned.instanceId} className="space-y-1">
              <div className={`${selectedWarriorIds.includes(owned.instanceId) ? 'rounded-lg ring-2 ring-amber-400 ring-offset-2 ring-offset-black/20 shadow-[0_0_18px_rgba(251,191,36,0.45)]' : ''}`}>
                <WarriorCardView
                  card={card}
                  owned={owned}
                  size="sm"
                  selected={false}
                  onClick={() => toggleWarrior(owned.instanceId)}
                  duplicateCount={owned.duplicates}
                />
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget({ owned, card })}
                className="w-full rounded-md border border-white/15 bg-white/5 py-1 text-[11px] font-bold text-white/85"
              >
                상세
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h2 className="text-white font-bold mb-2">전법 후보 (2선택)</h2>
        {tacticCards.length === 0 && <div className="text-gray-400 text-sm">전법 인벤토리가 없습니다.</div>}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {tacticCards.map(({ owned, card }) => (
            <div key={owned.instanceId} className="space-y-1">
              <div className={`${selectedTacticIds.includes(owned.instanceId) ? 'rounded-lg ring-2 ring-amber-400 ring-offset-2 ring-offset-black/20 shadow-[0_0_18px_rgba(251,191,36,0.45)]' : ''}`}>
                <TacticCardView
                  key={owned.instanceId}
                  card={card}
                  owned={owned}
                  size="sm"
                  selected={false}
                  onClick={() => toggleTactic(owned.instanceId)}
                />
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget({ owned, card })}
                className="w-full rounded-md border border-white/15 bg-white/5 py-1 text-[11px] font-bold text-white/85"
              >
                상세
              </button>
            </div>
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
        {actionLabel ?? '덱 확정 후 맵 진입'}
      </button>

      {!warriorReady && <p className="text-xs text-yellow-300">무장 3장을 선택해야 합니다.</p>}
      <p className="text-xs text-gray-400">전법은 선택 사항입니다. (최대 2장)</p>

      <CardDetailModal
        card={detailTarget?.card ?? null}
        owned={detailTarget?.owned ?? null}
        sourceTag="탐험 편성"
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}
