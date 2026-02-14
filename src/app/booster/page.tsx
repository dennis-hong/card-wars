'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BoosterPackView from '@/components/booster/BoosterPackView';
import { useGameStateContext } from '@/context/GameStateContext';

export default function BoosterPage() {
  const router = useRouter();
  const { state, openBooster } = useGameStateContext();

  const ownedCardIds = useMemo(
    () => new Set(state.ownedCards.map((c) => c.cardId)),
    [state.ownedCards]
  );

  return (
    <BoosterPackView
      packs={state.boosterPacks}
      onOpen={openBooster}
      onComplete={() => router.push('/')}
      ownedCardIds={ownedCardIds}
      ownedCards={state.ownedCards}
    />
  );
}
