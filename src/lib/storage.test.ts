import { describe, expect, it } from 'vitest';
import { createInitialState, migrateState } from '@/lib/storage';

describe('migrateState', () => {
  it('returns a safe initial-like shape for invalid payloads', () => {
    const result = migrateState(null);
    const initial = createInitialState();

    expect(result.initialized).toBe(initial.initialized);
    expect(result.ownedCards).toEqual([]);
    expect(result.decks).toEqual([]);
    expect(result.activeDeckId).toBeNull();
    expect(result.activeTitle).toBeNull();
    expect(result.stats).toEqual(initial.stats);
  });

  it('normalizes decks, cards and active title constraints', () => {
    const result = migrateState({
      version: 3,
      initialized: true,
      ownedCards: [
        { instanceId: 'w1', cardId: 'w-cao-cao', level: 4, duplicates: 2 },
        { instanceId: 't1', cardId: 't-fire', level: 2, duplicates: 0 },
        { instanceId: 'bad', cardId: 'unknown-card', level: 1, duplicates: 0 },
      ],
      decks: [
        {
          id: 'deck-1',
          name: '테스트 덱',
          warriors: [
            { instanceId: 'w1', lane: 'front' },
            { instanceId: 'missing', lane: 'mid' },
          ],
          tactics: ['t1', 'missing'],
        },
      ],
      activeDeckId: 'deck-1',
      boosterPacks: [
        { id: 'pack-1', type: 'hero', opened: true },
        { id: 99, type: 'bad', opened: false },
      ],
      stats: {
        wins: 9,
        losses: 2,
        streak: 3,
        maxStreak: 4,
        scenariosCleared: 1,
      },
      earnedTitles: ['collector'],
      activeTitle: 'not-earned',
    });

    expect(result.initialized).toBe(true);
    expect(result.ownedCards.map((card) => card.instanceId)).toEqual(['w1', 't1']);
    expect(result.decks).toHaveLength(1);
    expect(result.decks[0].warriors).toEqual([{ instanceId: 'w1', lane: 'front' }]);
    expect(result.decks[0].tactics).toEqual(['t1']);
    expect(result.boosterPacks).toEqual([{ id: 'pack-1', type: 'hero', opened: true }]);
    expect(result.activeTitle).toBeNull();
    expect(result.activeDeckId).toBe('deck-1');
    expect(result.stats.wins).toBe(9);
    expect(result.stats.maxStreak).toBe(4);
  });
});
