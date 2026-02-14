'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, BoosterPack, OwnedCard } from '@/types/game';
import CardDetailModal from '@/components/card/CardDetailModal';
import PackTearView from '@/components/booster/PackTearView';
import PackRevealView from '@/components/booster/PackRevealView';
import PackSelectionView from '@/components/booster/PackSelectionView';
import PackSummaryModal from '@/components/booster/PackSummaryModal';
import { SFX } from '@/lib/sound';
import { BOOSTER_ANIMATION_PRESETS } from '@/lib/animation-presets';
import {
  buildOwnedByCardId,
  buildOwnedCardCounts,
} from '@/lib/card-utils';

interface Props {
  packs: BoosterPack[];
  onOpen: (packId: string) => Card[] | null;
  onComplete: () => void;
  ownedCardIds?: Set<string>;
  ownedCards?: OwnedCard[];
}

type Phase = 'select' | 'tearing' | 'revealing' | 'summary';

export default function BoosterPackView({ packs, onOpen, onComplete, ownedCardIds = new Set(), ownedCards = [] }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [tearingPackId, setTearingPackId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [flashTone, setFlashTone] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [revealAllMode, setRevealAllMode] = useState(false);
  const [lastObtained, setLastObtained] = useState<{ cards: Card[]; ownedBefore: Set<string> } | null>(null);
  const [detailCard, setDetailCard] = useState<{ card: Card; isNew: boolean } | null>(null);
  const preOpenOwnedRef = useRef<Set<string>>(new Set(ownedCardIds));

  const unopened = useMemo(() => packs.filter((p) => !p.opened), [packs]);
  const ownedCardCounts = useMemo(() => buildOwnedCardCounts(ownedCards), [ownedCards]);
  const representativeByCard = useMemo(() => {
    const byCard = buildOwnedByCardId(ownedCards);
    const representative = new Map<string, OwnedCard>();
    byCard.forEach((bucket, cardId) => {
      const [top] = bucket;
      if (top) {
        representative.set(cardId, top);
      }
    });
    return representative;
  }, [ownedCards]);

  useEffect(() => {
    const sync = () => setCompact(window.innerWidth < 640);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (unopened.length === 0) {
      setActivePackId(null);
      return;
    }
    if (!activePackId || !unopened.some((p) => p.id === activePackId)) {
      setActivePackId(unopened[0].id);
    }
  }, [unopened, activePackId]);

  const activePack = useMemo(
    () => unopened.find((p) => p.id === activePackId) ?? unopened[0] ?? null,
    [unopened, activePackId]
  );

  const startOpen = useCallback((pack: BoosterPack) => {
    if (phase !== 'select') return;
    preOpenOwnedRef.current = new Set(ownedCardIds);
    setDetailCard(null);
    SFX.packOpen();
    setTearingPackId(pack.id);
    setPhase('tearing');
  }, [phase, ownedCardIds]);

  const handleTearDone = useCallback(() => {
    if (!tearingPackId) return;
    const result = onOpen(tearingPackId);
    if (!result) return;
    const ownedBefore = new Set(preOpenOwnedRef.current);
    setLastObtained({ cards: result, ownedBefore });
    setCards(result);
    setRevealedIndexes(new Set());
    setFocusIndex(null);
    setFlashTone(null);
    setRevealAllMode(false);
    setPhase('revealing');
  }, [tearingPackId, onOpen]);

  const handleRevealCard = useCallback((index: number) => {
    if (phase !== 'revealing' || revealAllMode || revealedIndexes.has(index)) return;

    const card = cards[index];
    SFX.cardFlip();
    setTimeout(() => SFX.gradeReveal(card.grade), BOOSTER_ANIMATION_PRESETS.revealSfxDelayMsByGrade[card.grade]);

    const tone = BOOSTER_ANIMATION_PRESETS.cardGradeTone[card.grade];
    setFlashTone(tone);

    if (card.grade >= 3) {
      setFocusIndex(index);
      setTimeout(() => setFocusIndex(null), BOOSTER_ANIMATION_PRESETS.cinematicDelayMsByGrade[card.grade]);
    }

    setTimeout(() => setFlashTone(null), 240);

    setRevealedIndexes((prev) => {
      const next = new Set([...prev, index]);
      if (next.size === cards.length) {
        setTimeout(() => setPhase('summary'), card.grade >= 3 ? 1200 : 700);
      }
      return next;
    });
  }, [phase, revealAllMode, revealedIndexes, cards]);

  const handleRevealAll = useCallback(() => {
    if (phase !== 'revealing' || revealAllMode) return;
    const pending = cards
      .map((card, i) => ({ card, i }))
      .filter(({ i }) => !revealedIndexes.has(i));
    if (pending.length === 0) return;

    setRevealAllMode(true);
    const highest = pending.reduce((best, curr) => (curr.card.grade > best.card.grade ? curr : best));

    // One-shot global reveal effect to avoid repeated flashes and shake flicker.
    SFX.cardFlip();
    setTimeout(() => SFX.gradeReveal(highest.card.grade), BOOSTER_ANIMATION_PRESETS.revealSfxDelayMsByGrade[highest.card.grade]);
    setFocusIndex(null);
    setFlashTone(BOOSTER_ANIMATION_PRESETS.cardGradeTone[highest.card.grade]);
    setTimeout(() => setFlashTone(null), 260);

    setRevealedIndexes((prev) => {
      const next = new Set(prev);
      pending.forEach(({ i }) => next.add(i));
      return next;
    });

    setTimeout(() => setPhase('summary'), highest.card.grade >= 3 ? 1000 : 700);
  }, [phase, revealAllMode, cards, revealedIndexes]);

  const handleSummaryDone = useCallback(() => {
    setDetailCard(null);
    const remaining = packs.filter((p) => !p.opened);
    if (remaining.length > 0) {
      setTearingPackId(null);
      setCards([]);
      setRevealedIndexes(new Set());
      setFocusIndex(null);
      setRevealAllMode(false);
      setPhase('select');
      return;
    }
    onComplete();
  }, [packs, onComplete]);

  if (phase === 'tearing' && tearingPackId) {
    const pack = packs.find((p) => p.id === tearingPackId);
    if (!pack) return null;
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#1b315f_0%,#0a1228_58%,#040812_100%)]">
        <PackTearView packType={pack.type} compact={compact} onDone={handleTearDone} />
      </div>
    );
  }

  if (phase === 'revealing') {
    return (
      <PackRevealView
        cards={cards}
        compact={compact}
        revealedIndexes={revealedIndexes}
        focusIndex={focusIndex}
        flashTone={flashTone}
        revealAllMode={revealAllMode}
        onRevealCard={handleRevealCard}
        onRevealAll={handleRevealAll}
      />
    );
  }

  if (phase === 'summary') {
    const remaining = packs.filter((p) => !p.opened);
    return (
      <>
        <PackSummaryModal
          cards={cards}
          ownedBefore={preOpenOwnedRef.current}
          onCardClick={(card, isNew) => setDetailCard({ card, isNew })}
          onDone={handleSummaryDone}
          remainingPacks={remaining.length}
        />
        <CardDetailModal
          card={detailCard?.card ?? null}
          owned={detailCard ? representativeByCard.get(detailCard.card.id) : undefined}
          ownedCount={detailCard ? ownedCardCounts[detailCard.card.id] || 0 : 0}
          isNew={detailCard?.isNew}
          sourceTag="부스터 획득"
          onClose={() => setDetailCard(null)}
        />
      </>
    );
  }

  return (
    <>
      <PackSelectionView
        packs={unopened}
        activePack={activePack}
        compact={compact}
        lastObtained={lastObtained}
        onBack={onComplete}
        onSelectPack={setActivePackId}
        onOpenActive={() => {
          if (activePack) {
            startOpen(activePack);
          }
        }}
        onRecentCardClick={(card, isNew) => setDetailCard({ card, isNew })}
      />
      <CardDetailModal
        card={detailCard?.card ?? null}
        owned={detailCard ? representativeByCard.get(detailCard.card.id) : undefined}
        ownedCount={detailCard ? ownedCardCounts[detailCard.card.id] || 0 : 0}
        isNew={detailCard?.isNew}
        sourceTag="부스터 획득"
        onClose={() => setDetailCard(null)}
      />
    </>
  );
}
