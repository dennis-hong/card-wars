'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { useGameState } from '@/hooks/useGameState';
import { Deck } from '@/types/game';
import { getTitleById, TITLES } from '@/data/titles';
import { getWarriorById } from '@/data/cards';
import BoosterPackView from '@/components/booster/BoosterPackView';
import DeckEditor from '@/components/deck/DeckEditor';
import BattleArena from '@/components/battle/BattleArena';
import CardCollection from '@/components/collection/CardCollection';
import { SFX } from '@/lib/sound';

type Screen =
  | 'main'
  | 'booster'
  | 'deck-list'
  | 'deck-edit'
  | 'deck-saved'
  | 'battle'
  | 'collection'
  | 'titles';

export default function Home() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const {
    state,
    loaded,
    openBooster,
    saveDeck,
    deleteDeck,
    setActiveDeck,
    setActiveTitle,
    enhanceCard,
    recordBattleResult,
    resetGame,
    newTitleIds,
    dismissNewTitles,
    enhanceableCount,
  } = useGameState();

  const [screen, setScreen] = useState<Screen>('main');
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [streakReward, setStreakReward] = useState<{ type: string; streak: number } | null>(null);
  const [savedDeckName, setSavedDeckName] = useState<string>('');

  const unopenedPacks = useMemo(
    () => state.boosterPacks.filter((p) => !p.opened),
    [state.boosterPacks]
  );

  const ownedCardIds = useMemo(
    () => new Set(state.ownedCards.map((c) => c.cardId)),
    [state.ownedCards]
  );

  const activeDeck = useMemo(
    () => state.decks.find((d) => d.id === state.activeDeckId) || null,
    [state.decks, state.activeDeckId]
  );

  const activeTitleData = useMemo(
    () => state.activeTitle ? getTitleById(state.activeTitle) : null,
    [state.activeTitle]
  );

  // Show title popup when new titles earned
  const hasNewTitles = newTitleIds.length > 0 && screen === 'main';

  if (!isHydrated || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">로딩 중...</div>
      </div>
    );
  }

  // ─── Booster Opening Screen ───
  if (screen === 'booster') {
    return (
      <BoosterPackView
        packs={state.boosterPacks}
        onOpen={openBooster}
        onComplete={() => setScreen('main')}
        ownedCardIds={ownedCardIds}
        ownedCards={state.ownedCards}
      />
    );
  }

  // ─── Deck List Screen ───
  if (screen === 'deck-list') {
    return (
      <div className="min-h-screen ui-page p-4 md:p-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('main')}
            className="text-gray-300 text-sm hover:text-white min-h-10 px-2"
          >
            ← 뒤로
          </button>
          <h1 className="text-white font-bold text-lg">덱 관리</h1>
          <button
            onClick={() => {
              SFX.buttonClick();
              setEditingDeck(null);
              setScreen('deck-edit');
            }}
            className="text-green-300 text-sm hover:text-green-200"
          >
            + 새 덱
          </button>
        </div>

        {state.decks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center mt-20">
            <div className="text-6xl mb-6">🃏</div>
            <div className="text-gray-200 text-lg mb-2">덱이 없습니다</div>
            <div className="text-sm text-gray-300 mb-8">새 덱을 만들어 전투에 나서세요!</div>
            <button
              onClick={() => {
                SFX.buttonClick();
                setEditingDeck(null);
                setScreen('deck-edit');
              }}
              className="ui-btn ui-btn-primary px-8 py-4 text-lg"
            >
              + 새 덱 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {state.decks.map((deck) => (
              <div
                key={deck.id}
                className={`ui-panel rounded-xl p-4 ${
                  deck.id === state.activeDeckId
                    ? 'border-yellow-500/50'
                    : 'border-gray-700/50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-white font-bold">{deck.name}</div>
                    {deck.id === state.activeDeckId && (
                      <span className="text-xs text-yellow-400">활성 덱</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {deck.id !== state.activeDeckId && (
                      <button
                        onClick={() => {
                          SFX.buttonClick();
                          setActiveDeck(deck.id);
                        }}
                        className="ui-btn px-3 py-1 bg-yellow-700 text-white text-xs rounded hover:bg-yellow-600"
                      >
                        활성화
                      </button>
                    )}
                    <button
                      onClick={() => {
                        SFX.buttonClick();
                        setEditingDeck(deck);
                        setScreen('deck-edit');
                      }}
                      className="ui-btn px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-600"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => {
                        SFX.buttonClick();
                        if (confirm('이 덱을 삭제하시겠습니까?')) {
                          deleteDeck(deck.id);
                        }
                      }}
                      className="ui-btn px-3 py-1 bg-red-700 text-white text-xs rounded hover:bg-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 text-xs text-gray-400">
                  <span>무장 {deck.warriors.length}/3</span>
                  <span>|</span>
                  <span>전법 {deck.tactics.length}/2</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Deck Editor Screen ───
  if (screen === 'deck-edit') {
    return (
      <DeckEditor
        ownedCards={state.ownedCards}
        deck={editingDeck}
        onSave={(deck) => {
          saveDeck(deck);
          setSavedDeckName(deck.name);
          setScreen('deck-saved');
        }}
        onCancel={() => setScreen('deck-list')}
      />
    );
  }

  // ─── Deck Saved Screen ───
  if (screen === 'deck-saved') {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-center max-w-xs w-full">
          <div className="text-5xl mb-4">✅</div>
          <div className="text-xl font-bold text-white mb-2">저장 완료!</div>
          <div className="text-sm text-gray-400 mb-8">
            &apos;{savedDeckName}&apos; 덱이 활성 덱으로 설정되었습니다.
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                SFX.buttonClick();
                setScreen('battle');
              }}
              className="ui-btn ui-btn-danger w-full py-4 text-lg"
            >
              ⚔️ 바로 전투!
            </button>
            <button
              onClick={() => {
                SFX.buttonClick();
                setScreen('deck-list');
              }}
              className="ui-btn ui-btn-neutral w-full py-3"
            >
              🃏 덱 목록
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Battle Screen ───
  if (screen === 'battle') {
    // Validate deck: must exist and have 3 warriors with valid owned cards
    const validWarriorCount = activeDeck
      ? activeDeck.warriors.filter((w) => {
          const owned = state.ownedCards.find((c) => c.instanceId === w.instanceId);
          return owned && getWarriorById(owned.cardId);
        }).length
      : 0;

    if (!activeDeck || validWarriorCount < 3) {
      return (
        <div className="min-h-screen ui-page flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-4">⚔️</div>
            <div className="text-white mb-2">
              {!activeDeck ? '활성 덱이 없습니다!' : '덱의 무장이 부족합니다!'}
            </div>
            <div className="text-gray-300 text-sm mb-4">
              {!activeDeck
                ? '먼저 덱을 만들고 활성화하세요.'
                : '카드 강화/합성으로 덱에서 무장이 빠졌을 수 있습니다. 덱을 다시 편집해주세요.'}
            </div>
            <button
              onClick={() => setScreen('deck-list')}
              className="ui-btn px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              덱 관리로 이동
            </button>
          </div>
        </div>
      );
    }

    return (
      <BattleArena
        deck={activeDeck}
        ownedCards={state.ownedCards}
        wins={state.stats.wins}
        onBattleEnd={(result) => {
          // Calculate streak reward before recording
          let reward: { type: string; streak: number } | null = null;
          if (result === 'win') {
            const newStreak = state.stats.streak + 1;
            if (newStreak === 3) reward = { type: 'rare', streak: 3 };
            if (newStreak === 5) reward = { type: 'hero', streak: 5 };
          }
          setStreakReward(reward);
          recordBattleResult(result === 'win');
          setScreen('main');
        }}
        onExit={() => setScreen('main')}
        streakReward={streakReward}
      />
    );
  }

  // ─── Collection Screen ───
  if (screen === 'collection') {
    return (
      <CardCollection
        ownedCards={state.ownedCards}
        onEnhance={enhanceCard}
        onBack={() => setScreen('main')}
      />
    );
  }

  // ─── Titles Screen ───
  if (screen === 'titles') {
    return (
      <div className="min-h-screen ui-page p-4 md:p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('main')}
            className="text-gray-300 text-sm hover:text-white min-h-10 px-2"
          >
            ← 뒤로
          </button>
          <h1 className="text-white font-bold text-lg">칭호 목록</h1>
          <div className="w-12" />
        </div>

        <div className="space-y-3">
          {TITLES.map((title) => {
            const earned = state.earnedTitles.includes(title.id);
            const isActive = state.activeTitle === title.id;
            return (
              <div
                key={title.id}
                className={`rounded-xl p-4 border transition-all ${
                  earned
                    ? isActive
                      ? 'bg-yellow-900/30 border-yellow-500/50'
                      : 'bg-gray-800/50 border-gray-600/50'
                    : 'bg-gray-800/40 border-gray-700/40 opacity-85'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${earned ? 'text-white' : 'text-gray-300'}`}>
                        {title.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] bg-yellow-600 text-white px-1.5 py-0.5 rounded-full">착용 중</span>
                      )}
                    </div>
                    <div className={`text-xs mt-0.5 ${earned ? 'text-gray-300' : 'text-gray-400'}`}>{title.description}</div>
                    <div className={`text-[10px] mt-0.5 ${earned ? 'text-gray-400' : 'text-gray-500'}`}>
                      {title.category === 'wins' ? '🏆 승리' : title.category === 'collection' ? '📚 수집' : '🔥 연승'}
                    </div>
                  </div>
                  {earned && !isActive && (
                    <button
                      onClick={() => {
                        SFX.buttonClick();
                        setActiveTitle(title.id);
                      }}
                      className="ui-btn px-3 py-1 bg-yellow-700 text-white text-xs rounded hover:bg-yellow-600"
                    >
                      착용
                    </button>
                  )}
                  {earned && isActive && (
                    <button
                      onClick={() => {
                        SFX.buttonClick();
                        setActiveTitle(null);
                      }}
                      className="ui-btn px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
                    >
                      해제
                    </button>
                  )}
                  {!earned && (
                    <span className="text-xs text-gray-400">🔒 미달성</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Main Menu ───
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/title-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* New Title Popup */}
      {hasNewTitles && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-yellow-900/90 to-gray-900/95 rounded-2xl p-6 max-w-xs w-full text-center border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-xl font-black text-yellow-300 mb-4">칭호 획득!</div>
            {newTitleIds.map((id) => {
              const t = getTitleById(id);
              return t ? (
                <div key={id} className="bg-yellow-800/30 rounded-lg p-3 mb-2 border border-yellow-600/30">
                  <div className="text-white font-bold text-lg">{t.name}</div>
                  <div className="text-yellow-200/70 text-sm">{t.description}</div>
                </div>
              ) : null;
            })}
            <button
              onClick={() => {
                SFX.buttonClick();
                dismissNewTitles();
              }}
              className="mt-4 px-6 py-2 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Streak Reward Notification */}
      {streakReward && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div
            className="bg-gradient-to-b from-purple-900/90 to-gray-900/95 rounded-2xl p-6 max-w-xs w-full text-center border-2 border-purple-500/50 shadow-2xl"
            style={{ animation: 'streakBounce 0.6s ease-out' }}
          >
            <style jsx>{`
              @keyframes streakBounce {
                0% { transform: translateY(100px); opacity: 0; }
                40% { transform: translateY(-10px); opacity: 1; }
                60% { transform: translateY(5px); }
                100% { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            <div className="text-4xl mb-3">🔥</div>
            <div className="text-xl font-black text-purple-300 mb-2">
              {streakReward.streak}연승 달성!
            </div>
            <div className="text-sm text-purple-200/70 mb-4">
              보상: {streakReward.type === 'hero' ? '🟣 영웅팩' : '🔵 희귀팩'} 1개
            </div>
            <button
              onClick={() => {
                SFX.buttonClick();
                setStreakReward(null);
              }}
              className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 pt-8 pb-8 sm:p-8 relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <div className="mb-4" style={{ filter: 'drop-shadow(0 0 20px rgba(255,170,0,0.5))' }}>
            <Image src="/images/logo.png" alt="Warlords Card Wars" width={112} height={112} className="w-28 h-28 mx-auto object-contain" />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-black text-white tracking-[0.18em] sm:tracking-widest mb-2"
            style={{ textShadow: '0 0 40px rgba(255,170,0,0.4), 0 4px 8px rgba(0,0,0,0.8)' }}
          >
            WARLORDS
          </h1>
          <div
            className="text-lg sm:text-xl font-bold text-amber-400 tracking-[0.28em] sm:tracking-[0.3em]"
            style={{ textShadow: '0 0 20px rgba(251,191,36,0.4)' }}
          >
            CARD WARS
          </div>
          <div className="text-sm text-gray-200 mt-2 tracking-wider">5분 컷 삼국지 카드 배틀</div>

          {/* Active Title */}
          {activeTitleData && (
            <button
              onClick={() => {
                SFX.buttonClick();
                setScreen('titles');
              }}
              className="mt-3 inline-block"
            >
              <span className="text-xs bg-gradient-to-r from-yellow-700 to-amber-600 text-yellow-200 px-3 py-1 rounded-full font-bold border border-yellow-500/30 hover:border-yellow-400/50 transition-colors">
                👑 {activeTitleData.name}
              </span>
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex gap-5 sm:gap-6 mb-6 sm:mb-8 text-center bg-black/35 backdrop-blur-sm rounded-2xl px-5 sm:px-6 py-3 border border-white/15">
          <div>
            <div className="text-xl font-bold text-green-400">{state.stats.wins}</div>
            <div className="text-xs text-gray-300">승리</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{state.stats.losses}</div>
            <div className="text-xs text-gray-300">패배</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{state.stats.streak}</div>
            <div className="text-xs text-gray-300">연승</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400">{state.ownedCards.length}</div>
            <div className="text-xs text-gray-300">카드</div>
          </div>
        </div>

        {/* Streak progress bar */}
        {state.stats.streak > 0 && (
          <div className="w-full max-w-xs mb-6">
            <div className="flex justify-between text-[10px] text-gray-300 mb-1">
              <span>🔥 {state.stats.streak}연승</span>
              <span>다음 보상: {state.stats.streak < 3 ? '3연승 (희귀팩)' : state.stats.streak < 5 ? '5연승 (영웅팩)' : '달성 완료!'}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                style={{ width: `${Math.min(100, (state.stats.streak / 5) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Menu buttons */}
        <div className="w-full max-w-xs space-y-3">
          {/* Booster notification */}
          {unopenedPacks.length > 0 && (
            <button
              onClick={() => {
                SFX.buttonClick();
                setScreen('booster');
              }}
              className="ui-btn w-full py-4 min-h-14 bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-yellow-400 transition-all relative overflow-hidden"
              style={{ animation: 'glow 2s infinite' }}
            >
              <span className="relative z-10">
                🎁 부스터팩 개봉 ({unopenedPacks.length}개)
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
            </button>
          )}

          <button
            onClick={() => {
              SFX.buttonClick();
              setScreen('battle');
            }}
            className="ui-btn ui-btn-danger w-full py-4 min-h-14 text-lg border border-red-500/30"
          >
            ⚔️ AI 대전
          </button>

          <button
            onClick={() => {
              SFX.buttonClick();
              setScreen('deck-list');
            }}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12"
          >
            🃏 덱 관리
          </button>

          <button
            onClick={() => {
              SFX.buttonClick();
              setScreen('collection');
            }}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12 relative"
          >
            📚 카드 수집
            {enhanceableCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 text-black text-xs font-black rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-yellow-500/50">
                {enhanceableCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              SFX.buttonClick();
              setScreen('titles');
            }}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12"
          >
            🏆 칭호 ({state.earnedTitles.length}/{TITLES.length})
          </button>

          {unopenedPacks.length === 0 && (
            <button
              onClick={() => {
                SFX.buttonClick();
                setScreen('booster');
              }}
              className="ui-btn w-full py-3 min-h-12 bg-white/10 backdrop-blur-sm text-gray-300 font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10"
            >
              📦 부스터팩
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center relative z-10">
        <button
          onClick={() => {
            if (confirm('정말 게임을 초기화하시겠습니까? 모든 데이터가 삭제됩니다!')) {
              resetGame();
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          게임 초기화
        </button>
      </div>
    </div>
  );
}
