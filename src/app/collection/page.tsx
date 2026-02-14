'use client';

import { useRouter } from 'next/navigation';
import CardCollection from '@/components/collection/CardCollection';
import { useGameStateContext } from '@/context/GameStateContext';

export default function CollectionPage() {
  const router = useRouter();
  const { state, enhanceCard } = useGameStateContext();

  return (
    <CardCollection
      ownedCards={state.ownedCards}
      onEnhance={enhanceCard}
      onBack={() => router.push('/')}
    />
  );
}
