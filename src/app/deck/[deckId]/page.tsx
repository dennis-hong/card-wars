'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DeckEditor from '@/components/deck/DeckEditor';
import { useGameStateContext } from '@/context/GameStateContext';

export default function DeckEditPage() {
  const router = useRouter();
  const params = useParams();
  const { state, saveDeck } = useGameStateContext();

  const deckId = Array.isArray(params.deckId) ? params.deckId[0] : params.deckId || '';
  const deck = useMemo(() => {
    return state.decks.find((d) => d.id === deckId) || null;
  }, [deckId, state.decks]);

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-xl mb-4">덱을 찾을 수 없습니다.</div>
        <button
          onClick={() => router.push('/deck')}
          className="px-4 py-2 bg-blue-700 rounded-lg"
        >
          덱 목록으로
        </button>
      </div>
    );
  }

  return (
    <DeckEditor
      ownedCards={state.ownedCards}
      deck={deck}
      onSave={(savedDeck) => {
        saveDeck(savedDeck);
        router.push(`/deck/saved?name=${encodeURIComponent(savedDeck.name)}`);
      }}
      onCancel={() => router.push('/deck')}
    />
  );
}
