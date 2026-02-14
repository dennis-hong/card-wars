'use client';

import { useRouter } from 'next/navigation';
import { SFX } from '@/lib/sound';
import { useGameStateContext } from '@/context/GameStateContext';

export default function DeckListPage() {
  const router = useRouter();
  const {
    state,
    setActiveDeck,
    deleteDeck,
  } = useGameStateContext();

  return (
    <div className="min-h-screen ui-page p-4 md:p-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-gray-300 text-sm hover:text-white min-h-10 px-2"
        >
          ← 뒤로
        </button>
        <h1 className="text-white font-bold text-lg">덱 관리</h1>
        <button
          onClick={() => {
            SFX.buttonClick();
            router.push('/deck/new');
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
              router.push('/deck/new');
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
                      router.push(`/deck/${deck.id}`);
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
