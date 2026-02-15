'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BattleArena from '@/components/battle/BattleArena';
import { useRunContext } from '@/context/run-context';
import { getNodeById } from '@/lib/roguelike/map-generator';

interface LocalDeckEnemyWarrior {
  instanceId: string;
  cardId: string;
  lane: 'front' | 'mid' | 'back';
  level?: number;
}

interface LocalDeckEnemy {
  warriors: LocalDeckEnemyWarrior[];
  tactics?: {
    cardId: string;
    level: number;
  }[];
}

export default function RoguelikeBattlePage() {
  const router = useRouter();
  const {
    state,
    completeBattle,
    loaded,
  } = useRunContext();

  const currentNode = useMemo(() => {
    if (!state.map || !state.currentNodeId) return null;
    return getNodeById(state.map, state.currentNodeId);
  }, [state.currentNodeId, state.map]);

  const battleOptions = useMemo(() => {
    const template = currentNode?.enemy as LocalDeckEnemy | undefined;
    if (!template) return undefined;

    return {
      forcedEnemy: {
        warriors: template.warriors.map((warrior) => ({
          cardId: warrior.cardId,
          level: Math.max(1, warrior.level ?? 1),
          lane: warrior.lane,
        })),
        tactics: template.tactics?.map((tactic) => ({
          cardId: tactic.cardId,
          level: Math.max(1, tactic.level),
        })),
      },
      teamHp: state.teamHp,
      maxTeamHp: state.maxTeamHp,
    };
  }, [currentNode, state.maxTeamHp, state.teamHp]);

  const hasEnoughWarriors = useMemo(() => {
    const owned = new Set(state.inventory.map((owned) => owned.instanceId));
    return state.deck.warriors.every((slot) => owned.has(slot.instanceId));
  }, [state.deck.warriors, state.inventory]);

  if (!loaded) {
    return <div className="min-h-screen ui-page flex items-center justify-center text-white">로딩 중...</div>;
  }

  if (!state.currentNodeId || !currentNode || (currentNode.type !== 'battle' && currentNode.type !== 'elite' && currentNode.type !== 'boss')) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-white text-lg mb-4">현재 노드에서 전투를 시작할 수 없습니다.</div>
          <button
            onClick={() => router.push('/roguelike/map')}
            className="ui-btn ui-btn-primary py-3 px-5"
          >
            맵으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!hasEnoughWarriors || state.deck.tactics.length < 2) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-white">편성된 덱이 무장/전법 기준을 충족하지 않습니다.</div>
          <button
            onClick={() => router.push('/roguelike')}
            className="ui-btn ui-btn-primary w-full py-3"
          >
            편성 변경하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <BattleArena
        deck={state.deck}
        ownedCards={state.inventory}
        wins={state.stats.battlesWon}
        onBattleEnd={(result) => {
          if (result === 'win') {
            router.push('/roguelike/reward');
          } else {
            router.push('/roguelike/summary');
          }
        }}
        onBattleEndWithSummary={(result, summary) => {
          completeBattle(result, {
            teamHpBefore: state.teamHp,
            teamHpAfter: summary.teamHpAfter,
            teamDamage: summary.teamDamage,
          });
        }}
        battleOptions={battleOptions}
        runTeamHp={state.teamHp}
        onExit={() => router.push('/roguelike/map')}
      />
    </div>
  );
}
