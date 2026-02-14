'use client';

import { useRouter } from 'next/navigation';
import DeckEditor from '@/components/deck/DeckEditor';
import { useGameStateContext } from '@/context/GameStateContext';

export default function DeckCreatePage() {
  const router = useRouter();
  const { state, saveDeck } = useGameStateContext();

  return (
    <DeckEditor
      ownedCards={state.ownedCards}
      deck={null}
      onSave={(deck) => {
        saveDeck(deck);
        router.push(`/deck/saved?name=${encodeURIComponent(deck.name)}`);
      }}
      onCancel={() => router.push('/deck')}
    />
  );
}
