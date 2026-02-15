'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, Deck, MAX_LEVEL, OwnedCard } from '@/types/game';
import { getCardById } from '@/data/cards';
import RelicDisplay from '@/components/roguelike/RelicDisplay';

interface Props {
  runResult: 'win' | 'loss' | 'draw';
  act: number;
  teamHp: number;
  maxTeamHp: number;
  startedAt: number;
  relicIds: string[];
  deck: Deck;
  inventory: OwnedCard[];
  stats: {
    battlesWon: number;
    elitesCleared: number;
    goldEarned: number;
    relicsCollected: number;
    cardsObtained: number;
    battlesFought: number;
    floorsCleared: number;
  };
  playTimeMs?: number;
  onRetry: () => void;
}

function formatTime(ms: number) {
  const m = Math.max(0, Math.floor(ms / 1000 / 60));
  const s = Math.max(0, Math.floor((ms / 1000) % 60));
  return `${m}분 ${s}초`;
}

function getCardName(cardId: string) {
  const card = getCardById(cardId);
  return card?.name || '알 수 없음';
}

function cardLevelText(owned: OwnedCard) {
  return Math.max(1, owned.level);
}

function cardLabel(type: Card['type']) {
  return type === 'warrior' ? '무장' : '전법';
}

export default function RunSummary({
  runResult,
  act,
  teamHp,
  maxTeamHp,
  startedAt,
  relicIds,
  deck,
  inventory,
  stats,
  playTimeMs,
  onRetry,
}: Props) {
  const deckCards = useMemo(() => {
    const warriors = deck.warriors.map((slot) => {
      const owned = inventory.find((entry) => entry.instanceId === slot.instanceId);
      return owned ? { cardId: owned.cardId, type: 'warrior' as const, level: cardLevelText(owned) } : null;
    }).filter(Boolean) as Array<{ cardId: string; type: 'warrior'; level: number }>;

    const tactics = deck.tactics.map((instanceId) => {
      const owned = inventory.find((entry) => entry.instanceId === instanceId);
      return owned ? { cardId: owned.cardId, type: 'tactic' as const, level: cardLevelText(owned) } : null;
    }).filter(Boolean) as Array<{ cardId: string; type: 'tactic'; level: number }>;

    return [...warriors, ...tactics];
  }, [deck.tactics, deck.warriors, inventory]);

  const elapsed = Date.now() - Math.max(0, startedAt);

  return (
    <div className="min-h-screen ui-page p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] text-white">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <div className="text-center">
            <div className={`text-3xl mb-2 ${runResult === 'win' ? 'text-amber-300' : 'text-red-300'}`}>
              {runResult === 'win' ? '🏆 삼국통일!' : '💀 원정 실패'}
            </div>
            <div className="text-sm text-gray-300">Act {act} · 노드 진행</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <h2 className="text-base font-bold mb-2">전투 요약</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">승리</div>
              <div className="font-bold text-emerald-300">{stats.battlesWon}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">엘리트 처치</div>
              <div className="font-bold text-amber-300">{stats.elitesCleared}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">획득 금</div>
              <div className="font-bold text-blue-300">{stats.goldEarned}G</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">수집 보물</div>
              <div className="font-bold text-amber-300">{stats.relicsCollected}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">최종 체력</div>
              <div className="font-bold text-rose-300">{teamHp}/{maxTeamHp}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">획득 카드</div>
              <div className="font-bold text-purple-300">{stats.cardsObtained}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">클리어 층</div>
              <div className="font-bold text-cyan-300">{stats.floorsCleared}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="text-gray-300 text-xs">전투 횟수</div>
              <div className="font-bold text-cyan-300">{stats.battlesFought}</div>
            </div>
          </div>
        </div>

      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <h2 className="text-base font-bold mb-2">진행 정보</h2>
        <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm space-y-1">
          <div>플레이 시간: {formatTime(playTimeMs ?? elapsed)}</div>
          <div>최대 레벨: {Math.max(MAX_LEVEL[4], ...deckCards.map((entry) => entry.level))}</div>
          <div>남은 포트: {Math.max(0, act - 1)}장</div>
        </div>
      </div>

        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <h2 className="text-base font-bold mb-2">최종 덱</h2>
          <div className="space-y-2 text-sm">
            {deckCards.map((entry) => (
              <div
                key={`${entry.cardId}-${entry.type}`}
                className="rounded-lg border border-white/10 bg-black/25 p-2 flex justify-between"
              >
                <span>
                  {cardLabel(entry.type)} Lv.{entry.level}
                </span>
                <span className="text-white">{getCardName(entry.cardId)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <h2 className="text-base font-bold mb-2">보물</h2>
          <RelicDisplay relicIds={relicIds} size="md" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onRetry}
            className="ui-btn ui-btn-primary py-3"
          >
            새로운 탐험
          </button>
          <Link
            href="/"
            className="ui-btn ui-btn-neutral py-3 text-center"
          >
            메인으로
          </Link>
        </div>
      </div>
    </div>
  );
}
