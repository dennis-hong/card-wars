'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Deck } from '@/types/game';
import { getCardById } from '@/data/cards';
import DeckFormation from '@/components/roguelike/DeckFormation';
import TacticCardView from '@/components/card/TacticCardView';
import WarriorCardView from '@/components/card/WarriorCardView';
import { useRunContext } from '@/context/run-context';

const PACK_LABEL = {
  normal: '🧧 일반팩',
};

export default function RoguelikeLandingPage() {
  const router = useRouter();
  const {
    state,
    loaded,
    startNewRun,
    openStarterPack,
    saveDeck,
    clearRun,
    goToMap,
    ensureStarterComposition,
  } = useRunContext();

  const [revealedCards, setRevealedCards] = useState<Card[]>([]);
  const [revealedPackId, setRevealedPackId] = useState<string | null>(null);

  const phase = state.phase;
  const canContinue = state.phase !== 'idle' && state.phase !== 'ended';

  const phaseHint = useMemo(() => {
    if (phase === 'opening') return '시작팩 오픈 필요';
    if (phase === 'deck_build') return '덱 편성 필요';
    if (phase === 'running') return '맵에서 진행';
    if (phase === 'battle') return '전투 준비 중';
    if (phase === 'event') return '이벤트 진행 중';
    if (phase === 'shop') return '상점 진입 중';
    if (phase === 'rest') return '휴식 진입 중';
    if (phase === 'reward') return '보상 확인 중';
    if (phase === 'ended') return '원정 종료';
    return '새 원정 대기';
  }, [phase]);

  const continueRoute = useMemo(() => {
    if (phase === 'opening' || phase === 'deck_build') return '/roguelike';
    if (phase === 'battle') return '/roguelike/battle';
    if (phase === 'event') return '/roguelike/event';
    if (phase === 'shop') return '/roguelike/shop';
    if (phase === 'rest') return '/roguelike/rest';
    if (phase === 'reward') return '/roguelike/reward';
    return '/roguelike/map';
  }, [phase]);

  const closePackModal = () => {
    setRevealedCards([]);
    setRevealedPackId(null);
  };

  const handleOpenStarter = (packId: string) => {
    const cards = openStarterPack(packId);
    if (!cards) {
      return;
    }
    if (cards.length > 0) {
      setRevealedCards(cards);
      setRevealedPackId(packId);
    }
  };

  const handleSaveDeck = (nextDeck: Deck) => {
    saveDeck({
      id: state.deck.id || 'roguelike-formation',
      name: state.deck.name || '원정대',
      warriors: nextDeck.warriors,
      tactics: nextDeck.tactics,
    });
    goToMap();
  };

  const handleStart = () => {
    if (canContinue && !window.confirm('진행 중인 원정을 포기하고 새로 시작할까요?')) {
      return;
    }

    clearRun();
    startNewRun();
  };

  if (!loaded) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center text-white">로딩 중...</div>
    );
  }

  return (
    <div className="min-h-screen ui-page">
      <div className="mx-auto max-w-3xl px-3 py-4 space-y-4">
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 animate-[fadeIn_260ms_ease]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg md:text-xl font-black text-white">탐험 모드</h1>
            <span className="text-xs text-gray-300">{phaseHint}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="text-gray-400 text-xs">Act</div>
              <div className="text-xl font-black text-amber-300">{state.currentAct}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="text-gray-400 text-xs">현재 HP</div>
              <div className="text-lg font-black text-green-300">{state.teamHp}/{state.maxTeamHp}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="text-gray-400 text-xs">보유 금</div>
              <div className="text-lg font-black text-yellow-300">{state.gold}G</div>
            </div>
          </div>
        </div>

        {!canContinue ? (
          <button
            onClick={handleStart}
            className="ui-btn ui-btn-danger w-full py-4 text-lg"
          >
            새 원정
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push(continueRoute)}
              className="ui-btn ui-btn-primary py-3"
            >
              이어하기
            </button>
            <button
              onClick={handleStart}
              className="ui-btn ui-btn-neutral py-3"
            >
              새 원정
            </button>
          </div>
        )}

        {phase === 'opening' && (
          <div className="space-y-3">
            <h2 className="text-white font-bold">시작 전투 팩 열기</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {state.openedStarterPacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleOpenStarter(pack.id)}
                  disabled={pack.opened}
                  className={`rounded-xl border p-4 text-left transition ${pack.opened
                    ? 'border-emerald-400/40 bg-emerald-950/40 opacity-70'
                    : 'border-white/20 bg-black/30 hover:border-amber-500/40'}`}
                >
                  <div className="text-xs text-gray-300">{PACK_LABEL.normal}</div>
                  <div className="font-black text-white">{pack.opened ? '개봉 완료' : '택하여 개봉'}</div>
                  <div className="text-xs text-gray-400 mt-1">상태: {pack.opened ? '열림' : '미개봉'}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                ensureStarterComposition();
                goToMap();
              }}
              className="ui-btn ui-btn-primary w-full py-3"
            >
              자동 보충 후 맵으로
            </button>
          </div>
        )}

        {phase === 'deck_build' && (
          <div className="space-y-3">
            <DeckFormation deck={state.deck} inventory={state.inventory} onSave={handleSaveDeck} />
          </div>
        )}

        {phase === 'running' && (
          <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <div className="text-white font-bold mb-2">진행 중인 원정</div>
            <div className="text-sm text-gray-300 mb-3">
              현재 노드: {state.currentNodeId ? state.currentNodeId : '대기중'}
            </div>
            <button onClick={() => router.push('/roguelike/map')} className="ui-btn ui-btn-primary w-full py-3">
              맵으로 이어하기
            </button>
          </div>
        )}

        {phase === 'battle' && (
          <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <div className="text-white font-bold mb-2">전투 노드 진입 필요</div>
            <button onClick={() => router.push('/roguelike/battle')} className="ui-btn ui-btn-primary w-full py-3">
              전투 계속하기
            </button>
          </div>
        )}

        {phase === 'event' && (
          <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <div className="text-white font-bold mb-2">이벤트 노드</div>
            <button onClick={() => router.push('/roguelike/event')} className="ui-btn ui-btn-primary w-full py-3">
              이벤트 선택으로 이동
            </button>
          </div>
        )}

        {phase === 'shop' && (
          <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <div className="text-white font-bold mb-2">상점 노드</div>
            <button onClick={() => router.push('/roguelike/shop')} className="ui-btn ui-btn-primary w-full py-3">
              상점으로 이동
            </button>
          </div>
        )}

        {phase === 'rest' && (
          <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <div className="text-white font-bold mb-2">휴식 노드</div>
            <button onClick={() => router.push('/roguelike/rest')} className="ui-btn ui-btn-primary w-full py-3">
              휴식하기
            </button>
          </div>
        )}

        {phase === 'reward' && (
          <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <div className="text-white font-bold mb-2">보상이 남아있습니다.</div>
            <button onClick={() => router.push('/roguelike/reward')} className="ui-btn ui-btn-primary w-full py-3">
              보상 확인
            </button>
          </div>
        )}

        {(revealedCards.length > 0 && revealedPackId) && (
          <div className="fixed inset-0 z-50 bg-black/85 p-4 flex items-center justify-center">
            <div className="w-full max-w-3xl bg-gray-900 border border-indigo-500/40 rounded-2xl p-4 shadow-[0_0_40px_rgba(99,102,241,0.25)]">
              <div className="text-white text-lg font-black mb-3">{PACK_LABEL.normal} 개봉 결과</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {revealedCards.map((card, index) => {
                  const cardData = getCardById(card.id);
                  if (!cardData) return null;
                  if (cardData.type === 'warrior') {
                    return (
                      <WarriorCardView
                        key={`${cardData.id}-${index}`}
                        card={cardData}
                        size="sm"
                        owned={undefined}
                      />
                    );
                  }

                  return (
                    <TacticCardView
                      key={`${cardData.id}-${index}`}
                      card={cardData}
                      size="sm"
                      owned={undefined}
                    />
                  );
                })}
              </div>
              <button onClick={closePackModal} className="ui-btn ui-btn-neutral w-full py-3 mt-4">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
